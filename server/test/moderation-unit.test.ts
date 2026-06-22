import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the Anthropic SDK at the module boundary so the real moderateMessage()
// runs end-to-end. moderation.test.ts already covers the full HTTP path with
// the moderation module mocked; this file does the inverse and exercises the
// branches that file can't reach.
const createMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

// Imported after vi.mock so the moderation module picks up the mocked SDK.
import { moderateMessage, _resetModerationClientForTests } from '../lib/moderation';

const ORIGINAL_ENV = { ...process.env };

// Helper: shape a fake Anthropic response containing a single text block
// whose .text is the JSON the structured-output schema would produce.
function verdictBlock(verdict: { allowed: boolean; categories?: string[]; reason?: string }) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          allowed: verdict.allowed,
          categories: verdict.categories ?? [],
          reason: verdict.reason ?? (verdict.allowed ? 'ok' : 'flagged'),
        }),
      },
    ],
  };
}

beforeEach(() => {
  createMock.mockReset();
  _resetModerationClientForTests();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  _resetModerationClientForTests();
});

describe('moderateMessage', () => {
  it('(a) returns allowed:true when the Claude verdict is allowed', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.NODE_ENV = 'test';
    createMock.mockResolvedValueOnce(verdictBlock({ allowed: true }));

    const res = await moderateMessage('hello coach, looking forward to camp');

    expect(res).toEqual({ allowed: true });
    expect(createMock).toHaveBeenCalledTimes(1);

    // Verify the request shape: Haiku 4.5, structured JSON output, cached
    // system rubric, no `thinking` and no `output_config.effort`.
    const args = createMock.mock.calls[0][0];
    expect(args.model).toBe('claude-haiku-4-5');
    expect(args.max_tokens).toBe(256);
    expect(args.thinking).toBeUndefined();
    expect(args.output_config?.effort).toBeUndefined();
    expect(args.output_config?.format?.type).toBe('json_schema');
    expect(args.output_config?.format?.schema?.required).toEqual(['allowed', 'categories', 'reason']);
    expect(args.system?.[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(args.messages?.[0]?.role).toBe('user');
    expect(args.messages?.[0]?.content).toBe('hello coach, looking forward to camp');
  });

  it('(b) returns allowed:false with reason listing the triggered categories', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.NODE_ENV = 'test';
    createMock.mockResolvedValueOnce(verdictBlock({
      allowed: false,
      categories: ['grooming', 'off_platform_contact'],
      reason: 'message asks the athlete to DM on Snapchat',
    }));

    const res = await moderateMessage('flagged payload');

    expect(res.allowed).toBe(false);
    if (res.allowed === false) {
      expect(res.reason.startsWith('flagged:')).toBe(true);
      expect(res.reason).toContain('grooming');
      expect(res.reason).toContain('off_platform_contact');
    }
  });

  it('(b) returns bare "flagged" reason when allowed:false but no categories surfaced', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.NODE_ENV = 'test';
    createMock.mockResolvedValueOnce(verdictBlock({
      allowed: false,
      categories: [],
      reason: 'borderline',
    }));

    const res = await moderateMessage('flagged but no categories');

    expect(res).toEqual({ allowed: false, reason: 'flagged' });
  });

  it('(c) returns allowed:false reason:"moderation_failed" when the Anthropic call throws', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.NODE_ENV = 'test';
    createMock.mockRejectedValueOnce(new Error('upstream 503'));

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_failed' });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('(c) returns allowed:false reason:"moderation_failed" when the response has no text block', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.NODE_ENV = 'test';
    createMock.mockResolvedValueOnce({ content: [{ type: 'tool_use', name: 'unused', input: {} }] });

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_failed' });
  });

  it('(c) returns allowed:false reason:"moderation_failed" on unparseable JSON', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.NODE_ENV = 'test';
    createMock.mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json at all' }] });

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_failed' });
  });

  it('(c) returns allowed:false reason:"moderation_failed" when JSON is valid but misses required fields', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.NODE_ENV = 'test';
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ allowed: true /* missing categories, reason */ }) }],
    });

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_failed' });
  });

  it('(d) returns allowed:false reason:"moderation_unavailable" in production with no API key (fail closed)', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.NODE_ENV = 'production';

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_unavailable' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('(e) returns allowed:true in non-production with no API key (fail open for dev/CI)', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.NODE_ENV = 'test';

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: true });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('(e) fail-open also applies when NODE_ENV is "development"', async () => {
    delete process.env.ANTHROPIC_API_KEY;
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
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.NODE_ENV;
    delete process.env.APP_ENV;

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_unavailable' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('(f) also fails closed when env is an unrecognized string and key is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.NODE_ENV = 'staging';
    delete process.env.APP_ENV;

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: false, reason: 'moderation_unavailable' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('(g) APP_ENV=development overrides NODE_ENV=production for the fail-open path', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.APP_ENV = 'development';
    process.env.NODE_ENV = 'production';

    const res = await moderateMessage('anything');

    expect(res).toEqual({ allowed: true });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('_resetModerationClientForTests() rebuilds the client after an env change', async () => {
    // First call: no key → fail-open (test env), no SDK construction.
    delete process.env.ANTHROPIC_API_KEY;
    process.env.NODE_ENV = 'test';
    const first = await moderateMessage('a');
    expect(first).toEqual({ allowed: true });
    expect(createMock).not.toHaveBeenCalled();

    // Provide a key and reset the cached client — the next call must
    // actually go through the (mocked) SDK.
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    _resetModerationClientForTests();
    createMock.mockResolvedValueOnce(verdictBlock({ allowed: true }));

    const second = await moderateMessage('b');
    expect(second).toEqual({ allowed: true });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0].messages[0].content).toBe('b');
  });
});
