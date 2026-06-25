import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Errors a handler can throw to request a non-500 status. The message is
// considered safe to expose to the client (it should already be a
// user-facing string, e.g. "Player not found" or "Invalid request id").
//
// Anything else — bare `Error`, `TypeError`, Postgres errors, Drizzle
// errors — is treated as a 500 with a generic message.
export class HttpError extends Error {
  readonly statusCode: number;
  readonly safeMessage: string;
  constructor(statusCode: number, safeMessage: string) {
    super(safeMessage);
    this.statusCode = statusCode;
    this.safeMessage = safeMessage;
    this.name = 'HttpError';
  }
}

function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}

// Per the directives: never leak stack traces, error names, DB error codes,
// or framework noise to clients. The server logs the full detail (so we
// can still triage in production); the client gets a generic message + a
// request id so support requests can be cross-referenced.
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // If headers were already sent, defer to Express's default close.
  if (res.headersSent) {
    return _next(err);
  }

  const requestId = randomUUID();

  if (isHttpError(err)) {
    res.status(err.statusCode).json({
      success: false,
      error: err.safeMessage,
      requestId,
    });
    return;
  }

  // Log full detail server-side. Includes method/path so the request id in
  // the client response is enough to find this line.
  const detail = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err;
  console.error(`[error] ${req.method} ${req.originalUrl} requestId=${requestId}`, detail);

  res.status(500).json({
    success: false,
    error: 'Something went wrong. Please try again.',
    requestId,
  });
};

export default errorHandler;
