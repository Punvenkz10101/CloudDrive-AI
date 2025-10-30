import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Note: dotenv is loaded in index.js before this module is imported, so env vars should be available

export function getS3Client() {
  // Force reload .env if credentials missing (last resort)
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    const envPaths = [
      path.join(__dirname, '..', '.env'),
      path.join(__dirname, '..', '..', '.env'),
      path.join(process.cwd(), '.env')
    ];
    
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        // Try dotenv first
        dotenv.config({ path: envPath, override: true });
        
        // ALSO manually parse and set (bypasses dotenv issues)
        try {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          const lines = envContent.split(/\r?\n/);
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            const match = trimmed.match(/^([^=]+)=(.*)$/);
            if (match) {
              const key = match[1].trim();
              let value = match[2].trim();
              // Remove quotes
              if ((value.startsWith('"') && value.endsWith('"')) || 
                  (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
              }
              process.env[key] = value;
            }
          }
          console.log(`[S3] Reloaded and manually parsed .env from: ${envPath}`);
        } catch (e) {
          console.warn(`[S3] Error manually parsing .env:`, e.message);
        }
        break;
      }
    }
  }
  
  const region = process.env.AWS_REGION || 'ap-south-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  // Better error message with debugging info
  if (!accessKeyId || !secretAccessKey) {
    console.error('[S3] AWS Credentials Check FAILED:');
    console.error(`[S3] AWS_ACCESS_KEY_ID: ${accessKeyId ? '✓ Set' : '✗ Missing'}`);
    console.error(`[S3] AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? '✓ Set' : '✗ Missing'}`);
    console.error(`[S3] AWS_REGION: ${region}`);
    console.error('[S3] Working directory:', process.cwd());
    console.error('[S3] __dirname:', __dirname);
    console.error('[S3] All AWS env vars:', Object.keys(process.env).filter(k => k.startsWith('AWS')));
    throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  }
  
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


