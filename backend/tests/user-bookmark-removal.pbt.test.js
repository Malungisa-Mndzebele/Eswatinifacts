import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/database.js';

/**
 * Feature: eswatini-facts-platform, Property 24: Bookmark removal
 * Validates: Requirements 7.4
 * 
 * For any bookmarked content item, removing the bookmark should delete it from 
 * the saved items list and prevent it from appearing in future retrievals
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
     RETURNING id, content_type, content_id, saved_at`,
    [userId, contentType, contentId]
  );
  return result.rows[0];
}

// Helper function to remove saved content by ID
async function removeSavedContent(savedContentId, userId) {
  const result = await pool.query(
    `DELETE FROM saved_content
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [savedContentId, userId]
  );
  return result.rows.length > 0;
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

describe('User Profile - Bookmark Removal (PBT)', () => {
  let dbAvailable = false;
  let testUsers = [];

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      console.log('Database connected - running bookmark removal tests');
    } catch (error) {
      console.log('Database not available - skipping bookmark removal tests');
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

  it('Property 24: removed bookmark should not appear in saved items list', async () => {
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
          const email = `test-remove-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          // Save the content
          const savedItem = await saveContent(user.id, contentType, contentId);
          
          // Verify it was saved
          let savedList = await getSavedContent(user.id);
          assert.ok(isContentInSavedList(savedList, contentType, contentId), 'Content should be in saved list');

          // Remove the bookmark
          const removed = await removeSavedContent(savedItem.id, user.id);
          assert.ok(removed, 'Bookmark should be removed');

          // Get the saved content list again
          savedList = await getSavedContent(user.id);

          // Verify the bookmark no longer appears
          const isPresent = isContentInSavedList(savedList, contentType, contentId);
          
          return isPresent === false;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 24: removing one bookmark should not affect other bookmarks', async () => {
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
          { minLength: 2, maxLength: 5 }
        ),
        async (bookmarks) => {
          // Create a unique test user
          const email = `test-multi-remove-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          // Save all bookmarks
          const savedItems = [];
          for (const bookmark of bookmarks) {
            const saved = await saveContent(user.id, bookmark.contentType, bookmark.contentId);
            savedItems.push(saved);
          }

          // Remove the first bookmark
          const toRemove = savedItems[0];
          await removeSavedContent(toRemove.id, user.id);

          // Get the saved content list
          const savedList = await getSavedContent(user.id);

          // Verify the removed bookmark is not present
          const removedIsPresent = isContentInSavedList(
            savedList,
            toRemove.content_type,
            toRemove.content_id
          );

          // Verify all other bookmarks are still present
          const othersPresent = savedItems.slice(1).every(item =>
            isContentInSavedList(savedList, item.content_type, item.content_id)
          );

          return removedIsPresent === false && othersPresent === true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('Property 24: removing non-existent bookmark should not cause errors', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (fakeId) => {
          // Create a unique test user
          const email = `test-fake-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          // Try to remove a non-existent bookmark
          const removed = await removeSavedContent(fakeId, user.id);

          // Should return false (not found) but not throw an error
          return removed === false;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('Property 24: user cannot remove another user\'s bookmarks', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        contentTypeGenerator,
        contentIdGenerator,
        async (contentType, contentId) => {
          // Create two test users
          const email1 = `test-user1-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user1 = await createTestUser(email1, 'TestPass123');
          testUsers.push(user1);

          const email2 = `test-user2-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user2 = await createTestUser(email2, 'TestPass123');
          testUsers.push(user2);

          // User 1 saves content
          const savedItem = await saveContent(user1.id, contentType, contentId);

          // User 2 tries to remove user 1's bookmark
          const removed = await removeSavedContent(savedItem.id, user2.id);

          // Should not be removed
          assert.strictEqual(removed, false, 'User 2 should not be able to remove user 1\'s bookmark');

          // Verify user 1's bookmark still exists
          const user1SavedList = await getSavedContent(user1.id);
          const stillPresent = isContentInSavedList(user1SavedList, contentType, contentId);

          return stillPresent === true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('Property 24: removing bookmark is idempotent', async () => {
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
          const email = `test-idempotent-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          // Save the content
          const savedItem = await saveContent(user.id, contentType, contentId);

          // Remove the bookmark twice
          const removed1 = await removeSavedContent(savedItem.id, user.id);
          const removed2 = await removeSavedContent(savedItem.id, user.id);

          // First removal should succeed, second should return false (not found)
          assert.strictEqual(removed1, true, 'First removal should succeed');
          assert.strictEqual(removed2, false, 'Second removal should return false');

          // Verify the bookmark is not in the list
          const savedList = await getSavedContent(user.id);
          const isPresent = isContentInSavedList(savedList, contentType, contentId);

          return isPresent === false;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
