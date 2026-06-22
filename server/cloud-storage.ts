// Cloud storage service for media (profile photos + game film video).
// Supports: AWS S3, Cloudflare R2, or any S3-compatible storage.
//
// [D-08] Game film (100–500MB) is kept in a SEPARATE bucket from profile photos
// with its own CDN distribution, longer presign TTL, immutable cache headers,
// and a hard size cap. See docs/VIDEO-STORAGE.md for buckets, CDN, costs, and
// lifecycle rules.

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Profile photos / general media.
const photoBucket = process.env.S3_BUCKET || 'hers365-media';
const cloudfrontUrl = process.env.CLOUDFRONT_URL || '';

// [D-08] Game film lives in its own bucket + CDN. Both fall back to the photo
// bucket/CDN if unset so local dev still works without extra config.
const videoBucket = process.env.VIDEO_BUCKET || photoBucket;
const videoCdnUrl = process.env.VIDEO_CDN_URL || cloudfrontUrl;

// [D-08] Cap game-film uploads (default 500MB) and give signed PUT URLs a long
// TTL so a large upload can't expire mid-transfer (1h is far too short for
// 100–500MB over a home connection).
export const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_BYTES) || 500 * 1024 * 1024;
const VIDEO_UPLOAD_TTL = Number(process.env.VIDEO_UPLOAD_TTL_SECONDS) || 6 * 60 * 60; // 6h

// Object keys are timestamped and never overwritten, so they can be cached
// forever at the CDN edge. CloudFront honors this Cache-Control on origin pulls.
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

export interface UploadResult {
  url: string;
  key: string;
}

function publicUrl(cdn: string, bucket: string, key: string): string {
  return cdn ? `${cdn}/${key}` : `https://${bucket}.s3.amazonaws.com/${key}`;
}

export async function uploadVideo(file: Buffer, filename: string, contentType: string): Promise<UploadResult> {
  // [D-08] Enforce the size cap server-side regardless of any client check.
  if (file.length > MAX_VIDEO_BYTES) {
    throw new Error(`Video exceeds the ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB limit`);
  }

  const key = `videos/${Date.now()}-${filename}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: videoBucket,
    Key: key,
    Body: file,
    ContentType: contentType,
    CacheControl: IMMUTABLE_CACHE,
  }));

  return { url: publicUrl(videoCdnUrl, videoBucket, key), key };
}

export async function uploadImage(file: Buffer, filename: string, contentType: string): Promise<UploadResult> {
  const key = `images/${Date.now()}-${filename}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: photoBucket,
    Key: key,
    Body: file,
    ContentType: contentType,
    CacheControl: IMMUTABLE_CACHE,
  }));

  return { url: publicUrl(cloudfrontUrl, photoBucket, key), key };
}

// [D-08] Browser-direct upload for game film: returns a presigned PUT URL on the
// VIDEO bucket with a long TTL. Lets large files go straight to S3 without
// streaming through the API server. Use the returned `key` to build the CDN URL
// after upload via videoPublicUrl().
export async function getSignedVideoUploadUrl(
  filename: string,
  contentType: string,
  expiresIn = VIDEO_UPLOAD_TTL,
): Promise<{ uploadUrl: string; key: string; publicUrl: string; maxBytes: number }> {
  const key = `videos/${Date.now()}-${filename}`;
  const command = new PutObjectCommand({
    Bucket: videoBucket,
    Key: key,
    ContentType: contentType,
    CacheControl: IMMUTABLE_CACHE,
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return { uploadUrl, key, publicUrl: publicUrl(videoCdnUrl, videoBucket, key), maxBytes: MAX_VIDEO_BYTES };
}

export function videoPublicUrl(key: string): string {
  return publicUrl(videoCdnUrl, videoBucket, key);
}

export async function getSignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: photoBucket,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  // Default to the photo bucket; pass a videos/ key for film and it resolves
  // against the video bucket instead.
  const isVideo = key.startsWith('videos/');
  const command = new GetObjectCommand({
    Bucket: isVideo ? videoBucket : photoBucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}
