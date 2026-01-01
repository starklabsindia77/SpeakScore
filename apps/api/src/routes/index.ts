import { FastifyInstance } from 'fastify';
import { authRoutes } from './modules/auth';
import { orgRoutes } from './modules/org';
import { testRoutes } from './modules/tests';
import { publicRoutes } from './modules/public';
import { candidateRoutes } from './modules/candidates';
import { adminRoutes } from './modules/admin';
import { batchRoutes } from './modules/batches';
import { templateRoutes } from './modules/templates';
import { notificationRoutes } from './modules/notifications';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(orgRoutes, { prefix: '/api' });
  await app.register(testRoutes, { prefix: '/api' });
  await app.register(candidateRoutes, { prefix: '/api' });
  await app.register(batchRoutes, { prefix: '/api' });
  await app.register(templateRoutes, { prefix: '/api' });
  await app.register(notificationRoutes, { prefix: '/api' });
}
