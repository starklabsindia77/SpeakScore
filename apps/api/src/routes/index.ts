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
import billingRoutes from './modules/billing';
import { brandingRoutes } from './modules/branding';
import { integrationsRoutes } from './modules/integrations';

export async function registerRoutes(app: any) {
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(orgRoutes, { prefix: '/api' });
  await app.register(testRoutes, { prefix: '/api' });
  await app.register(candidateRoutes, { prefix: '/api' });
  await app.register(batchRoutes, { prefix: '/api' });
  await app.register(templateRoutes, { prefix: '/api' });
  await app.register(notificationRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(billingRoutes, { prefix: '/api/billing' });
  await app.register(brandingRoutes, { prefix: '/api' });
  await app.register(integrationsRoutes, { prefix: '/api' });
  await app.register(publicRoutes, { prefix: '/api/public' });
}
