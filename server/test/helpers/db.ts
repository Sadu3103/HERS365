import { pool } from '../../db';

const TABLES = [
  'messages',
  'message_requests',
  'message_blocks',
  'message_reports',
  'parent_child_relations',
  'parents',
  'coaches',
  'players',
];

export async function resetDb() {
  await pool.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}
