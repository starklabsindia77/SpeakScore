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
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.org_id,
        title: (user as any).title
      };
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
      .then((rows) => rows.map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role,
        title: (r as any).title,
        createdAt: r.created_at
      })));
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
          title: data.title,
          custom_role_id: data.customRoleId,
          token_version: 1,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning(['id', 'email', 'role', 'title'])
        .execute();
      return created;
    });
    reply.code(201).send({ id: user.id, email: user.email, role: user.role, title: user.title });
  });

  app.get('/org/roles', { preHandler: app.authorize(['ORG_ADMIN']) }, async (request) => {
    return request.withTenantDb(async (tenantDb) => {
      return tenantDb.selectFrom('custom_roles').selectAll().orderBy('name').execute();
    });
  });

  app.post('/org/roles', { preHandler: app.authorize(['ORG_ADMIN']) }, async (request) => {
    const data = request.body as { name: string; permissions: string[] };
    return request.withTenantDb(async (tenantDb) => {
      const [role] = await tenantDb
        .insertInto('custom_roles')
        .values({
          id: randomUUID(),
          name: data.name,
          permissions: data.permissions,
          is_system: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returningAll()
        .execute();
      return role;
    });
  });

  app.delete('/org/roles/:id', { preHandler: app.authorize(['ORG_ADMIN']) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await request.withTenantDb(async (tenantDb) => {
      const role = await tenantDb.selectFrom('custom_roles').select('is_system').where('id', '=', id).executeTakeFirst();
      if (role?.is_system) {
        throw new Error('Cannot delete system roles');
      }
      await tenantDb.deleteFrom('custom_roles').where('id', '=', id).execute();
    });
    return { success: true };
  });
}
