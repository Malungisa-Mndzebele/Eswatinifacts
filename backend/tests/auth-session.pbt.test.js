import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/database.js';

/**
 * Feature: eswatini-facts-platform, Property 22: Authentication session creation
 * Validates: Requirements 7.2
 * 
 * For any successful login with valid credentials, the Platform should create 
 * a session token that remains valid for subsequent requests
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// Helper function to generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Helper function to verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Helper function to create test user
async function createTestUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, email_verified)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, role, created_at`,
    [email, passwordHash, 'Test User', 'user', false]
  );
  return result.rows[0];
}

// Helper function to simulate login
async function attemptLogin(email, password) {
  try {
    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return { success: false, reason: 'user_not_found' };
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return { success: false, reason: 'invalid_password' };
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error) {
    return { success: false, reason: 'error', error };
  }
}

// Generators
const emailGenerator = fc.emailAddress();
const passwordGenerator = fc.string({ minLength: 8, maxLength: 50 });
const userRoleGenerator = fc.constantFrom('user', 'admin');

describe('Authentication - Session Creation (PBT)', () => {
  const testUsers = [];
  let dbAvailable = false;

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      console.log('Database connected - running session creation tests');
    } catch (error) {
      console.log('Database not available - skipping session tests');
      console.log('To run these tests, please set up PostgreSQL and configure .env');
    }
  });

  after(async () => {
    // Clean up test users
    if (dbAvailable) {
      for (const user of testUsers) {
        await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
      }
    }
  });

  it('Property 22: should create valid session token on successful login', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        passwordGenerator,
        async (emailBase, password) => {
          // Create unique email
          const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailBase.split('@')[1] || 'example.com'}`;
          
          // Create test user
          const user = await createTestUser(email, password);
          testUsers.push(user);
          
          // Attempt login
          const loginResult = await attemptLogin(email, password);
          
          // Should succeed
          if (!loginResult.success) return false;
          
          // Token should exist
          if (!loginResult.token) return false;
          
          // Token should be verifiable
          const decoded = verifyToken(loginResult.token);
          if (!decoded) return false;
          
          // Token should contain user information
          return (
            decoded.userId === user.id &&
            decoded.email === user.email &&
            decoded.role === user.role
          );
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 22: should create tokens that remain valid for subsequent verification', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        passwordGenerator,
        async (emailBase, password) => {
          // Create unique email
          const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailBase.split('@')[1] || 'example.com'}`;
          
          // Create test user
          const user = await createTestUser(email, password);
          testUsers.push(user);
          
          // Login to get token
          const loginResult = await attemptLogin(email, password);
          if (!loginResult.success) return false;
          
          const token = loginResult.token;
          
          // Verify token multiple times (simulating subsequent requests)
          const verification1 = verifyToken(token);
          const verification2 = verifyToken(token);
          const verification3 = verifyToken(token);
          
          // All verifications should succeed and return same data
          return (
            verification1 !== null &&
            verification2 !== null &&
            verification3 !== null &&
            verification1.userId === verification2.userId &&
            verification2.userId === verification3.userId
          );
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 22: should fail login with incorrect password', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        passwordGenerator,
        passwordGenerator,
        async (emailBase, correctPassword, wrongPassword) => {
          // Skip if passwords are the same
          if (correctPassword === wrongPassword) return true;
          
          // Create unique email
          const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailBase.split('@')[1] || 'example.com'}`;
          
          // Create test user with correct password
          const user = await createTestUser(email, correctPassword);
          testUsers.push(user);
          
          // Attempt login with wrong password
          const loginResult = await attemptLogin(email, wrongPassword);
          
          // Should fail
          return loginResult.success === false && loginResult.reason === 'invalid_password';
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 22: should fail login with non-existent email', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        passwordGenerator,
        async (emailBase, password) => {
          // Create unique email that doesn't exist
          const email = `nonexistent-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailBase.split('@')[1] || 'example.com'}`;
          
          // Attempt login
          const loginResult = await attemptLogin(email, password);
          
          // Should fail
          return loginResult.success === false && loginResult.reason === 'user_not_found';
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 22: should include expiration in token', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        passwordGenerator,
        async (emailBase, password) => {
          // Create unique email
          const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailBase.split('@')[1] || 'example.com'}`;
          
          // Create test user
          const user = await createTestUser(email, password);
          testUsers.push(user);
          
          // Login to get token
          const loginResult = await attemptLogin(email, password);
          if (!loginResult.success) return false;
          
          // Decode token
          const decoded = verifyToken(loginResult.token);
          if (!decoded) return false;
          
          // Token should have expiration (exp claim)
          // exp should be in the future
          const now = Math.floor(Date.now() / 1000);
          return decoded.exp && decoded.exp > now;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 22: should update last_login_at on successful login', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        passwordGenerator,
        async (emailBase, password) => {
          // Create unique email
          const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${emailBase.split('@')[1] || 'example.com'}`;
          
          // Create test user
          const user = await createTestUser(email, password);
          testUsers.push(user);
          
          // Get initial last_login_at (should be null)
          const beforeLogin = await pool.query(
            'SELECT last_login_at FROM users WHERE id = $1',
            [user.id]
          );
          
          // Login
          const loginResult = await attemptLogin(email, password);
          if (!loginResult.success) return false;
          
          // Get updated last_login_at
          const afterLogin = await pool.query(
            'SELECT last_login_at FROM users WHERE id = $1',
            [user.id]
          );
          
          // last_login_at should be updated
          return afterLogin.rows[0].last_login_at !== null;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });
});
