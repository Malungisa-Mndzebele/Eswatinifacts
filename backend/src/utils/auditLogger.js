import { pool } from '../config/database.js';

/**
 * Log an administrative action to the audit log
 * 
 * @param {Object} params - Audit log parameters
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.actionType - Type of action performed
 * @param {string} params.resourceType - Type of resource affected
 * @param {string} params.resourceId - ID of the resource affected
 * @param {Object} params.details - Additional details about the action
 * @param {string} params.ipAddress - IP address of the user
 * @param {string} params.userAgent - User agent string
 */
export async function logAuditAction({
  userId,
  actionType,
  resourceType = null,
  resourceId = null,
  details = {},
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, actionType, resourceType, resourceId, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Failed to log audit action:', error);
    // Don't throw error - audit logging failure shouldn't break the main operation
  }
}

/**
 * Middleware to automatically log admin actions
 */
export function auditMiddleware(actionType, resourceType) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after successful response
    res.json = function (data) {
      // Only log if the operation was successful
      if (data.success) {
        const resourceId = req.params.id || req.body?.id || data.data?.id || null;
        
        logAuditAction({
          userId: req.user?.id,
          actionType,
          resourceType,
          resourceId: resourceId ? String(resourceId) : null,
          details: {
            method: req.method,
            path: req.path,
            body: req.body,
            params: req.params,
            query: req.query,
          },
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent'),
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs({
  userId = null,
  actionType = null,
  resourceType = null,
  startDate = null,
  endDate = null,
  limit = 50,
  offset = 0,
}) {
  try {
    let query = `
      SELECT 
        al.id,
        al.user_id,
        u.email as user_email,
        u.name as user_name,
        al.action_type,
        al.resource_type,
        al.resource_id,
        al.details,
        al.ip_address,
        al.user_agent,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      query += ` AND al.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (actionType) {
      paramCount++;
      query += ` AND al.action_type = $${paramCount}`;
      params.push(actionType);
    }

    if (resourceType) {
      paramCount++;
      query += ` AND al.resource_type = $${paramCount}`;
      params.push(resourceType);
    }

    if (startDate) {
      paramCount++;
      query += ` AND al.created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND al.created_at <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM audit_logs al WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (userId) {
      countParamCount++;
      countQuery += ` AND al.user_id = $${countParamCount}`;
      countParams.push(userId);
    }

    if (actionType) {
      countParamCount++;
      countQuery += ` AND al.action_type = $${countParamCount}`;
      countParams.push(actionType);
    }

    if (resourceType) {
      countParamCount++;
      countQuery += ` AND al.resource_type = $${countParamCount}`;
      countParams.push(resourceType);
    }

    if (startDate) {
      countParamCount++;
      countQuery += ` AND al.created_at >= $${countParamCount}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countParamCount++;
      countQuery += ` AND al.created_at <= $${countParamCount}`;
      countParams.push(endDate);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    return {
      logs: result.rows,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + result.rows.length < totalCount,
      },
    };
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    throw error;
  }
}
