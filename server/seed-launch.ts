// @ts-nocheck
// Launch-day seed: replaces placeholder athletes with real CA girls' flag-football
// profiles and seeds an on-brand feed. Idempotent — safe to re-run.
// Run against prod with DATABASE_URL set to the production Postgres URL.
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

// Prefer the public proxy URL (works from outside Railway's network) when present.
// railway run injects these vars; we never print or hardcode the connection string.
const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

const ATHLETES = [
  { name: 'Maya Johnson',    email: 'maya.johnson@hers365.app',    position: 'QB',         age: 17, state: 'CA', city: 'Santa Ana',   school: 'Mater Dei HS',          gradYear: 2026, g5Rating: 5, gpa: '3.9', tier: 'elite', archetype: 'Field General',  achievements: '2025 CIF-SS Flag Football Offensive MVP · 2,400 passing yds' },
  { name: 'Sofia Ramirez',   email: 'sofia.ramirez@hers365.app',   position: 'WR',         age: 17, state: 'CA', city: 'Long Beach',   school: 'Long Beach Poly',       gradYear: 2026, g5Rating: 5, gpa: '4.0', tier: 'pro',   archetype: 'Deep Threat',    achievements: 'Section-leading 18 receiving TDs · 1st Team All-League' },
  { name: 'Aaliyah Brooks',  email: 'aaliyah.brooks@hers365.app',  position: 'Safety',     age: 16, state: 'CA', city: 'Corona',       school: 'Centennial HS',         gradYear: 2027, g5Rating: 5, gpa: '3.7', tier: 'pro',   archetype: 'Ball Hawk',      achievements: '9 INTs in 2025 · All-Section defense' },
  { name: 'Isabella Reyes',  email: 'isabella.reyes@hers365.app',  position: 'QB',         age: 16, state: 'CA', city: 'Orange',       school: 'Orange Lutheran',       gradYear: 2027, g5Rating: 5, gpa: '3.8', tier: 'free',  archetype: 'Dual-Threat',    achievements: 'Freshman of the Year · 28 total TDs' },
  { name: 'Destiny Nguyen',  email: 'destiny.nguyen@hers365.app',  position: 'Center',     age: 16, state: 'CA', city: 'Gardena',      school: 'Gardena HS',            gradYear: 2027, g5Rating: 4, gpa: '3.6', tier: 'free',  archetype: 'Anchor',         achievements: 'Zero bad snaps in 2025 · team captain' },
  { name: 'Olivia Martinez', email: 'olivia.martinez@hers365.app', position: 'Cornerback', age: 17, state: 'CA', city: 'Chatsworth',   school: 'Sierra Canyon',         gradYear: 2026, g5Rating: 4, gpa: '3.9', tier: 'pro',   archetype: 'Lockdown',       achievements: 'Held WRs under 30 yds/game · All-League' },
  { name: 'Layla Thompson',  email: 'layla.thompson@hers365.app',  position: 'RB',         age: 17, state: 'CA', city: 'Harbor City',  school: 'Narbonne HS',           gradYear: 2026, g5Rating: 4, gpa: '3.5', tier: 'free',  archetype: 'Burner',         achievements: '4.71 shuttle · 14 rushing TDs' },
  { name: 'Zoe Williams',    email: 'zoe.williams@hers365.app',    position: 'WR',         age: 15, state: 'CA', city: 'Inglewood',    school: 'Inglewood HS',          gradYear: 2028, g5Rating: 4, gpa: '3.8', tier: 'free',  archetype: 'Route Tech',     achievements: 'Varsity starter as a sophomore' },
  { name: 'Jasmine Carter',  email: 'jasmine.carter@hers365.app',  position: 'Rusher',     age: 16, state: 'CA', city: 'Inglewood',    school: "St. Mary's Academy",    gradYear: 2027, g5Rating: 4, gpa: '3.7', tier: 'free',  archetype: 'Edge Pressure',  achievements: 'Section-leading 22 flag pulls at the line' },
  { name: 'Amara Davis',     email: 'amara.davis@hers365.app',     position: 'Blitzer',    age: 15, state: 'CA', city: 'Long Beach',   school: 'Long Beach Wilson',     gradYear: 2028, g5Rating: 3, gpa: '3.6', tier: 'free',  archetype: 'Disruptor',      achievements: 'JV defensive MVP · moved up to varsity' },
];

const POSTS = [
  { idx: 0, content: 'First 7-on-7 of the spring is in the books. Offense moved the ball all day — timing with my receivers is clicking. 🏈 #HERS365', category: 'training', likes: 1240, comments: 63 },
  { idx: 1, content: 'Route running session after practice. Reps over everything. 18 TDs and counting this season.', category: 'training', likes: 987, comments: 41 },
  { idx: 2, content: '3 picks in our scrimmage today 🔒 Film study pays off. Defense wins championships.', category: 'game', likes: 1580, comments: 92 },
  { idx: 3, content: 'Putting in the work this offseason — new footwork, sharper reads. Let\'s go, 2027. 🙌', category: 'training', likes: 742, comments: 28 },
  { idx: 5, content: 'Lockdown corner mindset. Press coverage drills all morning. Come get it.', category: 'training', likes: 905, comments: 34 },
  { idx: 6, content: 'Speed kills. New PR in the shuttle today — flag football is FAST and I love it. ⚡', category: 'combine', likes: 1130, comments: 47 },
  { idx: 7, content: 'First varsity start Friday. Nervous but ready. Praying and balling. 🙏🏈', category: 'game', likes: 856, comments: 58 },
  { idx: 2, content: 'Grateful to be ranked top-5 in the section. None of it happens without my team and my coaches. On to the next. 💪', category: 'game', likes: 2103, comments: 121 },
];

const STORY_PORTRAITS = [21, 33, 45, 55, 67, 26];

async function run() {
  console.log('🌱 Launch seed starting…');

  // 1. Reshape existing rows in place (ids 1..7) — no deletes, no FK breakage
  const existing = await db.select({ id: schema.players.id }).from(schema.players).orderBy(schema.players.id);
  const ids = existing.map((r) => r.id);

  for (let i = 0; i < ATHLETES.length; i++) {
    const a = ATHLETES[i];
    const vals = {
      email: a.email, name: a.name, position: a.position, age: a.age,
      state: a.state, city: a.city, school: a.school, gradYear: a.gradYear,
      g5Rating: a.g5Rating, gpa: a.gpa, sport: 'Flag Football', archetype: a.archetype,
      achievements: a.achievements, subscriptionTier: a.tier, segment: 'high_school',
      skillTier: a.g5Rating >= 5 ? 'elite' : a.g5Rating >= 4 ? 'advanced' : 'intermediate',
      verificationStatus: 'verified', privacySetting: 'public',
      nilPoints: a.g5Rating * 120, xpPoints: a.g5Rating * 340, level: a.g5Rating,
      passwordHash: null,
    };
    if (i < ids.length) {
      await db.update(schema.players).set(vals).where(eq(schema.players.id, ids[i]));
    } else {
      await db.insert(schema.players).values(vals).onConflictDoUpdate({ target: schema.players.email, set: vals });
    }
  }
  console.log(`✅ ${ATHLETES.length} athletes seeded (girls' flag football, CA)`);

  // 2. Resolve player ids by email (stable handle for posts/stories)
  const all = await db.select({ id: schema.players.id, email: schema.players.email }).from(schema.players);
  const idByEmail = Object.fromEntries(all.map((r) => [r.email, r.id]));
  const pid = (i) => idByEmail[ATHLETES[i].email];

  // 3. Fresh feed
  await db.delete(schema.posts);
  for (const p of POSTS) {
    await db.insert(schema.posts).values({
      playerId: pid(p.idx), content: p.content, category: p.category,
      moderationStatus: 'approved', likes: p.likes, comments: p.comments,
    });
  }
  console.log(`✅ ${POSTS.length} feed posts seeded`);

  // 4. Stories (24h)
  await db.delete(schema.stories);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  for (let i = 0; i < STORY_PORTRAITS.length; i++) {
    await db.insert(schema.stories).values({
      playerId: pid(i),
      imageUrl: `https://randomuser.me/api/portraits/women/${STORY_PORTRAITS[i]}.jpg`,
      expiresAt: expires,
    });
  }
  console.log(`✅ ${STORY_PORTRAITS.length} stories seeded`);

  console.log('🎉 Launch seed complete.');
  process.exit(0);
}

run().catch((e) => { console.error('Seed failed:', e); process.exit(1); });
