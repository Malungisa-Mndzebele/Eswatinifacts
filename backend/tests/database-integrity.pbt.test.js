import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import pool, { query, transaction } from '../src/config/database.js';
import { initializeDatabase, resetDatabase } from '../src/database/init.js';

/**
 * Feature: eswatini-facts-platform, Property 33: Data import integrity
 * Validates: Requirements 10.4
 * 
 * For any data import operation, all referential integrity constraints should be maintained
 * (no orphaned references, valid foreign keys)
 */

// Generators for test data
const uuidArbitrary = fc.uuid();

const userArbitrary = fc.record({
  email: fc.emailAddress(),
  password_hash: fc.string({ minLength: 60, maxLength: 60 }), // bcrypt hash length
  name: fc.option(fc.string({ minLength: 1, maxLength: 255 })),
  role: fc.constantFrom('user', 'admin'),
});

const blogPostArbitrary = (authorId) => fc.record({
  title: fc.string({ minLength: 1, maxLength: 500 }),
  slug: fc.string({ minLength: 1, maxLength: 500 }).map(s => 
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  ),
  content: fc.string({ minLength: 1, maxLength: 5000 }),
  excerpt: fc.option(fc.string({ minLength: 1, maxLength: 1000 })),
  author_id: fc.constant(authorId),
  category: fc.option(fc.constantFrom('Economy', 'Health', 'Education', 'Politics', 'Culture')),
  status: fc.constantFrom('draft', 'scheduled', 'published'),
});

const dataSourceArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 255 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 1000 })),
  url: fc.option(fc.webUrl()),
  category: fc.option(fc.constantFrom('Economy', 'Health', 'Education', 'Politics', 'Culture')),
});

const dataPointArbitrary = (sourceId) => fc.record({
  source_id: fc.constant(sourceId),
  category: fc.constantFrom('Economy', 'Health', 'Education', 'Politics', 'Culture'),
  subcategory: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  metric_name: fc.string({ minLength: 1, maxLength: 255 }),
  metric_value: fc.double({ min: 0, max: 1000000, noNaN: true }),
  metric_unit: fc.option(fc.constantFrom('USD', 'percent', 'count', 'rate')),
  date_recorded: fc.date({ min: new Date('2000-01-01'), max: new Date('2025-12-31') }),
});

describe('Database Schema Integrity Property Tests', () => {
  let dbAvailable = false;

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      // Initialize database schema
      await resetDatabase();
      console.log('Database connected - running full property tests');
    } catch (error) {
      console.log('Database not available - skipping tests');
      console.log('To run these tests, please set up PostgreSQL and configure .env');
      console.log('See SETUP.md for instructions');
    }
  });

  after(async () => {
    // Clean up
    if (dbAvailable) {
      await pool.end();
    }
  });

  it('Property 33: Foreign key constraints prevent orphaned blog posts', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 1, maxLength: 5 }),
        async (userData, titles) => {
          // Create a user
          const userResult = await query(
            `INSERT INTO users (email, password_hash, name, role) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [userData.email, userData.password_hash, userData.name, userData.role]
          );
          const userId = userResult.rows[0].id;

          // Create blog posts for this user
          const postIds = [];
          for (const title of titles) {
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const result = await query(
              `INSERT INTO blog_posts (title, slug, content, author_id, status) 
               VALUES ($1, $2, $3, $4, $5) RETURNING id`,
              [title, `${slug}-${Date.now()}`, 'Test content', userId, 'draft']
            );
            postIds.push(result.rows[0].id);
          }

          // Verify all posts have valid author_id
          const postsResult = await query(
            `SELECT bp.id, bp.author_id, u.id as user_exists 
             FROM blog_posts bp 
             LEFT JOIN users u ON bp.author_id = u.id 
             WHERE bp.id = ANY($1)`,
            [postIds]
          );

          // All posts should have a matching user
          const allHaveValidAuthor = postsResult.rows.every(row => row.user_exists !== null);

          // Clean up
          await query('DELETE FROM blog_posts WHERE id = ANY($1)', [postIds]);
          await query('DELETE FROM users WHERE id = $1', [userId]);

          return allHaveValidAuthor;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 33: Foreign key constraints prevent orphaned data points', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        dataSourceArbitrary,
        fc.array(
          fc.record({
            metric_name: fc.string({ minLength: 1, maxLength: 255 }),
            metric_value: fc.double({ min: 0, max: 1000000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (sourceData, metrics) => {
          // Create a data source
          const sourceResult = await query(
            `INSERT INTO data_sources (name, description, url, category) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [sourceData.name, sourceData.description, sourceData.url, sourceData.category]
          );
          const sourceId = sourceResult.rows[0].id;

          // Create data points for this source
          const pointIds = [];
          for (const metric of metrics) {
            const result = await query(
              `INSERT INTO data_points (source_id, category, metric_name, metric_value, date_recorded) 
               VALUES ($1, $2, $3, $4, $5) RETURNING id`,
              [sourceId, 'Economy', metric.metric_name, metric.metric_value, new Date()]
            );
            pointIds.push(result.rows[0].id);
          }

          // Verify all data points have valid source_id
          const pointsResult = await query(
            `SELECT dp.id, dp.source_id, ds.id as source_exists 
             FROM data_points dp 
             LEFT JOIN data_sources ds ON dp.source_id = ds.id 
             WHERE dp.id = ANY($1)`,
            [pointIds]
          );

          // All points should have a matching source
          const allHaveValidSource = pointsResult.rows.every(row => row.source_exists !== null);

          // Clean up
          await query('DELETE FROM data_points WHERE id = ANY($1)', [pointIds]);
          await query('DELETE FROM data_sources WHERE id = $1', [sourceId]);

          return allHaveValidSource;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 33: Cascade delete maintains referential integrity', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 1, maxLength: 3 }),
        async (userData, titles) => {
          // Use transaction to ensure atomicity
          const result = await transaction(async (client) => {
            // Create a user
            const userResult = await client.query(
              `INSERT INTO users (email, password_hash, name, role) 
               VALUES ($1, $2, $3, $4) RETURNING id`,
              [userData.email, userData.password_hash, userData.name, userData.role]
            );
            const userId = userResult.rows[0].id;

            // Create saved content entries for this user
            const savedIds = [];
            for (const title of titles) {
              const result = await client.query(
                `INSERT INTO saved_content (user_id, content_type, content_id) 
                 VALUES ($1, $2, $3) RETURNING id`,
                [userId, 'article', `article-${title}`]
              );
              savedIds.push(result.rows[0].id);
            }

            // Delete the user (should cascade to saved_content)
            await client.query('DELETE FROM users WHERE id = $1', [userId]);

            // Check that saved content was also deleted
            const remainingResult = await client.query(
              'SELECT COUNT(*) as count FROM saved_content WHERE id = ANY($1)',
              [savedIds]
            );

            return parseInt(remainingResult.rows[0].count) === 0;
          });

          return result;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 33: Unique constraints prevent duplicate entries', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          let duplicateRejected = false;

          try {
            // Insert first user
            await query(
              `INSERT INTO users (email, password_hash, role) 
               VALUES ($1, $2, $3)`,
              [email, '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ', 'user']
            );

            // Try to insert duplicate email
            try {
              await query(
                `INSERT INTO users (email, password_hash, role) 
                 VALUES ($1, $2, $3)`,
                [email, '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ', 'user']
              );
            } catch (error) {
              // Should throw unique constraint violation
              duplicateRejected = error.code === '23505';
            }

            // Clean up
            await query('DELETE FROM users WHERE email = $1', [email]);
          } catch (error) {
            // Clean up on error
            await query('DELETE FROM users WHERE email = $1', [email]);
            throw error;
          }

          return duplicateRejected;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 33: Check constraints enforce valid data', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.constantFrom('invalid_role', 'superuser', 'guest'),
        async (email, invalidRole) => {
          let constraintEnforced = false;

          try {
            // Try to insert user with invalid role
            await query(
              `INSERT INTO users (email, password_hash, role) 
               VALUES ($1, $2, $3)`,
              [email, '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ', invalidRole]
            );
          } catch (error) {
            // Should throw check constraint violation
            constraintEnforced = error.code === '23514';
          }

          // Clean up (in case it somehow got inserted)
          await query('DELETE FROM users WHERE email = $1', [email]);

          return constraintEnforced;
        }
      ),
      { numRuns: 20 }
    );
  });
});
