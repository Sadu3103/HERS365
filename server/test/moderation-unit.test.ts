import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the OpenAI SDK at the module boundary so the real moderateMessage()
// runs end-to-end. moderation.test.ts already covers the full HTTP path with
// the moderation module mocked; this file does the inverse and exercises the
// branches that file can't reach.
const createMock = vi.fn();
vi.mock('openai', () => ({
  default: class MockOpenAI {
    moderations = { create: createMock };
  },
}));

// Imported after vi.mock so the moderation module picks up the mocked SDK.
import { moderateMessage, _resetModerationClientForTests } from '../lib/moderation';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  createMock.mockReset();
  _resetModerationClientForTests();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  _resetModerationClientForTests();
});

describe('moderateMessage', () => {
  it('(a) returns allowed:true when the OpenAI response is not flagged', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.NODE_ENV = 'test';
    createMock.mockResolvedValueOnce({
      results: [{ flagged: false, categories: { hate: false, violence: false } }],
    });

    const res = await moderateMessage('hello coach, looking forward to camp');

    expect(res).toEqual({ allowed: true });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      model: 'omni-moderation-latest',
      input: 'hello coach, looking forward to camp',
    });
  });

  it('(b) returns allowed:false with reason listing only the true categories when flagged', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.NODE_ENV = 'test';
    createMock.mockResolvedValueOnce({
      results: [{
        flagged: true,
        categories: {
          harassment: true,
          'harassment/threatening': true,
          hate: false,
          violence: false,
          'self-harm': false,
        },
      }],
    });

    const res = await moderateMessage('flagged payload');

    expect(res.allowed).toBe(false);
    if (res.allowed === false) {
      expect(res.reason.startsWith('flagged:')).toBe(true);
      expect(res.reason).toContain('harassment');
      expect(res.reason).toContain('harassment/threatening');
      expect(res.reason).not.toContain('hate');
      expect(res.reason).not.toContain('violence');
      expect(res.reason).not.toContain('self-harm');
    }
  });

  it('(b) returns bare "flagged" reason when the API flags without surfacing categories', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.NODE_ENV = 'test';
    createMock.mockResolvedValueOnce({
      results: [{ flagged: true, categories: {} }],
    });

    const res = await moderateMessage('flagged but no categories');

    expect(res).toEqual({ allowed: false, reason: 'flagged' });
  });

  it('(c) returns allowed:false reason:"moderation_failed" when the OpenAI call throws', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.NODE_ENV = 'test';
    createMock.mockRejectedValueOnce(new Error('upstream 503'));

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_failed' });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('(d) returns allowed:false reason:"moderation_unavailable" in production with no API key (fail closed)', async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = 'production';

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_unavailable' });
    // Never hits the SDK because there is no client.
    expect(createMock).not.toHaveBeenCalled();
  });

  it('(e) returns allowed:true in non-production with no API key (fail open for dev/CI)', async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = 'test';

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: true });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('(e) fail-open also applies when NODE_ENV is "development"', async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = 'development';

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: true });
    expect(createMock).not.toHaveBeenCalled();
  });

  // CRITICAL: this is the prod-runtime case in this repo, where NODE_ENV
  // is not reliably set. An "if NODE_ENV === 'production'" check would
  // have fallen through to the dev fail-open branch here. The positive
  // non-prod assertion must NOT.
  it('(f) returns allowed:false reason:"moderation_unavailable" when env is UNSET and key is missing (fail closed, no NODE_ENV in prod runtime)', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.NODE_ENV;
    delete process.env.APP_ENV;

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_unavailable' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('(f) also fails closed when env is an unrecognized string and key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = 'staging';
    delete process.env.APP_ENV;

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_unavailable' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('(g) APP_ENV=development overrides NODE_ENV=production for the fail-open path', async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.APP_ENV = 'development';
    process.env.NODE_ENV = 'production';

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: true });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('_resetModerationClientForTests() rebuilds the client after an env change', async () => {
    // First call: no key → fail-open (test env), no SDK construction.
    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = 'test';
    const first = await moderateMessage('a');
    expect(first).toEqual({ allowed: true });
    expect(createMock).not.toHaveBeenCalled();

    // Provide a key and reset the cached client — the next call must
    // actually go through the (mocked) SDK.
    process.env.OPENAI_API_KEY = 'sk-test';
    _resetModerationClientForTests();
    createMock.mockResolvedValueOnce({ results: [{ flagged: false, categories: {} }] });

    const second = await moderateMessage('b');
    expect(second).toEqual({ allowed: true });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      model: 'omni-moderation-latest',
      input: 'b',
    });
  });
});
