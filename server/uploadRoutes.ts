import express, { NextFunction, Request, Response } from 'express';
import { getSignedUploadUrl } from './cloud-storage';
import { requireAuth } from './auth';
import { validateBody } from './middleware/validate';
import { uploadImagePresignBody, uploadVideoPresignBody } from './middleware/safetySchemas';

const router = express.Router();
router.use(requireAuth);

const VIDEO_EXTENSION_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

function publicUrlFor(key: string): string {
  const bucket = process.env.S3_BUCKET || 'hers365-media';
  const cloudfrontUrl = process.env.CLOUDFRONT_URL;
  return cloudfrontUrl ? `${cloudfrontUrl}/${key}` : `https://${bucket}.s3.amazonaws.com/${key}`;
}

/**
 * POST /api/upload/presign
 * Body: { filename, contentType, size? }
 * Returns: { uploadUrl, key, publicUrl }
 *
 * Client PUTs the file directly to uploadUrl, then saves publicUrl on their row.
 */
router.post('/presign', validateBody(uploadImagePresignBody), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, contentType } = req.body as { filename: string; contentType: string };
    // Strip path separators defensively even though the key is anchored to a
    // server-generated prefix — keeps the extension parse from picking up a
    // surprise from a crafted filename.
    const safeExt = (filename.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
    const key = `profile-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
    const uploadUrl = await getSignedUploadUrl(key, contentType, 300); // 5-min TTL
    res.json({ uploadUrl, key, publicUrl: publicUrlFor(key) });
  } catch (err) {
    next(err);
  }
});

router.post('/video/presign', validateBody(uploadVideoPresignBody), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contentType } = req.body as { contentType: string };
    const ext = VIDEO_EXTENSION_BY_TYPE[contentType];
    if (!ext) {
      // Zod's enum on contentType should have caught this; defence in depth.
      return res.status(400).json({ error: 'Unsupported video type' });
    }
    const key = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadUrl = await getSignedUploadUrl(key, contentType, 300); // 5-min TTL
    res.json({ uploadUrl, key, publicUrl: publicUrlFor(key) });
  } catch (err) {
    next(err);
  }
});

export default router;
