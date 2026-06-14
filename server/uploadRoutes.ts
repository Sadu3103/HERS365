// @ts-nocheck
import express from 'express';
import { getSignedUploadUrl } from './cloud-storage';
import { requireAuth } from './auth';

const router = express.Router();
router.use(requireAuth);

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
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

export default router;
