import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import { generateToken, blacklistToken } from '../middleware/auth.js';
import { getRedisClient } from '../config/redis.js';
import { encryptEmail, decryptEmail, encryptName, decryptName } from '../utils/encryption.js';

const BCRYPT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Validation rules for registration
 */
export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
];

/**
 * Validation rules for login
 */
export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Validation rules for password reset request
 */
export const passwordResetRequestValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

/**
 * Validation rules for password reset
 */
export const passwordResetValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
];

/**
 * Register a new user
 */
export async function register(req, res) {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { email, password, name } = req.body;

    // Encrypt PII
    const encryptedEmail = encryptEmail(email);
    const encryptedName = name ? encryptName(name) : null;

    // Check if user already exists (we need to check encrypted email)
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email_encrypted = $1',
      [encryptedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email already exists',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user with encrypted PII
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, email_verified, email_encrypted, name_encrypted, pii_encrypted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email_encrypted, name_encrypted, role, created_at`,
      [email, passwordHash, name || null, 'user', false, encryptedEmail, encryptedName, true]
    );

    const user = result.rows[0];
    
    // Decrypt PII for response
    const decryptedEmail = decryptEmail(user.email_encrypted);
    const decryptedName = user.name_encrypted ? decryptName(user.name_encrypted) : null;

    // Generate token (use decrypted email for token)
    const tokenUser = {
      id: user.id,
      email: decryptedEmail,
      name: decryptedName,
      role: user.role
    };
    const token = generateToken(tokenUser);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: decryptedEmail,
          name: decryptedName,
          role: user.role,
          createdAt: user.created_at,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to register user',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Login user
 */
export async function login(req, res) {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { email, password } = req.body;

    // Encrypt email to search for user
    const encryptedEmail = encryptEmail(email);

    // Find user by encrypted email
    const result = await pool.query(
      'SELECT id, email_encrypted, password_hash, name_encrypted, role FROM users WHERE email_encrypted = $1',
      [encryptedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const user = result.rows[0];
    
    // Decrypt PII
    const decryptedEmail = decryptEmail(user.email_encrypted);
    const decryptedName = user.name_encrypted ? decryptName(user.name_encrypted) : null;

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token (use decrypted data)
    const tokenUser = {
      id: user.id,
      email: decryptedEmail,
      name: decryptedName,
      role: user.role
    };
    const token = generateToken(tokenUser);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: decryptedEmail,
          name: decryptedName,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to login',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Logout user
 */
export async function logout(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await blacklistToken(token);
    }

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to logout',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get current user profile
 */
export async function getProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, email_encrypted, name_encrypted, role, created_at, last_login_at, email_verified
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const user = result.rows[0];
    
    // Decrypt PII
    const decryptedEmail = decryptEmail(user.email_encrypted);
    const decryptedName = user.name_encrypted ? decryptName(user.name_encrypted) : null;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: decryptedEmail,
          name: decryptedName,
          role: user.role,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
          emailVerified: user.email_verified,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get profile',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(req, res) {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { email } = req.body;

    // Encrypt email to search for user
    const encryptedEmail = encryptEmail(email);

    // Find user by encrypted email
    const result = await pool.query(
      'SELECT id FROM users WHERE email_encrypted = $1',
      [encryptedEmail]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'If the email exists, a password reset link has been sent',
        },
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store reset token in Redis with expiry
    const redis = getRedisClient();
    if (redis) {
      await redis.setEx(
        `password-reset:${resetTokenHash}`,
        PASSWORD_RESET_EXPIRY / 1000,
        user.id
      );
    }

    // TODO: Send email with reset link
    // For now, we'll just return success
    // In production, you would send an email with a link like:
    // https://eswatinifacts.org/reset-password?token=${resetToken}

    res.json({
      success: true,
      data: {
        message: 'If the email exists, a password reset link has been sent',
        // In development, include the token
        ...(process.env.NODE_ENV === 'development' && { resetToken }),
      },
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process password reset request',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(req, res) {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { token, password } = req.body;

    // Hash the token to look it up
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Get user ID from Redis
    const redis = getRedisClient();
    if (!redis) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Password reset service is temporarily unavailable',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userId = await redis.get(`password-reset:${resetTokenHash}`);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );

    // Delete reset token
    await redis.del(`password-reset:${resetTokenHash}`);

    res.json({
      success: true,
      data: {
        message: 'Password reset successfully',
      },
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reset password',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
