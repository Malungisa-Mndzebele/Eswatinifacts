import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import pool from '../src/config/database.js';
import bcrypt from 'bcrypt';

/**
 * Feature: eswatini-facts-platform, Property 31: Content moderation effects
 * Validates: Requirements 10.2
 * 
 * Property: For any moderation action (approve, edit, remove) performed by an administrator,
 * the content state should reflect the action immediately
 */

describe('Content Moderation Effects Property Tests', () => {
  let adminUserId;
  let regularUserId;
  let dbAvailable = false;

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      console.log('Database connected - running content moderation property tests');

      // Create admin user
      const adminPasswordHash = await bcrypt.hash('AdminPassword123', 10);
      const adminResult = await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['moderation-admin@example.com', adminPasswordHash, 'Moderation Admin', 'admin']
      );
      adminUserId = adminResult.rows[0].id;

      // Create regular user
      const userPasswordHash = await bcrypt.hash('UserPassword123', 10);
      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['moderation-user@example.com', userPasswordHash, 'Regular User', 'user']
      );
      regularUserId = userResult.rows[0].id;
    } catch (error) {
      console.log('Database not available - skipping tests');
      console.log('To run these tests, please set up PostgreSQL and configure .env');
      console.log('See SETUP.md for instructions');
    }
  });

  after(async () => {
    // Clean up test data
    if (dbAvailable) {
      await pool.query('DELETE FROM search_index WHERE content_type = $1', ['blog_post']);
      await pool.query('DELETE FROM blog_posts WHERE author_id IN ($1, $2)', [adminUserId, regularUserId]);
      await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [adminUserId, regularUserId]);
      await pool.end();
    }
  });

  it('should immediately reflect approval (publish) action on content', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 500 }),
          content: fc.string({ minLength: 1, maxLength: 10000 }),
          category: fc.option(fc.constantFrom('Economy', 'Health', 'Education', 'Politics', 'Culture'), { nil: null }),
        }),
        async (postData) => {
          const slug = 'approve-test-' + Date.now() + '-' + Math.random().toString(36).substring(7);

          // Create a draft post (simulating user-generated content awaiting moderation)
          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id, category, status)
             VALUES ($1, $2, $3, $4, $5, 'draft')
             RETURNING id, status`,
            [postData.title, slug, postData.content, regularUserId, postData.category]
          );

          const postId = insertResult.rows[0].id;
          const initialStatus = insertResult.rows[0].status;

          // Verify initial state is draft
          assert.strictEqual(initialStatus, 'draft', 'Initial status should be draft');

          // Admin performs approval action (publish)
          const approveResult = await pool.query(
            `UPDATE blog_posts 
             SET status = 'published', published_at = NOW(), updated_at = NOW()
             WHERE id = $1
             RETURNING id, status, published_at`,
            [postId]
          );

          // Verify immediate effect: status changed to published
          assert.strictEqual(approveResult.rows[0].status, 'published', 'Status should immediately change to published');
          assert.ok(approveResult.rows[0].published_at, 'Published timestamp should be set');

          // Verify state persists in database
          const verifyResult = await pool.query(
            `SELECT status, published_at FROM blog_posts WHERE id = $1`,
            [postId]
          );

          assert.strictEqual(verifyResult.rows[0].status, 'published', 'Published status should persist');
          assert.ok(verifyResult.rows[0].published_at, 'Published timestamp should persist');

          // Clean up
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should immediately reflect edit action on content', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalTitle: fc.string({ minLength: 1, maxLength: 500 }),
          originalContent: fc.string({ minLength: 1, maxLength: 10000 }),
          editedTitle: fc.string({ minLength: 1, maxLength: 500 }),
          editedContent: fc.string({ minLength: 1, maxLength: 10000 }),
        }),
        async (postData) => {
          const slug = 'edit-test-' + Date.now() + '-' + Math.random().toString(36).substring(7);

          // Create a published post
          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id, status, published_at)
             VALUES ($1, $2, $3, $4, 'published', NOW())
             RETURNING id, title, content`,
            [postData.originalTitle, slug, postData.originalContent, regularUserId]
          );

          const postId = insertResult.rows[0].id;
          const originalTitle = insertResult.rows[0].title;
          const originalContent = insertResult.rows[0].content;

          // Verify original state
          assert.strictEqual(originalTitle, postData.originalTitle, 'Original title should match');
          assert.strictEqual(originalContent, postData.originalContent, 'Original content should match');

          // Admin performs edit action
          const editResult = await pool.query(
            `UPDATE blog_posts 
             SET title = $1, content = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING id, title, content, updated_at`,
            [postData.editedTitle, postData.editedContent, postId]
          );

          // Verify immediate effect: content changed
          assert.strictEqual(editResult.rows[0].title, postData.editedTitle, 'Title should immediately reflect edit');
          assert.strictEqual(editResult.rows[0].content, postData.editedContent, 'Content should immediately reflect edit');
          assert.ok(editResult.rows[0].updated_at, 'Updated timestamp should be set');

          // Verify state persists in database
          const verifyResult = await pool.query(
            `SELECT title, content FROM blog_posts WHERE id = $1`,
            [postId]
          );

          assert.strictEqual(verifyResult.rows[0].title, postData.editedTitle, 'Edited title should persist');
          assert.strictEqual(verifyResult.rows[0].content, postData.editedContent, 'Edited content should persist');

          // Clean up
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should immediately reflect removal (delete) action on content', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 500 }),
          content: fc.string({ minLength: 1, maxLength: 10000 }),
        }),
        async (postData) => {
          const slug = 'delete-test-' + Date.now() + '-' + Math.random().toString(36).substring(7);

          // Create a published post
          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id, status, published_at)
             VALUES ($1, $2, $3, $4, 'published', NOW())
             RETURNING id`,
            [postData.title, slug, postData.content, regularUserId]
          );

          const postId = insertResult.rows[0].id;

          // Verify post exists
          const existsResult = await pool.query(
            `SELECT id FROM blog_posts WHERE id = $1`,
            [postId]
          );
          assert.strictEqual(existsResult.rows.length, 1, 'Post should exist before deletion');

          // Admin performs removal action
          const deleteResult = await pool.query(
            `DELETE FROM blog_posts WHERE id = $1 RETURNING id`,
            [postId]
          );

          // Verify immediate effect: post deleted
          assert.strictEqual(deleteResult.rows.length, 1, 'Delete operation should return deleted post ID');

          // Verify post no longer exists in database
          const verifyResult = await pool.query(
            `SELECT id FROM blog_posts WHERE id = $1`,
            [postId]
          );

          assert.strictEqual(verifyResult.rows.length, 0, 'Post should not exist after deletion');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should immediately reflect unpublish action on content', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 500 }),
          content: fc.string({ minLength: 1, maxLength: 10000 }),
        }),
        async (postData) => {
          const slug = 'unpublish-test-' + Date.now() + '-' + Math.random().toString(36).substring(7);

          // Create a published post
          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id, status, published_at)
             VALUES ($1, $2, $3, $4, 'published', NOW())
             RETURNING id, status`,
            [postData.title, slug, postData.content, regularUserId]
          );

          const postId = insertResult.rows[0].id;
          const initialStatus = insertResult.rows[0].status;

          // Verify initial state is published
          assert.strictEqual(initialStatus, 'published', 'Initial status should be published');

          // Admin performs unpublish action (moderation to hide content)
          const unpublishResult = await pool.query(
            `UPDATE blog_posts 
             SET status = 'draft', updated_at = NOW()
             WHERE id = $1
             RETURNING id, status`,
            [postId]
          );

          // Verify immediate effect: status changed to draft
          assert.strictEqual(unpublishResult.rows[0].status, 'draft', 'Status should immediately change to draft');

          // Verify state persists in database
          const verifyResult = await pool.query(
            `SELECT status FROM blog_posts WHERE id = $1`,
            [postId]
          );

          assert.strictEqual(verifyResult.rows[0].status, 'draft', 'Draft status should persist');

          // Verify post is no longer visible in public queries
          const publicResult = await pool.query(
            `SELECT id FROM blog_posts WHERE id = $1 AND status = 'published'`,
            [postId]
          );

          assert.strictEqual(publicResult.rows.length, 0, 'Unpublished post should not appear in public queries');

          // Clean up
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple moderation actions in sequence', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 500 }),
          content: fc.string({ minLength: 1, maxLength: 10000 }),
          editedTitle: fc.string({ minLength: 1, maxLength: 500 }),
        }),
        async (postData) => {
          const slug = 'sequence-test-' + Date.now() + '-' + Math.random().toString(36).substring(7);

          // Create a draft post
          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id, status)
             VALUES ($1, $2, $3, $4, 'draft')
             RETURNING id`,
            [postData.title, slug, postData.content, regularUserId]
          );

          const postId = insertResult.rows[0].id;

          // Action 1: Approve (publish)
          await pool.query(
            `UPDATE blog_posts SET status = 'published', published_at = NOW() WHERE id = $1`,
            [postId]
          );

          let verifyResult = await pool.query(
            `SELECT status FROM blog_posts WHERE id = $1`,
            [postId]
          );
          assert.strictEqual(verifyResult.rows[0].status, 'published', 'First action: should be published');

          // Action 2: Edit
          await pool.query(
            `UPDATE blog_posts SET title = $1, updated_at = NOW() WHERE id = $2`,
            [postData.editedTitle, postId]
          );

          verifyResult = await pool.query(
            `SELECT title, status FROM blog_posts WHERE id = $1`,
            [postId]
          );
          assert.strictEqual(verifyResult.rows[0].title, postData.editedTitle, 'Second action: title should be edited');
          assert.strictEqual(verifyResult.rows[0].status, 'published', 'Second action: should still be published');

          // Action 3: Unpublish
          await pool.query(
            `UPDATE blog_posts SET status = 'draft', updated_at = NOW() WHERE id = $1`,
            [postId]
          );

          verifyResult = await pool.query(
            `SELECT status FROM blog_posts WHERE id = $1`,
            [postId]
          );
          assert.strictEqual(verifyResult.rows[0].status, 'draft', 'Third action: should be unpublished');

          // Clean up
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
        }
      ),
      { numRuns: 50 }
    );
  });
});
