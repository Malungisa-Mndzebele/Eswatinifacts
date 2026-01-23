import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';
import bcrypt from 'bcrypt';

/**
 * Feature: eswatini-facts-platform, Property 11: Blog post persistence
 * Validates: Requirements 4.1
 * 
 * Property: For any blog post created with required fields (title, body, author, category),
 * all fields should be retrievable from storage with identical values
 */

describe('Blog Post Persistence Property Tests', () => {
  let testUserId;

  before(async () => {
    // Create a test user for blog posts
    const passwordHash = await bcrypt.hash('TestPassword123', 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['blog-test@example.com', passwordHash, 'Blog Test User', 'admin']
    );
    testUserId = result.rows[0].id;
  });

  after(async () => {
    // Clean up test data
    await pool.query('DELETE FROM blog_posts WHERE author_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  it('should persist and retrieve all blog post fields correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid blog post data
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 500 }),
          content: fc.string({ minLength: 1, maxLength: 10000 }),
          excerpt: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
          category: fc.option(fc.constantFrom('Economy', 'Health', 'Education', 'Politics', 'Culture'), { nil: null }),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
          featuredImage: fc.option(fc.webUrl(), { nil: null }),
          status: fc.constantFrom('draft', 'scheduled', 'published'),
        }),
        async (postData) => {
          // Generate a unique slug from title
          const slug = postData.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + Date.now();

          // Insert blog post
          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, excerpt, author_id, category, tags, featured_image, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, title, slug, content, excerpt, author_id, category, tags, featured_image, status, created_at, updated_at`,
            [
              postData.title,
              slug,
              postData.content,
              postData.excerpt,
              testUserId,
              postData.category,
              postData.tags,
              postData.featuredImage,
              postData.status,
            ]
          );

          const insertedPost = insertResult.rows[0];

          // Retrieve the post
          const selectResult = await pool.query(
            'SELECT id, title, slug, content, excerpt, author_id, category, tags, featured_image, status FROM blog_posts WHERE id = $1',
            [insertedPost.id]
          );

          const retrievedPost = selectResult.rows[0];

          // Clean up
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [insertedPost.id]);

          // Verify all fields match
          assert.strictEqual(retrievedPost.title, postData.title, 'Title should match');
          assert.strictEqual(retrievedPost.slug, slug, 'Slug should match');
          assert.strictEqual(retrievedPost.content, postData.content, 'Content should match');
          assert.strictEqual(retrievedPost.excerpt, postData.excerpt, 'Excerpt should match');
          assert.strictEqual(retrievedPost.author_id, testUserId, 'Author ID should match');
          assert.strictEqual(retrievedPost.category, postData.category, 'Category should match');
          assert.deepStrictEqual(retrievedPost.tags, postData.tags, 'Tags should match');
          assert.strictEqual(retrievedPost.featured_image, postData.featuredImage, 'Featured image should match');
          assert.strictEqual(retrievedPost.status, postData.status, 'Status should match');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle posts with minimal required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 500 }),
          content: fc.string({ minLength: 1, maxLength: 10000 }),
        }),
        async (postData) => {
          const slug = postData.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + Date.now();

          // Insert with only required fields
          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, title, slug, content, excerpt, author_id, category, tags, featured_image, status`,
            [postData.title, slug, postData.content, testUserId]
          );

          const insertedPost = insertResult.rows[0];

          // Retrieve the post
          const selectResult = await pool.query(
            'SELECT id, title, slug, content, excerpt, author_id, category, tags, featured_image, status FROM blog_posts WHERE id = $1',
            [insertedPost.id]
          );

          const retrievedPost = selectResult.rows[0];

          // Clean up
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [insertedPost.id]);

          // Verify required fields match and optional fields are null/default
          assert.strictEqual(retrievedPost.title, postData.title, 'Title should match');
          assert.strictEqual(retrievedPost.content, postData.content, 'Content should match');
          assert.strictEqual(retrievedPost.author_id, testUserId, 'Author ID should match');
          assert.strictEqual(retrievedPost.status, 'draft', 'Default status should be draft');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve special characters and unicode in content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.unicodeString({ minLength: 1, maxLength: 500 }),
          content: fc.unicodeString({ minLength: 1, maxLength: 10000 }),
        }),
        async (postData) => {
          const slug = 'unicode-test-' + Date.now();

          const insertResult = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, author_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [postData.title, slug, postData.content, testUserId]
          );

          const postId = insertResult.rows[0].id;

          const selectResult = await pool.query(
            'SELECT title, content FROM blog_posts WHERE id = $1',
            [postId]
          );

          const retrievedPost = selectResult.rows[0];

          // Clean up
          await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);

          // Verify unicode content is preserved
          assert.strictEqual(retrievedPost.title, postData.title, 'Unicode title should be preserved');
          assert.strictEqual(retrievedPost.content, postData.content, 'Unicode content should be preserved');
        }
      ),
      { numRuns: 50 }
    );
  });
});
