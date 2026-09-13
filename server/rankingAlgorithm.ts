// H.E.R.S.365 Ranking Algorithm
// Multi-source data integration for athlete rankings

export interface AthleteData {
  id: number;
  name: string;
  state: string;
  highSchool: string;
  graduationYear: number;
  position: string;
  combineStats?: CombineStats;
  maxPrepsStats?: MaxPrepsStats;
  zybekStats?: ZybekStats;
  usaTalentIdStats?: USATalentIdStats;
  otherStats?: OtherSourceStats;
}

export interface CombineStats {
  fortyYardDash?: number;
  threeConeDrill?: number;
  shuttleRun?: number;
  verticalJump?: number;
  broadJump?: number;
  benchPress?: number;
  sixtyYardDash?: number;
  routeRunning?: number;
  catching?: number;
  throwingAccuracy?: number;
  throwingPower?: number;
  eventId: string;
  eventDate: string;
}

export interface MaxPrepsStats {
  totalTackles?: number;
  totalSacks?: number;
  interceptions?: number;
  passingYards?: number;
  rushingYards?: number;
  receivingYards?: number;
  totalTouchdowns?: number;
  gamesPlayed: number;
  schoolYear: string;
  verified: boolean;
}

export interface ZybekStats {
  fortyYardDash?: number;
  shuttleRun?: number;
  threeConeDrill?: number;
  verticalJump?: number;
  broadJump?: number;
  powerThrow?: number;
  accuracy?: number;
  eventName: string;
  eventDate: string;
  verified: boolean;
}

export interface USATalentIdStats {
  overallRating?: number;
  speedRating?: number;
  agilityRating?: number;
  strengthRating?: number;
  techniqueRating?: number;
  eventName: string;
  eventDate: string;
  verified: boolean;
}

export interface OtherSourceStats {
  sourceName: string;
  stats: Record<string, number | string>;
  eventDate: string;
  verified: boolean;
}

// Ranking Weights Configuration
export const RANKING_WEIGHTS = {
  combine: {
    fortyYardDash: 15,      // Lower is better
    threeConeDrill: 10,     // Lower is better
    shuttleRun: 8,          // Lower is better
    verticalJump: 12,       // Higher is better
    broadJump: 10,         // Higher is better
    routeRunning: 10,       // Higher is better
    catching: 8,           // Higher is better
    throwingAccuracy: 8,    // Higher is better
    throwingPower: 9,       // Higher is better
  },
  maxPreps: {
    pointsPerGame: 15,      // Higher is better
    tacklesPerGame: 8,      // Higher is better
    sacksPerGame: 8,       // Higher is better
    interceptionsPerGame: 6, // Higher is better
    touchdowns: 10,        // Higher is better
    verified: 3,           // Bonus for verified data
  },
  zybek: {
    fortyYardDash: 12,
    shuttleRun: 8,
    threeConeDrill: 8,
    verticalJump: 10,
    broadJump: 10,
    powerThrow: 8,
    accuracy: 8,
    verified: 6,
  },
  usaTalentId: {
    overallRating: 25,
    speedRating: 15,
    agilityRating: 12,
    strengthRating: 10,
    techniqueRating: 8,
    verified: 5,
  },
};

// Normalize values to 0-100 scale
export function normalizeValue(value: number, min: number, max: number, lowerIsBetter: boolean = false): number {
  if (max === min) return 50;
  let normalized = ((value - min) / (max - min)) * 100;
  if (lowerIsBetter) {
    normalized = 100 - normalized;
  }
  return Math.max(0, Math.min(100, normalized));
}

// Calculate combine score
export function calculateCombineScore(stats: CombineStats | undefined): number {
  if (!stats) return 0;
  
  let score = 0;
  let weight = 0;
  
  // Forty yard dash (lower is better - elite: 4.3-4.5, avg: 5.0+)
  if (stats.fortyYardDash) {
    const normalized = normalizeValue(stats.fortyYardDash, 4.3, 5.5, true);
    score += normalized * (RANKING_WEIGHTS.combine.fortyYardDash / 100);
    weight += RANKING_WEIGHTS.combine.fortyYardDash;
  }
  
  // Three cone drill (lower is better)
  if (stats.threeConeDrill) {
    const normalized = normalizeValue(stats.threeConeDrill, 6.0, 8.0, true);
    score += normalized * (RANKING_WEIGHTS.combine.threeConeDrill / 100);
    weight += RANKING_WEIGHTS.combine.threeConeDrill;
  }
  
  // Shuttle run (lower is better)
  if (stats.shuttleRun) {
    const normalized = normalizeValue(stats.shuttleRun, 3.8, 5.0, true);
    score += normalized * (RANKING_WEIGHTS.combine.shuttleRun / 100);
    weight += RANKING_WEIGHTS.combine.shuttleRun;
  }
  
  // Vertical jump (higher is better)
  if (stats.verticalJump) {
    const normalized = normalizeValue(stats.verticalJump, 20, 40, false);
    score += normalized * (RANKING_WEIGHTS.combine.verticalJump / 100);
    weight += RANKING_WEIGHTS.combine.verticalJump;
  }
  
  // Broad jump (higher is better)
  if (stats.broadJump) {
    const normalized = normalizeValue(stats.broadJump, 8, 12, false);
    score += normalized * (RANKING_WEIGHTS.combine.broadJump / 100);
    weight += RANKING_WEIGHTS.combine.broadJump;
  }
  
  // Route running (higher is better, 1-10 scale)
  if (stats.routeRunning) {
    const normalized = stats.routeRunning * 10;
    score += normalized * (RANKING_WEIGHTS.combine.routeRunning / 100);
    weight += RANKING_WEIGHTS.combine.routeRunning;
  }
  
  // Catching (higher is better, 1-10 scale)
  if (stats.catching) {
    const normalized = stats.catching * 10;
    score += normalized * (RANKING_WEIGHTS.combine.catching / 100);
    weight += RANKING_WEIGHTS.combine.catching;
  }
  
  // Throwing accuracy (higher is better, 1-10 scale)
  if (stats.throwingAccuracy) {
    const normalized = stats.throwingAccuracy * 10;
    score += normalized * (RANKING_WEIGHTS.combine.throwingAccuracy / 100);
    weight += RANKING_WEIGHTS.combine.throwingAccuracy;
  }
  
  // Throwing power (higher is better, 1-10 scale)
  if (stats.throwingPower) {
    const normalized = stats.throwingPower * 10;
    score += normalized * (RANKING_WEIGHTS.combine.throwingPower / 100);
    weight += RANKING_WEIGHTS.combine.throwingPower;
  }
  
  return weight > 0 ? (score / weight) * 100 : 0;
}

// Calculate MaxPreps score
export function calculateMaxPrepsScore(stats: MaxPrepsStats | undefined): number {
  if (!stats || !stats.gamesPlayed || stats.gamesPlayed === 0) return 0;
  
  let score = 0;
  let weight = 0;
  
  const ppg = (stats.totalTouchdowns || 0) * 6 / stats.gamesPlayed; // Points per game estimate
  
  // Points per game
  if (ppg > 0) {
    const normalized = normalizeValue(ppg, 0, 10, false);
    score += normalized * (RANKING_WEIGHTS.maxPreps.pointsPerGame / 100);
    weight += RANKING_WEIGHTS.maxPreps.pointsPerGame;
  }
  
  // Tackles per game
  if (stats.totalTackles) {
    const tpg = stats.totalTackles / stats.gamesPlayed;
    const normalized = normalizeValue(tpg, 0, 10, false);
    score += normalized * (RANKING_WEIGHTS.maxPreps.tacklesPerGame / 100);
    weight += RANKING_WEIGHTS.maxPreps.tacklesPerGame;
  }
  
  // Sacks per game
  if (stats.totalSacks) {
    const spg = stats.totalSacks / stats.gamesPlayed;
    const normalized = normalizeValue(spg, 0, 2, false);
    score += normalized * (RANKING_WEIGHTS.maxPreps.sacksPerGame / 100);
    weight += RANKING_WEIGHTS.maxPreps.sacksPerGame;
  }
  
  // Interceptions per game
  if (stats.interceptions) {
    const ipg = stats.interceptions / stats.gamesPlayed;
    const normalized = normalizeValue(ipg, 0, 1, false);
    score += normalized * (RANKING_WEIGHTS.maxPreps.interceptionsPerGame / 100);
    weight += RANKING_WEIGHTS.maxPreps.interceptionsPerGame;
  }
  
  // Total touchdowns bonus
  if (stats.totalTouchdowns) {
    const normalized = normalizeValue(stats.totalTouchdowns, 0, 30, false);
    score += normalized * (RANKING_WEIGHTS.maxPreps.touchdowns / 100);
    weight += RANKING_WEIGHTS.maxPreps.touchdowns;
  }
  
  // Verified bonus
  if (stats.verified) {
    score += 3; // Fixed bonus for verified data
    weight += RANKING_WEIGHTS.maxPreps.verified;
  }
  
  return weight > 0 ? (score / weight) * 100 : 0;
}

// Calculate Zybek score
export function calculateZybekScore(stats: ZybekStats | undefined): number {
  if (!stats) return 0;
  
  let score = 0;
  let weight = 0;
  
  // Forty yard dash
  if (stats.fortyYardDash) {
    const normalized = normalizeValue(stats.fortyYardDash, 4.3, 5.5, true);
    score += normalized * (RANKING_WEIGHTS.zybek.fortyYardDash / 100);
    weight += RANKING_WEIGHTS.zybek.fortyYardDash;
  }
  
  // Shuttle run
  if (stats.shuttleRun) {
    const normalized = normalizeValue(stats.shuttleRun, 3.8, 5.0, true);
    score += normalized * (RANKING_WEIGHTS.zybek.shuttleRun / 100);
    weight += RANKING_WEIGHTS.zybek.shuttleRun;
  }
  
  // Three cone drill
  if (stats.threeConeDrill) {
    const normalized = normalizeValue(stats.threeConeDrill, 6.0, 8.0, true);
    score += normalized * (RANKING_WEIGHTS.zybek.threeConeDrill / 100);
    weight += RANKING_WEIGHTS.zybek.threeConeDrill;
  }
  
  // Vertical jump
  if (stats.verticalJump) {
    const normalized = normalizeValue(stats.verticalJump, 20, 40, false);
    score += normalized * (RANKING_WEIGHTS.zybek.verticalJump / 100);
    weight += RANKING_WEIGHTS.zybek.verticalJump;
  }
  
  // Broad jump
  if (stats.broadJump) {
    const normalized = normalizeValue(stats.broadJump, 8, 12, false);
    score += normalized * (RANKING_WEIGHTS.zybek.broadJump / 100);
    weight += RANKING_WEIGHTS.zybek.broadJump;
  }
  
  // Power throw
  if (stats.powerThrow) {
    const normalized = normalizeValue(stats.powerThrow, 30, 70, false);
    score += normalized * (RANKING_WEIGHTS.zybek.powerThrow / 100);
    weight += RANKING_WEIGHTS.zybek.powerThrow;
  }
  
  // Accuracy
  if (stats.accuracy) {
    const normalized = stats.accuracy * 10;
    score += normalized * (RANKING_WEIGHTS.zybek.accuracy / 100);
    weight += RANKING_WEIGHTS.zybek.accuracy;
  }
  
  // Verified bonus
  if (stats.verified) {
    score += 6;
    weight += RANKING_WEIGHTS.zybek.verified;
  }
  
  return weight > 0 ? (score / weight) * 100 : 0;
}

// Calculate USA Talent ID score
export function calculateUSATalentIdScore(stats: USATalentIdStats | undefined): number {
  if (!stats) return 0;
  
  let score = 0;
  let weight = 0;
  
  if (stats.overallRating) {
    score += stats.overallRating * (RANKING_WEIGHTS.usaTalentId.overallRating / 100);
    weight += RANKING_WEIGHTS.usaTalentId.overallRating;
  }
  
  if (stats.speedRating) {
    score += stats.speedRating * (RANKING_WEIGHTS.usaTalentId.speedRating / 100);
    weight += RANKING_WEIGHTS.usaTalentId.speedRating;
  }
  
  if (stats.agilityRating) {
    score += stats.agilityRating * (RANKING_WEIGHTS.usaTalentId.agilityRating / 100);
    weight += RANKING_WEIGHTS.usaTalentId.agilityRating;
  }
  
  if (stats.strengthRating) {
    score += stats.strengthRating * (RANKING_WEIGHTS.usaTalentId.strengthRating / 100);
    weight += RANKING_WEIGHTS.usaTalentId.strengthRating;
  }
  
  if (stats.techniqueRating) {
    score += stats.techniqueRating * (RANKING_WEIGHTS.usaTalentId.techniqueRating / 100);
    weight += RANKING_WEIGHTS.usaTalentId.techniqueRating;
  }
  
  if (stats.verified) {
    score += 5;
    weight += RANKING_WEIGHTS.usaTalentId.verified;
  }
  
  return weight > 0 ? (score / weight) * 100 : 0;
}

// Calculate overall ranking score
export function calculateRankingScore(athlete: AthleteData): {
  overallScore: number;
  combineScore: number;
  maxPrepsScore: number;
  zybekScore: number;
  usaTalentIdScore: number;
  dataSources: string[];
} {
  const dataSources: string[] = [];
  
  // Calculate individual source scores
  const combineScore = calculateCombineScore(athlete.combineStats);
  if (combineScore > 0) dataSources.push('combine');
  
  const maxPrepsScore = calculateMaxPrepsScore(athlete.maxPrepsStats);
  if (maxPrepsScore > 0) dataSources.push('maxpreps');
  
  const zybekScore = calculateZybekScore(athlete.zybekStats);
  if (zybekScore > 0) dataSources.push('zybek');
  
  const usaTalentIdScore = calculateUSATalentIdScore(athlete.usaTalentIdStats);
  if (usaTalentIdScore > 0) dataSources.push('usa_talent_id');
  
  // Weight each source type
  const SOURCE_WEIGHTS = {
    combine: 0.30,
    maxpreps: 0.25,
    zybek: 0.25,
    usa_talent_id: 0.20,
  };
  
  // Calculate weighted overall score
  let totalWeight = 0;
  let overallScore = 0;
  
  if (combineScore > 0) {
    overallScore += combineScore * SOURCE_WEIGHTS.combine;
    totalWeight += SOURCE_WEIGHTS.combine;
  }
  
  if (maxPrepsScore > 0) {
    overallScore += maxPrepsScore * SOURCE_WEIGHTS.maxpreps;
    totalWeight += SOURCE_WEIGHTS.maxpreps;
  }
  
  if (zybekScore > 0) {
    overallScore += zybekScore * SOURCE_WEIGHTS.zybek;
    totalWeight += SOURCE_WEIGHTS.zybek;
  }
  
  if (usaTalentIdScore > 0) {
    overallScore += usaTalentIdScore * SOURCE_WEIGHTS.usa_talent_id;
    totalWeight += SOURCE_WEIGHTS.usa_talent_id;
  }
  
  // Normalize by actual weights used
  const finalScore = totalWeight > 0 ? (overallScore / totalWeight) : 0;
  
  return {
    overallScore: Math.round(finalScore * 100) / 100,
    combineScore: Math.round(combineScore * 100) / 100,
    maxPrepsScore: Math.round(maxPrepsScore * 100) / 100,
    zybekScore: Math.round(zybekScore * 100) / 100,
    usaTalentIdScore: Math.round(usaTalentIdScore * 100) / 100,
    dataSources,
  };
}

// Get ranking tier based on score
export function getRankingTier(score: number): string {
  if (score >= 90) return 'Elite';
  if (score >= 75) return 'High Major';
  if (score >= 60) return 'Major';
  if (score >= 45) return 'Division I';
  if (score >= 30) return 'Division II';
  if (score >= 15) return 'Division III';
  return 'Developing';
}

// Get ranking tier color
export function getTierColor(tier: string): string {
  switch (tier) {
    case 'Elite': return '#FFD700'; // Gold
    case 'High Major': return '#C0C0C0'; // Silver
    case 'Major': return '#CD7F32'; // Bronze
    case 'Division I': return '#14B8A6'; // Teal
    case 'Division II': return '#3B82F6'; // Blue
    case 'Division III': return '#8B5CF6'; // Purple
    default: return '#6B7280'; // Gray
  }
}