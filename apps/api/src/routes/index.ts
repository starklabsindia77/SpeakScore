import { FastifyInstance } from 'fastify';
import { authRoutes } from './modules/auth';
import { orgRoutes } from './modules/org';
import { testRoutes } from './modules/tests';
import { publicRoutes } from './modules/public';
import { candidateRoutes } from './modules/candidates';
import { adminRoutes } from './modules/admin';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(orgRoutes, { prefix: '/api' });
  await app.register(testRoutes, { prefix: '/api' });
  await app.register(candidateRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(publicRoutes, { prefix: '/public' });
}
