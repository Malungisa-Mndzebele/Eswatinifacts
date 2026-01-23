import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';
import crypto from 'crypto';

/**
 * Feature: eswatini-facts-platform, Property 15: API error handling
 * Validates: Requirements 5.3
 * 
 * Property: For any request to a non-existent API endpoint, the response should have 
 * status code 404 and include error details in the response body
 */

describe('API Error Handling Property Tests', () => {
  let testUserId;
  let testApiKey;
  let serverAvailable = false;

  before(async () => {
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        serverAvailable = true;
        console.log('Server is running - proceeding with API error tests');
      }
    } catch (error) {
      console.log('Server not running - skipping API error tests');
      console.log('To run these tests, start the server with: npm start');
      return;
    }

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`test-error-${Date.now()}@example.com`, 'hashedpassword', 'user']
    );
    testUserId = userResult.rows[0].id;

    // Generate API key
    const apiKey = `efp_${crypto.randomBytes(32).toString('hex')}`;
    testApiKey = apiKey;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    await pool.query(
      `INSERT INTO api_keys (user_id, key_hash, name, rate_limit)
       VALUES ($1, $2, $3, $4)`,
      [testUserId, keyHash, 'Test Key', 1000]
    );
  });

  after(async () => {
    // Cleanup
    if (testUserId) {
      await pool.query('DELETE FROM api_keys WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  it('should return 404 with error details for non-existent endpoints', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !['economy', 'health', 'education', 'politics', 'culture'].includes(s)),
        async (invalidEndpoint) => {
          // Make request to non-existent endpoint
          const response = await fetch(
            `http://localhost:3000/api/v1/data/${invalidEndpoint}`,
            {
              headers: {
                'X-API-Key': testApiKey,
              },
            }
          );

          // Verify 404 status code
          assert.strictEqual(
            response.status,
            404,
            'Non-existent endpoint should return 404'
          );

          // Verify response is JSON
          const contentType = response.headers.get('content-type');
          assert.ok(
            contentType && contentType.includes('application/json'),
            'Error response should be JSON'
          );

          const data = await response.json();

          // Verify error structure
          assert.strictEqual(data.success, false, 'success should be false for errors');
          assert.ok(data.hasOwnProperty('error'), 'Response should have error field');
          assert.ok(data.error.hasOwnProperty('code'), 'Error should have code field');
          assert.strictEqual(
            typeof data.error.code,
            'string',
            'Error code should be a string'
          );
          assert.ok(data.error.hasOwnProperty('message'), 'Error should have message field');
          assert.strictEqual(
            typeof data.error.message,
            'string',
            'Error message should be a string'
          );
          assert.ok(data.error.hasOwnProperty('timestamp'), 'Error should have timestamp field');
          assert.ok(
            new Date(data.error.timestamp).toString() !== 'Invalid Date',
            'Timestamp should be a valid date'
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return 401 with error details for missing API key', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('economy', 'health', 'education', 'politics', 'culture'),
        async (category) => {
          // Make request without API key
          const response = await fetch(`http://localhost:3000/api/v1/data/${category}`);

          // Verify 401 status code
          assert.strictEqual(
            response.status,
            401,
            'Request without API key should return 401'
          );

          const data = await response.json();

          // Verify error structure
          assert.strictEqual(data.success, false, 'success should be false');
          assert.ok(data.error, 'Response should have error field');
          assert.strictEqual(data.error.code, 'API_KEY_REQUIRED', 'Error code should indicate missing API key');
          assert.ok(data.error.message, 'Error should have message');
          assert.ok(data.error.timestamp, 'Error should have timestamp');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return 401 with error details for invalid API key', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.constantFrom('economy', 'health', 'education', 'politics', 'culture'),
        async (invalidKey, category) => {
          // Make request with invalid API key
          const response = await fetch(`http://localhost:3000/api/v1/data/${category}`, {
            headers: {
              'X-API-Key': `efp_${invalidKey}`,
            },
          });

          // Verify 401 status code
          assert.strictEqual(
            response.status,
            401,
            'Request with invalid API key should return 401'
          );

          const data = await response.json();

          // Verify error structure
          assert.strictEqual(data.success, false, 'success should be false');
          assert.ok(data.error, 'Response should have error field');
          assert.strictEqual(
            data.error.code,
            'INVALID_API_KEY',
            'Error code should indicate invalid API key'
          );
          assert.ok(data.error.message, 'Error should have message');
          assert.ok(data.error.timestamp, 'Error should have timestamp');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return 422 with validation error details for invalid query parameters', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          startDate: fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            // Generate invalid date strings
            const date = new Date(s);
            return date.toString() === 'Invalid Date' || !/^\d{4}-\d{2}-\d{2}/.test(s);
          }),
        }),
        async (invalidParams) => {
          // Make request with invalid parameters
          const params = new URLSearchParams();
          params.append('startDate', invalidParams.startDate);

          const response = await fetch(
            `http://localhost:3000/api/v1/data/economy?${params.toString()}`,
            {
              headers: {
                'X-API-Key': testApiKey,
              },
            }
          );

          // Verify 422 status code for validation errors
          assert.strictEqual(
            response.status,
            422,
            'Invalid query parameters should return 422'
          );

          const data = await response.json();

          // Verify error structure
          assert.strictEqual(data.success, false, 'success should be false');
          assert.ok(data.error, 'Response should have error field');
          assert.strictEqual(
            data.error.code,
            'VALIDATION_ERROR',
            'Error code should indicate validation error'
          );
          assert.ok(data.error.message, 'Error should have message');
          assert.ok(data.error.details, 'Validation error should have details');
          assert.ok(Array.isArray(data.error.details), 'Error details should be an array');
          assert.ok(data.error.timestamp, 'Error should have timestamp');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should include consistent error structure across all error types', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { endpoint: 'nonexistent', expectedStatus: 404 },
          { endpoint: 'economy', expectedStatus: 401, noKey: true },
          { endpoint: 'health', expectedStatus: 401, invalidKey: true }
        ),
        async (testCase) => {
          let response;
          
          if (testCase.noKey) {
            response = await fetch(`http://localhost:3000/api/v1/data/${testCase.endpoint}`);
          } else if (testCase.invalidKey) {
            response = await fetch(`http://localhost:3000/api/v1/data/${testCase.endpoint}`, {
              headers: { 'X-API-Key': 'efp_invalid' },
            });
          } else {
            response = await fetch(`http://localhost:3000/api/v1/data/${testCase.endpoint}`, {
              headers: { 'X-API-Key': testApiKey },
            });
          }

          const data = await response.json();

          // All errors should have consistent structure
          assert.strictEqual(data.success, false, 'success should be false');
          assert.ok(data.error, 'Should have error object');
          assert.strictEqual(typeof data.error.code, 'string', 'Error code should be string');
          assert.strictEqual(typeof data.error.message, 'string', 'Error message should be string');
          assert.ok(data.error.timestamp, 'Error should have timestamp');
          assert.ok(
            new Date(data.error.timestamp).toString() !== 'Invalid Date',
            'Timestamp should be valid'
          );
        }
      ),
      { numRuns: 20 }
    );
  });
});
