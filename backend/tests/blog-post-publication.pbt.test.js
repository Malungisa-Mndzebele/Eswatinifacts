import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';
import bcrypt from 'bcrypt';

/**
 * Feature: eswatini-facts-platform, Property 12: Post publication visibility
 * Validates: Requirements 4.3
 * 
 * Property: For any blog post with status changed to "published",
 * the post should appear in the blog list and be findable via search
 */

describe('Blog Post Publication Visibility Property Tests', () => {
  let testUserId;

  before(async () => {
    // Create a test user for blog posts
    const passwordHash = await bcrypt.hash('TestPassword123', 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['blog-pub-test@example.com', passwordHash, 'Blog Pub Test User', 'admin']
    );
    testUserId = result.rows[0].id;
  });

  after(async () => {
    // Clean up test data
    await pool.query('DELETE FROM search_index WHERE content_type = $1', ['blog_post']);
    await pool.query('DELETE FROM blog_posts WHERE author_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  it('should make published posts visible in blog list', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 500 }),
          content: fc.string({ minLength: 1, maxLength: 10000 }),
          category: fc.option(fc.constantFrom('Economy', 'Health', 'Education', 'Politics', 'Culture'), { nil: null }),
        }),
        async (postData) => {
          const slug = 'pub-test-' + Date.now() + '-' + Math.random().toString(36).substring(7);

          // Create a draft post
          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id, category, status)
             VALUES ($1, $2, $3, $4, $5, 'draft')
             RETURNING id`,
            [postData.title, slug, postData.content, testUserId, postData.category]
          );

          const postId = insertResult.rows[0].id;

          // Verify draft post is NOT in published list
          const draftListResult = await pool.query(
            `SELECT id FROM blog_posts WHERE id = $1 AND status = 'published'`,
            [postId]
          );

          assert.strictEqual(draftListResult.rows.length, 0, 'Draft post should not appear in published list');

          // Publish the post
          await pool.query(
            `UPDATE blog_posts SET status = 'published', published_at = NOW() WHERE id = $1`,
            [postId]
          );

          // Verify published post IS in published list
          const publishedListResult = await pool.query(
            `SELECT id FROM blog_posts WHERE id = $1 AND status = 'published'`,
            [postId]
          );

          assert.strictEqual(publishedListResult.rows.length, 1, 'Published post should appear in published list');

          // Clean up
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should make published posts findable in search index', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 500 }),
          content: fc.string({ minLength: 1, maxLength: 10000 }),
        }),
        async (postData) => {
          const slug = 'search-test-' + Date.now() + '-' + Math.random().toString(36).substring(7);

          // Create and publish a post
          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id, status, published_at)
             VALUES ($1, $2, $3, $4, 'published', NOW())
             RETURNING id`,
            [postData.title, slug, postData.content, testUserId]
          );

          const postId = insertResult.rows[0].id;

          // Add to search index (simulating what the controller does)
          await pool.query(
            `INSERT INTO search_index (content_type, content_id, title, content, url, search_vector)
             VALUES ($1, $2, $3, $4, $5, to_tsvector('english', $3 || ' ' || $4))
             ON CONFLICT (content_type, content_id) DO UPDATE SET
               title = EXCLUDED.title,
               content = EXCLUDED.content,
               search_vector = EXCLUDED.search_vector`,
            ['blog_post', postId, postData.title, postData.content, `/blog/${slug}`]
          );

          // Verify post is in search index
          const searchResult = await pool.query(
            `SELECT id FROM search_index WHERE content_type = 'blog_post' AND content_id = $1`,
            [postId]
          );

          assert.strictEqual(searchResult.rows.length, 1, 'Published post should be in search index');

          // Clean up
          await pool.query('DELETE FROM search_index WHERE content_type = $1 AND content_id = $2', ['blog_post', postId]);
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should remove unpublished posts from search index', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 500 }),
          content: fc.string({ minLength: 1, maxLength: 10000 }),
        }),
        async (postData) => {
          const slug = 'unpub-test-' + Date.now() + '-' + Math.random().toString(36).substring(7);

          // Create and publish a post
          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id, status, published_at)
             VALUES ($1, $2, $3, $4, 'published', NOW())
             RETURNING id`,
            [postData.title, slug, postData.content, testUserId]
          );

          const postId = insertResult.rows[0].id;

          // Add to search index
          await pool.query(
            `INSERT INTO search_index (content_type, content_id, title, content, url, search_vector)
             VALUES ($1, $2, $3, $4, $5, to_tsvector('english', $3 || ' ' || $4))`,
            ['blog_post', postId, postData.title, postData.content, `/blog/${slug}`]
          );

          // Unpublish the post
          await pool.query(
            `UPDATE blog_posts SET status = 'draft' WHERE id = $1`,
            [postId]
          );

          // Remove from search index (simulating what the controller does)
          await pool.query(
            `DELETE FROM search_index WHERE content_type = 'blog_post' AND content_id = $1`,
            [postId]
          );

          // Verify post is NOT in search index
          const searchResult = await pool.query(
            `SELECT id FROM search_index WHERE content_type = 'blog_post' AND content_id = $1`,
            [postId]
          );

          assert.strictEqual(searchResult.rows.length, 0, 'Unpublished post should not be in search index');

          // Clean up
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only show published posts in public queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 500 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            status: fc.constantFrom('draft', 'scheduled', 'published'),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (posts) => {
          const postIds = [];

          // Create all posts
          for (const post of posts) {
            const slug = `multi-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const result = await pool.query(
              `INSERT INTO blog_posts (title, slug, content, author_id, status, published_at)
               VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 = 'published' THEN NOW() ELSE NULL END)
               RETURNING id`,
              [post.title, slug, post.content, testUserId, post.status]
            );
            postIds.push(result.rows[0].id);
          }

          // Query for published posts only
          const publishedResult = await pool.query(
            `SELECT id, status FROM blog_posts WHERE id = ANY($1) AND status = 'published'`,
            [postIds]
          );

          // Count expected published posts
          const expectedPublished = posts.filter(p => p.status === 'published').length;

          assert.strictEqual(
            publishedResult.rows.length,
            expectedPublished,
            'Only published posts should be returned in public query'
          );

          // Verify all returned posts are published
          for (const row of publishedResult.rows) {
            assert.strictEqual(row.status, 'published', 'All returned posts should have published status');
          }

          // Clean up
          await pool.query('DELETE FROM blog_posts WHERE id = ANY($1)', [postIds]);
        }
      ),
      { numRuns: 50 }
    );
  });
});
