import { Component, type ErrorInfo, type ReactNode } from 'react';

// Per-field caps mirror the server-side allow-list in server/api/errors.ts so
// nothing oversized is sent over the wire either. The boundary is the last
// line of defence for an unhandled React error; we never want it to fail in
// a way that makes the error worse (huge payload, blocking the unload, or
// leaking user-generated content).
const MAX_MESSAGE = 500;
const MAX_COMPONENT_STACK = 2000;
const MAX_ROUTE = 200;
const MAX_USER_AGENT = 300;

interface ErrorPayload {
  message: string;
  componentStack: string;
  route: string;
  userAgent: string;
}

function buildPayload(error: Error, info: ErrorInfo): ErrorPayload {
  return {
    message: (error.message ?? '').slice(0, MAX_MESSAGE),
    componentStack: (info.componentStack ?? '').slice(0, MAX_COMPONENT_STACK),
    route:
      typeof window !== 'undefined'
        ? window.location.pathname.slice(0, MAX_ROUTE)
        : '',
    userAgent:
      typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, MAX_USER_AGENT)
        : '',
  };
}

// Fire-and-forget. sendBeacon is the right tool — it survives a page unload
// or navigation, doesn't block, and the browser handles retry semantics. We
// fall back to fetch+keepalive only when sendBeacon is unavailable (older
// Safari / non-browser test envs). Both paths swallow their own errors so a
// reporting failure can never re-trigger the boundary.
function reportError(payload: ErrorPayload): void {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/errors', blob);
      return;
    }
  } catch {
    // sendBeacon can throw on some hardened browsers; fall through to fetch.
  }
  try {
    if (typeof fetch !== 'undefined') {
      void fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // last-resort: nothing else we can do without making the error louder.
  }
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * App-root error boundary. componentDidCatch needs a class component — hooks
 * cannot replace it in React 19. On a render-time crash we:
 *
 *  1. send a sanitized POST to /api/errors via sendBeacon (with fetch
 *     fallback) so server-side logging picks up the failure regardless of
 *     whether the user reloads.
 *  2. show a minimal dark "Something went wrong" card with a reload button.
 *     The raw error message is intentionally NOT rendered for the user —
 *     this is a minors platform and a stack trace string can carry leaked
 *     internals that should not be on screen.
 */
export default class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(buildPayload(error, info));
  }

  private handleReload = (): void => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          color: '#f4f4f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            background: '#111',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '36px 32px',
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '1.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              margin: '0 0 10px',
              color: '#f4f4f2',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '0.92rem',
              color: '#9a9a96',
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}
          >
            We hit an unexpected error. Reload to try again — your work isn&apos;t lost.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              background: '#ff5a2d',
              color: '#0a0a0c',
              border: 'none',
              borderRadius: 10,
              padding: '11px 24px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '0.95rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 6px 22px rgba(255,90,45,.32)',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
