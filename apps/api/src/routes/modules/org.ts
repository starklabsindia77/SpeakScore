import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { createUserInviteSchema } from '@speakscore/shared';
import { prisma } from '../../db';

export async function orgRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/me', async (request) => {
    const user = await prisma.user.findUnique({ where: { id: request.user?.userId } });
    if (!user) return null;
    return { id: user.id, email: user.email, role: user.role, orgId: user.orgId };
  });

  app.get('/org/users', async (request) => {
    const orgId = request.user!.orgId;
    return prisma.user.findMany({ where: { orgId }, select: { id: true, email: true, role: true, createdAt: true } });
  });

  app.post('/org/users/invite', { preHandler: app.authorize(['ORG_ADMIN']) }, async (request, reply) => {
    const orgId = request.user!.orgId;
    const data = createUserInviteSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(2, 10), 10);
    const user = await prisma.user.create({ data: { orgId, email: data.email, passwordHash, role: data.role } });
    reply.code(201).send({ id: user.id, email: user.email, role: user.role });
  });
}
