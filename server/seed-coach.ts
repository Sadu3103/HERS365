// @ts-nocheck
// Seeds demo coach accounts for previewing the coach side. Idempotent.
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

const DEMO_COACHES = [
  {
    email: 'coach@hers365.com',
    password: 'hers365coach',
    name: 'Coach Maria Torres',
    university: 'University of Texas',
    division: 'NCAA D1',
    recruitingPositions: 'QB, DB',
    recruitingStates: 'TX, CA, FL',
    verifiedStatus: true,
  },
  {
    email: 'coach2@hers365.com',
    password: 'hers365coach',
    name: 'Coach Lisa Monroe',
    university: 'Florida State University',
    division: 'NCAA D1',
    recruitingPositions: 'WR, QB',
    recruitingStates: 'FL, GA, TX',
    verifiedStatus: true,
  },
  {
    email: 'coach3@hers365.com',
    password: 'hers365coach',
    name: 'Coach Angela Reed',
    university: 'Azusa Pacific University',
    division: 'NAIA',
    recruitingPositions: 'RB, LB',
    recruitingStates: 'CA, AZ',
    verifiedStatus: true,
  },
  {
    email: 'coach4@hers365.com',
    password: 'hers365coach',
    name: 'Coach Sandra Hill',
    university: 'Hardin-Simmons University',
    division: 'NCAA D3',
    recruitingPositions: 'QB',
    recruitingStates: 'TX',
    verifiedStatus: true,
  },
  {
    email: 'coach5@hers365.com',
    password: 'hers365coach',
    name: 'Coach Tiffany Brooks',
    university: 'Shorter University',
    division: 'NCAA D2',
    recruitingPositions: 'DB, LB, WR',
    recruitingStates: 'GA, TN, AL',
    verifiedStatus: true,
  },
  {
    email: 'coach6@hers365.com',
    password: 'hers365coach',
    name: 'Coach Denise Carr',
    university: 'Lindenwood University',
    division: 'NCAA D1',
    recruitingPositions: 'QB, WR, DB',
    recruitingStates: 'MO, IL, KS',
    verifiedStatus: true,
  },
  {
    email: 'coach7@hers365.com',
    password: 'hers365coach',
    name: 'Coach Patricia Vega',
    university: 'Benedictine College',
    division: 'NAIA',
    recruitingPositions: 'RB',
    recruitingStates: 'KS',
    verifiedStatus: true,
  },
];

async function run() {
  const passwordHash = await bcrypt.hash('hers365coach', 12);

  for (const coach of DEMO_COACHES) {
    const vals = {
      email: coach.email,
      passwordHash,
      name: coach.name,
      university: coach.university,
      division: coach.division,
      recruitingPositions: coach.recruitingPositions,
      recruitingStates: coach.recruitingStates,
      verifiedStatus: coach.verifiedStatus,
    };

    const [existing] = await db
      .select({ id: schema.coaches.id })
      .from(schema.coaches)
      .where(eq(schema.coaches.email, coach.email))
      .limit(1);

    if (existing) {
      await db.update(schema.coaches).set(vals).where(eq(schema.coaches.id, existing.id));
      console.log(`✅ Updated ${coach.name} (id ${existing.id})`);
    } else {
      const [row] = await db.insert(schema.coaches).values(vals).returning({ id: schema.coaches.id });
      console.log(`✅ Created ${coach.name} (id ${row.id})`);
    }
    console.log(`   login: ${coach.email} / hers365coach`);
  }

  process.exit(0);
}

run().catch((e) => { console.error('Coach seed failed:', e); process.exit(1); });
