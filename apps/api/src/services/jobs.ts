import { Queue, QueueEvents } from 'bullmq';
import { env } from '../env';

export const transcriptionQueue = new Queue('transcription', {
  connection: { url: env.REDIS_URL }
});

export const scoringQueue = new Queue('scoring', {
  connection: { url: env.REDIS_URL }
});

export const queueEvents = new QueueEvents('transcription', { connection: { url: env.REDIS_URL } });

queueEvents.on('failed', ({ jobId, failedReason }) => {
  // eslint-disable-next-line no-console
  console.error('Job failed', jobId, failedReason);
});
