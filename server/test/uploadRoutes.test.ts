import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { resetDb } from './helpers/db';
import { createApp } from '../app';
import { makeAthlete, tokenFor } from './helpers/fixtures';
import { getSignedUploadUrl } from '../cloud-storage';

// cloud-storage talks to S3 to mint a presigned URL. We don't want a real AWS
// dependency in the test loop, and signing locally still requires a non-empty
// access key. Mocking the single export this route uses is the cleanest
// boundary — the test still exercises the real route handler, validator,
// auth middleware, key construction, and publicUrl logic. vi.mock is hoisted
// above the static imports above, so the route picks up the stubbed module.
vi.mock('../cloud-storage', () => ({
  getSignedUploadUrl: vi.fn(async (key: string, contentType: string, expiresIn: number) =>
    `https://signed.test.local/${key}?ct=${encodeURIComponent(contentType)}&exp=${expiresIn}`,
  ),
}));

const app = createApp();

beforeEach(async () => {
  await resetDb();
  vi.mocked(getSignedUploadUrl).mockClear();
});

describe('POST /api/upload/presign', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app)
      .post('/api/upload/presign')
      .send({ filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed token', async () => {
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', 'Bearer not-a-real-jwt')
      .send({ filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for an unsupported contentType (zod enum)', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ filename: 'photo.heic', contentType: 'image/heic' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a missing filename', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when size exceeds the 5MB image cap', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ filename: 'photo.jpg', contentType: 'image/jpeg', size: 6 * 1024 * 1024 });
    expect(res.status).toBe(400);
  });

  it('mints an upload URL and a publicUrl with the right key prefix and extension', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ filename: 'cute-pic.JPG', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.key).toMatch(/^profile-photos\/\d+-[a-z0-9]+\.jpg$/);
    expect(res.body.uploadUrl).toContain('https://signed.test.local/');
    expect(res.body.publicUrl).toContain(res.body.key);
    expect(vi.mocked(getSignedUploadUrl)).toHaveBeenCalledTimes(1);
    // 5-min TTL per the route source.
    expect(vi.mocked(getSignedUploadUrl).mock.calls[0][2]).toBe(300);
  });

  it('falls back to "jpg" when the parsed extension is empty after sanitization', async () => {
    const a = await makeAthlete();
    // ".!!!" → split('.').pop() = "!!!" → strip non-alnum = "" → falls back to "jpg".
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ filename: 'weird.!!!', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.key).toMatch(/\.jpg$/);
  });

  it('lowercases and slices the extension to 5 chars', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ filename: 'photo.JPEGEXTRA', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    // 'JPEGEXTRA' → 'jpegextra' → 'jpege' (5-char slice).
    expect(res.body.key).toMatch(/\.jpege$/);
  });
});

describe('POST /api/upload/video/presign', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app)
      .post('/api/upload/video/presign')
      .send({ filename: 'clip.mp4', contentType: 'video/mp4', size: 1024 });
    expect(res.status).toBe(401);
  });

  it('returns 400 for an unsupported video contentType (zod enum)', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/video/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ filename: 'clip.mkv', contentType: 'video/x-matroska', size: 1024 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when size is missing (size is required for video)', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/video/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ filename: 'clip.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when size exceeds the 500MB video cap', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/upload/video/presign')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ filename: 'clip.mp4', contentType: 'video/mp4', size: 600 * 1024 * 1024 });
    expect(res.status).toBe(400);
  });

  it('mints an upload URL and assigns the right extension for each supported type', async () => {
    const a = await makeAthlete();
    const cases: Array<[string, string]> = [
      ['video/mp4', 'mp4'],
      ['video/webm', 'webm'],
      ['video/quicktime', 'mov'],
    ];
    for (const [contentType, ext] of cases) {
      const res = await request(app)
        .post('/api/upload/video/presign')
        .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
        .send({ filename: `clip.${ext}`, contentType, size: 1024 });
      expect(res.status).toBe(200);
      expect(res.body.key).toMatch(new RegExp(`^videos/\\d+-[a-z0-9]+\\.${ext}$`));
      expect(res.body.uploadUrl).toContain('https://signed.test.local/');
      expect(res.body.publicUrl).toContain(res.body.key);
    }
  });
});
