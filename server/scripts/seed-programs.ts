/**
 * One-time seed: inserts the 23 known flag football programs into `teams`
 * and creates a matching `program_details` row with websiteUrl + hasScholarships.
 * Safe to re-run — skips schools that already exist by name.
 *
 * Usage (from server/): npx tsx scripts/seed-programs.ts
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from '../schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/hers365' });
const db = drizzle(pool, { schema });

const SCHOOLS = [
  { name: 'Ottawa University',               website: 'https://ouazspirit.com/sports/womens-flag-football/roster',                   division: 'NAIA',      conference: 'Kansas Collegiate Athletic Conference (KCAC)',   city: 'Ottawa',          state: 'KS', hasScholarships: true  },
  { name: 'Keiser University',               website: 'https://kuseahawks.com/sports/flag-football/stats',                           division: 'NAIA',      conference: 'Sun Conference',                                city: 'Fort Lauderdale', state: 'FL', hasScholarships: true  },
  { name: 'Warner University',               website: 'https://warnerroyals.com/sports/womens-flag-football',                        division: 'NAIA',      conference: 'Sun Conference',                                city: 'Lake Wales',      state: 'FL', hasScholarships: true  },
  { name: 'Kansas Wesleyan University',      website: 'https://kwucoyotes.com/sports/flag-football/roster',                          division: 'NAIA',      conference: 'Kansas Collegiate Athletic Conference (KCAC)',   city: 'Salina',          state: 'KS', hasScholarships: true  },
  { name: 'Baker University',                website: 'https://www.bakerwildcats.com/sports/flagfball/2025-26/roster',               division: 'NAIA',      conference: 'Kansas Collegiate Athletic Conference (KCAC)',   city: 'Baldwin City',    state: 'KS', hasScholarships: true  },
  { name: 'Milligan University',             website: 'https://milliganbuffs.com/sports/womens-flag-football/roster',                division: 'NAIA',      conference: 'Appalachian Athletic Conference',               city: 'Milligan',        state: 'TN', hasScholarships: true  },
  { name: 'Lindsey Wilson College',          website: 'https://lindseyathletics.com/sports/flag-football/roster',                    division: 'NAIA',      conference: 'Mid-South Conference',                          city: 'Columbia',        state: 'KY', hasScholarships: true  },
  { name: 'Cumberland University',           website: 'https://gocumberlandathletics.com/sports/womens-flag-football/stats/',        division: 'NAIA',      conference: 'Mid-South Conference',                          city: 'Lebanon',         state: 'TN', hasScholarships: true  },
  { name: 'St. Thomas University',           website: 'https://stubobcats.com/sports/womens-flag-football/stats',                    division: 'NAIA',      conference: 'Sun Conference',                                city: 'Miami Gardens',   state: 'FL', hasScholarships: true  },
  { name: 'Webber International University', website: 'https://webberathletics.com/sports/womens-flag-football',                     division: 'NAIA',      conference: 'Sun Conference',                                city: 'Babson Park',     state: 'FL', hasScholarships: true  },
  { name: 'Ferrum College',                  website: 'https://ferrumpanthers.com/sports/flag-football/stats',                       division: 'NCAA DII',  conference: 'Conference Carolinas',                          city: 'Ferrum',          state: 'VA', hasScholarships: null  },
  { name: 'North Park University',           website: 'https://athletics.northpark.edu/sports/womens-flag-football/roster',          division: 'NCAA DIII', conference: null,                                            city: 'Chicago',         state: 'IL', hasScholarships: false },
  { name: 'College of Staten Island',        website: 'https://csidolphins.com/sports/womens-flag-football',                         division: 'NCAA DIII', conference: 'CUNY Athletic Conference',                      city: 'Staten Island',   state: 'NY', hasScholarships: false },
  { name: 'Alabama State University',        website: 'https://bamastatesports.com/sports/womens-flag-football/roster',              division: 'NCAA DI',   conference: 'Independent',                                   city: 'Montgomery',      state: 'AL', hasScholarships: true  },
  { name: 'Lindenwood University',           website: 'https://lindenwood.edu/athletics/sports/womens-flag-football',                division: 'NCAA DI',   conference: 'Ohio Valley Conference',                        city: 'St. Charles',     state: 'MO', hasScholarships: true  },
  { name: 'Azusa Pacific University',        website: 'https://athletics.apu.edu/sports/womens-flag-football',                       division: 'NCAA DIII', conference: null,                                            city: 'Azusa',           state: 'CA', hasScholarships: false },
  { name: 'Hardin-Simmons University',       website: 'https://hsuathletics.com/sports/womens-flag-football',                        division: 'NCAA DIII', conference: 'American Southwest Conference',                 city: 'Abilene',         state: 'TX', hasScholarships: false },
  { name: 'Shorter University',              website: 'https://shorterathletics.com/sports/womens-flag-football',                    division: 'NAIA',      conference: 'Southern States Athletic Conference',           city: 'Rome',            state: 'GA', hasScholarships: true  },
  { name: 'Benedictine College',             website: 'https://ravenssports.com/sports/womens-flag-football',                        division: 'NAIA',      conference: 'Heart of America Athletic Conference (HAAC)',   city: 'Atchison',        state: 'KS', hasScholarships: true  },
  { name: 'University of Texas',             website: 'https://texassports.com/sports/womens-flag-football',                         division: 'NCAA DI',   conference: 'Big 12 Conference',                             city: 'Austin',          state: 'TX', hasScholarships: true  },
  { name: 'Florida State University',        website: 'https://seminoles.com/sports/womens-flag-football',                           division: 'NCAA DI',   conference: 'Atlantic Coast Conference (ACC)',               city: 'Tallahassee',     state: 'FL', hasScholarships: true  },
  { name: 'SUNY Brockport',                  website: 'https://gobrockport.com/sports/womens-flag-football/stats',                   division: 'NCAA DIII', conference: 'SUNY Athletic Conference (SUNYAC)',             city: 'Brockport',       state: 'NY', hasScholarships: false },
  { name: 'Chestnut Hill College',           website: 'https://griffinathletics.com/sports/womens-flag-football/roster',            division: 'NCAA DII',  conference: 'Atlantic East Conference',                      city: 'Philadelphia',    state: 'PA', hasScholarships: null  },
] as const;

async function seed() {
  console.log('Seeding 23 flag football programs...');
  for (const school of SCHOOLS) {
    const existing = await db.select({ id: schema.teams.id }).from(schema.teams)
      .where(eq(schema.teams.name, school.name)).limit(1);

    let teamId: number;
    if (existing.length > 0) {
      teamId = existing[0].id;
      console.log(`  skip  ${school.name} (id=${teamId})`);
    } else {
      const inserted = await db.insert(schema.teams).values({
        name: school.name,
        division: school.division,
        conference: school.conference ?? null,
        city: school.city,
        state: school.state,
        type: 'college',
      }).returning({ id: schema.teams.id });
      teamId = inserted[0].id;
      console.log(`  added ${school.name} (id=${teamId})`);
    }

    const existingDetail = await db.select({ id: schema.programDetails.id }).from(schema.programDetails)
      .where(eq(schema.programDetails.teamId, teamId)).limit(1);
    if (existingDetail.length === 0) {
      await db.insert(schema.programDetails).values({
        teamId,
        websiteUrl: school.website,
        hasScholarships: school.hasScholarships ?? null,
      });
    }
  }
  console.log('Done!');
  await pool.end();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
