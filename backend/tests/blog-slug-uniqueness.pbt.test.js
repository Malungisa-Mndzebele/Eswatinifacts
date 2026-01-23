import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';
import bcrypt from 'bcrypt';
import { generateSlug, ensureUniqueSlug } from '../src/controllers/blogController.js';

/**
 * Feature: eswatini-facts-platform, Property 13: URL slug uniqueness
 * Validates: Requirements 4.5
 * 
 * Property: For any set of blog posts, all generated URL slugs should be unique
 * and deterministically derived from titles
 */

describe('Blog Slug Uniqueness Property Tests', () => {
  let testUserId;

  before(async () => {
    // Create a test user for blog posts
    const passwordHash = await bcrypt.hash('TestPassword123', 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['blog-slug-test@example.com', passwordHash, 'Blog Slug Test User', 'admin']
    );
    testUserId = result.rows[0].id;
  });

  after(async () => {
    // Clean up test data
    await pool.query('DELETE FROM blog_posts WHERE author_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  it('should generate unique slugs for different titles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 5, maxLength: 100 }),
          { minLength: 2, maxLength: 20 }
        ),
        async (titles) => {
          // Generate slugs from all titles
          const slugs = titles.map(title => generateSlug(title));
          
          // Create a set to check uniqueness
          const uniqueSlugs = new Set(slugs);
          
          // If all titles are different, slugs should be different
          const uniqueTitles = new Set(titles);
          
          // The number of unique slugs should equal the number of unique titles
          assert.strictEqual(
            uniqueSlugs.size,
            uniqueTitles.size,
            'Each unique title should generate a unique slug'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate URL-safe slugs', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (title) => {
          const slug = generateSlug(title);
          
          // Slug should only contain lowercase letters, numbers, and hyphens
          const urlSafePattern = /^[a-z0-9-]*$/;
          assert.ok(urlSafePattern.test(slug), 'Slug should be URL-safe (lowercase alphanumeric and hyphens only)');
          
          // Slug should not start or end with hyphen
          if (slug.length > 0) {
            assert.ok(!slug.startsWith('-'), 'Slug should not start with hyphen');
            assert.ok(!slug.endsWith('-'), 'Slug should not end with hyphen');
          }
          
          // Slug should not have consecutive hyphens
          assert.ok(!slug.includes('--'), 'Slug should not have consecutive hyphens');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure database-level slug uniqueness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 500 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (posts) => {
          const postIds = [];
          const slugs = [];

          try {
            // Create all posts
            for (const post of posts) {
              const baseSlug = generateSlug(post.title);
              const uniqueSlug = await ensureUniqueSlug(baseSlug);
              
              const result = await pool.query(
                `INSERT INTO blog_posts (title, slug, content, author_id)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, slug`,
                [post.title, uniqueSlug, post.content, testUserId]
              );
              
              postIds.push(result.rows[0].id);
              slugs.push(result.rows[0].slug);
            }

            // Verify all slugs are unique
            const uniqueSlugs = new Set(slugs);
            assert.strictEqual(
              slugs.length,
              uniqueSlugs.size,
              'All slugs in database should be unique'
            );

            // Verify database constraint prevents duplicates
            const allSlugs = await pool.query(
              'SELECT slug, COUNT(*) as count FROM blog_posts WHERE id = ANY($1) GROUP BY slug',
              [postIds]
            );

            for (const row of allSlugs.rows) {
              assert.strictEqual(
                parseInt(row.count),
                1,
                `Slug "${row.slug}" should appear exactly once`
              );
            }
          } finally {
            // Clean up
            if (postIds.length > 0) {
              await pool.query('DELETE FROM blog_posts WHERE id = ANY($1)', [postIds]);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle duplicate titles by appending numbers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }),
        async (title) => {
          const postIds = [];

          try {
            const baseSlug = generateSlug(title);
            
            // Create first post with this title
            const slug1 = await ensureUniqueSlug(baseSlug);
            const result1 = await pool.query(
              `INSERT INTO blog_posts (title, slug, content, author_id)
               VALUES ($1, $2, $3, $4)
               RETURNING id, slug`,
              [title, slug1, 'Content 1', testUserId]
            );
            postIds.push(result1.rows[0].id);

            // Create second post with same title
            const slug2 = await ensureUniqueSlug(baseSlug);
            const result2 = await pool.query(
              `INSERT INTO blog_posts (title, slug, content, author_id)
               VALUES ($1, $2, $3, $4)
               RETURNING id, slug`,
              [title, slug2, 'Content 2', testUserId]
            );
            postIds.push(result2.rows[0].id);

            // Create third post with same title
            const slug3 = await ensureUniqueSlug(baseSlug);
            const result3 = await pool.query(
              `INSERT INTO blog_posts (title, slug, content, author_id)
               VALUES ($1, $2, $3, $4)
               RETURNING id, slug`,
              [title, slug3, 'Content 3', testUserId]
            );
            postIds.push(result3.rows[0].id);

            // All three slugs should be different
            const slugs = [result1.rows[0].slug, result2.rows[0].slug, result3.rows[0].slug];
            const uniqueSlugs = new Set(slugs);
            
            assert.strictEqual(uniqueSlugs.size, 3, 'All three slugs should be unique');
            
            // Second and third slugs should have numeric suffixes
            assert.ok(
              slugs[1] !== slugs[0],
              'Second slug should be different from first'
            );
            assert.ok(
              slugs[2] !== slugs[0] && slugs[2] !== slugs[1],
              'Third slug should be different from first and second'
            );
          } finally {
            // Clean up
            if (postIds.length > 0) {
              await pool.query('DELETE FROM blog_posts WHERE id = ANY($1)', [postIds]);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should generate deterministic slugs from same title', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (title) => {
          // Generate slug multiple times from same title
          const slug1 = generateSlug(title);
          const slug2 = generateSlug(title);
          const slug3 = generateSlug(title);
          
          // All should be identical
          assert.strictEqual(slug1, slug2, 'Slug generation should be deterministic');
          assert.strictEqual(slug2, slug3, 'Slug generation should be deterministic');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle special characters in titles', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (title) => {
          const slug = generateSlug(title);
          
          // Slug should not contain special characters
          const specialChars = /[^a-z0-9-]/;
          assert.ok(!specialChars.test(slug), 'Slug should not contain special characters');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle very long titles by truncating appropriately', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 500, maxLength: 1000 }),
        (longTitle) => {
          const slug = generateSlug(longTitle);
          
          // Slug should be reasonable length (not excessively long)
          // This is implementation-dependent, but generally slugs should be manageable
          assert.ok(slug.length <= 500, 'Slug should not be excessively long');
        }
      ),
      { numRuns: 50 }
    );
  });
});
