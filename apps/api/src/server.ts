import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import jwtPlugin from './auth/jwt';
import multiTenantPlugin from './plugins/multiTenant';
import rbacPlugin from './plugins/rbac';
import { logger } from './logger';
import { publicRoutes } from './routes/modules/public';
import billingRoutes from './routes/modules/billing';
import { adminRoutes } from './routes/modules/admin';
import { registerRoutes } from './routes';

export async function buildServer() {
  const app = Fastify({
    logger: logger,
  });
  // Global Maintenance Mode Check
  app.addHook('onRequest', async (request, reply) => {
    // Skip for admin routes and auth (so admins can login and fix issues)
    if (request.url.startsWith('/api/admin') || request.url.startsWith('/api/auth') || request.url.startsWith('/documentation')) return;

    // Use a lightweight check or cache this if possible. Ideally, we read from Redis/Memory.
    // For MVP, we query DB but this might be heavy. Let's assume we can query DB.
    const { db } = await import('./db');
    const setting = await db.selectFrom('platform_settings').select('value').where('key', '=', 'maintenance_mode').executeTakeFirst();
    if (setting && (setting.value as any)?.enabled === true) {
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'Platform is currently under maintenance. Please try again later.',
        maintenance: true
      });
    }
  });

  // Admin IP Whitelist Check
  app.addHook('onRequest', async (request: any, reply: any) => {
    if (!request.url.startsWith('/api/admin')) return;

    const { db } = await import('./db');
    const setting = await db.selectFrom('platform_settings').select('value').where('key', '=', 'admin_security').executeTakeFirst();
    const config = setting?.value as any;

    if (config?.ipWhitelist?.enabled === true) {
      const clientIp = request.ip;
      const allowedIps = (config.ipWhitelist.ips as string[]) || [];

      // Simple exact match for now. Could add CIDR support later.
      if (!allowedIps.includes(clientIp) && clientIp !== '127.0.0.1') {
        request.log.warn({ clientIp, url: request.url }, 'Blocked by Admin IP Whitelist');
        return reply.status(403).send({ error: 'Access Denied', message: 'Your IP address is not authorized to access the admin panel.' });
      }
    }
  });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(multipart);
  await app.register(jwtPlugin);
  await app.register(rbacPlugin);
  await app.register(multiTenantPlugin);

  // Routes (after auth plugins are registered)
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(billingRoutes, { prefix: '/api/billing' });
  await app.register(publicRoutes, { prefix: '/api/public' });
  await registerRoutes(app);
  return app;
}

export type App = Awaited<ReturnType<typeof buildServer>>;
