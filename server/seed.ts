// @ts-nocheck
import { db } from './db';
import * as schema from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  // Seed Subscription Plans
  const plans = [
    {
      name: 'Rookie',
      price: 0,
      tierLevel: 'free',
    },
    {
      name: 'Pro',
      price: 999, // $9.99 in cents
      tierLevel: 'pro',
    },
    {
      name: 'Elite',
      price: 2999, // $29.99 in cents
      tierLevel: 'elite',
    },
  ];

  for (const plan of plans) {
    const existing = await db
      .select()
      .from(schema.subscriptionPlans)
      .where(schema.subscriptionPlans.tierLevel === plan.tierLevel);
    
    if (existing.length === 0) {
      await db.insert(schema.subscriptionPlans).values(plan);
      console.log(`✅ Created plan: ${plan.name}`);
    } else {
      console.log(`⏭️  Plan already exists: ${plan.name}`);
    }
  }

  // Seed Badges
  const badges = [
    { name: 'First Touch', description: 'Uploaded your first highlight', icon: 'trophy', category: 'milestone' },
    { name: 'Rising Star', description: 'Reached 100 followers', icon: 'star', category: 'social' },
    { name: 'Speed Demon', description: 'Ran a 5.0 or faster 40-yard dash', icon: 'lightning', category: 'combine' },
    { name: 'Flag Puller', description: 'Recorded 10+ flag pulls in a game', icon: 'flag', category: 'game' },
    { name: 'Team Captain', description: 'Created or joined a team', icon: 'users', category: 'team' },
    { name: 'NIL Earned', description: 'Earned your first NIL deal', icon: 'dollar', category: 'nil' },
    { name: 'Academic All-Star', description: 'Maintain 3.5+ GPA', icon: 'graduation', category: 'academic' },
    { name: 'State Champion', description: 'Won a state championship', icon: 'medal', category: 'championship' },
  ];

  for (const badge of badges) {
    const existing = await db
      .select()
      .from(schema.badges)
      .where(schema.badges.name === badge.name);
    
    if (existing.length === 0) {
      await db.insert(schema.badges).values(badge);
      console.log(`✅ Created badge: ${badge.name}`);
    }
  }

  // Seed Challenges
  const challenges = [
    { title: 'Daily Practice', description: 'Complete 1 drill today', points: 10, type: 'daily' },
    { title: 'Weekly Warrior', description: 'Complete 7 drills this week', points: 50, type: 'weekly' },
    { title: 'Highlight Hoarder', description: 'Upload 5 highlight videos', points: 100, type: 'milestone' },
    { title: 'Social Butterfly', description: 'Get 50 followers', points: 75, type: 'social' },
    { title: 'Stats Master', description: 'Connect your MaxPreps profile', points: 50, type: 'verification' },
  ];

  for (const challenge of challenges) {
    const existing = await db
      .select()
      .from(schema.challenges)
      .where(schema.challenges.title === challenge.title);
    
    if (existing.length === 0) {
      await db.insert(schema.challenges).values(challenge);
      console.log(`✅ Created challenge: ${challenge.title}`);
    }
  }

  // Seed Drills
  const drills = [
    // QB Drills
    { position: 'QB', category: 'passing', instructions: 'Practice 3-step drop and throw to designated zones' },
    { position: 'QB', category: 'footwork', instructions: 'Ladder drills for quick feet and coordination' },
    { position: 'QB', category: 'decision', instructions: 'Read defense and make quick decisions under pressure' },
    // WR Drills
    { position: 'WR', category: 'route_running', instructions: 'Practice sharp cuts and route transitions' },
    { position: 'WR', category: 'receiving', instructions: 'Catch drills with varying trajectories' },
    { position: 'WR', category: 'speed', instructions: 'Sprint workouts and acceleration drills' },
    // RB/DB Drills
    { position: 'RB', category: 'ball_security', instructions: 'High carry drills and fumble recovery practice' },
    { position: 'DB', category: 'coverage', instructions: 'Backpedal and transition to sprint transitions' },
    { position: 'DB', category: 'interception', instructions: 'Track ball and high-point catches' },
    // General
    { position: 'ALL', category: 'conditioning', instructions: 'Full field sprints and agility work' },
    { position: 'ALL', category: 'flexibility', instructions: 'Dynamic stretching and mobility exercises' },
  ];

  for (const drill of drills) {
    const existing = await db
      .select()
      .from(schema.drills)
      .where(schema.drills.instructions === drill.instructions);
    
    if (existing.length === 0) {
      await db.insert(schema.drills).values(drill);
      console.log(`✅ Created drill: ${drill.position} - ${drill.category}`);
    }
  }

  // Seed Sample NIL Opportunities
  const nilOpps = [
    { brandName: 'SportsGear Pro', requirements: 'Post 2 Instagram reels wearing brand gear', deliverables: '2 social posts', estimatedEarnings: 500 },
    { brandName: 'Local Car Dealership', requirements: 'Attend grand opening event', deliverables: '1 event appearance', estimatedEarnings: 1000 },
    { brandName: 'FitnessFuel App', requirements: 'Video testimonial about training app', deliverables: '1 video (30 sec)', estimatedEarnings: 300 },
    { brandName: 'State Farm', requirements: 'Be part of NIL campaign', deliverables: 'Photo shoot', estimatedEarnings: 2500 },
  ];

  for (const opp of nilOpps) {
    const existing = await db
      .select()
      .from(schema.nilOpportunities)
      .where(schema.nilOpportunities.brandName === opp.brandName);
    
    if (existing.length === 0) {
      await db.insert(schema.nilOpportunities).values(opp);
      console.log(`✅ Created NIL opportunity: ${opp.brandName}`);
    }
  }

  // Seed Athletes (Players)
  const playersData = [
    { name: 'Tyson Carter', email: 'tyson@example.com', position: 'QB', state: 'TX', age: 17, school: 'Westlake High', gradYear: 2026, g5Rating: 5, archetype: 'Dual-Threat', subscriptionTier: 'free' },
    { name: 'Marcus Johnson', email: 'marcus@example.com', position: 'WR', state: 'FL', age: 16, school: 'Miami Southridge', gradYear: 2027, g5Rating: 5, archetype: 'Speedster', subscriptionTier: 'pro' },
    { name: 'Elijah Smith', email: 'elijah@example.com', position: 'CB', state: 'CA', age: 17, school: 'Crenshaw High', gradYear: 2026, g5Rating: 5, archetype: 'Lockdown', subscriptionTier: 'elite' },
    { name: 'Jayden Williams', email: 'jayden@example.com', position: 'RB', state: 'GA', age: 16, school: 'Westlake High', gradYear: 2027, g5Rating: 4, archetype: 'Power Back', subscriptionTier: 'free' },
    { name: 'Noah Davis', email: 'noah@example.com', position: 'TE', state: 'TX', age: 17, school: 'Dallas Elite High', gradYear: 2026, g5Rating: 4, archetype: 'Redzone Target', subscriptionTier: 'pro' },
  ];

  for (const p of playersData) {
    const existing = await db.select().from(schema.players).where(eq(schema.players.email, p.email));
    if (existing.length === 0) {
      const inserted = await db.insert(schema.players).values(p).returning();
      console.log(`✅ Created player: ${p.name}`);
      
      // Seed rankings for this player
      await db.insert(schema.athleteRankings).values({
        playerId: inserted[0].id,
        nationalRank: playersData.indexOf(p) + 1,
        stateRank: 1,
        positionRank: 1,
        movement: 'up'
      });
    }
  }

  // Seed College Teams
  const collegeTeams = [
    { name: 'University of Alabama', state: 'AL', city: 'Tuscaloosa', conference: 'SEC', division: 'NAIA', wins: 12, losses: 0, titles: 3, rating: 98, tuitionInState: 12500, tuitionOutState: 31500, hasApplication: true, hasQuestionnaire: true, applicationUrl: 'https://ala.edu/flagfootball', questionnaireUrl: 'https://ala.edu/flagfootball/recruit', socials: { instagram: '@ala_flagfb', twitter: '@ALAFlagFootball' }, type: 'college' },
    { name: 'University of Texas', state: 'TX', city: 'Austin', conference: 'Big 12', division: 'NAIA', wins: 11, losses: 1, titles: 2, rating: 96, tuitionInState: 11448, tuitionOutState: 41070, hasApplication: true, hasQuestionnaire: true, applicationUrl: 'https://utexas.edu/flagfootball', socials: { instagram: '@texas_flagfb' }, type: 'college' },
    { name: 'Florida State University', state: 'FL', city: 'Tallahassee', conference: 'ACC', division: 'NAIA', wins: 10, losses: 2, titles: 2, rating: 94, tuitionInState: 6770, tuitionOutState: 21683, hasApplication: true, type: 'college' },
    { name: 'Keiser University', state: 'FL', city: 'West Palm Beach', division: 'NAIA', wins: 15, losses: 0, titles: 1, rating: 99, type: 'college' },
    { name: 'Ottawa University', state: 'KS', city: 'Ottawa', division: 'NAIA', wins: 14, losses: 1, titles: 2, rating: 97, type: 'college' },
  ];

  for (const t of collegeTeams) {
    const existing = await db.select().from(schema.teams).where(eq(schema.teams.name, t.name));
    if (existing.length === 0) {
      await db.insert(schema.teams).values(t);
      console.log(`✅ Created college team: ${t.name}`);
    }
  }

  // Seed High School Teams
  const hsTeams = [
    { name: 'Alonso Ravens', state: 'FL', city: 'Tampa', wins: 20, losses: 2, titles: 4, type: 'high_school' },
    { name: 'JSerra Catholic Lions', state: 'CA', city: 'San Juan Capistrano', wins: 28, losses: 0, titles: 1, type: 'high_school' },
    { name: 'Westlake High School', state: 'GA', city: 'Atlanta', wins: 18, losses: 2, titles: 2, type: 'high_school' },
  ];

  for (const t of hsTeams) {
    const existing = await db.select().from(schema.teams).where(eq(schema.teams.name, t.name));
    if (existing.length === 0) {
      await db.insert(schema.teams).values(t);
      console.log(`✅ Created high school team: ${t.name}`);
    }
  }

  // Seed Events
  const eventsData = [
    { name: 'NFL ID Camp - Texas', date: new Date('2026-10-15'), location: 'Dallas, TX', participantCount: 450, capacity: 500, price: 14900, description: 'Official NFL ID Camp featuring college coaches.', upcoming: true },
    { name: 'National 7v7 Showcase', date: new Date('2026-11-02'), location: 'Miami, FL', participantCount: 320, capacity: 400, price: 19900, description: 'Top 7v7 tournament with recruiting opportunities.', upcoming: true },
    { name: 'San Diego HERS365 Combine', date: new Date('2026-03-17'), location: 'San Diego, CA', participantCount: 180, capacity: 200, price: 7500, description: 'HERS365 verified combine.', upcoming: true },
  ];

  for (const e of eventsData) {
    const existing = await db.select().from(schema.events).where(eq(schema.events.name, e.name));
    if (existing.length === 0) {
      await db.insert(schema.events).values(e);
      console.log(`✅ Created event: ${e.name}`);
    }
  }

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
