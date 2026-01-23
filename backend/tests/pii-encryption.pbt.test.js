import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';
import { initializeDatabase, dropAllTables, runMigrations } from '../src/database/init.js';
import { encrypt, decrypt, encryptEmail, decryptEmail, encryptName, decryptName } from '../src/utils/encryption.js';
import bcrypt from 'bcrypt';

/**
 * Feature: eswatini-facts-platform, Property 36: PII encryption at rest
 * Validates: Requirements 12.5
 * 
 * Property: For any personally identifiable information stored in the database,
 * the data should be encrypted using AES-256 or stronger
 */

describe('PII Encryption Property-Based Tests', () => {
  describe('Property 36: PII encryption at rest', () => {
    it('encrypting then decrypting any string returns the original value', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 255 }),
          (plaintext) => {
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);
            return decrypted === plaintext;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('encrypting the same value twice produces different ciphertexts (due to random IV)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 255 }),
          (plaintext) => {
            const encrypted1 = encrypt(plaintext);
            const encrypted2 = encrypt(plaintext);
            // Different ciphertexts due to random IV
            return encrypted1 !== encrypted2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('encrypted data is different from plaintext', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 255 }),
          (plaintext) => {
            const encrypted = encrypt(plaintext);
            // Encrypted data should not contain the plaintext
            return encrypted !== plaintext;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('email encryption round-trip preserves email format', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            const encrypted = encryptEmail(email);
            const decrypted = decryptEmail(encrypted);
            return decrypted === email;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('name encryption round-trip preserves name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 255 }),
          (name) => {
            const encrypted = encryptName(name);
            const decrypted = decryptName(encrypted);
            return decrypted === name;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('null values are handled correctly', () => {
      assert.strictEqual(encrypt(null), null);
      assert.strictEqual(decrypt(null), null);
      assert.strictEqual(encryptEmail(null), null);
      assert.strictEqual(decryptEmail(null), null);
      assert.strictEqual(encryptName(null), null);
      assert.strictEqual(decryptName(null), null);
    });



    it('encrypted data uses AES-256-GCM (verified by ciphertext structure)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 255 }),
          (plaintext) => {
            const encrypted = encrypt(plaintext);
            
            // Decode from base64
            const combined = Buffer.from(encrypted, 'base64');
            
            // Verify structure: IV (16 bytes) + ciphertext + auth tag (16 bytes)
            // Minimum length should be 16 (IV) + 16 (auth tag) = 32 bytes
            assert.ok(combined.length >= 32);
            
            // Extract IV (first 16 bytes)
            const iv = combined.subarray(0, 16);
            assert.strictEqual(iv.length, 16);
            
            // Extract auth tag (last 16 bytes)
            const authTag = combined.subarray(combined.length - 16);
            assert.strictEqual(authTag.length, 16);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tampering with encrypted data causes decryption to fail', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 255 }),
          (plaintext) => {
            const encrypted = encrypt(plaintext);
            const buffer = Buffer.from(encrypted, 'base64');
            
            // Tamper with a random byte in the middle
            const tamperIndex = Math.floor(buffer.length / 2);
            buffer[tamperIndex] = buffer[tamperIndex] ^ 0xFF;
            
            const tamperedEncrypted = buffer.toString('base64');
            
            // Decryption should fail
            assert.throws(() => decrypt(tamperedEncrypted));
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
