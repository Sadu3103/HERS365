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
  'admin_users',
];

export async function resetDb() {
  await pool.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}
