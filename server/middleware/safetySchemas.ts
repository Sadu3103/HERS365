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
