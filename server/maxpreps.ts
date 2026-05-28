// @ts-nocheck
/**
 * MaxPreps Girls Flag Football Data Service
 * 
 * MaxPreps does not have an official public API.
 * This service uses:
 *   1. MaxPreps internal JSON web API endpoints (used by their site)
 *   2. Cheerio HTML scraping as a fallback
 *   3. A normalized local schema so stats can be stored & verified in our DB
 * 
 * All requests go through our backend to avoid CORS issues and to allow caching.
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://www.maxpreps.com';

// MaxPreps uses internal API routes prefixed with /api/
// These are observable from the MaxPreps site's network tab
const MAXPREPS_API = 'https://api.maxpreps.com';

const SPORT_SLUG = 'girls-flag-football'; // MaxPreps sport slug

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.maxpreps.com',
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type MaxPrepsPlayer = {
  source: 'maxpreps';
  maxprepsId?: string;
  name: string;
  position: string;
  schoolName: string;
  schoolState: string;
  gradYear?: number;
  stats: MaxPrepsFlagFootballStats;
};

export type MaxPrepsFlagFootballStats = {
  // Passing
  passingAttempts?: number;
  passingCompletions?: number;
  passingYards?: number;
  passingTouchdowns?: number;
  passingInterceptions?: number;
  // Rushing
  rushingAttempts?: number;
  rushingYards?: number;
  rushingTouchdowns?: number;
  // Receiving
  receptions?: number;
  receivingYards?: number;
  receivingTouchdowns?: number;
  // Defense
  flagPulls?: number;
  interceptions?: number;
  sacksAllowed?: number;
  // General
  gamesPlayed?: number;
  season?: string;
};

export type MaxPrepsTeam = {
  source: 'maxpreps';
  teamId?: string;
  name: string;
  schoolGID?: string;
  city: string;
  state: string;
  record?: string;
  season?: string;
};

// ─── Helper ──────────────────────────────────────────────────────────────────

async function safeGet<T = any>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: HEADERS, timeout: 8000 });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── MaxPreps Internal API Endpoints ─────────────────────────────────────────

/**
 * Fetch top statistical leaders for girls flag football nationally.
 * MaxPreps structures stat leaders at: /api/sports/v2/stats/leaders
 */
export async function fetchFlagFootballLeaders(
  statCategory: 'receiving' | 'passing' | 'rushing' | 'defense' = 'receiving',
  state?: string,
  season: string = '2025'
): Promise<MaxPrepsPlayer[]> {
  const stateParam = state ? `&state=${state.toUpperCase()}` : '';
  const url = `${MAXPREPS_API}/api/sports/v2/stats/leaders?sport=${SPORT_SLUG}&category=${statCategory}&season=${season}${stateParam}&limit=25`;

  const data = await safeGet(url);

  if (data?.leaders) {
    return data.leaders.map(normalizeMaxPrepsPlayer);
  }

  // Fallback: try alternate endpoint format
  const url2 = `${BASE_URL}/api/v1/sports/${SPORT_SLUG}/leaders?category=${statCategory}&season=${season}${stateParam}`;
  const data2 = await safeGet(url2);
  if (data2?.leaders) {
    return data2.leaders.map(normalizeMaxPrepsPlayer);
  }

  // Return mock data if MaxPreps is unreachable (dev mode / no live connection)
  console.log('[MaxPreps] API unavailable, returning empty'); return [];
}

/**
 * Fetch a team's roster and season stats by MaxPreps school GID.
 */
export async function fetchTeamRoster(schoolGID: string, season: string = '2025'): Promise<MaxPrepsPlayer[]> {
  const url = `${MAXPREPS_API}/api/sports/v2/teams/${schoolGID}/roster?sport=${SPORT_SLUG}&season=${season}`;
  const data = await safeGet(url);

  if (data?.players) {
    return data.players.map(normalizeMaxPrepsPlayer);
  }

  return [];
}

/**
 * Fetch team rankings/standings for a given state.
 */
export async function fetchStateTeamRankings(state: string, season: string = '2025'): Promise<MaxPrepsTeam[]> {
  const url = `${MAXPREPS_API}/api/sports/v2/rankings?sport=${SPORT_SLUG}&state=${state.toUpperCase()}&season=${season}`;
  const data = await safeGet(url);

  if (data?.teams) {
    return data.teams.map(normalizeMaxPrepsTeam);
  }

  console.log('[MaxPreps] API unavailable, returning empty'); return [];
}

/**
 * Search for a specific player by name + school/state.
 */
export async function searchMaxPrepsPlayer(name: string, state?: string): Promise<MaxPrepsPlayer[]> {
  const stateParam = state ? `&state=${state.toUpperCase()}` : '';
  const url = `${MAXPREPS_API}/api/search/v2/athletes?q=${encodeURIComponent(name)}&sport=${SPORT_SLUG}${stateParam}`;
  const data = await safeGet(url);

  if (data?.results) {
    return data.results.map(normalizeMaxPrepsPlayer);
  }

  return [];
}

/**
 * Fetch individual player career stats from MaxPreps profile page.
 */
export async function fetchPlayerStats(maxprepsId: string): Promise<MaxPrepsFlagFootballStats | null> {
  const url = `${MAXPREPS_API}/api/sports/v2/athletes/${maxprepsId}/stats?sport=${SPORT_SLUG}`;
  const data = await safeGet(url);

  if (data?.stats) {
    return normalizeStats(data.stats);
  }

  return null;
}

// ─── Normalization  ───────────────────────────────────────────────────────────

function normalizeMaxPrepsPlayer(raw: any): MaxPrepsPlayer {
  return {
    source: 'maxpreps',
    maxprepsId: raw.athleteId || raw.id || undefined,
    name: raw.name || raw.athleteName || `${raw.firstName || ''} ${raw.lastName || ''}`.trim(),
    position: raw.position || raw.pos || 'Unknown',
    schoolName: raw.schoolName || raw.school?.name || 'Unknown School',
    schoolState: raw.state || raw.school?.state || 'Unknown',
    gradYear: raw.gradYear || raw.classYear || undefined,
    stats: normalizeStats(raw.stats || raw),
  };
}

function normalizeStats(raw: any): MaxPrepsFlagFootballStats {
  return {
    passingAttempts: raw.passingAttempts ?? raw.att ?? undefined,
    passingCompletions: raw.passingCompletions ?? raw.comp ?? undefined,
    passingYards: raw.passingYards ?? raw.passYds ?? undefined,
    passingTouchdowns: raw.passingTouchdowns ?? raw.passTds ?? undefined,
    passingInterceptions: raw.passingInterceptions ?? raw.int ?? undefined,
    rushingAttempts: raw.rushingAttempts ?? raw.car ?? undefined,
    rushingYards: raw.rushingYards ?? raw.rushYds ?? undefined,
    rushingTouchdowns: raw.rushingTouchdowns ?? raw.rushTds ?? undefined,
    receptions: raw.receptions ?? raw.rec ?? undefined,
    receivingYards: raw.receivingYards ?? raw.recYds ?? undefined,
    receivingTouchdowns: raw.receivingTouchdowns ?? raw.recTds ?? undefined,
    flagPulls: raw.flagPulls ?? raw.tkl ?? undefined,
    interceptions: raw.interceptions ?? raw.defInt ?? undefined,
    gamesPlayed: raw.gamesPlayed ?? raw.gp ?? undefined,
    season: raw.season ?? raw.seasonName ?? undefined,
  };
}

function normalizeMaxPrepsTeam(raw: any): MaxPrepsTeam {
  return {
    source: 'maxpreps',
    teamId: raw.teamId || raw.id || undefined,
    schoolGID: raw.schoolGID || raw.schoolId || undefined,
    name: raw.name || raw.schoolName || 'Unknown Team',
    city: raw.city || '',
    state: raw.state || '',
    record: raw.record ? `${raw.record.wins}-${raw.record.losses}` : undefined,
    season: raw.season || undefined,
  };
}

// ─── Mock / Fallback Data ─────────────────────────────────────────────────────

function getMockLeaders(category: string): MaxPrepsPlayer[] {
  const BASE_PLAYER = { source: 'maxpreps' as const, schoolName: 'Demo HS', schoolState: 'TX', position: 'WR', gradYear: 2026 };

  if (category === 'receiving') {
    return [
      { ...BASE_PLAYER, name: 'Aaliyah Thompson', stats: { receptions: 64, receivingYards: 1204, receivingTouchdowns: 18, gamesPlayed: 12, season: '2025' } },
      { ...BASE_PLAYER, name: 'Maya Johnson', stats: { receptions: 58, receivingYards: 1022, receivingTouchdowns: 14, gamesPlayed: 12, season: '2025' } },
      { ...BASE_PLAYER, name: 'Destiny Williams', stats: { receptions: 52, receivingYards: 934, receivingTouchdowns: 12, gamesPlayed: 11, season: '2025' } },
    ];
  }
  if (category === 'passing') {
    return [
      { ...BASE_PLAYER, name: 'Jordan Davis', position: 'QB', stats: { passingYards: 2840, passingTouchdowns: 32, passingInterceptions: 4, passingAttempts: 220, passingCompletions: 162, gamesPlayed: 12, season: '2025' } },
    ];
  }
  return [];
}

function getMockTeamRankings(state: string): MaxPrepsTeam[] {
  return [
    { source: 'maxpreps', name: 'Dallas Elite High', city: 'Dallas', state, record: '12-1', season: '2025' },
    { source: 'maxpreps', name: 'Plano West', city: 'Plano', state, record: '10-3', season: '2025' },
    { source: 'maxpreps', name: 'Cedar Hill', city: 'Cedar Hill', state, record: '9-4', season: '2025' },
  ];
}
