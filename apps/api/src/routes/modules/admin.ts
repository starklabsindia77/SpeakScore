import { FastifyInstance } from 'fastify';
import { createOrgSchema } from '@speakscore/shared';
import { prisma } from '../../db';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/orgs', { preHandler: app.authorize(['SUPER_ADMIN']) }, async () => {
    return prisma.organization.findMany({ select: { id: true, name: true, creditsBalance: true, createdAt: true } });
  });

  app.post('/orgs', { preHandler: app.authorize(['SUPER_ADMIN']) }, async (request) => {
    const data = createOrgSchema.parse(request.body);
    return prisma.organization.create({ data });
  });

  app.post('/orgs/:id/credits', { preHandler: app.authorize(['SUPER_ADMIN']) }, async (request, reply) => {
    const orgId = (request.params as any).id;
    const { amount } = (request.body as any) as { amount: number };
    if (typeof amount !== 'number') return reply.badRequest('amount required');
    return prisma.organization.update({ where: { id: orgId }, data: { creditsBalance: { increment: amount } } });
  });
}
