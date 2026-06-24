// @ts-nocheck
// Seed 6 realistic girls flag football events with future 2026 dates.
// Idempotent: matches on name to avoid duplicates.
// Run: DATABASE_URL=... npx tsx server/seed-events.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

// description format: "TYPE|ORG|FEATURED|<actual description>"
// The events API route will parse this and return enriched fields.
const EVENTS = [
  {
    name: 'HERS365 Spring Showcase',
    date: 'Jun 28, 2026',
    location: 'Los Angeles, CA',
    registrationDeadline: 'Jun 14, 2026',
    capacity: 64,
    participantCount: 46,
    price: 0,
    description: 'Showcase|HERS365|true|The official HERS365 recruiting showcase. College scouts invited. Compete against top athletes in Southern California.',
    upcoming: true,
  },
  {
    name: 'NorCal 7v7 Summer Classic',
    date: 'Jul 12, 2026',
    location: 'San Jose, CA',
    registrationDeadline: 'Jun 28, 2026',
    capacity: 128,
    participantCount: 84,
    price: 4500,
    description: '7v7|Bay Area Flag|false|16-team bracket. Two-day tournament with film sessions after each round. Coaching staff on site.',
    upcoming: true,
  },
  {
    name: 'Elite QB-WR Camp',
    date: 'Jul 19, 2026',
    location: 'Austin, TX',
    registrationDeadline: 'Jul 5, 2026',
    capacity: 40,
    participantCount: 31,
    price: 12500,
    description: 'Camp|Routes Academy|false|Two-day intensive for QBs and pass catchers. Film review, route trees, 1-on-1s, and college prep sessions.',
    upcoming: true,
  },
  {
    name: 'NFHS Girls Flag Combine',
    date: 'Aug 2, 2026',
    location: 'Scottsdale, AZ',
    registrationDeadline: 'Jul 19, 2026',
    capacity: 100,
    participantCount: 69,
    price: 6000,
    description: 'Combine|NFHS|true|Official NFHS combine. 40-yard dash, shuttle, vertical, position drills. Results distributed to participating programs.',
    upcoming: true,
  },
  {
    name: 'Southwest Regional Tournament',
    date: 'Aug 16, 2026',
    location: 'Phoenix, AZ',
    registrationDeadline: 'Aug 2, 2026',
    capacity: 0,
    participantCount: 0,
    price: 20000,
    description: 'Tournament|USA Flag Football|false|Regional qualifier for the USA Flag Football National Championship. Open to U17 and U19 divisions.',
    upcoming: true,
  },
  {
    name: 'Florida All-Star Showcase',
    date: 'Sep 6, 2026',
    location: 'Miami, FL',
    registrationDeadline: 'Aug 23, 2026',
    capacity: 80,
    participantCount: 28,
    price: 3500,
    description: 'Showcase|Florida Girls Flag|false|All-star format with east vs west roster draft. College coaches from 4 programs confirmed.',
    upcoming: true,
  },
];

async function run() {
  console.log('Seeding events...');

  for (const ev of EVENTS) {
    const existing = await db
      .select({ id: schema.events.id })
      .from(schema.events)
      .where(eq(schema.events.name, ev.name))
      .limit(1);

    if (existing.length > 0) {
      await db.update(schema.events).set(ev).where(eq(schema.events.name, ev.name));
      console.log(`  updated: ${ev.name}`);
    } else {
      await db.insert(schema.events).values(ev);
      console.log(`  inserted: ${ev.name}`);
    }
  }

  console.log(`Done. ${EVENTS.length} events seeded.`);
  process.exit(0);
}

run().catch((e) => { console.error('Seed failed:', e); process.exit(1); });
