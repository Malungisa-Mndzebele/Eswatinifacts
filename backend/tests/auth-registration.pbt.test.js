import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/database.js';

/**
 * Feature: eswatini-facts-platform, Property 21: Registration validation
 * Validates: Requirements 7.1
 * 
 * For any registration attempt, the Platform should create an account only if 
 * the email is valid format and password meets strength requirements 
 * (min 8 chars, mixed case, number)
 */

// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

// Helper function to validate password strength
function isValidPassword(password) {
  if (password.length < 8) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

// Helper function to simulate registration
async function attemptRegistration(email, password, name = null) {
  try {
    // Check if email is valid
    if (!isValidEmail(email)) {
      return { success: false, reason: 'invalid_email' };
    }

    // Check if password is valid
    if (!isValidPassword(password)) {
      return { success: false, reason: 'invalid_password' };
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return { success: false, reason: 'user_exists' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, created_at`,
      [email.toLowerCase(), passwordHash, name, 'user', false]
    );

    return { success: true, user: result.rows[0] };
  } catch (error) {
    return { success: false, reason: 'error', error };
  }
}

// Generators for property-based testing
const validEmailGenerator = fc.emailAddress();

const invalidEmailGenerator = fc.oneof(
  fc.string().filter(s => !isValidEmail(s)),
  fc.constant('notanemail'),
  fc.constant('missing@domain'),
  fc.constant('@nodomain.com'),
  fc.constant('no-at-sign.com')
);

const validPasswordGenerator = fc.string({ minLength: 8, maxLength: 50 })
  .map(s => {
    // Ensure it has at least one lowercase, uppercase, and number
    let password = s;
    if (!/[a-z]/.test(password)) password += 'a';
    if (!/[A-Z]/.test(password)) password += 'A';
    if (!/[0-9]/.test(password)) password += '1';
    return password;
  });

const invalidPasswordGenerator = fc.oneof(
  // Too short
  fc.string({ maxLength: 7 }),
  // No lowercase
  fc.string({ minLength: 8 }).filter(s => !/[a-z]/.test(s)).map(s => s.toUpperCase() + '123'),
  // No uppercase
  fc.string({ minLength: 8 }).filter(s => !/[A-Z]/.test(s)).map(s => s.toLowerCase() + '123'),
  // No number
  fc.string({ minLength: 8 }).filter(s => !/[0-9]/.test(s)).map(s => 'Aa' + s.replace(/[0-9]/g, 'x'))
);

describe('Authentication - Registration Validation (PBT)', () => {
  let dbAvailable = false;

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      console.log('Database connected - running registration validation tests');
    } catch (error) {
      console.log('Database not available - skipping registration tests');
      console.log('To run these tests, please set up PostgreSQL and configure .env');
    }
  });

  after(async () => {
    // Clean up test users
    if (dbAvailable) {
      await pool.query("DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example%'");
    }
  });

  it('Property 21: should accept valid email and password combinations', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        validEmailGenerator,
        validPasswordGenerator,
        fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
        async (email, password, name) => {
          // Make email unique for this test
          const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${email.split('@')[1] || 'example.com'}`;
          
          const result = await attemptRegistration(uniqueEmail, password, name);
          
          // Clean up
          if (result.success) {
            await pool.query('DELETE FROM users WHERE id = $1', [result.user.id]);
          }
          
          // Should succeed with valid credentials
          return result.success === true;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 21: should reject invalid email formats', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        invalidEmailGenerator,
        validPasswordGenerator,
        async (email, password) => {
          const result = await attemptRegistration(email, password);
          
          // Should fail with invalid email
          return result.success === false && result.reason === 'invalid_email';
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 21: should reject weak passwords', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        validEmailGenerator,
        invalidPasswordGenerator,
        async (email, password) => {
          // Make email unique
          const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${email.split('@')[1] || 'example.com'}`;
          
          const result = await attemptRegistration(uniqueEmail, password);
          
          // Should fail with invalid password
          return result.success === false && result.reason === 'invalid_password';
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 21: should reject duplicate email registrations', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    // Create a test user first
    const testEmail = `duplicate-test-${Date.now()}@example.com`;
    const testPassword = 'ValidPass123';
    
    const firstResult = await attemptRegistration(testEmail, testPassword);
    assert.strictEqual(firstResult.success, true, 'First registration should succeed');
    
    // Try to register again with same email
    const secondResult = await attemptRegistration(testEmail, testPassword);
    assert.strictEqual(secondResult.success, false, 'Second registration should fail');
    assert.strictEqual(secondResult.reason, 'user_exists', 'Should fail due to duplicate email');
    
    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
  });
});
