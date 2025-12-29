import { env } from './env';
import { logger } from './logger';
import { buildServer } from './server';

buildServer()
  .then((app) => app.listen({ port: Number(env.PORT), host: '0.0.0.0' }))
  .catch((err) => {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  });
