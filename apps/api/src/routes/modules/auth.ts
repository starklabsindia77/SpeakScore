import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@speakscore/shared';
import { db, withTenantTransaction } from '../../db';
import { resolveTenant } from '../../services/tenancy';

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', { schema: { body: loginSchema } }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    if (!body.orgId) {
      const admin = await db.selectFrom('platform_admins').selectAll().where('email', '=', body.email).executeTakeFirst();
      if (!admin) return reply.unauthorized('Invalid credentials');
      const valid = await bcrypt.compare(body.password, admin.password_hash);
      if (!valid) return reply.unauthorized('Invalid credentials');
      const token = app.jwt.sign({ userId: admin.id, role: 'SUPER_ADMIN' });
      return { accessToken: token, user: { id: admin.id, role: 'SUPER_ADMIN', email: admin.email } };
    }

    let org;
    try {
      org = await resolveTenant(body.orgId);
    } catch (err) {
      return reply.unauthorized('Unknown organization');
    }

    const user = await withTenantTransaction(org.schema_name, async (tenantDb) =>
      tenantDb.selectFrom('users').selectAll().where('email', '=', body.email).executeTakeFirst()
    );
    if (!user) return reply.unauthorized('Invalid credentials');
    const valid = await bcrypt.compare(body.password, user.password_hash);
    if (!valid) return reply.unauthorized('Invalid credentials');

    const token = app.jwt.sign({ userId: user.id, orgId: org.id, role: user.role });
    return { accessToken: token, user: { id: user.id, orgId: org.id, role: user.role, email: user.email } };
  });

  app.post('/logout', async (_request, reply) => {
    return reply.code(200).send({ message: 'logged out' });
  });
}
