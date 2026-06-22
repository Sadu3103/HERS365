import { db } from '../../db';
import * as schema from '../../schema';
import { signToken, type UserRole } from '../../auth';
import bcrypt from 'bcryptjs';

// cost 4: fast for tests, same algorithm as hashPassword (cost 12)
const PW_HASH = bcrypt.hashSync('Test-pw-123', 4);
let seq = 0;
const email = (tag: string) => `${tag}-${++seq}@test.local`;

export async function makeAthlete(overrides: Partial<typeof schema.players.$inferInsert> = {}) {
  const [row] = await db.insert(schema.players).values({
    email: email('athlete'),
    passwordHash: PW_HASH,
    name: 'Test Athlete',
    age: 15,
    state: 'CA',
    city: 'Los Angeles',
    ...overrides,
  }).returning();
  return row;
}

export async function makeCoach(overrides: Partial<typeof schema.coaches.$inferInsert> = {}) {
  // Default to a verified coach — the unverified state is its own workflow and
  // is exercised by dedicated tests via { verifiedStatus: false }.
  const [row] = await db.insert(schema.coaches).values({
    email: email('coach'),
    passwordHash: PW_HASH,
    name: 'Test Coach',
    verifiedStatus: true,
    ...overrides,
  }).returning();
  return row;
}

export async function makeParent(overrides: Partial<typeof schema.parents.$inferInsert> = {}) {
  const [row] = await db.insert(schema.parents).values({
    email: email('parent'),
    passwordHash: PW_HASH,
    name: 'Test Parent',
    ...overrides,
  }).returning();
  return row;
}

export async function linkParentChild(parentId: number, playerId: number) {
  const [row] = await db.insert(schema.parentChildRelations).values({
    parentId, playerId, relationship: 'guardian',
  }).returning();
  return row;
}

export function tokenFor(user: { id: number; email: string; name: string | null }, role: UserRole) {
  return signToken({ userId: user.id, email: user.email, role, name: user.name ?? '' });
}
