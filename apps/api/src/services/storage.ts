import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env';

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: Boolean(env.S3_ENDPOINT),
  credentials: env.S3_ACCESS_KEY && env.S3_SECRET_KEY ? { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY } : undefined
});

export async function checkS3Health() {
  const start = Date.now();
  try {
    const command = new ListObjectsV2Command({
      Bucket: env.S3_BUCKET,
      MaxKeys: 1
    });
    await s3.send(command);
    return { status: 'connected', latency: Date.now() - start };
  } catch (err: any) {
    return { status: 'error', latency: Date.now() - start, error: err.message };
  }
}

export async function createSignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 15 * 60 });
  return url;
}

export async function createSignedReadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 10 * 60 });
  return url;
}
