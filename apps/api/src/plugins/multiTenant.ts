import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export default fp(async (app: FastifyInstance) => {
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/public')) return;
    const user = request.user as { orgId?: string } | undefined;
    if (!user?.orgId) {
      return reply.unauthorized('Missing org context');
    }
    request.headers['x-org-id'] = user.orgId;
  });
});
