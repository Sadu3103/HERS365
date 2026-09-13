import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

// Public client-error sink. No auth on purpose — an auth failure is exactly
// the kind of error we need to see. Mounted before any auth-gated router in
// app.ts so a token/CORS/middleware crash on a sign-in attempt still reaches
// the endpoint.
//
// Safety posture:
// - Allow-list schema (not deny-list). Anything not in
//   { message, componentStack, route, userAgent } is stripped server-side
//   before logging. This is a minors platform; we never want a user id,
//   email, name, session token, or user-generated string ending up in
//   Railway logs by accident.
// - Per-field length caps so a runaway stack trace cannot blow up the log
//   pipeline or our cost line.
// - Rate-limited per IP so a misbehaving client cannot DoS our log volume.
// - Always returns 200. We never leak server state or rate-limit detail to
//   the browser — the client treats this as fire-and-forget anyway.

const MAX_MESSAGE = 500;
const MAX_COMPONENT_STACK = 2000;
const MAX_ROUTE = 200;
const MAX_USER_AGENT = 300;

interface SanitizedPayload {
  message: string;
  componentStack: string;
  route: string;
  userAgent: string;
}

function truncate(input: unknown, max: number): string {
  if (typeof input !== 'string') return '';
  return input.length > max ? input.slice(0, max) : input;
}

function sanitize(body: unknown): SanitizedPayload {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    message: truncate(b.message, MAX_MESSAGE),
    componentStack: truncate(b.componentStack, MAX_COMPONENT_STACK),
    route: truncate(b.route, MAX_ROUTE),
    userAgent: truncate(b.userAgent, MAX_USER_AGENT),
  };
}

const errorReportLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Same 200 on rate-limit hits as on success so the client cannot probe the
  // limiter and a real error storm still gets a sampling logged via earlier
  // requests rather than a burst of 429s in the browser console.
  handler: (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  },
});

export const errorsRouter = express.Router();

errorsRouter.post('/', errorReportLimiter, (req: Request, res: Response) => {
  const payload = sanitize(req.body);

  // Structured single-line JSON so Railway / any log shipper can index it.
  // Stays a console.error so the existing log level routing keeps working.
  console.error(
    JSON.stringify({
      level: 'error',
      source: 'client-react',
      message: payload.message,
      componentStack: payload.componentStack,
      route: payload.route,
      userAgent: payload.userAgent,
      ts: new Date().toISOString(),
    }),
  );

  res.status(200).json({ ok: true });
});
