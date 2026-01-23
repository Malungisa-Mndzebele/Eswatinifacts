import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client configuration
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB || '0'),
};

// Create Redis client
const redisClient = createClient(redisConfig);

// Handle Redis errors
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

// Connect to Redis
export async function connectRedis() {
  try {
    await redisClient.connect();
    return true;
  } catch (error) {
    console.error('Redis connection error:', error);
    return false;
  }
}

// Cache helper functions
export async function setCache(key, value, expirationSeconds = 3600) {
  try {
    const serialized = JSON.stringify(value);
    await redisClient.setEx(key, expirationSeconds, serialized);
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
}

export async function getCache(key) {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function deleteCache(key) {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}

export async function clearCachePattern(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.error('Cache clear pattern error:', error);
    return false;
  }
}

// Session storage functions
export async function setSession(sessionId, data, expirationSeconds = 2592000) {
  return setCache(`session:${sessionId}`, data, expirationSeconds);
}

export async function getSession(sessionId) {
  return getCache(`session:${sessionId}`);
}

export async function deleteSession(sessionId) {
  return deleteCache(`session:${sessionId}`);
}

// Get Redis client instance
export function getRedisClient() {
  return redisClient.isOpen ? redisClient : null;
}

export default redisClient;
