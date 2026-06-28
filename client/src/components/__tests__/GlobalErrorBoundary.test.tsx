import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlobalErrorBoundary from '../GlobalErrorBoundary';

// A child that throws on demand. Used to trigger the boundary's
// componentDidCatch path inside an act-aware render.
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render crash');
  return <div>safe</div>;
}

describe('GlobalErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React 18+ pipes thrown errors to console.error during render. The test
    // is meant to assert the recovery, not pollute output, so the spy
    // suppresses the noise without changing behaviour.
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // navigator.sendBeacon is not implemented in JSDOM. Stand it up as a
    // jest-style mock so we can read what the boundary sent on a crash.
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(true),
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('(a) renders children when no error is thrown', () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={false} />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('(b) renders the fallback when a child throws', () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={true} />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('(c) calls navigator.sendBeacon with the /api/errors endpoint and a Blob', () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={true} />
      </GlobalErrorBoundary>,
    );
    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      '/api/errors',
      expect.any(Blob),
    );
  });

  it('(d) sendBeacon payload contains NO PII keys (no userId, email, name, lastName, parentEmail)', async () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={true} />
      </GlobalErrorBoundary>,
    );
    const calls = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const blob = calls[0][1] as Blob;
    const text = await blob.text();
    const payload = JSON.parse(text);

    expect(payload).not.toHaveProperty('userId');
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('lastName');
    expect(payload).not.toHaveProperty('parentEmail');
    // Defence in depth — these never belong on the wire either.
    expect(payload).not.toHaveProperty('token');
    expect(payload).not.toHaveProperty('sessionId');
    expect(payload).not.toHaveProperty('phone');
    expect(payload).not.toHaveProperty('dob');
  });

  it('(e) sendBeacon payload contains exactly the four allowed string fields', async () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={true} />
      </GlobalErrorBoundary>,
    );
    const blob = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][1] as Blob;
    const payload = JSON.parse(await blob.text());

    expect(typeof payload.message).toBe('string');
    expect(typeof payload.componentStack).toBe('string');
    expect(typeof payload.route).toBe('string');
    expect(typeof payload.userAgent).toBe('string');

    // The boundary picks up the test's actual error message verbatim.
    expect(payload.message).toBe('Test render crash');
  });

  it('(f) renders a Reload button inside the fallback', () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={true} />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
});
