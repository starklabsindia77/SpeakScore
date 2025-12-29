import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@speakscore/shared';
import { prisma } from '../../db';

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', { schema: { body: loginSchema } }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return reply.unauthorized('Invalid credentials');
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return reply.unauthorized('Invalid credentials');

    const token = app.jwt.sign({ userId: user.id, orgId: user.orgId, role: user.role });
    return { accessToken: token, user: { id: user.id, orgId: user.orgId, role: user.role, email: user.email } };
  });

  app.post('/logout', async (_request, reply) => {
    return reply.code(200).send({ message: 'logged out' });
  });
}
