import { z } from 'zod';

// Centralized schemas for the parent-gate / minor-safety surfaces. These run
// in front of route handlers via validateBody/validateParams so unsafe input
// can never reach the gate check or the database write.

// ─── Shared primitives ───────────────────────────────────────────────────────

// Accept both string and number ids in URL params (Express gives strings,
// but some callers pre-serialize). Coerces to a positive integer.
export const positiveIdParam = z.coerce.number().int().positive();

// Partner ids in message bodies — same rule.
const partnerId = z.coerce.number().int().positive();

// Free-form content with a hard ceiling. The DB columns are TEXT, but
// unbounded payloads are a denial-of-service surface and the UI never asks
// for more than a long-form note.
const messageContent = z.string().trim().min(1).max(4000);
const reportDetails = z.string().trim().max(2000).optional();

// ─── Messaging routes ────────────────────────────────────────────────────────

export const sendMessageBody = z.object({
  partnerId,
  content: messageContent,
});

export const messageRespondBody = z.object({
  action: z.enum(['approve', 'reject']),
});

export const idParam = z.object({ id: positiveIdParam });

export const blockBody = z.object({ partnerId });

// Match the existing REPORT_REASONS list in messages.ts; keeping it here too
// gives a 400 before the handler instead of a generic 500.
export const reportBody = z.object({
  partnerId,
  reason: z.enum([
    'inappropriate',
    'harassment',
    'spam',
    'safety_concern',
    'impersonation',
    'other',
  ]),
  details: reportDetails,
});

// ─── Coach direct-message route ──────────────────────────────────────────────

export const coachMessageBody = z.object({
  message: messageContent,
});

export const coachMessageParams = z.object({ playerId: positiveIdParam });

// ─── Parent routes ───────────────────────────────────────────────────────────

export const parentRespondBody = z.object({
  action: z.enum(['approve', 'reject']),
});

// Preferences are merged into the parent's persisted JSON. Restrict to a
// plain object so an array or scalar can't overwrite the column.
export const parentSettingsBody = z.record(z.string(), z.unknown());

export const parentInviteBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  relationship: z.string().trim().min(1).max(64).optional(),
});

// ─── Token / NIL routes ──────────────────────────────────────────────────────
// NOTE: these handlers currently sit behind `requireAuth` only — any logged-in
// user can mint or redeem points for any playerId. That is a separate authz
// bug. These schemas at least make sure malformed input can't reach the DB
// write or trip a 500.

const tokenActivityType = z.string().trim().min(1).max(64);
const points = z.coerce.number().int().positive().max(1_000_000);

export const tokenEarnBody = z.object({
  playerId: positiveIdParam,
  points,
  activityType: tokenActivityType,
  description: z.string().trim().max(500).optional(),
});

export const tokenXpEarnBody = z.object({
  playerId: positiveIdParam,
  points,
  activityType: tokenActivityType,
});

export const tokenRedeemBody = z.object({
  playerId: positiveIdParam,
  cost: points,
  rewardType: z.string().trim().min(1).max(64),
  rewardId: z.union([z.coerce.number().int().positive(), z.string().trim().min(1).max(128)]).optional(),
});

// ─── Athlete profile / stats ────────────────────────────────────────────────

const optionalString = (max: number) => z.string().trim().max(max).optional().nullable();
const optionalInt = z.coerce.number().int().optional().nullable();

export const userProfilePutBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  position: optionalString(64),
  age: optionalInt,
  state: optionalString(64),
  city: optionalString(120),
  zipCode: optionalString(16),
  school: optionalString(200),
  gradYear: optionalInt,
  gpa: optionalString(8),
  sport: optionalString(32),
  achievements: optionalString(4000),
  archetype: optionalString(64),
  privacySetting: z.enum(['public', 'private', 'parent_only']).optional(),
  bio: optionalString(2000),
}).refine((b) => Object.keys(b).length > 0, { message: 'At least one updatable field is required' });

export const userStatsPostBody = z.object({
  season: optionalString(16),
  fortyDash: optionalString(16),
  shuttle: optionalString(16),
  vertical: optionalString(16),
  broadJump: optionalString(16),
  threeCone: optionalString(16),
});

// ─── Upload presign routes ──────────────────────────────────────────────────

const filename = z.string().trim().min(1).max(255);
const positiveBytes = z.coerce.number().int().positive();

export const uploadImagePresignBody = z.object({
  filename,
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  size: positiveBytes.max(5 * 1024 * 1024).optional(), // 5MB cap
});

export const uploadVideoPresignBody = z.object({
  filename,
  contentType: z.enum(['video/mp4', 'video/webm', 'video/quicktime']),
  size: positiveBytes.max(500 * 1024 * 1024), // 500MB cap, required
});
