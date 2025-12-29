import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import { env } from './env';
import jwtPlugin from './auth/jwt';
import multiTenantPlugin from './plugins/multiTenant';
import rbacPlugin from './plugins/rbac';
import { logger } from './logger';
import { registerRoutes } from './routes';

async function buildServer() {
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

buildServer()
  .then((app) => app.listen({ port: Number(env.PORT), host: '0.0.0.0' }))
  .catch((err) => {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  });

export type App = Awaited<ReturnType<typeof buildServer>>;
