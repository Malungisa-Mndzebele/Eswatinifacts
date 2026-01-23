import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/database.js';

/**
 * Feature: eswatini-facts-platform, Property 23: Bookmark persistence
 * Validates: Requirements 7.3
 * 
 * For any content item bookmarked by an authenticated user, the bookmark should 
 * appear in the user's saved items list immediately
 */

// Helper function to create a test user
async function createTestUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, email_verified)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, role`,
    [email, passwordHash, 'Test User', 'user', false]
  );
  return result.rows[0];
}

// Helper function to save content
async function saveContent(userId, contentType, contentId) {
  const result = await pool.query(
    `INSERT INTO saved_content (user_id, content_type, content_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, content_type, content_id) DO NOTHING
     RETURNING id, content_type, content_id, saved_at`,
    [userId, contentType, contentId]
  );
  return result.rows[0];
}

// Helper function to get saved content
async function getSavedContent(userId) {
  const result = await pool.query(
    `SELECT id, content_type, content_id, saved_at
     FROM saved_content
     WHERE user_id = $1
     ORDER BY saved_at DESC`,
    [userId]
  );
  return result.rows;
}

// Helper function to check if content is saved
function isContentInSavedList(savedList, contentType, contentId) {
  return savedList.some(
    item => item.content_type === contentType && item.content_id === contentId
  );
}

// Generators for property-based testing
const contentTypeGenerator = fc.constantFrom(
  'blog_post',
  'data_point',
  'visualization',
  'video',
  'article'
);

const contentIdGenerator = fc.uuid();

describe('User Profile - Bookmark Persistence (PBT)', () => {
  let dbAvailable = false;
  let testUsers = [];

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      console.log('Database connected - running bookmark persistence tests');
    } catch (error) {
      console.log('Database not available - skipping bookmark tests');
      console.log('To run these tests, please set up PostgreSQL and configure .env');
    }
  });

  after(async () => {
    // Clean up test data
    if (dbAvailable && testUsers.length > 0) {
      const userIds = testUsers.map(u => u.id);
      await pool.query('DELETE FROM saved_content WHERE user_id = ANY($1)', [userIds]);
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    }
  });

  it('Property 23: bookmarked content should appear in saved items list immediately', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        contentTypeGenerator,
        contentIdGenerator,
        async (contentType, contentId) => {
          // Create a unique test user for this test case
          const email = `test-bookmark-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          // Save the content
          const savedItem = await saveContent(user.id, contentType, contentId);
          
          // Verify it was saved
          assert.ok(savedItem, 'Content should be saved');
          assert.strictEqual(savedItem.content_type, contentType, 'Content type should match');
          assert.strictEqual(savedItem.content_id, contentId, 'Content ID should match');

          // Get the saved content list
          const savedList = await getSavedContent(user.id);

          // Verify the bookmarked content appears in the list
          const isPresent = isContentInSavedList(savedList, contentType, contentId);
          
          return isPresent === true;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 23: multiple bookmarks should all appear in saved items list', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            contentType: contentTypeGenerator,
            contentId: contentIdGenerator,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (bookmarks) => {
          // Create a unique test user
          const email = `test-multi-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          // Save all bookmarks
          for (const bookmark of bookmarks) {
            await saveContent(user.id, bookmark.contentType, bookmark.contentId);
          }

          // Get the saved content list
          const savedList = await getSavedContent(user.id);

          // Verify all bookmarks appear in the list
          const allPresent = bookmarks.every(bookmark =>
            isContentInSavedList(savedList, bookmark.contentType, bookmark.contentId)
          );

          return allPresent === true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('Property 23: duplicate bookmarks should not create multiple entries', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        contentTypeGenerator,
        contentIdGenerator,
        async (contentType, contentId) => {
          // Create a unique test user
          const email = `test-dup-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          // Save the same content twice
          await saveContent(user.id, contentType, contentId);
          await saveContent(user.id, contentType, contentId);

          // Get the saved content list
          const savedList = await getSavedContent(user.id);

          // Count how many times this content appears
          const count = savedList.filter(
            item => item.content_type === contentType && item.content_id === contentId
          ).length;

          // Should only appear once
          return count === 1;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('Property 23: saved content should have timestamp', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        contentTypeGenerator,
        contentIdGenerator,
        async (contentType, contentId) => {
          // Create a unique test user
          const email = `test-time-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          const beforeSave = new Date();
          
          // Save the content
          await saveContent(user.id, contentType, contentId);
          
          const afterSave = new Date();

          // Get the saved content list
          const savedList = await getSavedContent(user.id);
          const savedItem = savedList.find(
            item => item.content_type === contentType && item.content_id === contentId
          );

          // Verify timestamp exists and is reasonable
          assert.ok(savedItem, 'Saved item should exist');
          assert.ok(savedItem.saved_at, 'Saved item should have timestamp');
          
          const savedAt = new Date(savedItem.saved_at);
          const isReasonableTime = savedAt >= beforeSave && savedAt <= afterSave;

          return isReasonableTime;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
