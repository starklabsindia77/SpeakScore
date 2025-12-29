import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'RECRUITER';

function authorize(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { role?: Role } | undefined;
    if (!user?.role || !roles.includes(user.role)) {
      return reply.forbidden('Insufficient role');
    }
  };
}

export default fp(async (app: FastifyInstance) => {
  app.decorate('authorize', authorize);
});

declare module 'fastify' {
  interface FastifyInstance {
    authorize: typeof authorize;
  }
}
