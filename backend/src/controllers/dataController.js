import { query, validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import { getRedisClient } from '../config/redis.js';
import crypto from 'crypto';

/**
 * Generate a new API key for a user
 */
export async function generateApiKey(req, res) {
  try {
    const { name, rateLimit = 1000, expiresInDays } = req.body;

    // Generate random API key
    const apiKey = `efp_${crypto.randomBytes(32).toString('hex')}`;
    
    // Hash the API key for storage
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Insert API key
    const result = await pool.query(
      `INSERT INTO api_keys (user_id, key_hash, name, rate_limit, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, rate_limit, created_at, expires_at`,
      [req.user.id, keyHash, name || 'API Key', rateLimit, expiresAt]
    );

    const keyRecord = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        apiKey: apiKey, // Only shown once
        keyInfo: {
          id: keyRecord.id,
          name: keyRecord.name,
          rateLimit: keyRecord.rate_limit,
          createdAt: keyRecord.created_at,
          expiresAt: keyRecord.expires_at,
        },
        warning: 'Store this API key securely. It will not be shown again.',
      },
    });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate API key',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * List all API keys for the authenticated user
 */
export async function listApiKeys(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, rate_limit, created_at, last_used_at, expires_at
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const keys = result.rows.map((key) => ({
      id: key.id,
      name: key.name,
      rateLimit: key.rate_limit,
      createdAt: key.created_at,
      lastUsedAt: key.last_used_at,
      expiresAt: key.expires_at,
    }));

    res.json({
      success: true,
      data: { keys },
    });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list API keys',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Revoke (delete) an API key
 */
export async function revokeApiKey(req, res) {
  try {
    const { id } = req.params;

    // Check if key exists and belongs to user
    const existingKey = await pool.query(
      'SELECT user_id FROM api_keys WHERE id = $1',
      [id]
    );

    if (existingKey.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'KEY_NOT_FOUND',
          message: 'API key not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check authorization
    if (existingKey.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to revoke this API key',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Delete the key
    await pool.query('DELETE FROM api_keys WHERE id = $1', [id]);

    res.json({
      success: true,
      data: {
        message: 'API key revoked successfully',
      },
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to revoke API key',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get economy data with optional filtering
 */
export async function getEconomyData(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const {
      startDate,
      endDate,
      metric,
      subcategory,
      limit = 100,
      offset = 0,
    } = req.query;

    // Build query
    const conditions = ["category = 'economy'"];
    const values = [];
    let paramCount = 1;

    if (startDate) {
      conditions.push(`date_recorded >= $${paramCount}`);
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      conditions.push(`date_recorded <= $${paramCount}`);
      values.push(endDate);
      paramCount++;
    }

    if (metric) {
      conditions.push(`metric_name = $${paramCount}`);
      values.push(metric);
      paramCount++;
    }

    if (subcategory) {
      conditions.push(`subcategory = $${paramCount}`);
      values.push(subcategory);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get data points
    values.push(parseInt(limit));
    values.push(parseInt(offset));

    const result = await pool.query(
      `SELECT 
         dp.id,
         dp.metric_name,
         dp.metric_value,
         dp.metric_unit,
         dp.date_recorded,
         dp.subcategory,
         dp.metadata,
         ds.name as source_name,
         ds.url as source_url
       FROM data_points dp
       LEFT JOIN data_sources ds ON dp.source_id = ds.id
       WHERE ${whereClause}
       ORDER BY dp.date_recorded DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    const dataPoints = result.rows.map((row) => ({
      id: row.id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricUnit: row.metric_unit,
      dateRecorded: row.date_recorded,
      subcategory: row.subcategory,
      metadata: row.metadata,
      source: {
        name: row.source_name,
        url: row.source_url,
      },
    }));

    res.json({
      success: true,
      data: {
        category: 'economy',
        dataPoints,
        count: dataPoints.length,
      },
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        rateLimit: {
          limit: req.rateLimit?.limit,
          remaining: req.rateLimit?.remaining,
        },
      },
    });
  } catch (error) {
    console.error('Get economy data error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve economy data',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get health data with optional filtering
 */
export async function getHealthData(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const {
      startDate,
      endDate,
      metric,
      subcategory,
      limit = 100,
      offset = 0,
    } = req.query;

    // Build query
    const conditions = ["category = 'health'"];
    const values = [];
    let paramCount = 1;

    if (startDate) {
      conditions.push(`date_recorded >= $${paramCount}`);
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      conditions.push(`date_recorded <= $${paramCount}`);
      values.push(endDate);
      paramCount++;
    }

    if (metric) {
      conditions.push(`metric_name = $${paramCount}`);
      values.push(metric);
      paramCount++;
    }

    if (subcategory) {
      conditions.push(`subcategory = $${paramCount}`);
      values.push(subcategory);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get data points
    values.push(parseInt(limit));
    values.push(parseInt(offset));

    const result = await pool.query(
      `SELECT 
         dp.id,
         dp.metric_name,
         dp.metric_value,
         dp.metric_unit,
         dp.date_recorded,
         dp.subcategory,
         dp.metadata,
         ds.name as source_name,
         ds.url as source_url
       FROM data_points dp
       LEFT JOIN data_sources ds ON dp.source_id = ds.id
       WHERE ${whereClause}
       ORDER BY dp.date_recorded DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    const dataPoints = result.rows.map((row) => ({
      id: row.id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricUnit: row.metric_unit,
      dateRecorded: row.date_recorded,
      subcategory: row.subcategory,
      metadata: row.metadata,
      source: {
        name: row.source_name,
        url: row.source_url,
      },
    }));

    res.json({
      success: true,
      data: {
        category: 'health',
        dataPoints,
        count: dataPoints.length,
      },
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        rateLimit: {
          limit: req.rateLimit?.limit,
          remaining: req.rateLimit?.remaining,
        },
      },
    });
  } catch (error) {
    console.error('Get health data error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve health data',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get education data with optional filtering
 */
export async function getEducationData(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const {
      startDate,
      endDate,
      metric,
      subcategory,
      limit = 100,
      offset = 0,
    } = req.query;

    // Build query
    const conditions = ["category = 'education'"];
    const values = [];
    let paramCount = 1;

    if (startDate) {
      conditions.push(`date_recorded >= $${paramCount}`);
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      conditions.push(`date_recorded <= $${paramCount}`);
      values.push(endDate);
      paramCount++;
    }

    if (metric) {
      conditions.push(`metric_name = $${paramCount}`);
      values.push(metric);
      paramCount++;
    }

    if (subcategory) {
      conditions.push(`subcategory = $${paramCount}`);
      values.push(subcategory);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get data points
    values.push(parseInt(limit));
    values.push(parseInt(offset));

    const result = await pool.query(
      `SELECT 
         dp.id,
         dp.metric_name,
         dp.metric_value,
         dp.metric_unit,
         dp.date_recorded,
         dp.subcategory,
         dp.metadata,
         ds.name as source_name,
         ds.url as source_url
       FROM data_points dp
       LEFT JOIN data_sources ds ON dp.source_id = ds.id
       WHERE ${whereClause}
       ORDER BY dp.date_recorded DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    const dataPoints = result.rows.map((row) => ({
      id: row.id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricUnit: row.metric_unit,
      dateRecorded: row.date_recorded,
      subcategory: row.subcategory,
      metadata: row.metadata,
      source: {
        name: row.source_name,
        url: row.source_url,
      },
    }));

    res.json({
      success: true,
      data: {
        category: 'education',
        dataPoints,
        count: dataPoints.length,
      },
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        rateLimit: {
          limit: req.rateLimit?.limit,
          remaining: req.rateLimit?.remaining,
        },
      },
    });
  } catch (error) {
    console.error('Get education data error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve education data',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get politics data with optional filtering
 */
export async function getPoliticsData(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const {
      startDate,
      endDate,
      metric,
      subcategory,
      limit = 100,
      offset = 0,
    } = req.query;

    // Build query
    const conditions = ["category = 'politics'"];
    const values = [];
    let paramCount = 1;

    if (startDate) {
      conditions.push(`date_recorded >= $${paramCount}`);
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      conditions.push(`date_recorded <= $${paramCount}`);
      values.push(endDate);
      paramCount++;
    }

    if (metric) {
      conditions.push(`metric_name = $${paramCount}`);
      values.push(metric);
      paramCount++;
    }

    if (subcategory) {
      conditions.push(`subcategory = $${paramCount}`);
      values.push(subcategory);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get data points
    values.push(parseInt(limit));
    values.push(parseInt(offset));

    const result = await pool.query(
      `SELECT 
         dp.id,
         dp.metric_name,
         dp.metric_value,
         dp.metric_unit,
         dp.date_recorded,
         dp.subcategory,
         dp.metadata,
         ds.name as source_name,
         ds.url as source_url
       FROM data_points dp
       LEFT JOIN data_sources ds ON dp.source_id = ds.id
       WHERE ${whereClause}
       ORDER BY dp.date_recorded DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    const dataPoints = result.rows.map((row) => ({
      id: row.id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricUnit: row.metric_unit,
      dateRecorded: row.date_recorded,
      subcategory: row.subcategory,
      metadata: row.metadata,
      source: {
        name: row.source_name,
        url: row.source_url,
      },
    }));

    res.json({
      success: true,
      data: {
        category: 'politics',
        dataPoints,
        count: dataPoints.length,
      },
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        rateLimit: {
          limit: req.rateLimit?.limit,
          remaining: req.rateLimit?.remaining,
        },
      },
    });
  } catch (error) {
    console.error('Get politics data error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve politics data',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get culture data with optional filtering
 */
export async function getCultureData(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const {
      startDate,
      endDate,
      metric,
      subcategory,
      limit = 100,
      offset = 0,
    } = req.query;

    // Build query
    const conditions = ["category = 'culture'"];
    const values = [];
    let paramCount = 1;

    if (startDate) {
      conditions.push(`date_recorded >= $${paramCount}`);
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      conditions.push(`date_recorded <= $${paramCount}`);
      values.push(endDate);
      paramCount++;
    }

    if (metric) {
      conditions.push(`metric_name = $${paramCount}`);
      values.push(metric);
      paramCount++;
    }

    if (subcategory) {
      conditions.push(`subcategory = $${paramCount}`);
      values.push(subcategory);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get data points
    values.push(parseInt(limit));
    values.push(parseInt(offset));

    const result = await pool.query(
      `SELECT 
         dp.id,
         dp.metric_name,
         dp.metric_value,
         dp.metric_unit,
         dp.date_recorded,
         dp.subcategory,
         dp.metadata,
         ds.name as source_name,
         ds.url as source_url
       FROM data_points dp
       LEFT JOIN data_sources ds ON dp.source_id = ds.id
       WHERE ${whereClause}
       ORDER BY dp.date_recorded DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    const dataPoints = result.rows.map((row) => ({
      id: row.id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricUnit: row.metric_unit,
      dateRecorded: row.date_recorded,
      subcategory: row.subcategory,
      metadata: row.metadata,
      source: {
        name: row.source_name,
        url: row.source_url,
      },
    }));

    res.json({
      success: true,
      data: {
        category: 'culture',
        dataPoints,
        count: dataPoints.length,
      },
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        rateLimit: {
          limit: req.rateLimit?.limit,
          remaining: req.rateLimit?.remaining,
        },
      },
    });
  } catch (error) {
    console.error('Get culture data error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve culture data',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Validation rules for data queries
 */
export const dataQueryValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('metric')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Metric name must not exceed 255 characters'),
  query('subcategory')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Subcategory must not exceed 100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];
