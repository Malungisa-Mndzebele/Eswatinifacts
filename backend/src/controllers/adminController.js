import { body, validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import { decryptEmail, decryptName } from '../utils/encryption.js';
import { logAuditAction, getAuditLogs } from '../utils/auditLogger.js';

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(req, res) {
  try {
    // Get user count
    const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCountResult.rows[0].count);

    // Get admin count
    const adminCountResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const adminCount = parseInt(adminCountResult.rows[0].count);

    // Get blog post count by status
    const postStatsResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM blog_posts
      GROUP BY status
    `);
    const postStats = {};
    postStatsResult.rows.forEach(row => {
      postStats[row.status] = parseInt(row.count);
    });

    // Get total blog posts
    const totalPostsResult = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
    const totalPosts = parseInt(totalPostsResult.rows[0].count);

    // Get newsletter subscription count
    const subscriberCountResult = await pool.query("SELECT COUNT(*) as count FROM newsletter_subscriptions WHERE status = 'confirmed'");
    const subscriberCount = parseInt(subscriberCountResult.rows[0].count);

    // Get data points count
    const dataPointsResult = await pool.query('SELECT COUNT(*) as count FROM data_points');
    const dataPointsCount = parseInt(dataPointsResult.rows[0].count);

    // Get recent activity (last 7 days)
    const recentActivityResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // System health indicators
    const systemHealth = {
      database: 'healthy',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
    };

    res.json({
      success: true,
      data: {
        users: {
          total: userCount,
          admins: adminCount,
          regular: userCount - adminCount,
        },
        content: {
          totalPosts,
          postsByStatus: postStats,
          dataPoints: dataPointsCount,
        },
        newsletter: {
          subscribers: subscriberCount,
        },
        recentActivity: recentActivityResult.rows,
        systemHealth,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get dashboard statistics',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * List all users with pagination and filtering
 */
export async function listUsers(req, res) {
  try {
    const { role, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT id, email_encrypted, name_encrypted, role, created_at, last_login_at, email_verified
      FROM users
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      params.push(role);
    }

    // Note: Search on encrypted fields is limited, but we can search by role
    // In a production system, you might want to implement a separate search index

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Decrypt user data
    const users = result.rows.map(user => ({
      id: user.id,
      email: decryptEmail(user.email_encrypted),
      name: user.name_encrypted ? decryptName(user.name_encrypted) : null,
      role: user.role,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      emailVerified: user.email_verified,
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    
    if (role) {
      countQuery += ' AND role = $1';
      countParams.push(role);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + users.length < totalCount,
        },
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list users',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get single user details
 */
export async function getUser(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, email_encrypted, name_encrypted, role, created_at, last_login_at, email_verified
       FROM users WHERE id = $1`,
      [id]
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

    // Get user's saved content count
    const savedContentResult = await pool.query(
      'SELECT COUNT(*) as count FROM saved_content WHERE user_id = $1',
      [id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: decryptEmail(user.email_encrypted),
          name: user.name_encrypted ? decryptName(user.name_encrypted) : null,
          role: user.role,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
          emailVerified: user.email_verified,
          savedContentCount: parseInt(savedContentResult.rows[0].count),
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Validation rules for updating user
 */
export const updateUserValidation = [
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  body('emailVerified')
    .optional()
    .isBoolean()
    .withMessage('Email verified must be a boolean'),
];

/**
 * Update user details
 */
export async function updateUser(req, res) {
  try {
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

    const { id } = req.params;
    const { role, emailVerified } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [id];
    let paramCount = 1;

    if (role !== undefined) {
      paramCount++;
      updates.push(`role = $${paramCount}`);
      params.push(role);
    }

    if (emailVerified !== undefined) {
      paramCount++;
      updates.push(`email_verified = $${paramCount}`);
      params.push(emailVerified);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No valid fields to update',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING id, email_encrypted, name_encrypted, role, created_at, last_login_at, email_verified
    `;

    const result = await pool.query(query, params);

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

    // Log the action
    await logAuditAction({
      userId: req.user.id,
      actionType: 'USER_UPDATED',
      resourceType: 'user',
      resourceId: id,
      details: { updates: req.body },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: decryptEmail(user.email_encrypted),
          name: user.name_encrypted ? decryptName(user.name_encrypted) : null,
          role: user.role,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
          emailVerified: user.email_verified,
        },
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update user',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Deactivate user account
 */
export async function deactivateUser(req, res) {
  try {
    const { id } = req.params;

    // Prevent admin from deactivating themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DEACTIVATE_SELF',
          message: 'Cannot deactivate your own account',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // For now, we'll change role to 'deactivated' or delete the user
    // In a production system, you might want a separate 'active' field
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [id]
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

    // Log the action
    await logAuditAction({
      userId: req.user.id,
      actionType: 'USER_DEACTIVATED',
      resourceType: 'user',
      resourceId: id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: {
        message: 'User deactivated successfully',
        id: result.rows[0].id,
      },
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to deactivate user',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Validation rules for content moderation
 */
export const moderateContentValidation = [
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['approve', 'edit', 'remove'])
    .withMessage('Action must be approve, edit, or remove'),
  body('content')
    .optional()
    .notEmpty()
    .withMessage('Content cannot be empty when editing'),
  body('title')
    .optional()
    .notEmpty()
    .withMessage('Title cannot be empty when editing'),
];

/**
 * Moderate blog post content
 */
export async function moderateContent(req, res) {
  try {
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

    const { id } = req.params;
    const { action, content, title, excerpt } = req.body;

    let result;

    switch (action) {
      case 'approve':
        // Approve by publishing the post
        result = await pool.query(
          `UPDATE blog_posts
           SET status = 'published', published_at = NOW(), updated_at = NOW()
           WHERE id = $1
           RETURNING id, title, status`,
          [id]
        );
        break;

      case 'edit':
        // Edit the post content
        const updates = [];
        const params = [id];
        let paramCount = 1;

        if (title !== undefined) {
          paramCount++;
          updates.push(`title = $${paramCount}`);
          params.push(title);
        }

        if (content !== undefined) {
          paramCount++;
          updates.push(`content = $${paramCount}`);
          params.push(content);
        }

        if (excerpt !== undefined) {
          paramCount++;
          updates.push(`excerpt = $${paramCount}`);
          params.push(excerpt);
        }

        updates.push('updated_at = NOW()');

        if (updates.length === 1) { // Only updated_at
          return res.status(400).json({
            success: false,
            error: {
              code: 'NO_UPDATES',
              message: 'No valid fields to update',
              timestamp: new Date().toISOString(),
            },
          });
        }

        result = await pool.query(
          `UPDATE blog_posts
           SET ${updates.join(', ')}
           WHERE id = $1
           RETURNING id, title, status`,
          params
        );
        break;

      case 'remove':
        // Remove the post
        result = await pool.query(
          `DELETE FROM blog_posts WHERE id = $1 RETURNING id, title`,
          [id]
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Invalid moderation action',
            timestamp: new Date().toISOString(),
          },
        });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Log the action
    await logAuditAction({
      userId: req.user.id,
      actionType: `CONTENT_${action.toUpperCase()}`,
      resourceType: 'blog_post',
      resourceId: id,
      details: { action, updates: req.body },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: {
        message: `Content ${action}d successfully`,
        post: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Moderate content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to moderate content',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Validation rules for data import
 */
export const importDataValidation = [
  body('data')
    .isArray({ min: 1 })
    .withMessage('Data must be a non-empty array'),
  body('data.*.category')
    .notEmpty()
    .withMessage('Category is required for each data point'),
  body('data.*.metric_name')
    .notEmpty()
    .withMessage('Metric name is required for each data point'),
  body('data.*.metric_value')
    .isNumeric()
    .withMessage('Metric value must be numeric'),
  body('data.*.date_recorded')
    .isISO8601()
    .withMessage('Date recorded must be a valid ISO 8601 date'),
];

/**
 * Import data points
 */
export async function importData(req, res) {
  try {
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

    const { data, sourceId } = req.body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const imported = [];
      const errors = [];

      for (let i = 0; i < data.length; i++) {
        const point = data[i];
        
        try {
          // Validate source_id if provided
          if (sourceId) {
            const sourceCheck = await client.query(
              'SELECT id FROM data_sources WHERE id = $1',
              [sourceId]
            );
            
            if (sourceCheck.rows.length === 0) {
              errors.push({
                index: i,
                error: 'Invalid source_id',
                data: point,
              });
              continue;
            }
          }

          const result = await client.query(
            `INSERT INTO data_points (source_id, category, subcategory, metric_name, metric_value, metric_unit, date_recorded, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
              sourceId || null,
              point.category,
              point.subcategory || null,
              point.metric_name,
              point.metric_value,
              point.metric_unit || null,
              point.date_recorded,
              point.metadata ? JSON.stringify(point.metadata) : null,
            ]
          );

          imported.push({
            index: i,
            id: result.rows[0].id,
          });
        } catch (error) {
          errors.push({
            index: i,
            error: error.message,
            data: point,
          });
        }
      }

      await client.query('COMMIT');

      // Log the action
      await logAuditAction({
        userId: req.user.id,
        actionType: 'DATA_IMPORTED',
        resourceType: 'data_points',
        resourceId: null,
        details: {
          totalRecords: data.length,
          imported: imported.length,
          errors: errors.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: {
          message: 'Data import completed',
          imported: imported.length,
          errors: errors.length,
          details: {
            imported,
            errors: errors.length > 0 ? errors : undefined,
          },
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Import data error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to import data',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get audit logs
 */
export async function getAuditLogsEndpoint(req, res) {
  try {
    const {
      userId,
      actionType,
      resourceType,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const result = await getAuditLogs({
      userId,
      actionType,
      resourceType,
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get audit logs',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
