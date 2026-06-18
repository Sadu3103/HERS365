// Single source of truth for athlete positions. HERS365 is girls flag football,
// so these are flag positions. Do not reintroduce tackle positions (TE, LB, DB):
// onboarding, rankings, recruiting and the fit calculator must all agree, or an
// athlete who picks "Rusher" cannot find herself in a "DB" filter.
export const FLAG_POSITIONS = [
  'QB',
  'WR',
  'RB',
  'Center',
  'Rusher',
  'Safety',
  'Cornerback',
  'Blitzer',
] as const;

export type FlagPosition = (typeof FLAG_POSITIONS)[number];

// For filter rows that need an "All" option in front.
export const POSITION_FILTERS = ['All', ...FLAG_POSITIONS] as const;
