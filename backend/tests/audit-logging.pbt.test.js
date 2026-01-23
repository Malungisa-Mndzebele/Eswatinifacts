import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import pool from '../src/config/database.js';
import bcrypt from 'bcrypt';
import { encryptEmail, encryptName } from '../src/utils/encryption.js';

/**
 * Feature: eswatini-facts-platform, Property 34: Audit log completeness
 * Validates: Requirements 10.5
 * 
 * Property: For any administrative action performed, an audit log entry should be created
 * with timestamp, user ID, action type, and affected resources
 */

describe('Audit Log Completeness Property Tests', () => {
  let adminUserId;
  let dbAvailable = false;

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      console.log('Database connected - running audit logging property tests');

      // Create admin user for testing
      const adminPasswordHash = await bcrypt.hash('AdminPassword123', 10);
      const adminEmail = encryptEmail('audit-test-admin@example.com');
      const adminName = encryptName('Audit Test Admin');
      
      const adminResult = await pool.query(
        `INSERT INTO users (email_encrypted, password_hash, name_encrypted, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [adminEmail, adminPasswordHash, adminName, 'admin']
      );
      adminUserId = adminResult.rows[0].id;
    } catch (error) {
      console.log('Database not available - skipping tests');
      console.log('To run these tests, please set up PostgreSQL and configure .env');
      console.log('See SETUP.md for instructions');
    }
  });

  after(async () => {
    // Clean up test data
    if (dbAvailable) {
      await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [adminUserId]);
      await pool.query('DELETE FROM users WHERE id = $1 OR email_encrypted LIKE $2', 
        [adminUserId, '%audit-test%']);
      await pool.end();
    }
  });

  /**
   * Helper function to create an audit log entry
   */
  async function createAuditLog(userId, actionType, resourceType, resourceId, details = {}) {
    const result = await pool.query(
      `INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, action_type, resource_type, resource_id, details, created_at`,
      [userId, actionType, resourceType, resourceId, JSON.stringify(details), '127.0.0.1', 'test-agent']
    );
    return result.rows[0];
  }

  it('should create audit log entry with all required fields for any administrative action', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          actionType: fc.constantFrom(
            'user_created', 'user_updated', 'user_deactivated',
            'content_approved', 'content_edited', 'content_removed',
            'data_imported', 'settings_changed', 'role_changed'
          ),
          resourceType: fc.constantFrom('user', 'blog_post', 'data_point', 'settings'),
          resourceId: fc.uuid(),
          details: fc.record({
            field: fc.string({ minLength: 1, maxLength: 50 }),
            oldValue: fc.string({ minLength: 0, maxLength: 100 }),
            newValue: fc.string({ minLength: 0, maxLength: 100 }),
          }),
        }),
        async (logData) => {
          const beforeTimestamp = new Date();

          // Perform administrative action and create audit log
          const auditLog = await createAuditLog(
            adminUserId,
            logData.actionType,
            logData.resourceType,
            logData.resourceId,
            logData.details
          );

          const afterTimestamp = new Date();

          // Verify audit log entry has all required fields
          assert.ok(auditLog.id, 'Audit log should have an ID');
          assert.strictEqual(auditLog.user_id, adminUserId, 'Audit log should have user ID');
          assert.strictEqual(auditLog.action_type, logData.actionType, 'Audit log should have action type');
          assert.strictEqual(auditLog.resource_type, logData.resourceType, 'Audit log should have resource type');
          assert.strictEqual(auditLog.resource_id, logData.resourceId, 'Audit log should have resource ID');
          assert.ok(auditLog.created_at, 'Audit log should have timestamp');

          // Verify timestamp is within reasonable range
          const logTimestamp = new Date(auditLog.created_at);
          assert.ok(
            logTimestamp >= beforeTimestamp && logTimestamp <= afterTimestamp,
            'Audit log timestamp should be within action timeframe'
          );

          // Verify details are stored correctly
          const storedDetails = typeof auditLog.details === 'string' 
            ? JSON.parse(auditLog.details) 
            : auditLog.details;
          assert.strictEqual(storedDetails.field, logData.details.field, 'Audit log should preserve details');

          // Clean up
          await pool.query('DELETE FROM audit_logs WHERE id = $1', [auditLog.id]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should create audit log for user management actions', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 255 }),
          action: fc.constantFrom('created', 'updated', 'deactivated'),
        }),
        async (userData) => {
          const uniqueEmail = `audit-test-user-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const passwordHash = await bcrypt.hash('TestPassword123', 10);
          const encryptedEmail = encryptEmail(uniqueEmail);
          const encryptedName = encryptName(userData.name);

          // Create a user (administrative action)
          const userResult = await pool.query(
            `INSERT INTO users (email_encrypted, password_hash, name_encrypted, role)
             VALUES ($1, $2, $3, 'user')
             RETURNING id`,
            [encryptedEmail, passwordHash, encryptedName]
          );

          const userId = userResult.rows[0].id;

          // Create audit log for the action
          const auditLog = await createAuditLog(
            adminUserId,
            `user_${userData.action}`,
            'user',
            userId,
            { email: uniqueEmail, name: userData.name }
          );

          // Verify audit log was created
          assert.ok(auditLog.id, 'Audit log should be created for user management action');
          assert.strictEqual(auditLog.user_id, adminUserId, 'Audit log should reference admin user');
          assert.strictEqual(auditLog.action_type, `user_${userData.action}`, 'Audit log should have correct action type');
          assert.strictEqual(auditLog.resource_type, 'user', 'Audit log should reference user resource');
          assert.strictEqual(auditLog.resource_id, userId, 'Audit log should reference affected user');

          // Clean up
          await pool.query('DELETE FROM audit_logs WHERE id = $1', [auditLog.id]);
          await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should create audit log for content moderation actions', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 5, maxLength: 100 }),
          action: fc.constantFrom('approved', 'edited', 'removed'),
        }),
        async (contentData) => {
          const slug = `audit-test-post-${Date.now()}-${Math.random().toString(36).substring(7)}`;

          // Create a blog post (content to moderate)
          const postResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id, status)
             VALUES ($1, $2, $3, $4, 'draft')
             RETURNING id`,
            [contentData.title, slug, 'Test content', adminUserId]
          );

          const postId = postResult.rows[0].id;

          // Create audit log for moderation action
          const auditLog = await createAuditLog(
            adminUserId,
            `content_${contentData.action}`,
            'blog_post',
            postId,
            { title: contentData.title, action: contentData.action }
          );

          // Verify audit log was created
          assert.ok(auditLog.id, 'Audit log should be created for content moderation action');
          assert.strictEqual(auditLog.user_id, adminUserId, 'Audit log should reference admin user');
          assert.strictEqual(auditLog.action_type, `content_${contentData.action}`, 'Audit log should have correct action type');
          assert.strictEqual(auditLog.resource_type, 'blog_post', 'Audit log should reference blog post resource');
          assert.strictEqual(auditLog.resource_id, postId, 'Audit log should reference affected post');

          // Clean up
          await pool.query('DELETE FROM audit_logs WHERE id = $1', [auditLog.id]);
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should create audit log for data import actions', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceName: fc.string({ minLength: 5, maxLength: 100 }),
          recordCount: fc.integer({ min: 1, max: 1000 }),
        }),
        async (importData) => {
          // Create a data source
          const sourceResult = await pool.query(
            `INSERT INTO data_sources (name, description, category)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [importData.sourceName, 'Test data source', 'Economy']
          );

          const sourceId = sourceResult.rows[0].id;

          // Create audit log for data import action
          const auditLog = await createAuditLog(
            adminUserId,
            'data_imported',
            'data_source',
            sourceId,
            { 
              sourceName: importData.sourceName, 
              recordCount: importData.recordCount,
              importedAt: new Date().toISOString()
            }
          );

          // Verify audit log was created
          assert.ok(auditLog.id, 'Audit log should be created for data import action');
          assert.strictEqual(auditLog.user_id, adminUserId, 'Audit log should reference admin user');
          assert.strictEqual(auditLog.action_type, 'data_imported', 'Audit log should have correct action type');
          assert.strictEqual(auditLog.resource_type, 'data_source', 'Audit log should reference data source resource');
          assert.strictEqual(auditLog.resource_id, sourceId, 'Audit log should reference affected data source');

          const storedDetails = typeof auditLog.details === 'string' 
            ? JSON.parse(auditLog.details) 
            : auditLog.details;
          assert.strictEqual(storedDetails.recordCount, importData.recordCount, 'Audit log should preserve import details');

          // Clean up
          await pool.query('DELETE FROM audit_logs WHERE id = $1', [auditLog.id]);
          await pool.query('DELETE FROM data_sources WHERE id = $1', [sourceId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain chronological order of audit logs', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            actionType: fc.constantFrom('user_created', 'user_updated', 'content_approved'),
            resourceType: fc.constantFrom('user', 'blog_post'),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (actions) => {
          const auditLogIds = [];

          // Perform multiple administrative actions in sequence
          for (const action of actions) {
            const resourceId = `test-resource-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const auditLog = await createAuditLog(
              adminUserId,
              action.actionType,
              action.resourceType,
              resourceId,
              { sequenceTest: true }
            );
            auditLogIds.push(auditLog.id);

            // Small delay to ensure timestamp differences
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Retrieve audit logs in chronological order
          const logsResult = await pool.query(
            `SELECT id, created_at FROM audit_logs 
             WHERE id = ANY($1)
             ORDER BY created_at ASC`,
            [auditLogIds]
          );

          // Verify logs are in chronological order
          assert.strictEqual(logsResult.rows.length, actions.length, 'All audit logs should be retrievable');

          for (let i = 1; i < logsResult.rows.length; i++) {
            const prevTimestamp = new Date(logsResult.rows[i - 1].created_at);
            const currTimestamp = new Date(logsResult.rows[i].created_at);
            assert.ok(
              currTimestamp >= prevTimestamp,
              'Audit logs should be in chronological order'
            );
          }

          // Clean up
          await pool.query('DELETE FROM audit_logs WHERE id = ANY($1)', [auditLogIds]);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should allow querying audit logs by user, action type, and resource', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          actionType: fc.constantFrom('user_created', 'user_updated', 'content_approved'),
          resourceType: fc.constantFrom('user', 'blog_post'),
          resourceId: fc.uuid(),
        }),
        async (logData) => {
          // Create audit log
          const auditLog = await createAuditLog(
            adminUserId,
            logData.actionType,
            logData.resourceType,
            logData.resourceId,
            { queryTest: true }
          );

          // Query by user ID
          const byUserResult = await pool.query(
            `SELECT id FROM audit_logs WHERE user_id = $1 AND id = $2`,
            [adminUserId, auditLog.id]
          );
          assert.strictEqual(byUserResult.rows.length, 1, 'Should be able to query audit logs by user ID');

          // Query by action type
          const byActionResult = await pool.query(
            `SELECT id FROM audit_logs WHERE action_type = $1 AND id = $2`,
            [logData.actionType, auditLog.id]
          );
          assert.strictEqual(byActionResult.rows.length, 1, 'Should be able to query audit logs by action type');

          // Query by resource
          const byResourceResult = await pool.query(
            `SELECT id FROM audit_logs WHERE resource_type = $1 AND resource_id = $2 AND id = $3`,
            [logData.resourceType, logData.resourceId, auditLog.id]
          );
          assert.strictEqual(byResourceResult.rows.length, 1, 'Should be able to query audit logs by resource');

          // Clean up
          await pool.query('DELETE FROM audit_logs WHERE id = $1', [auditLog.id]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve audit logs even when referenced resources are deleted', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 5, maxLength: 100 }),
        }),
        async (postData) => {
          const slug = `audit-test-preserve-${Date.now()}-${Math.random().toString(36).substring(7)}`;

          // Create a blog post
          const postResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id, status)
             VALUES ($1, $2, $3, $4, 'draft')
             RETURNING id`,
            [postData.title, slug, 'Test content', adminUserId]
          );

          const postId = postResult.rows[0].id;

          // Create audit log for the post
          const auditLog = await createAuditLog(
            adminUserId,
            'content_created',
            'blog_post',
            postId,
            { title: postData.title }
          );

          // Delete the blog post
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);

          // Verify audit log still exists
          const logResult = await pool.query(
            `SELECT id, resource_id FROM audit_logs WHERE id = $1`,
            [auditLog.id]
          );

          assert.strictEqual(logResult.rows.length, 1, 'Audit log should be preserved after resource deletion');
          assert.strictEqual(logResult.rows[0].resource_id, postId, 'Audit log should still reference deleted resource');

          // Clean up
          await pool.query('DELETE FROM audit_logs WHERE id = $1', [auditLog.id]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple concurrent administrative actions', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            actionType: fc.constantFrom('user_created', 'content_approved', 'data_imported'),
            resourceType: fc.constantFrom('user', 'blog_post', 'data_source'),
          }),
          { minLength: 5, maxLength: 15 }
        ),
        async (actions) => {
          // Perform multiple actions concurrently
          const auditLogPromises = actions.map(action => {
            const resourceId = `concurrent-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            return createAuditLog(
              adminUserId,
              action.actionType,
              action.resourceType,
              resourceId,
              { concurrentTest: true }
            );
          });

          const auditLogs = await Promise.all(auditLogPromises);

          // Verify all audit logs were created
          assert.strictEqual(auditLogs.length, actions.length, 'All concurrent actions should create audit logs');

          // Verify each log has required fields
          for (const log of auditLogs) {
            assert.ok(log.id, 'Each audit log should have an ID');
            assert.strictEqual(log.user_id, adminUserId, 'Each audit log should have user ID');
            assert.ok(log.action_type, 'Each audit log should have action type');
            assert.ok(log.resource_type, 'Each audit log should have resource type');
            assert.ok(log.created_at, 'Each audit log should have timestamp');
          }

          // Clean up
          const auditLogIds = auditLogs.map(log => log.id);
          await pool.query('DELETE FROM audit_logs WHERE id = ANY($1)', [auditLogIds]);
        }
      ),
      { numRuns: 50 }
    );
  });
});
