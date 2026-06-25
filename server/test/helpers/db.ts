import { pool } from '../../db';

const TABLES = [
  'messages',
  'message_requests',
  'message_blocks',
  'message_reports',
  'parent_child_relations',
  'event_registrations',
  'saved_scholarships',
  'support_interactions',
  'events',
  'scholarships',
  'faqs',
  'combine_stats',
  'athlete_rankings',
  'payments',
  'parents',
  'coaches',
  'players',
  // event_inbox is the dedupe ledger for Stripe webhook idempotency; clear so
  // tests that replay the same event.id start from a known state.
  'event_inbox',
  'admin_users',
];

export async function resetDb() {
  await pool.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}
