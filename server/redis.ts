// Redis caching for session management and token caching
// Required for 50K concurrent user scale

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  
  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  
  await redisClient.connect();
  return redisClient;
}

// Token caching functions
export async function cacheToken(token: string, userId: string, ttlSeconds: number = 300): Promise<void> {
  const client = await getRedisClient();
  await client.setEx(`token:${token}`, ttlSeconds, userId);
}

export async function getCachedToken(token: string): Promise<string | null> {
  const client = await getRedisClient();
  return await client.get(`token:${token}`);
}

export async function invalidateToken(token: string): Promise<void> {
  const client = await getRedisClient();
  await client.del(`token:${token}`);
}

// Session caching
export async function cacheSession(sessionId: string, data: object, ttlSeconds: number = 3600): Promise<void> {
  const client = await getRedisClient();
  await client.setEx(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
}

export async function getSession(sessionId: string): Promise<object | null> {
  const client = await getRedisClient();
  const data = await client.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}