import jwt from 'jsonwebtoken';
import { getRedisClient } from '../config/redis.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * Middleware to verify JWT token and authenticate requests
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token is required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token is blacklisted (for logout)
    const redis = getRedisClient();
    if (redis) {
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_REVOKED',
            message: 'Token has been revoked',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
          timestamp: new Date().toISOString(),
        },
      });
    }

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
 * Middleware to check if user has admin role
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
}

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Optional authentication middleware - attaches user if token is present but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without user
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token is blacklisted
    const redis = getRedisClient();
    if (redis) {
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        // Token is blacklisted, continue without user
        return next();
      }
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // If token is invalid or expired, just continue without user
    next();
  }
}

/**
 * Blacklist a token (for logout)
 */
export async function blacklistToken(token) {
  const redis = getRedisClient();
  if (redis) {
    // Store token in blacklist for 30 days (same as token expiry)
    await redis.setEx(`blacklist:${token}`, 30 * 24 * 60 * 60, 'true');
  }
}
