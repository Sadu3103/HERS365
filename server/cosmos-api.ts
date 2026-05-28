/**
 * COSMOS DB INTEGRATION SERVICE
 * High-performance API layer for social recruiting platform
 * Sub-200ms latency optimization with enterprise-scale caching
 */

import express, { Request, Response, NextFunction } from 'express';
import { OptimizedCosmosClient, COSMOS_SCHEMA } from './cosmos-schema';
import { RepositoryFactory } from './cosmos-repositories';
import { HybridCacheManager, RedisCacheClient, CacheAsideManager } from './cache-layer';
import { eventPublisher } from './service-bus';
import { logger } from './logger';
import { correlation } from './observability';
import { v4 as uuidv4 } from 'uuid';

// ─── PERFORMANCE MIDDLEWARE ───────────────────────────────────────────────────

/**
 * Response time tracking middleware
 */
function responseTimeTracker(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const correlationId = correlation.extractCorrelationId(req.headers);

  // Add correlation ID to response
  res.setHeader('x-correlation-id', correlationId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = `${req.method} ${req.route?.path || req.path}`;

    // Log slow requests
    if (duration > 200) {
      logger.warn(`Slow request: ${route} took ${duration}ms`, {
        correlationId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userAgent: req.headers['user-agent']
      });
    }

    // Record metrics
    if (global.metrics) {
      global.metrics.recordHistogram('http_request_duration', duration, {
        method: req.method,
        route: route,
        status: res.statusCode.toString()
      });
    }
  });

  next();
}

/**
 * Cache middleware for GET requests
 */
function cacheMiddleware(ttl: number = 300) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const cacheKey = `http:${req.originalUrl}`;
    const cached = await global.cacheAside?.get(cacheKey, () => null, ttl);

    if (cached) {
      res.setHeader('x-cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json;
    res.json = function(data) {
      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        global.cacheAside?.set(cacheKey, data, async () => {}, ttl);
      }
      res.setHeader('x-cache', 'MISS');
      return originalJson.call(this, data);
    };

    next();
  };
}

// ─── COSMOS DB API SERVICE ───────────────────────────────────────────────────

export class CosmosAPIService {
  private app: express.Application;
  private cosmosClient!: OptimizedCosmosClient;
  private repositories!: RepositoryFactory;
  private cacheManager!: HybridCacheManager;
  private cacheAside!: CacheAsideManager;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(responseTimeTracker);

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-correlation-id, x-cache');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', this.healthCheck.bind(this));

    // User APIs
    this.app.get('/users/:userId', cacheMiddleware(300), this.getUser.bind(this));
    this.app.put('/users/:userId', this.updateUser.bind(this));
    this.app.get('/users/:userId/posts', cacheMiddleware(600), this.getUserPosts.bind(this));

    // Post APIs
    this.app.post('/posts', this.createPost.bind(this));
    this.app.get('/posts/hashtag/:hashtag', cacheMiddleware(300), this.getPostsByHashtag.bind(this));
    this.app.put('/posts/:postId/engagement', this.updatePostEngagement.bind(this));

    // Message APIs
    this.app.get('/conversations/:conversationId/messages', cacheMiddleware(60), this.getConversationMessages.bind(this));
    this.app.post('/messages', this.sendMessage.bind(this));
    this.app.put('/messages/read', this.markMessagesRead.bind(this));
    this.app.get('/users/:userId/unread-count', cacheMiddleware(30), this.getUnreadCount.bind(this));

    // Search APIs
    this.app.post('/search/athletes', cacheMiddleware(1800), this.searchAthletes.bind(this));

    // Analytics APIs
    this.app.get('/analytics/:metricType/:timeBucket', cacheMiddleware(3600), this.getAnalytics.bind(this));

    // Audit APIs
    this.app.get('/audit/compliance/:userId', this.getComplianceAudit.bind(this));
    this.app.get('/audit/security/incidents', this.getSecurityIncidents.bind(this));
  }

  /**
   * Initialize with Cosmos DB and caching
   */
  async initialize(): Promise<void> {
    // Initialize Cosmos DB
    this.cosmosClient = new OptimizedCosmosClient(COSMOS_SCHEMA);
    await this.cosmosClient.initialize();

    // Initialize repositories
    this.repositories = RepositoryFactory.getInstance(this.cosmosClient);

    // Initialize caching
    const redisClient = new RedisCacheClient();
    this.cacheManager = new HybridCacheManager(redisClient, this.cosmosClient);
    this.cacheAside = new CacheAsideManager(this.cacheManager);

    // Make globally available for middleware
    (global as any).cacheAside = this.cacheAside;

    logger.info('Cosmos DB API Service initialized');
  }

  // ─── HEALTH CHECK ───────────────────────────────────────────────────────────

  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();

      // Check Cosmos DB connectivity
      const cosmosHealth = await this.cosmosClient.getRUConsumption();

      // Check cache connectivity
      const cacheStats = this.cacheManager.getCacheStats();

      // Check overall performance
      const performance = this.cacheManager.getPerformanceMetrics();

      const totalLatency = Date.now() - startTime;
      const healthy = totalLatency < 100; // Sub-100ms health check

      res.status(healthy ? 200 : 503).json({
        status: healthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        latency: totalLatency,
        checks: {
          cosmos: {
            status: 'ok',
            ruConsumption: cosmosHealth
          },
          cache: {
            status: cacheStats.redis.connected ? 'ok' : 'error',
            stats: cacheStats
          },
          performance: {
            status: performance.overall.slowOperationsPercent < 5 ? 'ok' : 'warning',
            metrics: performance
          }
        }
      });
    } catch (error) {
      logger.error('Health check failed:', error as Error);
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ─── USER APIs ─────────────────────────────────────────────────────────────

  private async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params as any;
      const user = await this.cacheManager.getUser(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user });
    } catch (error) {
      logger.error(`Error getting user ${req.params.userId}:`, error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params as any;
      const updates = req.body;

      const user = await this.cacheManager.updateUser(userId, updates);

      // Publish user updated event
      await eventPublisher.publishUserCreated({
        userId: userId as string,
        userType: user.userType,
        email: user.email,
        name: user.name,
        correlationId: correlation.extractCorrelationId(req.headers),
        source: 'cosmos-api-service',
        metadata: updates
      });

      res.json({ user });
    } catch (error) {
      logger.error(`Error updating user ${req.params.userId}:`, error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async getUserPosts(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const result = await this.cacheManager.getUserPosts(userId as string, page, limit);

      res.json({
        posts: result.posts,
        pagination: {
          page,
          limit,
          hasMore: result.posts.length === limit
        },
        cached: result.cached
      });
    } catch (error) {
      logger.error(`Error getting posts for user ${req.params.userId}:`, error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ─── POST APIs ─────────────────────────────────────────────────────────────

  private async createPost(req: Request, res: Response): Promise<void> {
    try {
      const postData = {
        authorId: req.body.authorId,
        content: req.body.content,
        postType: req.body.postType || 'text',
        visibility: req.body.visibility || 'public',
        hashtags: req.body.hashtags || [],
        mentions: req.body.mentions || [],
        location: req.body.location,
        media: req.body.media,
        complianceFlags: req.body.complianceFlags || []
      };

      const post = await this.cacheManager.createPost(postData);

      // Publish post created event
      await eventPublisher.publish({
        id: uuidv4(),
        eventType: 'PostCreated' as any,
        aggregateId: post.postId,
        aggregateType: 'Post',
        timestamp: new Date().toISOString(),
        correlationId: correlation.extractCorrelationId(req.headers),
        userId: post.authorId,
        userType: 'athlete', // Would be determined from user
        source: 'cosmos-api-service',
        version: 1,
        metadata: {
          priority: 'medium',
          complianceFlags: post.complianceFlags
        },
        payload: post
      });

      res.status(201).json({ post });
    } catch (error) {
      logger.error('Error creating post:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async getPostsByHashtag(req: Request, res: Response): Promise<void> {
    try {
      const { hashtag } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const posts = await this.repositories.getPostRepository().getPostsByHashtag(`#${hashtag}`, undefined, limit);

      res.json({ posts });
    } catch (error) {
      logger.error(`Error getting posts for hashtag ${req.params.hashtag}:`, error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async updatePostEngagement(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params as any;
      const updates = req.body;

      await this.repositories.getPostRepository().updateEngagement(postId, updates);

      res.json({ success: true });
    } catch (error) {
      logger.error(`Error updating engagement for post ${req.params.postId}:`, error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ─── MESSAGE APIs ──────────────────────────────────────────────────────────

  private async getConversationMessages(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params as any;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const result = await this.cacheManager.getConversationMessages(conversationId, undefined, limit);

      res.json({
        messages: result.messages,
        cached: result.cached
      });
    } catch (error) {
      logger.error(`Error getting messages for conversation ${req.params.conversationId}:`, error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageData = {
        conversationId: req.body.conversationId,
        senderId: req.body.senderId,
        recipientId: req.body.recipientId,
        messageType: req.body.messageType || 'direct',
        content: req.body.content,
        attachments: req.body.attachments,
        complianceFlags: req.body.complianceFlags || [],
        status: 'sent' as const,
        partitionKey: `conv_${req.body.conversationId}`,
        messageId: uuidv4()
      };

      const message = await this.repositories.getMessageRepository().create(messageData);

      // Publish message sent event
      await eventPublisher.publish({
        id: uuidv4(),
        eventType: 'MessageSent' as any,
        aggregateId: (message as any).messageId,
        aggregateType: 'Message',
        timestamp: new Date().toISOString(),
        correlationId: correlation.extractCorrelationId(req.headers),
        userId: message.senderId,
        userType: 'athlete', // Would be determined from user
        source: 'cosmos-api-service',
        version: 1,
        metadata: {
          priority: 'high',
          complianceFlags: message.complianceFlags
        },
        payload: message
      });

      res.status(201).json({ message });
    } catch (error) {
      logger.error('Error sending message:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async markMessagesRead(req: Request, res: Response): Promise<void> {
    try {
      const { messageIds, userId } = req.body;

      await this.repositories.getMessageRepository().markMessagesAsRead(messageIds, userId);

      res.json({ success: true });
    } catch (error) {
      logger.error('Error marking messages as read:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const count = await this.repositories.getMessageRepository().getUnreadCount(userId as string);

      res.json({ unreadCount: count });
    } catch (error) {
      logger.error(`Error getting unread count for user ${req.params.userId}:`, error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ─── SEARCH APIs ───────────────────────────────────────────────────────────

  private async searchAthletes(req: Request, res: Response): Promise<void> {
    try {
      const filters = req.body;
      const sortBy = req.query.sortBy as string || 'ranking';

      const result = await this.cacheManager.searchAthletes(filters, sortBy);

      res.json({
        athletes: result.results,
        cached: result.cached,
        cacheKey: result.cacheKey
      });
    } catch (error) {
      logger.error('Error searching athletes:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ─── ANALYTICS APIs ────────────────────────────────────────────────────────

  private async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { metricType, timeBucket } = req.params;
      const dimensions = req.query;

      const result = await this.cacheManager.getAnalytics(metricType as string, timeBucket as string, dimensions as any);

      res.json({
        data: result.data,
        cached: result.cached
      });
    } catch (error) {
      logger.error(`Error getting analytics ${req.params.metricType}:`, error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ─── AUDIT APIs ────────────────────────────────────────────────────────────

  private async getComplianceAudit(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const complianceType = req.query.type as string;
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : new Date();

      const logs = await this.repositories.getAuditRepository().getComplianceTrail(
        userId as string,
        complianceType,
        fromDate,
        toDate
      );

      res.json({ auditLogs: logs });
    } catch (error) {
      logger.error(`Error getting compliance audit for user ${req.params.userId}:`, error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async getSecurityIncidents(req: Request, res: Response): Promise<void> {
    try {
      const severity = req.query.severity as string || 'high';
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);

      const incidents = await this.repositories.getAuditRepository().getSecurityIncidents(
        severity as any,
        fromDate
      );

      res.json({ incidents });
    } catch (error) {
      logger.error('Error getting security incidents:', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ─── SERVICE METHODS ───────────────────────────────────────────────────────

  getApp(): express.Application {
    return this.app;
  }

  async getPerformanceMetrics(): Promise<any> {
    return {
      cosmos: await this.cosmosClient.getRUConsumption(),
      cache: this.cacheManager.getCacheStats(),
      repositories: {
        // Repository-specific metrics could be added here
      }
    };
  }

  async close(): Promise<void> {
    // Close connections
    logger.info('Cosmos API Service closed');
  }
}

// ─── PERFORMANCE OPTIMIZATION UTILITIES ──────────────────────────────────────

/**
 * Query result caching decorator
 */
export function cached(ttl: number = 300) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const cacheKey = `method:${propertyName}:${JSON.stringify(args)}`;
      const cached = await (global as any).cacheAside?.get(cacheKey, () => method.apply(this, args), ttl);

      if (cached !== null) {
        return cached;
      }

      const result = await method.apply(this, args);
      if (result !== null) {
        await (global as any).cacheAside?.set(cacheKey, result, async () => {}, ttl);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Batch operation optimizer
 */
export class BatchOptimizer {
  private operations: Array<{ operation: Function; args: any[] }> = [];
  private batchSize: number = 10;

  constructor(batchSize: number = 10) {
    this.batchSize = batchSize;
  }

  add(operation: Function, ...args: any[]): void {
    this.operations.push({ operation, args });
  }

  async execute(): Promise<any[]> {
    const results: any[] = [];

    for (let i = 0; i < this.operations.length; i += this.batchSize) {
      const batch = this.operations.slice(i, i + this.batchSize);
      const batchPromises = batch.map(({ operation, args }) => operation(...args));
      const batchResults = await Promise.allSettled(batchPromises);

      results.push(...batchResults.map(result =>
        result.status === 'fulfilled' ? result.value : null
      ));
    }

    return results;
  }
}

// ─── EXPORT SERVICE ──────────────────────────────────────────────────────────
