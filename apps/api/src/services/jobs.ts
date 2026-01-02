import { Queue, QueueEvents } from 'bullmq';
import { env } from '../env';

export const transcriptionQueue = new Queue('transcription', {
  connection: env.REDIS_URL as any
});

export const scoringQueue = new Queue('scoring', {
  connection: env.REDIS_URL as any
});

export const queueEvents = new QueueEvents('transcription', { connection: env.REDIS_URL as any });

queueEvents.on('failed', ({ jobId, failedReason }) => {
  // eslint-disable-next-line no-console
  console.error('Job failed', jobId, failedReason);
});
