import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { createUserInviteSchema } from '@speakscore/shared';

export async function orgRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/me', async (request) => {
    return request.withTenantDb(async (tenantDb) => {
      const user = await tenantDb
        .selectFrom('users')
        .select(['id', 'email', 'role', 'org_id'])
        .where('id', '=', request.user?.userId ?? '')
        .executeTakeFirst();
      if (!user) return null;
      return { id: user.id, email: user.email, role: user.role, orgId: user.org_id };
    });
  });

  app.get('/org/users', async (request) => {
    const orgId = request.user!.orgId;
    return request
      .withTenantDb((tenantDb) =>
        tenantDb
          .selectFrom('users')
          .select(['id', 'email', 'role', 'created_at'])
          .where('org_id', '=', orgId!)
          .orderBy('created_at', 'desc')
          .execute()
      )
      .then((rows) => rows.map((r) => ({ id: r.id, email: r.email, role: r.role, createdAt: r.created_at })));
  });

  app.post('/org/users/invite', { preHandler: app.authorize(['ORG_ADMIN']) }, async (request, reply) => {
    const orgId = request.user!.orgId!;
    const data = createUserInviteSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(2, 10), 10);
    const user = await request.withTenantDb(async (tenantDb) => {
      const [created] = await tenantDb
        .insertInto('users')
        .values({
          id: randomUUID(),
          org_id: orgId,
          email: data.email,
          password_hash: passwordHash,
          role: data.role,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning(['id', 'email', 'role'])
        .execute();
      return created;
    });
    reply.code(201).send({ id: user.id, email: user.email, role: user.role });
  });
}
