// @ts-nocheck
// Seed 6 girls flag football leagues into the leagues table.
// Idempotent: inserts only if the league name doesn't already exist.
// Run: DATABASE_URL=... npx tsx server/seed-leagues.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

const LEAGUES = [
  {
    name: 'LA Girls Flag Football League',
    city: 'Los Angeles',
    state: 'CA',
    format: 'Flag',
    ageGroups: 'U14/U16/U18',
    season: 'Fall',
    website: null,
    registrationOpen: true,
  },
  {
    name: 'Texas 7v7 Youth Alliance',
    city: 'Dallas',
    state: 'TX',
    format: '7v7',
    ageGroups: 'U16/U18',
    season: 'Spring',
    website: null,
    registrationOpen: true,
  },
  {
    name: 'SoCal Elite Flag',
    city: 'San Diego',
    state: 'CA',
    format: 'Combined',
    ageGroups: 'U14/U16/U18',
    season: 'Year-round',
    website: null,
    registrationOpen: true,
  },
  {
    name: 'Florida Flag Football Circuit',
    city: 'Miami',
    state: 'FL',
    format: 'Flag',
    ageGroups: 'U14/U16',
    season: 'Fall',
    website: null,
    registrationOpen: false,
  },
  {
    name: 'Bay Area Girls Gridiron',
    city: 'San Francisco',
    state: 'CA',
    format: 'Flag',
    ageGroups: 'U16/U18',
    season: 'Spring',
    website: null,
    registrationOpen: true,
  },
  {
    name: 'Arizona Rising Stars League',
    city: 'Phoenix',
    state: 'AZ',
    format: '7v7',
    ageGroups: 'U14/U16/U18',
    season: 'Year-round',
    website: null,
    registrationOpen: true,
  },
];

async function run() {
  console.log('Seeding leagues...');
  let inserted = 0;
  let skipped = 0;

  for (const league of LEAGUES) {
    const existing = await db
      .select({ id: schema.leagues.id })
      .from(schema.leagues)
      .where(eq(schema.leagues.name, league.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  skipped: ${league.name}`);
      skipped++;
      continue;
    }

    await db.insert(schema.leagues).values(league);
    console.log(`  inserted: ${league.name}`);
    inserted++;
  }

  console.log(`Done. ${inserted} inserted, ${skipped} skipped.`);
  process.exit(0);
}

run().catch((e) => { console.error('Seed failed:', e); process.exit(1); });
