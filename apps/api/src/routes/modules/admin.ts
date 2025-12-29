import { FastifyInstance } from 'fastify';
import { createOrgSchema } from '@speakscore/shared';
import { sql } from 'kysely';
import { db } from '../../db';
import { provisionOrganization } from '../../services/tenancy';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/orgs', { preHandler: app.authorize(['SUPER_ADMIN']) }, async () => {
    const orgs = await db.selectFrom('organizations').select(['id', 'name', 'credits_balance', 'created_at', 'schema_name', 'status']).execute();
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      schemaName: o.schema_name,
      status: o.status,
      creditsBalance: o.credits_balance,
      createdAt: o.created_at
    }));
  });

  app.post('/orgs', { preHandler: app.authorize(['SUPER_ADMIN']) }, async (request) => {
    const data = createOrgSchema.parse(request.body);
    const org = await provisionOrganization({
      name: data.name,
      schemaName: data.schemaName,
      creditsBalance: data.creditsBalance,
      adminEmail: data.adminEmail,
      adminPassword: data.adminPassword
    });
    return {
      id: org.id,
      name: org.name,
      schemaName: org.schema_name,
      status: org.status,
      creditsBalance: org.credits_balance,
      createdAt: org.created_at
    };
  });

  app.post('/orgs/:id/credits', { preHandler: app.authorize(['SUPER_ADMIN']) }, async (request, reply) => {
    const orgId = (request.params as any).id;
    const { amount } = (request.body as any) as { amount: number };
    if (typeof amount !== 'number') return reply.badRequest('amount required');
    const [org] = await db
      .updateTable('organizations')
      .set({ credits_balance: sql`credits_balance + ${amount}`, updated_at: new Date() })
      .where('id', '=', orgId)
      .returning(['id', 'name', 'credits_balance'])
      .execute();
    return { id: org.id, name: org.name, creditsBalance: org.credits_balance };
  });
}
