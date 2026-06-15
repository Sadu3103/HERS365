import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import coachRouter from './coachRoutes';
import paymentRouter from './paymentRoutes';
import authRoutesRouter from './authRoutes';
import adminRouter from './adminRoutes';
import uploadRouter from './uploadRoutes';
import emailAuthRouter from './emailAuthRoutes';
import mainApiRouter from './routes';
import { rankingsRouter } from './api/rankings';
import { athletesRouter } from './api/athletes';
import { messagesRouter } from './api/messages';
import { trainingRouter } from './api/training';
import { usersRouter } from './api/users';
import { programsRouter } from './api/programs';
import { coachesRouter } from './api/coaches';
import { parentRouter } from './api/parent';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
      .split(',').map(o => o.trim()),
    credentials: true,
  }));
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api/payments', paymentRouter);
  app.use('/api/rankings', rankingsRouter);
  app.use('/api/athletes', athletesRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/training', trainingRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/programs', programsRouter);
  app.use('/api/coaches', coachesRouter);
  app.use('/api/parent', parentRouter);
  app.use('/api/coach', coachRouter);
  app.use('/api/auth', authRoutesRouter);
  app.use('/api/auth/secure', authRoutesRouter);
  app.use('/api/auth/email', emailAuthRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', mainApiRouter);

  return app;
}
