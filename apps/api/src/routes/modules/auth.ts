import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@speakscore/shared';
import { db, withTenantTransaction } from '../../db';
import { resolveTenant, TenantAccessError } from '../../services/tenancy';
import { logPlatformEvent } from '../../services/audit';

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', { schema: { body: loginSchema } }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const emailHint = body.email.replace(/(.{2}).+(@.*)/, '$1***$2');
    if (!body.orgId) {
      const admin = await db.selectFrom('platform_admins').selectAll().where('email', '=', body.email).executeTakeFirst();
      if (!admin) {
        await logPlatformEvent({ level: 'WARN', source: 'AUTH', message: 'Failed SUPER_ADMIN login', meta: { emailHint } });
        return reply.unauthorized('Invalid credentials');
      }
      const valid = await bcrypt.compare(body.password, admin.password_hash);
      if (!valid) {
        await logPlatformEvent({ level: 'WARN', source: 'AUTH', message: 'Failed SUPER_ADMIN login', meta: { emailHint } });
        return reply.unauthorized('Invalid credentials');
      }
      const token = app.jwt.sign({ userId: admin.id, role: 'SUPER_ADMIN' });
      return { accessToken: token, user: { id: admin.id, role: 'SUPER_ADMIN', email: admin.email } };
    }

    let org;
    try {
      org = await resolveTenant(body.orgId);
    } catch (err) {
      if (err instanceof TenantAccessError && err.code === 'DISABLED') {
        await logPlatformEvent({ level: 'WARN', source: 'AUTH', message: 'Login attempt to disabled org', orgId: body.orgId, meta: { emailHint } });
        return reply.forbidden('Organization disabled');
      }
      await logPlatformEvent({ level: 'WARN', source: 'AUTH', message: 'Login attempt to unknown org', orgId: body.orgId, meta: { emailHint } });
      return reply.unauthorized('Unknown organization');
    }

    const user = await withTenantTransaction(org.schema_name, async (tenantDb) =>
      tenantDb.selectFrom('users').selectAll().where('email', '=', body.email).executeTakeFirst()
    );
    if (!user) return reply.unauthorized('Invalid credentials');
    const valid = await bcrypt.compare(body.password, user.password_hash);
    if (!valid) {
      await logPlatformEvent({ level: 'WARN', source: 'AUTH', message: 'Failed org login', orgId: org.id, meta: { emailHint } });
      return reply.unauthorized('Invalid credentials');
    }

    const token = app.jwt.sign({ userId: user.id, orgId: org.id, role: user.role });
    return { accessToken: token, user: { id: user.id, orgId: org.id, role: user.role, email: user.email } };
  });

  app.post('/logout', async (_request, reply) => {
    return reply.code(200).send({ message: 'logged out' });
  });
}
