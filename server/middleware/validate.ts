import { ZodTypeAny, type z } from 'zod';
import type { Request, RequestHandler } from 'express';

// Reject the request with a 400 before any handler runs. Field errors are
// surfaced so the client can highlight the offending input, but never the
// underlying error object or stack.
function makeValidator<S extends ZodTypeAny>(
  source: 'body' | 'params' | 'query',
  schema: S,
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse((req as Request)[source]);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    // Replace the raw input with the parsed (and coerced/trimmed) output so
    // downstream handlers operate on the narrowed shape.
    (req as Request)[source] = result.data;
    next();
  };
}

export const validateBody = <S extends ZodTypeAny>(schema: S): RequestHandler =>
  makeValidator('body', schema);

export const validateParams = <S extends ZodTypeAny>(schema: S): RequestHandler =>
  makeValidator('params', schema);

export const validateQuery = <S extends ZodTypeAny>(schema: S): RequestHandler =>
  makeValidator('query', schema);

// Helper for routes that want the inferred type without re-validating.
// Middleware has already run, so the cast is safe; the function exists so
// route handlers never reach for `any`.
export function parsedBody<S extends ZodTypeAny>(
  req: Request,
  _schema: S,
): z.infer<S> {
  return req.body as z.infer<S>;
}
