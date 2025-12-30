import { env } from './env';
import { logger } from './logger';
import { buildServer } from './server';
import { initDatabase } from './db/init';

async function start() {
  try {
    await initDatabase();
    const app = await buildServer();
    await app.listen({ port: Number(env.PORT), host: '0.0.0.0' });
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
