import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../env';

export interface AuthPayload {
  userId: string;
  orgId: string;
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'RECRUITER';
}

export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '30m' }
  });

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify<AuthPayload>();
    } catch (err) {
      reply.send(err);
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }

  interface FastifyRequest {
    user?: AuthPayload;
  }
}
