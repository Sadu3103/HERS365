
// Seeds a demo coach account for previewing the coach side. Idempotent.
// Loads .env (same as the server) so DATABASE_URL resolves when run standalone.
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

const COACH = {
  email: 'coach@hers365.com',
  password: 'hers365coach',
  name: 'Coach Sarah Williams',
  university: 'UCLA',
  division: 'NCAA D1',
  recruitingPositions: 'QB, WR, Safety',
  recruitingStates: 'CA, TX, FL',
  verifiedStatus: true,
};

async function run() {
  const passwordHash = await bcrypt.hash(COACH.password, 12);
  const vals = {
    email: COACH.email, passwordHash, name: COACH.name,
    university: COACH.university, division: COACH.division,
    recruitingPositions: COACH.recruitingPositions, recruitingStates: COACH.recruitingStates,
    verifiedStatus: COACH.verifiedStatus,
  };
  const [existing] = await db.select().from(schema.coaches).where(eq(schema.coaches.email, COACH.email)).limit(1);
  if (existing) {
    await db.update(schema.coaches).set(vals).where(eq(schema.coaches.id, existing.id));
    console.log(`✅ Updated demo coach (id ${existing.id})`);
  } else {
    const [row] = await db.insert(schema.coaches).values(vals).returning({ id: schema.coaches.id });
    console.log(`✅ Created demo coach (id ${row.id})`);
  }
  console.log(`   login: ${COACH.email} / ${COACH.password}`);
  process.exit(0);
}

run().catch((e) => { console.error('Coach seed failed:', e); process.exit(1); });
