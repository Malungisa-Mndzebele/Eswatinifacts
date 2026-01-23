import { body, validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import { decryptEmail, decryptName } from '../utils/encryption.js';

/**
 * Validation rules for saving content
 */
export const saveContentValidation = [
  body('contentType')
    .notEmpty()
    .withMessage('Content type is required')
    .isIn(['blog_post', 'data_point', 'visualization', 'video', 'article'])
    .withMessage('Invalid content type'),
  body('contentId')
    .notEmpty()
    .withMessage('Content ID is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Content ID must be between 1 and 255 characters'),
];

/**
 * Get user profile with saved content and preferences
 */
export async function getUserProfile(req, res) {
  try {
    // Get user basic info
    const userResult = await pool.query(
      `SELECT id, email_encrypted, name_encrypted, role, created_at, last_login_at, email_verified
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const user = userResult.rows[0];
    
    // Decrypt PII
    const decryptedEmail = decryptEmail(user.email_encrypted);
    const decryptedName = user.name_encrypted ? decryptName(user.name_encrypted) : null;

    // Get saved content
    const savedContentResult = await pool.query(
      `SELECT id, content_type, content_id, saved_at
       FROM saved_content
       WHERE user_id = $1
       ORDER BY saved_at DESC`,
      [req.user.id]
    );

    // Get user preferences (for now, just default preferences)
    // In a full implementation, this would come from a user_preferences table
    const preferences = {
      language: 'en',
      emailNotifications: true,
      theme: 'light',
    };

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
        savedContent: savedContentResult.rows.map(item => ({
          id: item.id,
          contentType: item.content_type,
          contentId: item.content_id,
          savedAt: item.saved_at,
        })),
        preferences,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user profile',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Save/bookmark content for user
 */
export async function saveContent(req, res) {
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

    const { contentType, contentId } = req.body;

    // Insert saved content (ON CONFLICT DO NOTHING to handle duplicates gracefully)
    const result = await pool.query(
      `INSERT INTO saved_content (user_id, content_type, content_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, content_type, content_id) DO NOTHING
       RETURNING id, content_type, content_id, saved_at`,
      [req.user.id, contentType, contentId]
    );

    // If no rows returned, it means the content was already saved
    if (result.rows.length === 0) {
      // Get the existing saved content
      const existing = await pool.query(
        `SELECT id, content_type, content_id, saved_at
         FROM saved_content
         WHERE user_id = $1 AND content_type = $2 AND content_id = $3`,
        [req.user.id, contentType, contentId]
      );

      return res.json({
        success: true,
        data: {
          savedContent: {
            id: existing.rows[0].id,
            contentType: existing.rows[0].content_type,
            contentId: existing.rows[0].content_id,
            savedAt: existing.rows[0].saved_at,
          },
          alreadySaved: true,
        },
      });
    }

    const savedContent = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        savedContent: {
          id: savedContent.id,
          contentType: savedContent.content_type,
          contentId: savedContent.content_id,
          savedAt: savedContent.saved_at,
        },
        alreadySaved: false,
      },
    });
  } catch (error) {
    console.error('Save content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to save content',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Remove saved/bookmarked content
 */
export async function removeSavedContent(req, res) {
  try {
    const { id } = req.params;

    // Delete the saved content (only if it belongs to the user)
    const result = await pool.query(
      `DELETE FROM saved_content
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Saved content not found or does not belong to user',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Content removed from saved items',
        id: result.rows[0].id,
      },
    });
  } catch (error) {
    console.error('Remove saved content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove saved content',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get all saved content for user
 */
export async function getSavedContent(req, res) {
  try {
    const { contentType, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT id, content_type, content_id, saved_at
      FROM saved_content
      WHERE user_id = $1
    `;
    const params = [req.user.id];

    // Add content type filter if provided
    if (contentType) {
      query += ` AND content_type = $${params.length + 1}`;
      params.push(contentType);
    }

    query += ` ORDER BY saved_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM saved_content WHERE user_id = $1';
    const countParams = [req.user.id];
    
    if (contentType) {
      countQuery += ' AND content_type = $2';
      countParams.push(contentType);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        savedContent: result.rows.map(item => ({
          id: item.id,
          contentType: item.content_type,
          contentId: item.content_id,
          savedAt: item.saved_at,
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + result.rows.length < totalCount,
        },
      },
    });
  } catch (error) {
    console.error('Get saved content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get saved content',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
