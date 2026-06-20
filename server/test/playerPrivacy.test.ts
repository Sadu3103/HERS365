import { describe, it, expect } from 'vitest';
import { publicPlayerView, selfPlayerView } from '../lib/playerPrivacy';

// Directive 1 sentinel: if any of these fields ever ship to a non-owner
// caller, this test should fail before the regression hits prod.
const SENSITIVE = ['email', 'phone', 'dob', 'zipCode', 'pendingParentEmail', 'passwordHash'] as const;

const FULL_ROW = {
  id: 42,
  name: 'Olivia Test',
  position: 'QB',
  state: 'CA',
  city: 'San Diego',
  school: 'Westview HS',
  // Sensitive — must be stripped from publicPlayerView.
  email: 'olivia@example.com',
  phone: '555-867-5309',
  dob: new Date('2009-04-12'),
  zipCode: '92127',
  pendingParentEmail: 'parent@example.com',
  passwordHash: '$2b$04$abcdef',
};

describe('publicPlayerView', () => {
  it('strips every sensitive field from a populated row', () => {
    const view = publicPlayerView(FULL_ROW)!;
    for (const k of SENSITIVE) {
      expect(view, `field ${k} should be stripped`).not.toHaveProperty(k);
    }
  });

  it('keeps non-sensitive fields intact', () => {
    const view = publicPlayerView(FULL_ROW)!;
    expect(view).toMatchObject({
      id: 42,
      name: 'Olivia Test',
      position: 'QB',
      state: 'CA',
      school: 'Westview HS',
    });
  });

  it('passes null/undefined through unchanged', () => {
    expect(publicPlayerView(null)).toBeNull();
    expect(publicPlayerView(undefined)).toBeUndefined();
  });
});

describe('selfPlayerView', () => {
  it('keeps contact info but drops the password hash', () => {
    const view = selfPlayerView(FULL_ROW)!;
    expect(view).not.toHaveProperty('passwordHash');
    expect(view).toMatchObject({
      email: 'olivia@example.com',
      phone: '555-867-5309',
      zipCode: '92127',
    });
  });
});
