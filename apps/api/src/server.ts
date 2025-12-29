import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import jwtPlugin from './auth/jwt';
import multiTenantPlugin from './plugins/multiTenant';
import rbacPlugin from './plugins/rbac';
import { logger } from './logger';
import { registerRoutes } from './routes';

export async function buildServer() {
  const app = Fastify({ logger });
  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(multipart);
  await app.register(jwtPlugin);
  await app.register(rbacPlugin);
  await app.register(multiTenantPlugin);
  await registerRoutes(app);
  return app;
}

export type App = Awaited<ReturnType<typeof buildServer>>;
