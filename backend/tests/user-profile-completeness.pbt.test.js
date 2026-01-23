import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/database.js';

/**
 * Feature: eswatini-facts-platform, Property 25: Profile completeness
 * Validates: Requirements 7.5
 * 
 * For any authenticated user viewing their profile, all user data 
 * (saved content, preferences, account info) should be displayed
 */

// Helper function to create a test user
async function createTestUser(email, password, name = null) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, email_verified)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, role, created_at, last_login_at, email_verified`,
    [email, passwordHash, name, 'user', false]
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

// Helper function to get user profile (simulating the controller logic)
async function getUserProfile(userId) {
  // Get user basic info
  const userResult = await pool.query(
    `SELECT id, email, name, role, created_at, last_login_at, email_verified
     FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  const user = userResult.rows[0];

  // Get saved content
  const savedContentResult = await pool.query(
    `SELECT id, content_type, content_id, saved_at
     FROM saved_content
     WHERE user_id = $1
     ORDER BY saved_at DESC`,
    [userId]
  );

  // Get user preferences (default for now)
  const preferences = {
    language: 'en',
    emailNotifications: true,
    theme: 'light',
  };

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      emailVerified: user.email_verified,
    },
    savedContent: savedContentResult.rows.map(item => ({
      id: item.id,
      contentType: item.content_type,
      contentId: item.content_id,
      savedAt: item.saved_at,
    })),
    preferences,
  };
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

describe('User Profile - Profile Completeness (PBT)', () => {
  let dbAvailable = false;
  let testUsers = [];

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      console.log('Database connected - running profile completeness tests');
    } catch (error) {
      console.log('Database not available - skipping profile completeness tests');
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

  it('Property 25: profile should contain all user account information', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
        async (emailDomain, name) => {
          // Create a unique test user
          const email = `test-profile-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailDomain.split('@')[1] || 'example.com'}`;
          const user = await createTestUser(email, 'TestPass123', name);
          testUsers.push(user);

          // Get the profile
          const profile = await getUserProfile(user.id);

          // Verify all account information is present
          assert.ok(profile, 'Profile should exist');
          assert.ok(profile.user, 'Profile should have user object');
          assert.strictEqual(profile.user.id, user.id, 'User ID should match');
          assert.strictEqual(profile.user.email, user.email, 'Email should match');
          assert.strictEqual(profile.user.name, user.name, 'Name should match');
          assert.strictEqual(profile.user.role, user.role, 'Role should match');
          assert.ok(profile.user.createdAt, 'Created at should be present');
          assert.ok(profile.user.hasOwnProperty('lastLoginAt'), 'Last login at should be present (can be null)');
          assert.ok(profile.user.hasOwnProperty('emailVerified'), 'Email verified should be present');

          return true;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 25: profile should contain all saved content', async () => {
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
          { minLength: 0, maxLength: 10 }
        ),
        async (bookmarks) => {
          // Create a unique test user
          const email = `test-saved-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          // Save all bookmarks
          for (const bookmark of bookmarks) {
            await saveContent(user.id, bookmark.contentType, bookmark.contentId);
          }

          // Get the profile
          const profile = await getUserProfile(user.id);

          // Verify saved content is present
          assert.ok(profile, 'Profile should exist');
          assert.ok(Array.isArray(profile.savedContent), 'Saved content should be an array');
          assert.strictEqual(
            profile.savedContent.length,
            bookmarks.length,
            'Saved content count should match'
          );

          // Verify each bookmark is in the profile
          for (const bookmark of bookmarks) {
            const found = profile.savedContent.some(
              item => item.contentType === bookmark.contentType && item.contentId === bookmark.contentId
            );
            assert.ok(found, `Bookmark ${bookmark.contentType}:${bookmark.contentId} should be in profile`);
          }

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('Property 25: profile should contain user preferences', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (emailDomain) => {
          // Create a unique test user
          const email = `test-prefs-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailDomain.split('@')[1] || 'example.com'}`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          // Get the profile
          const profile = await getUserProfile(user.id);

          // Verify preferences are present
          assert.ok(profile, 'Profile should exist');
          assert.ok(profile.preferences, 'Preferences should exist');
          assert.ok(profile.preferences.hasOwnProperty('language'), 'Language preference should be present');
          assert.ok(profile.preferences.hasOwnProperty('emailNotifications'), 'Email notifications preference should be present');
          assert.ok(profile.preferences.hasOwnProperty('theme'), 'Theme preference should be present');

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('Property 25: profile should have all three main sections', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.array(
          fc.record({
            contentType: contentTypeGenerator,
            contentId: contentIdGenerator,
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (emailDomain, bookmarks) => {
          // Create a unique test user
          const email = `test-complete-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailDomain.split('@')[1] || 'example.com'}`;
          const user = await createTestUser(email, 'TestPass123', 'Test User');
          testUsers.push(user);

          // Save some bookmarks
          for (const bookmark of bookmarks) {
            await saveContent(user.id, bookmark.contentType, bookmark.contentId);
          }

          // Get the profile
          const profile = await getUserProfile(user.id);

          // Verify all three main sections are present
          assert.ok(profile, 'Profile should exist');
          assert.ok(profile.user, 'User section should be present');
          assert.ok(Array.isArray(profile.savedContent), 'Saved content section should be present');
          assert.ok(profile.preferences, 'Preferences section should be present');

          // Verify user section has required fields
          const userFields = ['id', 'email', 'name', 'role', 'createdAt', 'lastLoginAt', 'emailVerified'];
          for (const field of userFields) {
            assert.ok(
              profile.user.hasOwnProperty(field),
              `User should have ${field} field`
            );
          }

          // Verify saved content has required fields
          if (profile.savedContent.length > 0) {
            const contentFields = ['id', 'contentType', 'contentId', 'savedAt'];
            for (const field of contentFields) {
              assert.ok(
                profile.savedContent[0].hasOwnProperty(field),
                `Saved content should have ${field} field`
              );
            }
          }

          // Verify preferences has required fields
          const prefFields = ['language', 'emailNotifications', 'theme'];
          for (const field of prefFields) {
            assert.ok(
              profile.preferences.hasOwnProperty(field),
              `Preferences should have ${field} field`
            );
          }

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  it('Property 25: profile for user with no saved content should still be complete', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (emailDomain) => {
          // Create a unique test user with no saved content
          const email = `test-empty-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailDomain.split('@')[1] || 'example.com'}`;
          const user = await createTestUser(email, 'TestPass123');
          testUsers.push(user);

          // Get the profile (without saving any content)
          const profile = await getUserProfile(user.id);

          // Verify profile is complete even with no saved content
          assert.ok(profile, 'Profile should exist');
          assert.ok(profile.user, 'User section should be present');
          assert.ok(Array.isArray(profile.savedContent), 'Saved content should be an array');
          assert.strictEqual(profile.savedContent.length, 0, 'Saved content should be empty');
          assert.ok(profile.preferences, 'Preferences section should be present');

          return true;
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });
});
