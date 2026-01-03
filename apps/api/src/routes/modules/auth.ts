import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '@speakscore/shared';
import { db, withTenantTransaction } from '../../db';
import { resolveTenant, TenantAccessError } from '../../services/tenancy';
import { logPlatformEvent } from '../../services/audit';
import { sendPasswordResetEmail } from '../../services/email';
import { SSOService } from '../../services/sso';

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const emailHint = body.email.replace(/(.{2}).+(@.*)/, '$1***$2');

    // 1. Check Platform Admins (SUPER_ADMIN)
    const admin = await db
      .selectFrom('platform_admins')
      .selectAll()
      .where('email', '=', body.email)
      .executeTakeFirst();

    if (admin) {
      const valid = await bcrypt.compare(body.password, admin.password_hash);
      if (valid) {
        const token = app.jwt.sign({ userId: admin.id, role: 'SUPER_ADMIN', v: admin.token_version ?? 1 });
        return { accessToken: token, user: { id: admin.id, role: 'SUPER_ADMIN', email: admin.email } };
      }
    }

    // 2. Check all ACTIVE organizations
    const orgs = await db
      .selectFrom('organizations')
      .select(['id', 'schema_name'])
      .where('status', '=', 'ACTIVE')
      .execute();

    for (const org of orgs) {
      const user = await withTenantTransaction(org.schema_name, async (tenantDb) =>
        tenantDb.selectFrom('users').selectAll().where('email', '=', body.email).executeTakeFirst()
      );

      if (user) {
        const valid = await bcrypt.compare(body.password, user.password_hash);
        if (valid) {
          const token = app.jwt.sign({ userId: user.id, orgId: org.id, role: user.role as any, v: user.token_version ?? 1 });
          return { accessToken: token, user: { id: user.id, orgId: org.id, role: user.role, email: user.email } };
        }
      }
    }

    await logPlatformEvent({
      level: 'WARN',
      source: 'AUTH',
      message: 'Failed login attempt',
      meta: { emailHint }
    });
    return reply.unauthorized('Invalid credentials');
  });

  app.post('/logout', async (_request, reply) => {
    return reply.code(200).send({ message: 'logged out' });
  });

  app.post('/forgot-password', async (request, reply) => {
    const { email } = forgotPasswordSchema.parse(request.body);

    // 1. Find User (Platform Admin or Org User)
    let userFound = null;
    let userType: 'PLATFORM_ADMIN' | 'ORG_USER' = 'PLATFORM_ADMIN';
    let orgId: string | null = null;
    let schemaName: string | null = null;

    const admin = await db
      .selectFrom('platform_admins')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();

    if (admin) {
      userFound = admin;
    } else {
      const orgs = await db.selectFrom('organizations').select(['id', 'schema_name']).where('status', '=', 'ACTIVE').execute();
      for (const org of orgs) {
        const user = await withTenantTransaction(org.schema_name, (tenantDb) =>
          tenantDb.selectFrom('users').selectAll().where('email', '=', email).executeTakeFirst()
        );
        if (user) {
          userFound = user;
          userType = 'ORG_USER';
          orgId = org.id;
          schemaName = org.schema_name;
          break;
        }
      }
    }

    if (userFound) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db
        .insertInto('password_reset_tokens')
        .values({
          user_type: userType,
          user_id: userFound.id,
          org_id: orgId,
          token_hash: tokenHash,
          expires_at: expiresAt
        })
        .execute();

      await sendPasswordResetEmail(email, token);
    }

    // Always return success to prevent user enumeration
    return { message: 'If an account exists with that email, a reset link has been sent.' };
  });

  app.post('/reset-password', async (request, reply) => {
    const { token, password } = resetPasswordSchema.parse(request.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await db
      .selectFrom('password_reset_tokens')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .where('expires_at', '>', new Date())
      .where('used_at', 'is', null)
      .executeTakeFirst();

    if (!resetToken) {
      return reply.badRequest('Invalid or expired token');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (resetToken.user_type === 'PLATFORM_ADMIN') {
      await db
        .updateTable('platform_admins')
        .set({
          password_hash: passwordHash,
          token_version: (db.selectFrom('platform_admins').select('token_version').where('id', '=', resetToken.user_id).executeTakeFirst() as any)?.token_version + 1 || 1,
          updated_at: new Date()
        })
        .where('id', '=', resetToken.user_id)
        .execute();
    } else {
      const org = await db.selectFrom('organizations').select('schema_name').where('id', '=', resetToken.org_id!).executeTakeFirst();
      if (!org) return reply.notFound('Organization not found');

      await withTenantTransaction(org.schema_name, async (tenantDb) => {
        const currentUser = await tenantDb.selectFrom('users').select('token_version').where('id', '=', resetToken.user_id).executeTakeFirst();
        return tenantDb
          .updateTable('users')
          .set({
            password_hash: passwordHash,
            token_version: (currentUser?.token_version ?? 0) + 1,
            updated_at: new Date()
          })
          .where('id', '=', resetToken.user_id)
          .execute();
      });
    }

    await db
      .updateTable('password_reset_tokens')
      .set({ used_at: new Date() })
      .where('id', '=', resetToken.id)
      .execute();

    return { message: 'Password has been reset successfully' };
  });

  app.post('/change-password', async (request, reply) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
    const { userId, role, orgId } = request.user as any;

    let userFound: any = null;
    let schemaName: string | null = null;

    if (role === 'SUPER_ADMIN') {
      userFound = await db.selectFrom('platform_admins').selectAll().where('id', '=', userId).executeTakeFirst();
    } else {
      const org = await db.selectFrom('organizations').select('schema_name').where('id', '=', orgId).executeTakeFirst();
      if (!org) return reply.notFound('Organization not found');
      schemaName = org.schema_name;
      userFound = await withTenantTransaction(schemaName, (tenantDb) =>
        tenantDb.selectFrom('users').selectAll().where('id', '=', userId).executeTakeFirst()
      );
    }

    if (!userFound) return reply.unauthorized('User not found');

    const valid = await bcrypt.compare(currentPassword, userFound.password_hash);
    if (!valid) return reply.badRequest('Invalid current password');

    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (role === 'SUPER_ADMIN') {
      await db
        .updateTable('platform_admins')
        .set({
          password_hash: passwordHash,
          token_version: (userFound.token_version ?? 0) + 1,
          updated_at: new Date()
        })
        .where('id', '=', userId)
        .execute();
    } else {
      await withTenantTransaction(schemaName!, (tenantDb) =>
        tenantDb
          .updateTable('users')
          .set({
            password_hash: passwordHash,
            token_version: (userFound.token_version ?? 0) + 1,
            updated_at: new Date()
          })
          .where('id', '=', userId)
          .execute()
      );
    }

    return { message: 'Password changed successfully' };
  });

  app.get('/auth/sso/init', async (request, reply) => {
    const { orgId } = (request.query as any);
    if (!orgId) return reply.badRequest('orgId required');

    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = await SSOService.getAuthorizationUrl(orgId, state);

    if (!authUrl) return reply.badRequest('SSO not configured for this organization');

    // Store state in session or cache if needed for verification
    return reply.redirect(authUrl);
  });

  app.get('/auth/sso/callback', async (request, reply) => {
    const { state, code, orgId } = (request.query as any);
    // Ideally orgId is inferred from state or relayState

    const userInfo = await SSOService.handleCallback(orgId, request.query, state);
    if (!userInfo) return reply.unauthorized('SSO Callback failed');

    // Find or create user in the organization schema
    const org = await db.selectFrom('organizations').select('schema_name').where('id', '=', orgId).executeTakeFirst();
    if (!org) return reply.unauthorized('Invalid organization');

    const user = await withTenantTransaction(org.schema_name, async (tenantDb) => {
      let existing = await tenantDb.selectFrom('users').selectAll().where('email', '=', userInfo.email!).executeTakeFirst();
      if (!existing) {
        // Just-in-time provisioning of users
        const [newUser] = await tenantDb.insertInto('users').values({
          id: crypto.randomUUID(),
          org_id: orgId,
          email: userInfo.email!,
          password_hash: '', // No password for SSO users
          role: 'RECRUITER',
          token_version: 1,
          created_at: new Date(),
          updated_at: new Date()
        }).returningAll().execute();
        existing = newUser;
      }
      return existing;
    });

    const token = app.jwt.sign({ userId: user.id, orgId: orgId, role: user.role as any, v: user.token_version ?? 1 });
    // Redirect to frontend with token
    return reply.redirect(`${process.env.FRONTEND_URL}/login/callback?token=${token}`);
  });
}
