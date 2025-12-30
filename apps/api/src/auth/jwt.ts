import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../env';

export interface AuthPayload {
  userId: string;
  orgId?: string;
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'RECRUITER';
}

export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '30m' }
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify<AuthPayload>();
    } catch (err) {
      reply.send(err);
    }
  });
});

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthPayload;
    user: AuthPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }
}
