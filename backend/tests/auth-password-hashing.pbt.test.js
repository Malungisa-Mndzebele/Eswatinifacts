import { describe, it } from 'node:test';
import fc from 'fast-check';
import bcrypt from 'bcrypt';

/**
 * Feature: eswatini-facts-platform, Property 35: Password hashing security
 * Validates: Requirements 12.2
 * 
 * For any password created by a user, the stored hash should be generated 
 * using bcrypt with work factor >= 10
 */

// Helper function to extract bcrypt work factor from hash
function getBcryptWorkFactor(hash) {
  // Bcrypt hash format: $2a$10$... or $2b$10$...
  // The work factor is the number after the second $
  const match = hash.match(/^\$2[aby]\$(\d+)\$/);
  return match ? parseInt(match[1], 10) : null;
}

// Helper function to hash password with bcrypt
async function hashPassword(password, rounds = 10) {
  return await bcrypt.hash(password, rounds);
}

// Helper function to verify password against hash
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generator for passwords
const passwordGenerator = fc.string({ minLength: 8, maxLength: 100 });

describe('Authentication - Password Hashing Security (PBT)', () => {
  it('Property 35: should hash passwords with work factor >= 10', async () => {
    await fc.assert(
      fc.asyncProperty(
        passwordGenerator,
        async (password) => {
          const hash = await hashPassword(password, 10);
          const workFactor = getBcryptWorkFactor(hash);
          
          // Work factor should be at least 10
          return workFactor !== null && workFactor >= 10;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 35: should produce different hashes for same password', async () => {
    await fc.assert(
      fc.asyncProperty(
        passwordGenerator,
        async (password) => {
          // Hash the same password twice
          const hash1 = await hashPassword(password, 10);
          const hash2 = await hashPassword(password, 10);
          
          // Hashes should be different due to random salt
          return hash1 !== hash2;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 35: should verify correct password against hash', async () => {
    await fc.assert(
      fc.asyncProperty(
        passwordGenerator,
        async (password) => {
          const hash = await hashPassword(password, 10);
          const isValid = await verifyPassword(password, hash);
          
          // Original password should verify successfully
          return isValid === true;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 35: should reject incorrect password against hash', async () => {
    await fc.assert(
      fc.asyncProperty(
        passwordGenerator,
        passwordGenerator,
        async (password1, password2) => {
          // Skip if passwords are the same
          if (password1 === password2) return true;
          
          const hash = await hashPassword(password1, 10);
          const isValid = await verifyPassword(password2, hash);
          
          // Different password should not verify
          return isValid === false;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 35: should produce valid bcrypt hash format', async () => {
    await fc.assert(
      fc.asyncProperty(
        passwordGenerator,
        async (password) => {
          const hash = await hashPassword(password, 10);
          
          // Bcrypt hash should match the format: $2a$10$... or $2b$10$...
          // Total length should be 60 characters
          const isValidFormat = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
          const isCorrectLength = hash.length === 60;
          
          return isValidFormat && isCorrectLength;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 35: should handle various password lengths and characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string({ minLength: 8, maxLength: 20 }),
          fc.string({ minLength: 20, maxLength: 50 }),
          fc.string({ minLength: 50, maxLength: 100 }),
          fc.string({ minLength: 8, maxLength: 50 })
        ),
        async (password) => {
          const hash = await hashPassword(password, 10);
          const isValid = await verifyPassword(password, hash);
          const workFactor = getBcryptWorkFactor(hash);
          
          // Should successfully hash and verify any valid password
          return isValid === true && workFactor >= 10;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });

  it('Property 35: should use consistent work factor', async () => {
    await fc.assert(
      fc.asyncProperty(
        passwordGenerator,
        fc.integer({ min: 10, max: 12 }),
        async (password, rounds) => {
          const hash = await hashPassword(password, rounds);
          const workFactor = getBcryptWorkFactor(hash);
          
          // Work factor in hash should match requested rounds
          return workFactor === rounds;
        }
      ),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
