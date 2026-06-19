
import bcrypt from 'bcryptjs';
import { db } from './db';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...');

  // ── Subscription Plans ────────────────────────────────────────────────────
  for (const plan of [
    { name: 'Rookie', price: 0, tierLevel: 'free' },
    { name: 'Pro', price: 999, tierLevel: 'pro' },
    { name: 'Elite', price: 2999, tierLevel: 'elite' },
  ]) {
    const existing = await db.select().from(schema.subscriptionPlans).where(eq(schema.subscriptionPlans.tierLevel, plan.tierLevel));
    if (existing.length === 0) {
      await db.insert(schema.subscriptionPlans).values(plan);
      console.log(`✅ Created plan: ${plan.name}`);
    }
  }

  // ── Badges ────────────────────────────────────────────────────────────────
  for (const badge of [
    { name: 'First Touch', description: 'Uploaded your first highlight', icon: 'trophy', category: 'milestone' },
    { name: 'Rising Star', description: 'Reached 100 followers', icon: 'star', category: 'social' },
    { name: 'Speed Demon', description: 'Ran a 5.0 or faster 40-yard dash', icon: 'lightning', category: 'combine' },
    { name: 'Flag Puller', description: 'Recorded 10+ flag pulls in a game', icon: 'flag', category: 'game' },
    { name: 'Team Captain', description: 'Created or joined a team', icon: 'users', category: 'team' },
    { name: 'NIL Earned', description: 'Earned your first NIL deal', icon: 'dollar', category: 'nil' },
    { name: 'Academic All-Star', description: 'Maintain 3.5+ GPA', icon: 'graduation', category: 'academic' },
    { name: 'State Champion', description: 'Won a state championship', icon: 'medal', category: 'championship' },
  ]) {
    const existing = await db.select().from(schema.badges).where(eq(schema.badges.name, badge.name));
    if (existing.length === 0) {
      await db.insert(schema.badges).values(badge);
      console.log(`✅ Created badge: ${badge.name}`);
    }
  }

  // ── Drills ────────────────────────────────────────────────────────────────
  for (const drill of [
    { position: 'QB', category: 'passing', instructions: 'Practice 3-step drop and throw to designated zones' },
    { position: 'QB', category: 'footwork', instructions: 'Ladder drills for quick feet and coordination' },
    { position: 'QB', category: 'decision', instructions: 'Read defense and make quick decisions under pressure' },
    { position: 'WR', category: 'route_running', instructions: 'Practice sharp cuts and route transitions' },
    { position: 'WR', category: 'receiving', instructions: 'Catch drills with varying trajectories' },
    { position: 'WR', category: 'speed', instructions: 'Sprint workouts and acceleration drills' },
    { position: 'RB', category: 'ball_security', instructions: 'High carry drills and fumble recovery practice' },
    { position: 'DB', category: 'coverage', instructions: 'Backpedal and transition to sprint transitions' },
    { position: 'DB', category: 'interception', instructions: 'Track ball and high-point catches' },
    { position: 'ALL', category: 'conditioning', instructions: 'Full field sprints and agility work' },
    { position: 'ALL', category: 'flexibility', instructions: 'Dynamic stretching and mobility exercises' },
  ]) {
    const existing = await db.select().from(schema.drills).where(eq(schema.drills.instructions, drill.instructions));
    if (existing.length === 0) {
      await db.insert(schema.drills).values(drill);
    }
  }

  // ── NIL Opportunities ─────────────────────────────────────────────────────
  for (const opp of [
    { brandName: 'SportsGear Pro', requirements: 'Post 2 Instagram reels wearing brand gear', deliverables: '2 social posts', estimatedEarnings: 500 },
    { brandName: 'Local Car Dealership', requirements: 'Attend grand opening event', deliverables: '1 event appearance', estimatedEarnings: 1000 },
    { brandName: 'FitnessFuel App', requirements: 'Video testimonial about training app', deliverables: '1 video (30 sec)', estimatedEarnings: 300 },
    { brandName: 'State Farm', requirements: 'Be part of NIL campaign', deliverables: 'Photo shoot', estimatedEarnings: 2500 },
  ]) {
    const existing = await db.select().from(schema.nilOpportunities).where(eq(schema.nilOpportunities.brandName, opp.brandName));
    if (existing.length === 0) {
      await db.insert(schema.nilOpportunities).values(opp);
      console.log(`✅ Created NIL opportunity: ${opp.brandName}`);
    }
  }

  // ── Female Athletes (players) ─────────────────────────────────────────────
  // Demo login: email + password "hers365"
  const athletePassword = await bcrypt.hash('hers365', 10);
  const athletesData = [
    { name: 'Maya Thompson',    email: 'maya@hers365.com',    position: 'QB', state: 'TX', city: 'Austin',       school: 'Westlake HS',          gradYear: 2026, g5Rating: 5, gpa: '3.9', archetype: 'Dual-Threat',  verificationStatus: 'verified',   subscriptionTier: 'elite'  },
    { name: 'Jordan Reyes',     email: 'jordan@hers365.com',  position: 'WR', state: 'CA', city: 'Long Beach',   school: 'Poly HS',              gradYear: 2026, g5Rating: 4, gpa: '3.6', archetype: 'Speedster',    verificationStatus: 'verified',   subscriptionTier: 'pro'   },
    { name: 'Aaliyah Brooks',   email: 'aaliyah@hers365.com', position: 'CB', state: 'FL', city: 'Miami',        school: 'Northwestern HS',      gradYear: 2027, g5Rating: 5, gpa: '4.0', archetype: 'Lockdown',     verificationStatus: 'verified',   subscriptionTier: 'elite' },
    { name: 'Sofia Martinez',   email: 'sofia@hers365.com',   position: 'RB', state: 'GA', city: 'Atlanta',      school: 'Grayson HS',           gradYear: 2026, g5Rating: 4, gpa: '3.4', archetype: 'Power Back',   verificationStatus: 'unverified', subscriptionTier: 'free'  },
    { name: 'Destiny Coleman',  email: 'destiny@hers365.com', position: 'S',  state: 'OH', city: 'Cleveland',    school: 'Glenville HS',         gradYear: 2027, g5Rating: 4, gpa: '3.7', archetype: 'Playmaker',    verificationStatus: 'verified',   subscriptionTier: 'pro'   },
    { name: 'Riley Nguyen',     email: 'riley@hers365.com',   position: 'ATH',state: 'WA', city: 'Seattle',      school: 'Eastside Catholic',    gradYear: 2026, g5Rating: 5, gpa: '3.9', archetype: 'Playmaker',    verificationStatus: 'verified',   subscriptionTier: 'elite' },
  ];

  const insertedAthletes: typeof schema.players.$inferSelect[] = [];
  for (const p of athletesData) {
    const existing = await db.select().from(schema.players).where(eq(schema.players.email, p.email));
    if (existing.length === 0) {
      const [inserted] = await db.insert(schema.players).values({ ...p, passwordHash: athletePassword }).returning();
      insertedAthletes.push(inserted);
      await db.insert(schema.athleteRankings).values({
        playerId: inserted.id,
        nationalRank: athletesData.indexOf(p) + 1,
        stateRank: 1,
        positionRank: 1,
        movement: 'up',
      });
      console.log(`✅ Created athlete: ${p.name}`);
    } else {
      insertedAthletes.push(existing[0]);
    }
  }

  // ── Demo Coach ────────────────────────────────────────────────────────────
  // Demo login: coach@hers365.com / hers365
  const coachPassword = await bcrypt.hash('hers365', 10);
  let demoCoach: typeof schema.coaches.$inferSelect;
  const existingCoach = await db.select().from(schema.coaches).where(eq(schema.coaches.email, 'coach@hers365.com'));
  if (existingCoach.length === 0) {
    const [inserted] = await db.insert(schema.coaches).values({
      name: 'Coach Sarah Williams',
      email: 'coach@hers365.com',
      passwordHash: coachPassword,
      university: 'Keiser University',
      division: 'NAIA',
      recruitingPositions: 'QB,WR,CB',
      recruitingStates: 'TX,CA,FL,GA',
      verifiedStatus: true,
    }).returning();
    demoCoach = inserted;
    console.log('✅ Created demo coach: Coach Sarah Williams (coach@hers365.com / hers365)');
  } else {
    demoCoach = existingCoach[0];
    console.log('⏭️  Demo coach already exists');
  }

  // ── Seed Message Thread ───────────────────────────────────────────────────
  // Coach → Maya Thompson conversation (demo thread)
  const maya = insertedAthletes.find(a => a.email === 'maya@hers365.com');
  if (maya && demoCoach) {
    const existing = await db.select().from(schema.messages)
      .where(eq(schema.messages.coachId, demoCoach.id));

    if (existing.length === 0) {
      const thread = [
        { senderType: 'coach', content: "Hi Maya! I've been following your highlight film and I'm really impressed with your pocket presence and accuracy. We'd love to have a conversation about our program at Keiser.", senderId: demoCoach.id },
        { senderType: 'athlete', content: "Thank you so much, Coach Williams! I've heard great things about Keiser's flag football program. I'd love to learn more about what you're looking for.", senderId: maya.id },
        { senderType: 'coach', content: "Absolutely. We're building something special here — D1-level coaching, academic support, and a real path to the field. Would you be available for a campus visit in October?", senderId: demoCoach.id },
        { senderType: 'athlete', content: "October works for me! My schedule is pretty open after the 10th. Should I bring my full highlight reel or do you already have it?", senderId: maya.id },
        { senderType: 'coach', content: "Bring the reel and any recent stats. We'll do a full walkthrough with the coaching staff. Really excited to meet you in person, Maya.", senderId: demoCoach.id },
      ];

      for (const msg of thread) {
        await db.insert(schema.messages).values({
          coachId: demoCoach.id,
          athleteId: maya.id,
          senderId: msg.senderId,
          senderType: msg.senderType,
          content: msg.content,
          read: true,
        });
      }
      console.log('✅ Seeded demo message thread (coach ↔ Maya Thompson)');
    } else {
      console.log('⏭️  Message thread already exists');
    }
  }

  // ── College Teams ─────────────────────────────────────────────────────────
  for (const t of [
    { name: 'University of Alabama', state: 'AL', city: 'Tuscaloosa', conference: 'SEC', division: 'NAIA', wins: 12, losses: 0, titles: 3, rating: 98, tuitionInState: 12500, tuitionOutState: 31500, hasApplication: true, hasQuestionnaire: true, type: 'college' },
    { name: 'University of Texas', state: 'TX', city: 'Austin', conference: 'Big 12', division: 'NAIA', wins: 11, losses: 1, titles: 2, rating: 96, tuitionInState: 11448, tuitionOutState: 41070, hasApplication: true, type: 'college' },
    { name: 'Florida State University', state: 'FL', city: 'Tallahassee', conference: 'ACC', division: 'NAIA', wins: 10, losses: 2, titles: 2, rating: 94, tuitionInState: 6770, tuitionOutState: 21683, type: 'college' },
    { name: 'Keiser University', state: 'FL', city: 'West Palm Beach', division: 'NAIA', wins: 15, losses: 0, titles: 1, rating: 99, type: 'college' },
    { name: 'Ottawa University', state: 'KS', city: 'Ottawa', division: 'NAIA', wins: 14, losses: 1, titles: 2, rating: 97, type: 'college' },
  ]) {
    const existing = await db.select().from(schema.teams).where(eq(schema.teams.name, t.name));
    if (existing.length === 0) {
      await db.insert(schema.teams).values(t);
      console.log(`✅ Created team: ${t.name}`);
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────
  for (const e of [
    { name: 'NFL ID Camp - Texas', date: new Date('2026-10-15'), location: 'Dallas, TX', participantCount: 450, capacity: 500, price: 14900, description: 'Official NFL ID Camp featuring college coaches.', upcoming: true },
    { name: 'National 7v7 Showcase', date: new Date('2026-11-02'), location: 'Miami, FL', participantCount: 320, capacity: 400, price: 19900, description: 'Top 7v7 tournament with recruiting opportunities.', upcoming: true },
    { name: 'San Diego HERS365 Combine', date: new Date('2026-03-17'), location: 'San Diego, CA', participantCount: 180, capacity: 200, price: 7500, description: 'HERS365 verified combine.', upcoming: true },
  ]) {
    const existing = await db.select().from(schema.events).where(eq(schema.events.name, e.name));
    if (existing.length === 0) {
      await db.insert(schema.events).values(e);
      console.log(`✅ Created event: ${e.name}`);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('   Demo logins:');
  console.log('     Athlete → maya@hers365.com / hers365');
  console.log('     Coach   → coach@hers365.com / hers365');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
