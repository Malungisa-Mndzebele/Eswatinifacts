import crypto from 'crypto';
import { pool } from '../config/database.js';
import { getRedisClient } from '../config/redis.js';

/**
 * Middleware to authenticate API requests using API keys
 */
export async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'API_KEY_REQUIRED',
          message: 'API key is required. Include it in the X-API-Key header.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate API key format
    if (!apiKey.startsWith('efp_')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key format',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Hash the API key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Check cache first
    const redis = getRedisClient();
    let keyData = null;

    if (redis) {
      const cached = await redis.get(`apikey:${keyHash}`);
      if (cached) {
        keyData = JSON.parse(cached);
      }
    }

    // If not in cache, query database
    if (!keyData) {
      const result = await pool.query(
        `SELECT ak.id, ak.user_id, ak.rate_limit, ak.expires_at, u.email, u.role
         FROM api_keys ak
         JOIN users u ON ak.user_id = u.id
         WHERE ak.key_hash = $1`,
        [keyHash]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key',
            timestamp: new Date().toISOString(),
          },
        });
      }

      keyData = result.rows[0];

      // Cache for 5 minutes
      if (redis) {
        await redis.setEx(`apikey:${keyHash}`, 300, JSON.stringify(keyData));
      }
    }

    // Check if key is expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'API_KEY_EXPIRED',
          message: 'API key has expired',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check rate limit
    const rateLimitKey = `ratelimit:apikey:${keyHash}`;
    let requestCount = 0;

    if (redis) {
      requestCount = await redis.incr(rateLimitKey);
      
      // Set expiry on first request (1 hour window)
      if (requestCount === 1) {
        await redis.expire(rateLimitKey, 3600);
      }

      // Check if rate limit exceeded
      if (requestCount > keyData.rate_limit) {
        const ttl = await redis.ttl(rateLimitKey);
        
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'API rate limit exceeded',
            timestamp: new Date().toISOString(),
            retryAfter: ttl,
          },
        });
      }
    }

    // Update last_used_at (async, don't wait)
    pool.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [keyData.id]
    ).catch((err) => console.error('Failed to update last_used_at:', err));

    // Attach API key info and user to request
    req.apiKey = {
      id: keyData.id,
      userId: keyData.user_id,
      rateLimit: keyData.rate_limit,
    };

    req.user = {
      id: keyData.user_id,
      email: keyData.email,
      role: keyData.role,
    };

    // Attach rate limit info for response metadata
    req.rateLimit = {
      limit: keyData.rate_limit,
      remaining: Math.max(0, keyData.rate_limit - requestCount),
      reset: redis ? await redis.ttl(rateLimitKey) : null,
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Optional API key authentication - attaches user if key is present but doesn't require it
 */
export async function optionalApiKeyAuth(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      // No API key provided, continue without authentication
      return next();
    }

    // If API key is provided, validate it
    return authenticateApiKey(req, res, next);
  } catch (error) {
    // If validation fails, continue without authentication
    next();
  }
}
