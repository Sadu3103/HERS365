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
import eventRouter from './eventRoutes';
import { scholarshipsRouter } from './api/scholarships';
import { storiesRouter } from './api/stories';
import { followsRouter } from './api/follows';
import { badgesRouter } from './api/badges';
import { faqsRouter } from './api/faqs';
import { contactRouter } from './api/contact';
import { adminStatsRouter } from './api/admin';
import { leaguesRouter } from './api/leagues';
import { teamsRouter } from './api/teams';
import { errorsRouter } from './api/errors';
import errorHandler from './middleware/errorHandler';
import { pool } from './db';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
      .split(',').map(o => o.trim()),
    credentials: true,
  }));
  app.use(express.json({ limit: '5mb' }));

  // Public health probe — used by Railway's deploy healthcheck (so a crash-looping
  // deploy is never promoted, the previous good one keeps serving) and by the
  // HERS365-HQ dashboard. CORS-open so the local dashboard file can read it.
  // Returns 200 whenever the app is responding; reports DB reachability in the
  // body rather than failing the probe, so a transient DB blip mid-deploy does
  // not reject an otherwise-healthy release.
  app.get('/health', async (_req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    let db = 'down';
    try { await pool.query('SELECT 1'); db = 'up'; } catch { /* db unreachable */ }
    res.json({ status: 'ok', db, uptime: Math.round(process.uptime()), time: new Date().toISOString() });
  });

  // Client error sink — mounted before every other /api/* router so an auth
  // crash on a pre-login page still reports up. No auth, allow-list schema,
  // rate limited. See server/api/errors.ts.
  app.use('/api/errors', errorsRouter);

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
  app.use('/api/admin/data', adminStatsRouter);
  app.use('/api/events', eventRouter);
  app.use('/api/scholarships', scholarshipsRouter);
  app.use('/api/stories', storiesRouter);
  app.use('/api/follows', followsRouter);
  app.use('/api/badges', badgesRouter);
  app.use('/api/faqs', faqsRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/leagues', leaguesRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api', mainApiRouter);

  // Final middleware: catches anything a route forwarded via next(err), logs
  // it server-side with a request id, and returns a generic 500 to the client.
  app.use(errorHandler);

  return app;
}
