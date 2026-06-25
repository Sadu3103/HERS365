import type Stripe from 'stripe';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { logger } from '../logger';

// Persistent dedupe gate for Stripe webhooks. Stripe delivers at-least-once;
// retries can replay the same event.id within minutes of the original delivery.
// We use the existing event_inbox table (inbox pattern, unique event_id) as the
// dedupe ledger so we don't need a new migration. Each Stripe event.id is
// claimed via INSERT ... ON CONFLICT DO NOTHING: the first writer wins and
// gets to run the handler, every retry sees the row already exists and short
// circuits with a 200.

export type DedupeResult = { duplicate: boolean };

export async function claimStripeEvent(event: Stripe.Event): Promise<DedupeResult> {
  // Stripe events look like { id: 'evt_...', type: '...', data: { object: { id: '...' } } }.
  // aggregateId is best-effort: the underlying object id when available, else the event id.
  const obj = (event.data as { object?: { id?: string } } | undefined)?.object;
  const aggregateId = obj?.id ?? event.id;

  const inserted = await db
    .insert(schema.eventInbox)
    .values({
      eventId: event.id,
      eventType: event.type,
      aggregateId,
      payload: JSON.stringify(event),
      metadata: JSON.stringify({ source: 'stripe', livemode: event.livemode }),
    })
    .onConflictDoNothing({ target: schema.eventInbox.eventId })
    .returning({ id: schema.eventInbox.id });

  if (inserted.length === 0) {
    logger.info('[stripe-webhook] duplicate event ignored', {
      eventId: event.id,
      eventType: event.type,
    });
    return { duplicate: true };
  }
  return { duplicate: false };
}

export async function markStripeEventProcessed(eventId: string): Promise<void> {
  await db
    .update(schema.eventInbox)
    .set({ processed: true, processedAt: new Date().toISOString() })
    .where(eq(schema.eventInbox.eventId, eventId));
}

export async function recordStripeEventError(eventId: string, errorMessage: string): Promise<void> {
  await db
    .update(schema.eventInbox)
    .set({
      errorMessage,
      retryCount: sql`coalesce(${schema.eventInbox.retryCount}, 0) + 1`,
    })
    .where(eq(schema.eventInbox.eventId, eventId));
}
