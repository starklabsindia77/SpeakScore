import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@speakscore/shared';
import { db, withTenantTransaction } from '../../db';
import { resolveTenant, TenantAccessError } from '../../services/tenancy';
import { logPlatformEvent } from '../../services/audit';

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
        const token = app.jwt.sign({ userId: admin.id, role: 'SUPER_ADMIN' });
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
          const token = app.jwt.sign({ userId: user.id, orgId: org.id, role: user.role });
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
}
