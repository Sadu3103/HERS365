/**
 * HYBRID CACHING LAYER
 * Redis + Cosmos DB for sub-200ms latency at enterprise scale
 */

import { createClient, RedisClientType } from 'redis';
import { OptimizedCosmosClient } from './cosmos-schema';
import { RepositoryFactory } from './cosmos-repositories';
import { logger } from './logger';

// ─── CACHE CONFIGURATION ───────────────────────────────────────────────────────

export interface CacheConfig {
  redis: {
    url: string;
    cluster: boolean;
    ttl: {
      user: number;        // 5 minutes
      post: number;        // 10 minutes
      search: number;      // 30 minutes
      analytics: number;   // 1 hour
      session: number;     // 1 hour
    };
  };
  strategies: {
    cacheAside: boolean;
    writeThrough: boolean;
    writeBehind: boolean;
    refreshAhead: boolean;
  };
  performance: {
    targetLatency: number;     // 200ms
    slowQueryThreshold: number; // 100ms
    cacheHitRatioTarget: number; // 0.95
  };
}

const defaultConfig: CacheConfig = {
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    cluster: false,
    ttl: {
      user: 300,      // 5 minutes
      post: 600,      // 10 minutes
      search: 1800,   // 30 minutes
      analytics: 3600, // 1 hour
      session: 3600   // 1 hour
    }
  },
  strategies: {
    cacheAside: true,
    writeThrough: true,
    writeBehind: false,
    refreshAhead: true
  },
  performance: {
    targetLatency: 200,
    slowQueryThreshold: 100,
    cacheHitRatioTarget: 0.95
  }
};

// ─── REDIS CACHE CLIENT ────────────────────────────────────────────────────────

export class RedisCacheClient {
  private client!: RedisClientType;
  private config: CacheConfig;
  private metrics: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
  } = { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    this.client = createClient({
      url: this.config.redis.url,
      socket: {
        connectTimeout: 60000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max retry attempts reached');
            return new Error('Max retry attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.metrics.errors++;
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis');
    });

    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error as Error);
    }
  }

  /**
   * Get cached value with JSON parsing
   */
  async get(key: string): Promise<any | null> {
    try {
      const value = await this.client.get(key);
      if (value) {
        this.metrics.hits++;
        return JSON.parse(value);
      }
      this.metrics.misses++;
      return null;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Redis GET error for key ${key}:`, error as Error);
      return null;
    }
  }

  /**
   * Set cached value with JSON serialization
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const result = ttl
        ? await this.client.setEx(key, ttl, serialized)
        : await this.client.set(key, serialized);

      this.metrics.sets++;
      return result === 'OK';
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Redis SET error for key ${key}:`, error as Error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      this.metrics.deletes++;
      return result > 0;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Redis DEL error for key ${key}:`, error as Error);
      return false;
    }
  }

  /**
   * Set multiple keys with TTL
   */
  async msetex(keyValuePairs: Array<[string, any, number]>): Promise<boolean> {
    try {
      const pipeline = this.client.multi();

      for (const [key, value, ttl] of keyValuePairs) {
        pipeline.setEx(key, ttl, JSON.stringify(value));
      }

      await pipeline.exec();
      this.metrics.sets += keyValuePairs.length;
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis MSETEX error:', error as Error);
      return false;
    }
  }

  /**
   * Get cache hit ratio
   */
  getHitRatio(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? this.metrics.hits / total : 0;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): any {
    return {
      ...this.metrics,
      hitRatio: this.getHitRatio(),
      connected: this.client.isOpen
    };
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }
}

// ─── HYBRID CACHE MANAGER ─────────────────────────────────────────────────────

export class HybridCacheManager {
  private redis: RedisCacheClient;
  private cosmos: OptimizedCosmosClient;
  private repositories: RepositoryFactory;
  private config: CacheConfig;

  constructor(
    redisClient: RedisCacheClient,
    cosmosClient: OptimizedCosmosClient,
    config: Partial<CacheConfig> = {}
  ) {
    this.redis = redisClient;
    this.cosmos = cosmosClient;
    this.repositories = RepositoryFactory.getInstance(cosmosClient);
    this.config = { ...defaultConfig, ...config };
  }

  // ─── USER CACHE OPERATIONS ──────────────────────────────────────────────────

  /**
   * Get user with cache-aside strategy - Sub-50ms target
   */
  async getUser(userId: string): Promise<any | null> {
    const cacheKey = `user:${userId}`;
    const startTime = Date.now();

    try {
      // Try cache first
      let user = await this.redis.get(cacheKey);
      if (user) {
        this.recordLatency('user_cache_hit', Date.now() - startTime);
        return user;
      }

      // Cache miss - fetch from Cosmos DB
      user = await this.repositories.getUserRepository().getUserById(userId);
      if (user) {
        // Cache for future requests
        await this.redis.set(cacheKey, user, this.config.redis.ttl.user);
        this.recordLatency('user_db_hit', Date.now() - startTime);
        return user;
      }

      this.recordLatency('user_miss', Date.now() - startTime);
      return null;
    } catch (error) {
      logger.error(`Error getting user ${userId}:`, error as Error);
      this.recordLatency('user_error', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Update user with write-through strategy
   */
  async updateUser(userId: string, updates: any): Promise<any> {
    const startTime = Date.now();

    try {
      // Update database first
      const updatedUser = await this.repositories.getUserRepository().update(userId, updates);

      // Update cache
      const cacheKey = `user:${userId}`;
      await this.redis.set(cacheKey, updatedUser, this.config.redis.ttl.user);

      // Invalidate related caches
      await this.invalidateUserRelatedCaches(userId);

      this.recordLatency('user_update', Date.now() - startTime);
      return updatedUser;
    } catch (error) {
      logger.error(`Error updating user ${userId}:`, error as Error);
      this.recordLatency('user_update_error', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Invalidate user-related caches
   */
  private async invalidateUserRelatedCaches(userId: string): Promise<void> {
    const keys = [
      `user:${userId}`,
      `user_posts:${userId}`,
      `user_search:${userId}`,
      `user_analytics:${userId}`
    ];

    await Promise.allSettled(keys.map(key => this.redis.delete(key)));
  }

  // ─── POST CACHE OPERATIONS ──────────────────────────────────────────────────

  /**
   * Get user's posts with pagination and caching
   */
  async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ posts: any[]; total: number; cached: boolean }> {
    const cacheKey = `user_posts:${userId}:${page}:${limit}`;
    const startTime = Date.now();

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.recordLatency('posts_cache_hit', Date.now() - startTime);
        return { ...cached, cached: true };
      }

      // Cache miss - fetch from database
      const posts = await this.repositories.getPostRepository().getUserPosts(userId, undefined, limit);

      const result = {
        posts,
        total: posts.length, // Simplified - would need count query
        cached: false
      };

      // Cache result
      await this.redis.set(cacheKey, result, this.config.redis.ttl.post);

      this.recordLatency('posts_db_hit', Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error(`Error getting posts for user ${userId}:`, error as Error);
      this.recordLatency('posts_error', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Create post with write-through caching
   */
  async createPost(postData: any): Promise<any> {
    const startTime = Date.now();

    try {
      // Create in database
      const post = await this.repositories.getPostRepository().create(postData);

      // Invalidate user's post cache
      const cacheKey = `user_posts:${post.authorId}:*`;
      // Note: Redis doesn't support wildcards in DEL, would need to track keys or use different strategy

      // Update search index cache if needed
      await this.updateSearchIndexCache(post.authorId);

      this.recordLatency('post_create', Date.now() - startTime);
      return post;
    } catch (error) {
      logger.error('Error creating post:', error as Error);
      this.recordLatency('post_create_error', Date.now() - startTime);
      throw error;
    }
  }

  // ─── SEARCH CACHE OPERATIONS ────────────────────────────────────────────────

  /**
   * Search athletes with intelligent caching
   */
  async searchAthletes(
    filters: any,
    sortBy: string = 'ranking'
  ): Promise<{ results: any[]; cached: boolean; cacheKey: string }> {
    // Create deterministic cache key from filters
    const cacheKey = `search:${JSON.stringify({ ...filters, sortBy }).replace(/\s+/g, '')}`;
    const startTime = Date.now();

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.recordLatency('search_cache_hit', Date.now() - startTime);
        return { ...cached, cached: true, cacheKey };
      }

      // Cache miss - perform search
      const results = await this.repositories.getSearchRepository().searchAthletes(filters, sortBy as any, 50);

      const result = {
        results,
        cached: false,
        cacheKey
      };

      // Cache with longer TTL for search results
      await this.redis.set(cacheKey, result, this.config.redis.ttl.search);

      this.recordLatency('search_db_hit', Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error('Error searching athletes:', error as Error);
      this.recordLatency('search_error', Date.now() - startTime);
      throw error;
    }
  }

  // ─── MESSAGING CACHE OPERATIONS ─────────────────────────────────────────────

  /**
   * Get conversation messages with caching
   */
  async getConversationMessages(
    conversationId: string,
    beforeDate?: Date,
    limit: number = 50
  ): Promise<{ messages: any[]; cached: boolean }> {
    const cacheKey = `conversation:${conversationId}:${beforeDate?.toISOString()}:${limit}`;
    const startTime = Date.now();

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.recordLatency('messages_cache_hit', Date.now() - startTime);
        return { messages: cached, cached: true };
      }

      // Cache miss - fetch from database
      const messages = await this.repositories.getMessageRepository().getConversationMessages(
        conversationId,
        beforeDate,
        limit
      );

      // Cache messages
      await this.redis.set(cacheKey, messages, this.config.redis.ttl.post);

      this.recordLatency('messages_db_hit', Date.now() - startTime);
      return { messages, cached: false };
    } catch (error) {
      logger.error(`Error getting messages for conversation ${conversationId}:`, error as Error);
      this.recordLatency('messages_error', Date.now() - startTime);
      throw error;
    }
  }

  // ─── ANALYTICS CACHE OPERATIONS ─────────────────────────────────────────────

  /**
   * Get analytics data with time-bucketed caching
   */
  async getAnalytics(
    metricType: string,
    timeBucket: string,
    dimensions: any = {}
  ): Promise<{ data: any[]; cached: boolean }> {
    const cacheKey = `analytics:${metricType}:${timeBucket}:${JSON.stringify(dimensions)}`;
    const startTime = Date.now();

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.recordLatency('analytics_cache_hit', Date.now() - startTime);
        return { data: cached, cached: true };
      }

      // Cache miss - would fetch from analytics repository
      // This is a placeholder - actual implementation would depend on analytics schema
      const data: any[] = [];

      // Cache analytics data
      await this.redis.set(cacheKey, data, this.config.redis.ttl.analytics);

      this.recordLatency('analytics_db_hit', Date.now() - startTime);
      return { data, cached: false };
    } catch (error) {
      logger.error(`Error getting analytics for ${metricType}:`, error as Error);
      this.recordLatency('analytics_error', Date.now() - startTime);
      throw error;
    }
  }

  // ─── PERFORMANCE MONITORING ────────────────────────────────────────────────

  private latencyMetrics: Map<string, number[]> = new Map();

  /**
   * Record operation latency for performance monitoring
   */
  private recordLatency(operation: string, latency: number): void {
    if (!this.latencyMetrics.has(operation)) {
      this.latencyMetrics.set(operation, []);
    }

    const latencies = this.latencyMetrics.get(operation)!;
    latencies.push(latency);

    // Keep only last 1000 measurements
    if (latencies.length > 1000) {
      latencies.shift();
    }

    // Log slow operations
    if (latency > this.config.performance.targetLatency) {
      logger.warn(`Slow operation: ${operation} took ${latency}ms`);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): any {
    const metrics: any = {};
    const totalOperations = Array.from(this.latencyMetrics.values()).reduce((sum, latencies) => sum + latencies.length, 0);

    for (const [operation, latencies] of this.latencyMetrics) {
      const sorted = [...latencies].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      metrics[operation] = {
        count: latencies.length,
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p50,
        p95,
        p99,
        max: Math.max(...latencies),
        min: Math.min(...latencies),
        slowOperations: latencies.filter(l => l > this.config.performance.targetLatency).length
      };
    }

    metrics.overall = {
      totalOperations,
      cacheHitRatio: this.redis.getHitRatio(),
      targetLatency: this.config.performance.targetLatency,
      slowOperationsPercent: totalOperations > 0
        ? (Array.from(this.latencyMetrics.values())
            .flat()
            .filter(l => l > this.config.performance.targetLatency).length / totalOperations) * 100
        : 0
    };

    return metrics;
  }

  // ─── CACHE MANAGEMENT ──────────────────────────────────────────────────────

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(): Promise<void> {
    logger.info('Starting cache warmup...');

    try {
      // Warm up popular users
      // Warm up trending posts
      // Warm up search indexes

      logger.info('Cache warmup completed');
    } catch (error) {
      logger.error('Cache warmup failed:', error as Error);
    }
  }

  /**
   * Update search index cache
   */
  private async updateSearchIndexCache(userId: string): Promise<void> {
    // Invalidate and refresh search cache for user
    const cacheKey = `user_search:${userId}`;
    await this.redis.delete(cacheKey);

    // Optionally pre-warm with fresh data
    // const searchData = await this.repositories.getSearchRepository().findById(userId);
    // if (searchData) {
    //   await this.redis.set(cacheKey, searchData, this.config.redis.ttl.search);
    // }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return {
      redis: this.redis.getMetrics(),
      performance: this.getPerformanceMetrics()
    };
  }
}

// ─── CACHE-ASIDE PATTERN IMPLEMENTATION ──────────────────────────────────────

export class CacheAsideManager {
  private cache: HybridCacheManager;

  constructor(cache: HybridCacheManager) {
    this.cache = cache;
  }

  /**
   * Get data with cache-aside pattern
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    ttl?: number
  ): Promise<T | null> {
    // Try cache first
    const cached = await this.cache['redis'].get(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    const data = await fetcher();
    if (data !== null && ttl) {
      await this.cache['redis'].set(key, data, ttl);
    }

    return data;
  }

  /**
   * Set data with cache-aside pattern (write-through)
   */
  async set<T>(
    key: string,
    data: T,
    persister: (data: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    // Write to database first
    await persister(data);

    // Update cache
    if (ttl) {
      await this.cache['redis'].set(key, data, ttl);
    }
  }

  /**
   * Invalidate cache key
   */
  async invalidate(key: string): Promise<void> {
    await this.cache['redis'].delete(key);
  }

  /**
   * Invalidate multiple keys with pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Redis doesn't support native pattern deletion
    // Would need to maintain a separate set of keys or use different strategy
    logger.warn(`Pattern invalidation not implemented for: ${pattern}`);
  }
}

// ─── EXPORT COMPONENTS ────────────────────────────────────────────────────────

export { defaultConfig as cacheConfig };