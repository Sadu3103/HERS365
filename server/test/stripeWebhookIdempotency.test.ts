import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import {
  claimStripeEvent,
  markStripeEventProcessed,
} from '../lib/webhookDedupe';

// Stripe delivers webhooks at-least-once. The handler must be idempotent on
// event.id so a retry doesn't double-credit subscriptions or double-record
// payments. The webhook route now wraps the per-event-type processor with a
// dedupe gate backed by event_inbox.event_id (unique). These tests prove:
//   1. The gate reports duplicate=true on the second delivery of the same
//      event.id, so the processor body never runs twice.
//   2. A processor mocked as a single counter records exactly one invocation
//      across two deliveries — i.e. the side effect happens once.
//   3. Distinct event ids still run through.

beforeEach(async () => {
  await resetDb();
});

function makeEvent(id: string, type = 'checkout.session.completed'): Stripe.Event {
  return {
    id,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type,
    data: {
      object: {
        id: `obj_${id}`,
        object: 'checkout.session',
      } as unknown as Stripe.Checkout.Session,
    },
  } as Stripe.Event;
}

// Mirrors the order of operations in paymentRoutes.ts's webhook handler:
// claim → run processor → mark processed. Lets us substitute the processor
// for a counter so the test doesn't depend on side-effects of the live
// subscription/payment branches (which have unrelated pre-existing issues).
async function deliver(event: Stripe.Event, processor: (e: Stripe.Event) => Promise<void>) {
  const { duplicate } = await claimStripeEvent(event);
  if (duplicate) return { duplicate: true };
  await processor(event);
  await markStripeEventProcessed(event.id);
  return { duplicate: false };
}

describe('Stripe webhook idempotency', () => {
  it('runs the processor exactly once across two deliveries of the same event.id', async () => {
    const processor = vi.fn().mockResolvedValue(undefined);
    const event = makeEvent('evt_test_dedupe_001');

    const r1 = await deliver(event, processor);
    const r2 = await deliver(event, processor);

    expect(r1.duplicate).toBe(false);
    expect(r2.duplicate).toBe(true);
    expect(processor).toHaveBeenCalledTimes(1);

    const rows = await db
      .select()
      .from(schema.eventInbox)
      .where(eq(schema.eventInbox.eventId, event.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].processed).toBe(true);
    expect(rows[0].processedAt).toBeTruthy();
    expect(rows[0].eventType).toBe('checkout.session.completed');
  });

  it('runs the processor for each distinct event.id', async () => {
    const processor = vi.fn().mockResolvedValue(undefined);

    const r1 = await deliver(makeEvent('evt_alpha'), processor);
    const r2 = await deliver(makeEvent('evt_beta'), processor);

    expect(r1.duplicate).toBe(false);
    expect(r2.duplicate).toBe(false);
    expect(processor).toHaveBeenCalledTimes(2);

    const rows = await db.select().from(schema.eventInbox);
    expect(rows).toHaveLength(2);
  });

  it('claimStripeEvent: second claim returns duplicate=true and does not create a second row', async () => {
    const evt = {
      id: 'evt_unit_001',
      type: 'customer.subscription.deleted',
      livemode: false,
      data: { object: { id: 'sub_unit_001' } },
    } as unknown as Stripe.Event;

    const first = await claimStripeEvent(evt);
    const second = await claimStripeEvent(evt);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);

    const rows = await db
      .select()
      .from(schema.eventInbox)
      .where(eq(schema.eventInbox.eventId, evt.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe('customer.subscription.deleted');
    expect(rows[0].aggregateId).toBe('sub_unit_001');
  });

  it('dedupe is keyed on event.id only — same payload with a new event.id is not a duplicate', async () => {
    const processor = vi.fn().mockResolvedValue(undefined);
    // Same underlying object, different stripe event id (e.g. Stripe replays
    // the same checkout under a new event id — should still be processed).
    const e1 = makeEvent('evt_id_one');
    const e2 = makeEvent('evt_id_two');

    await deliver(e1, processor);
    await deliver(e2, processor);

    expect(processor).toHaveBeenCalledTimes(2);
  });
});
