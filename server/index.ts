// @ts-nocheck
/**
 * HERS365 ENTERPRISE PLATFORM
 * Event-driven microservices with Cosmos DB optimization
 * Sub-200ms latency at enterprise scale
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { serviceOrchestrator } from './microservices';
import { serviceBusClient } from './service-bus';
import { CosmosAPIService } from './cosmos-api';
import { ComplianceOrchestrator, ComplianceDashboard } from './compliance-orchestrator';
import { tracing, metrics } from './observability';
import { logger } from './logger';

dotenv.config();

// [D-02] Fail fast on missing required env vars
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];

// [D-09] Payments can be disabled in dev (PAYMENTS_ENABLED=false) so the
// platform runs without Stripe. When enabled (the default), all three Stripe
// keys are required at startup — otherwise the server boots fine and only
// fails when a user actually tries to pay.
const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED !== 'false';
if (PAYMENTS_ENABLED) {
  REQUIRED_ENV_VARS.push('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRO_PRICE_ID');
}

if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// [D-07] Guard against weak JWT signing secrets. Runs in every environment —
// a short/known secret used in dev tends to leak into prod, and a forgeable
// token is forgeable everywhere. Require at least 32 characters.
if (process.env.NODE_ENV !== 'test') {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    console.error(
      `JWT_SECRET must be set and at least 32 characters (got ${secret ? `${secret.length} chars` : 'unset'}). ` +
      `Generate one with:  openssl rand -base64 48`
    );
    process.exit(1);
  }
}

// Initialize tracing
tracing;

// Create main application
const app = express();
const port = process.env.COSMOS_API_PORT || 4000;

// [B-20] Security headers via helmet
app.use(helmet());

// [B-17] CORS — read from env
app.use(cors({
  origin: (process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim()),
  credentials: true,
}));

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize services
const cosmosAPIService = new CosmosAPIService();
const complianceOrchestrator = new ComplianceOrchestrator();
const complianceDashboard = new ComplianceDashboard(complianceOrchestrator);

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Stop compliance orchestrator
    await complianceOrchestrator.stop();

    // Stop microservices
    await serviceOrchestrator.stopServices();

    // Close Service Bus
    await serviceBusClient.close();

    // Close Cosmos DB connections
    await cosmosAPIService.close();

    logger.info('All services shut down successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  metrics.recordMetric('uncaught_exception', 1, 'counter');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', reason instanceof Error ? reason : { reason });
  metrics.recordMetric('unhandled_rejection', 1, 'counter');
  process.exit(1);
});

// Performance monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const correlationId = req.headers['x-correlation-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add correlation ID
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Start span for tracing
  const span = tracing.startSpan(`${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.originalUrl,
      'http.user_agent': req.headers['user-agent'],
      'correlation.id': correlationId
    }
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Record metrics
    metrics.incrementCounter('http_requests_total', {
      method: req.method,
      status: res.statusCode.toString(),
      path: req.path
    });

    metrics.recordHistogram('http_request_duration', duration, {
      method: req.method,
      path: req.path
    });

    // End tracing span
    span.setAttributes({
      'http.status_code': res.statusCode,
      'http.duration_ms': duration
    });
    span.end();

    // Log slow requests
    if (duration > 200) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        correlationId
      });
    }
  });

  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();

    // Check Cosmos DB connectivity
    const cosmosHealth = await cosmosAPIService.getPerformanceMetrics();

    // Check compliance orchestrator status
    const complianceStatus = complianceOrchestrator.getStatus();

    // Check overall system health
    const totalLatency = Date.now() - startTime;
    const healthy = totalLatency < 100; // Sub-100ms health check

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      latency: totalLatency,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        cosmos: {
          status: 'ok',
          metrics: cosmosHealth
        },
        compliance: {
          status: 'ok',
          components: complianceStatus.components
        },
        microservices: serviceOrchestrator.getAllServices().length
      },
      compliance: {
        frameworks: ['COPPA', 'FERPA', 'GDPR'],
        monitoring: 'active',
        lastCheck: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(metrics.exportPrometheus());
});

// Mount Cosmos DB API service
app.use('/api/v1', cosmosAPIService.getApp());

// Mount Compliance Orchestrator
// Note: Compliance orchestrator has its own internal app, routes are handled within the orchestrator

// Compliance Dashboard
app.get('/dashboard/compliance', async (req, res) => {
  try {
    const dashboardData = await complianceDashboard.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load compliance dashboard' });
  }
});

// [B-46] Lightweight API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Additional API Routes
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

// [B-08] Wire Stripe webhook BEFORE express.json() body parser
// The webhook route in paymentRouter uses express.raw() internally
app.use('/api/payments', paymentRouter);

app.use(express.json());

app.use('/api/rankings', rankingsRouter);
app.use('/api/athletes', athletesRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/training', trainingRouter);
app.use('/api/users', usersRouter);
app.use('/api/programs', programsRouter);
app.use('/api/coaches', coachesRouter);
app.use('/api/coach', coachRouter);
app.use('/api/auth', authRoutesRouter);
app.use('/api/auth/secure', authRoutesRouter);
app.use('/api/auth/email', emailAuthRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/admin', adminRouter);
app.use('/api', mainApiRouter);

// Main startup function
async function startApplication() {
  try {
    logger.info('🚀 Starting HERS365 Enterprise Platform...');

    // Validate environment
    if (!process.env.AZURE_SERVICEBUS_CONNECTION_STRING && !process.env.AZURE_SERVICEBUS_NAMESPACE) {
      logger.warn('⚠️ Azure Service Bus not configured - running in local mode');
    }

    const isMockCosmos = process.env.COSMOS_ENDPOINT?.includes('preview-mock') || 
                        process.env.COSMOS_KEY === 'preview-mock-key';

    if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY || isMockCosmos) {
      logger.warn('⚠️ Cosmos DB configuration missing or mock - running in limited local mode');
    } else {
      // Initialize Cosmos DB API service
      logger.info('📊 Initializing Cosmos DB API service...');
      try {
        await cosmosAPIService.initialize();
      } catch (error) {
        logger.error('❌ Failed to initialize Cosmos DB API service. Running in limited mode.', error);
      }
    }

    // Start microservices (if configured)
    if (process.env.AZURE_SERVICEBUS_CONNECTION_STRING || process.env.AZURE_SERVICEBUS_NAMESPACE) {
      logger.info('🔄 Starting microservices...');
      await serviceOrchestrator.startServices();

      logger.info('Available microservices:');
      serviceOrchestrator.getAllServices().forEach(service => {
        logger.info(`  - ${service['serviceName']} on port ${service['port']}`);
      });
    }

    // Start compliance orchestrator
    logger.info('📋 Starting compliance orchestrator...');
    await complianceOrchestrator.start();

    // Start main API server
    app.listen(port, () => {
      logger.info(`🌐 Main API server listening on port ${port}`);
      logger.info(`📈 Performance target: Sub-200ms latency`);
      logger.info(`🏗️  Architecture: Event-driven microservices with Cosmos DB`);
      logger.info(`🔒 Compliance: COPPA, FERPA, GDPR enabled`);
    });

    // Log system information
    logger.info('System information:', {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });

  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
startApplication();
