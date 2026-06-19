
import express from 'express';
import { getSignedUploadUrl } from './cloud-storage';
import { requireAuth } from './auth';

const router = express.Router();
router.use(requireAuth);

// Images
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// photos up to 5MB
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/upload/presign
 * Body: { filename: string, contentType: string, size: number }
 * Returns: { uploadUrl: string, key: string, publicUrl: string }
 *
 * Client should PUT the file directly to uploadUrl, then save publicUrl to their profile.
 */
router.post('/presign', async (req, res) => {
  const { filename, contentType, size } = req.body || {};

  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType are required' });
  }
  if (!ALLOWED_TYPES.includes(contentType)) {
    return res.status(400).json({ error: 'Only JPEG, PNG, WebP, and GIF are allowed' });
  }
  if (size && size > MAX_SIZE) {
    return res.status(400).json({ error: 'File must be under 5MB' });
  }

  try {
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `profile-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadUrl = await getSignedUploadUrl(key, contentType, 300); // 5-min TTL

    const bucket = process.env.S3_BUCKET || 'hers365-media';
    const cloudfrontUrl = process.env.CLOUDFRONT_URL;
    const publicUrl = cloudfrontUrl
      ? `${cloudfrontUrl}/${key}`
      : `https://${bucket}.s3.amazonaws.com/${key}`;

    return res.json({ uploadUrl, key, publicUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

/**
 * POST /api/upload/video/presign
 * Body: { filename: string, contentType: string, size: number }
 * Returns: { uploadUrl: string, key: string, publicUrl: string }
 *
 * Client should PUT the file directly to uploadUrl, then save to highlight/video.
 */

// videos
const ALLOWED_TYPES_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];

// VIDEOS up to 500MB
const MAX_SIZE_VIDEO = 500 * 1024 * 1024; // 500MB

const VIDEO_EXTENSION_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

router.post('/video/presign', async (req, res) => {
  const { filename, contentType, size } = req.body || {};

  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType are required' });
  }

  if (!ALLOWED_TYPES_VIDEO.includes(contentType)) {
    return res.status(400).json({ error: 'Only mp4, WebM, and quicktime are allowed' });
  }

  if (typeof size !== 'number' || Number.isNaN(size)) {
    return res.status(400).json({ error: 'size is required and must be a number' });
  }

  if (size <= 0) {
    return res.status(400).json({ error: 'size must be greater than 0' });
  }
  
  if (size > MAX_SIZE_VIDEO) {
    return res.status(400).json({ error: 'Video file must be under 500MB' });
  }

  try {
    const ext = VIDEO_EXTENSION_BY_TYPE[contentType];
    if (!ext) {
      return res.status(400).json({ error: 'Unsupported video type' });
    }

    const key = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadUrl = await getSignedUploadUrl(key, contentType, 300); // 5-min TTL
    const bucket = process.env.S3_BUCKET || 'hers365-media';
    const cloudfrontUrl = process.env.CLOUDFRONT_URL;
    const publicUrl = cloudfrontUrl
      ? `${cloudfrontUrl}/${key}`
      : `https://${bucket}.s3.amazonaws.com/${key}`;

    return res.json({ uploadUrl, key, publicUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

export default router;
