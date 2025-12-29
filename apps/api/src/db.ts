import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ]
});

prisma.$on('error', (e) => logger.error({ msg: 'Prisma error', error: e }));
prisma.$on('warn', (e) => logger.warn({ msg: 'Prisma warn', error: e }));
