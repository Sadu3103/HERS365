import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
