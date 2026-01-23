import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import pool from '../src/config/database.js';
import bcrypt from 'bcrypt';
import { encryptEmail, encryptName, decryptEmail, decryptName } from '../src/utils/encryption.js';

/**
 * Feature: eswatini-facts-platform, Property 32: User management operations
 * Validates: Requirements 10.3
 * 
 * Property: For any user account operation (view, edit, deactivate) performed by an administrator,
 * the user account state should reflect the change
 */

describe('User Management Operations Property Tests', () => {
  let adminUserId;
  let dbAvailable = false;

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      console.log('Database connected - running user management property tests');

      // Create admin user
      const adminPasswordHash = await bcrypt.hash('AdminPassword123', 10);
      const adminEmail = encryptEmail('user-mgmt-admin@example.com');
      const adminName = encryptName('User Management Admin');
      
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
      await pool.query('DELETE FROM users WHERE id = $1 OR email_encrypted LIKE $2', 
        [adminUserId, '%user-mgmt-test%']);
      await pool.end();
    }
  });

  it('should immediately reflect view operation on user account', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 255 }),
          role: fc.constantFrom('user', 'admin'),
        }),
        async (userData) => {
          const uniqueEmail = `user-mgmt-test-view-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const passwordHash = await bcrypt.hash('TestPassword123', 10);
          const encryptedEmail = encryptEmail(uniqueEmail);
          const encryptedName = encryptName(userData.name);

          // Create a user account
          const insertResult = await pool.query(
            `INSERT INTO users (email_encrypted, password_hash, name_encrypted, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email_encrypted, name_encrypted, role, created_at, last_login_at, email_verified`,
            [encryptedEmail, passwordHash, encryptedName, userData.role]
          );

          const userId = insertResult.rows[0].id;

          // Admin performs view operation
          const viewResult = await pool.query(
            `SELECT id, email_encrypted, name_encrypted, role, created_at, last_login_at, email_verified
             FROM users WHERE id = $1`,
            [userId]
          );

          // Verify immediate effect: all user data is retrievable
          assert.strictEqual(viewResult.rows.length, 1, 'User should be viewable');
          assert.strictEqual(viewResult.rows[0].id, userId, 'User ID should match');
          
          const decryptedEmail = decryptEmail(viewResult.rows[0].email_encrypted);
          const decryptedName = decryptName(viewResult.rows[0].name_encrypted);
          
          assert.strictEqual(decryptedEmail, uniqueEmail, 'Email should be retrievable');
          assert.strictEqual(decryptedName, userData.name, 'Name should be retrievable');
          assert.strictEqual(viewResult.rows[0].role, userData.role, 'Role should be retrievable');
          assert.ok(viewResult.rows[0].created_at, 'Created timestamp should be retrievable');

          // Clean up
          await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should immediately reflect edit operation on user account', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalName: fc.string({ minLength: 1, maxLength: 255 }),
          editedName: fc.string({ minLength: 1, maxLength: 255 }),
          originalRole: fc.constantFrom('user', 'admin'),
          editedRole: fc.constantFrom('user', 'admin'),
        }),
        async (userData) => {
          const uniqueEmail = `user-mgmt-test-edit-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const passwordHash = await bcrypt.hash('TestPassword123', 10);
          const encryptedEmail = encryptEmail(uniqueEmail);
          const encryptedOriginalName = encryptName(userData.originalName);

          // Create a user account
          const insertResult = await pool.query(
            `INSERT INTO users (email_encrypted, password_hash, name_encrypted, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name_encrypted, role`,
            [encryptedEmail, passwordHash, encryptedOriginalName, userData.originalRole]
          );

          const userId = insertResult.rows[0].id;
          const originalName = decryptName(insertResult.rows[0].name_encrypted);
          const originalRole = insertResult.rows[0].role;

          // Verify original state
          assert.strictEqual(originalName, userData.originalName, 'Original name should match');
          assert.strictEqual(originalRole, userData.originalRole, 'Original role should match');

          // Admin performs edit operation
          const encryptedEditedName = encryptName(userData.editedName);
          const editResult = await pool.query(
            `UPDATE users 
             SET name_encrypted = $1, role = $2
             WHERE id = $3
             RETURNING id, name_encrypted, role`,
            [encryptedEditedName, userData.editedRole, userId]
          );

          // Verify immediate effect: user data changed
          const editedName = decryptName(editResult.rows[0].name_encrypted);
          assert.strictEqual(editedName, userData.editedName, 'Name should immediately reflect edit');
          assert.strictEqual(editResult.rows[0].role, userData.editedRole, 'Role should immediately reflect edit');

          // Verify state persists in database
          const verifyResult = await pool.query(
            `SELECT name_encrypted, role FROM users WHERE id = $1`,
            [userId]
          );

          const verifiedName = decryptName(verifyResult.rows[0].name_encrypted);
          assert.strictEqual(verifiedName, userData.editedName, 'Edited name should persist');
          assert.strictEqual(verifyResult.rows[0].role, userData.editedRole, 'Edited role should persist');

          // Clean up
          await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should immediately reflect deactivate operation on user account', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 255 }),
        }),
        async (userData) => {
          const uniqueEmail = `user-mgmt-test-deactivate-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const passwordHash = await bcrypt.hash('TestPassword123', 10);
          const encryptedEmail = encryptEmail(uniqueEmail);
          const encryptedName = encryptName(userData.name);

          // Create an active user account
          const insertResult = await pool.query(
            `INSERT INTO users (email_encrypted, password_hash, name_encrypted, role, email_verified)
             VALUES ($1, $2, $3, 'user', true)
             RETURNING id, email_verified`,
            [encryptedEmail, passwordHash, encryptedName]
          );

          const userId = insertResult.rows[0].id;
          const initialVerified = insertResult.rows[0].email_verified;

          // Verify initial state is active (email_verified = true)
          assert.strictEqual(initialVerified, true, 'Initial state should be active');

          // Admin performs deactivate operation (set email_verified to false as deactivation flag)
          const deactivateResult = await pool.query(
            `UPDATE users 
             SET email_verified = false
             WHERE id = $1
             RETURNING id, email_verified`,
            [userId]
          );

          // Verify immediate effect: account deactivated
          assert.strictEqual(deactivateResult.rows[0].email_verified, false, 'Account should immediately be deactivated');

          // Verify state persists in database
          const verifyResult = await pool.query(
            `SELECT email_verified FROM users WHERE id = $1`,
            [userId]
          );

          assert.strictEqual(verifyResult.rows[0].email_verified, false, 'Deactivated state should persist');

          // Verify deactivated user cannot be retrieved in active user queries
          const activeUsersResult = await pool.query(
            `SELECT id FROM users WHERE id = $1 AND email_verified = true`,
            [userId]
          );

          assert.strictEqual(activeUsersResult.rows.length, 0, 'Deactivated user should not appear in active user queries');

          // Clean up
          await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple user management operations in sequence', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalName: fc.string({ minLength: 1, maxLength: 255 }),
          editedName: fc.string({ minLength: 1, maxLength: 255 }),
        }),
        async (userData) => {
          const uniqueEmail = `user-mgmt-test-sequence-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const passwordHash = await bcrypt.hash('TestPassword123', 10);
          const encryptedEmail = encryptEmail(uniqueEmail);
          const encryptedOriginalName = encryptName(userData.originalName);

          // Create a user account
          const insertResult = await pool.query(
            `INSERT INTO users (email_encrypted, password_hash, name_encrypted, role, email_verified)
             VALUES ($1, $2, $3, 'user', true)
             RETURNING id`,
            [encryptedEmail, passwordHash, encryptedOriginalName]
          );

          const userId = insertResult.rows[0].id;

          // Operation 1: View user
          let viewResult = await pool.query(
            `SELECT id, name_encrypted, role, email_verified FROM users WHERE id = $1`,
            [userId]
          );
          assert.strictEqual(viewResult.rows.length, 1, 'First operation: user should be viewable');
          assert.strictEqual(decryptName(viewResult.rows[0].name_encrypted), userData.originalName, 'First operation: name should match');

          // Operation 2: Edit user
          const encryptedEditedName = encryptName(userData.editedName);
          await pool.query(
            `UPDATE users SET name_encrypted = $1, role = 'admin' WHERE id = $2`,
            [encryptedEditedName, userId]
          );

          viewResult = await pool.query(
            `SELECT name_encrypted, role FROM users WHERE id = $1`,
            [userId]
          );
          assert.strictEqual(decryptName(viewResult.rows[0].name_encrypted), userData.editedName, 'Second operation: name should be edited');
          assert.strictEqual(viewResult.rows[0].role, 'admin', 'Second operation: role should be edited');

          // Operation 3: Deactivate user
          await pool.query(
            `UPDATE users SET email_verified = false WHERE id = $1`,
            [userId]
          );

          viewResult = await pool.query(
            `SELECT email_verified FROM users WHERE id = $1`,
            [userId]
          );
          assert.strictEqual(viewResult.rows[0].email_verified, false, 'Third operation: user should be deactivated');

          // Operation 4: Reactivate user
          await pool.query(
            `UPDATE users SET email_verified = true WHERE id = $1`,
            [userId]
          );

          viewResult = await pool.query(
            `SELECT email_verified FROM users WHERE id = $1`,
            [userId]
          );
          assert.strictEqual(viewResult.rows[0].email_verified, true, 'Fourth operation: user should be reactivated');

          // Clean up
          await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain data integrity when editing user accounts', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 255 }),
          newName: fc.string({ minLength: 1, maxLength: 255 }),
        }),
        async (userData) => {
          const uniqueEmail = `user-mgmt-test-integrity-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
          const passwordHash = await bcrypt.hash('TestPassword123', 10);
          const encryptedEmail = encryptEmail(uniqueEmail);
          const encryptedName = encryptName(userData.name);

          // Create a user account
          const insertResult = await pool.query(
            `INSERT INTO users (email_encrypted, password_hash, name_encrypted, role)
             VALUES ($1, $2, $3, 'user')
             RETURNING id, created_at`,
            [encryptedEmail, passwordHash, encryptedName]
          );

          const userId = insertResult.rows[0].id;
          const createdAt = insertResult.rows[0].created_at;

          // Edit user name
          const encryptedNewName = encryptName(userData.newName);
          await pool.query(
            `UPDATE users SET name_encrypted = $1 WHERE id = $2`,
            [encryptedNewName, userId]
          );

          // Verify that other fields remain unchanged
          const verifyResult = await pool.query(
            `SELECT email_encrypted, created_at, role FROM users WHERE id = $1`,
            [userId]
          );

          const verifiedEmail = decryptEmail(verifyResult.rows[0].email_encrypted);
          assert.strictEqual(verifiedEmail, uniqueEmail, 'Email should remain unchanged after name edit');
          assert.deepStrictEqual(verifyResult.rows[0].created_at, createdAt, 'Created timestamp should remain unchanged');
          assert.strictEqual(verifyResult.rows[0].role, 'user', 'Role should remain unchanged when only editing name');

          // Clean up
          await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow viewing multiple users simultaneously', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 255 }),
            role: fc.constantFrom('user', 'admin'),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (usersData) => {
          const userIds = [];

          // Create multiple user accounts
          for (const userData of usersData) {
            const uniqueEmail = `user-mgmt-test-multi-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
            const passwordHash = await bcrypt.hash('TestPassword123', 10);
            const encryptedEmail = encryptEmail(uniqueEmail);
            const encryptedName = encryptName(userData.name);

            const insertResult = await pool.query(
              `INSERT INTO users (email_encrypted, password_hash, name_encrypted, role)
               VALUES ($1, $2, $3, $4)
               RETURNING id`,
              [encryptedEmail, passwordHash, encryptedName, userData.role]
            );

            userIds.push(insertResult.rows[0].id);
          }

          // Admin performs view operation on all users
          const viewResult = await pool.query(
            `SELECT id, email_encrypted, name_encrypted, role 
             FROM users 
             WHERE id = ANY($1)
             ORDER BY id`,
            [userIds]
          );

          // Verify all users are viewable
          assert.strictEqual(viewResult.rows.length, usersData.length, 'All users should be viewable');

          // Verify each user's data is correct
          for (let i = 0; i < viewResult.rows.length; i++) {
            assert.strictEqual(viewResult.rows[i].id, userIds[i], `User ${i} ID should match`);
            assert.ok(viewResult.rows[i].email_encrypted, `User ${i} should have encrypted email`);
            assert.ok(viewResult.rows[i].name_encrypted, `User ${i} should have encrypted name`);
            assert.ok(['user', 'admin'].includes(viewResult.rows[i].role), `User ${i} should have valid role`);
          }

          // Clean up
          await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
        }
      ),
      { numRuns: 50 }
    );
  });
});
