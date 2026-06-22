import { describe, it, expect } from 'vitest';
import { assertDemoNotEnabledInProduction } from '../core-server';

// [D-12] Startup hard-refusal: defense in depth on top of the runtime gate in
// authRoutes.ts. A prod build with DEMO_ENABLED=true must not boot at all.
// Tested as a pure function so we never actually call process.exit here.
describe('assertDemoNotEnabledInProduction', () => {
  it('throws when NODE_ENV=production AND DEMO_ENABLED=true', () => {
    expect(() =>
      assertDemoNotEnabledInProduction({
        NODE_ENV: 'production',
        DEMO_ENABLED: 'true',
      } as NodeJS.ProcessEnv),
    ).toThrow(/SECURITY/i);
  });

  it('does not throw when NODE_ENV=production but DEMO_ENABLED is unset', () => {
    expect(() =>
      assertDemoNotEnabledInProduction({
        NODE_ENV: 'production',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it('does not throw when NODE_ENV=production but DEMO_ENABLED=false', () => {
    expect(() =>
      assertDemoNotEnabledInProduction({
        NODE_ENV: 'production',
        DEMO_ENABLED: 'false',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it('does not throw in development with DEMO_ENABLED=true (dev needs Instant Login)', () => {
    expect(() =>
      assertDemoNotEnabledInProduction({
        NODE_ENV: 'development',
        DEMO_ENABLED: 'true',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it('does not throw in test with DEMO_ENABLED=true', () => {
    expect(() =>
      assertDemoNotEnabledInProduction({
        NODE_ENV: 'test',
        DEMO_ENABLED: 'true',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it('error message names the offending vars so on-call can fix it fast', () => {
    try {
      assertDemoNotEnabledInProduction({
        NODE_ENV: 'production',
        DEMO_ENABLED: 'true',
      } as NodeJS.ProcessEnv);
      throw new Error('expected assertion to throw');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/DEMO_ENABLED/);
      expect(msg).toMatch(/production/i);
    }
  });
});
