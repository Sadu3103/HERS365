# Video Storage & CDN (D-08)

Game film (highlight reels, full-game uploads) is large — typically **100–500MB**
per file — and needs a different storage/CDN strategy than profile photos.

## Buckets

| Purpose | Env var | Default | Notes |
|---|---|---|---|
| Profile photos / general media | `S3_BUCKET` | `hers365-media` | Small objects, frequent reads |
| Game film (video) | `VIDEO_BUCKET` | falls back to `S3_BUCKET` | Large objects; **provision a dedicated bucket in prod** |

Keep film in its own bucket so its lifecycle rules, CORS, and CDN behavior can be
tuned independently of photos, and so a film-bucket misconfig can't affect avatars.

## CDN (CloudFront or equivalent)

| Purpose | Env var | Default |
|---|---|---|
| Photo CDN | `CLOUDFRONT_URL` | none (falls back to direct S3 URL) |
| Video CDN | `VIDEO_CDN_URL` | falls back to `CLOUDFRONT_URL` |

- Point a CloudFront distribution at `VIDEO_BUCKET` (origin access control / OAC,
  bucket not public).
- Object keys are **timestamped and never overwritten**, so uploads are written
  with `Cache-Control: public, max-age=31536000, immutable`. CloudFront caches
  them at the edge indefinitely — cheap egress, no invalidations needed.
- Enable range requests (default on CloudFront) so players can seek without
  downloading the whole file.

## Upload paths

- **Server-proxied** (`uploadVideo`): enforces the size cap, streams through the
  API. Fine for small clips; avoid for 100–500MB.
- **Browser-direct** (`getSignedVideoUploadUrl`): returns a presigned `PUT` URL on
  the video bucket with a **6h TTL** (`VIDEO_UPLOAD_TTL_SECONDS`) so large uploads
  don't expire mid-transfer. Preferred for game film — bytes go straight to S3,
  not through our server.

## Limits

- `MAX_VIDEO_BYTES` (default **500MB**) is enforced server-side in `uploadVideo`
  and surfaced to the client via `getSignedVideoUploadUrl().maxBytes`.

## Cost & lifecycle (prod)

- **Storage:** S3 Standard ≈ $0.023/GB-mo. Estimate: 5,000 athletes × ~3 films ×
  ~250MB ≈ 3.75TB ≈ **~$85/mo** at launch scale; grows linearly.
- **Egress:** served via CloudFront (cheaper than S3 direct, ~$0.085/GB first
  tier). Immutable caching keeps origin pulls minimal.
- **Lifecycle rules (recommended):**
  - Transition film not viewed in **90 days** → S3 Standard-IA (~45% cheaper).
  - Transition to **Glacier Instant Retrieval** after **1 year** for archival.
  - Abort incomplete multipart uploads after **7 days** (avoids paying for
    orphaned parts from failed large uploads).
  - Optionally expire film for deleted/closed accounts after the compliance
    retention window (see COMPLIANCE_README).

> Status: code paths (separate bucket, signed video upload URL, cache headers,
> size cap) are implemented. The actual bucket + CloudFront distribution must be
> **provisioned in AWS**, after which QA verifies upload → playback end-to-end.
