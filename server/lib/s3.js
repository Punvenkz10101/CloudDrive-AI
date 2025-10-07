import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export function getS3Client() {
  const region = process.env.AWS_REGION || 'ap-south-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) throw new Error('AWS credentials not configured');
  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

export async function ensureBucket(_bucket) {
  // Assume bucket exists; creation usually managed outside app.
  return true;
}

export async function uploadBuffer(bucket, key, buffer, contentType) {
  const s3 = getS3Client();
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
}

export async function listFiles(bucket, prefix = '') {
  const s3 = getS3Client();
  const data = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
  return (data.Contents || []).filter((o) => o.Key && !o.Key.endsWith('/'));
}

export async function deleteFile(bucket, key) {
  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function presignUrl(bucket, key, expiresIn = 1800) {
  const s3 = getS3Client();
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await getSignedUrl(s3, cmd, { expiresIn });
}


