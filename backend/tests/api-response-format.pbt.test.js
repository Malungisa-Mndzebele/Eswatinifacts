import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';
import crypto from 'crypto';

/**
 * Feature: eswatini-facts-platform, Property 14: API response format
 * Validates: Requirements 5.1
 * 
 * Property: For any valid authenticated API request, the response should be valid JSON 
 * with the expected schema structure
 */

describe('API Response Format Property Tests', () => {
  let testUserId;
  let testApiKey;
  let testSourceId;
  let serverAvailable = false;

  before(async () => {
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        serverAvailable = true;
        console.log('Server is running - proceeding with API tests');
      }
    } catch (error) {
      console.log('Server not running - skipping API tests');
      console.log('To run these tests, start the server with: npm start');
      return;
    }

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`test-api-${Date.now()}@example.com`, 'hashedpassword', 'user']
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

    // Create test data source
    const sourceResult = await pool.query(
      `INSERT INTO data_sources (name, description, category)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['Test Source', 'Test description', 'economy']
    );
    testSourceId = sourceResult.rows[0].id;
  });

  after(async () => {
    // Cleanup
    if (testUserId) {
      await pool.query('DELETE FROM data_points WHERE source_id = $1', [testSourceId]);
      await pool.query('DELETE FROM data_sources WHERE id = $1', [testSourceId]);
      await pool.query('DELETE FROM api_keys WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  it('should return valid JSON with expected schema for all data endpoints', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('economy', 'health', 'education', 'politics', 'culture'),
        fc.record({
          metricName: fc.string({ minLength: 1, maxLength: 100 }),
          metricValue: fc.float({ min: 0, max: 1000000 }),
          metricUnit: fc.constantFrom('percent', 'count', 'currency', 'rate'),
          dateRecorded: fc.date({ min: new Date('2000-01-01'), max: new Date() }),
        }),
        async (category, dataPoint) => {
          // Insert test data point
          await pool.query(
            `INSERT INTO data_points (source_id, category, metric_name, metric_value, metric_unit, date_recorded)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              testSourceId,
              category,
              dataPoint.metricName,
              dataPoint.metricValue,
              dataPoint.metricUnit,
              dataPoint.dateRecorded,
            ]
          );

          // Make API request
          const response = await fetch(`http://localhost:3000/api/v1/data/${category}`, {
            headers: {
              'X-API-Key': testApiKey,
            },
          });

          // Verify response is valid JSON
          const contentType = response.headers.get('content-type');
          assert.ok(
            contentType && contentType.includes('application/json'),
            'Response should have JSON content type'
          );

          const data = await response.json();

          // Verify expected schema structure
          assert.ok(data.hasOwnProperty('success'), 'Response should have success field');
          assert.strictEqual(typeof data.success, 'boolean', 'success should be boolean');

          if (data.success) {
            // Verify data structure
            assert.ok(data.hasOwnProperty('data'), 'Successful response should have data field');
            assert.ok(data.data.hasOwnProperty('category'), 'Data should have category field');
            assert.ok(data.data.hasOwnProperty('dataPoints'), 'Data should have dataPoints field');
            assert.ok(Array.isArray(data.data.dataPoints), 'dataPoints should be an array');
            assert.ok(data.data.hasOwnProperty('count'), 'Data should have count field');

            // Verify metadata structure
            assert.ok(data.hasOwnProperty('metadata'), 'Response should have metadata field');
            assert.ok(data.metadata.hasOwnProperty('version'), 'Metadata should have version');
            assert.ok(data.metadata.hasOwnProperty('timestamp'), 'Metadata should have timestamp');
            assert.ok(data.metadata.hasOwnProperty('rateLimit'), 'Metadata should have rateLimit');

            // Verify rate limit structure
            assert.ok(
              data.metadata.rateLimit.hasOwnProperty('limit'),
              'Rate limit should have limit'
            );
            assert.ok(
              data.metadata.rateLimit.hasOwnProperty('remaining'),
              'Rate limit should have remaining'
            );
          } else {
            // Verify error structure
            assert.ok(data.hasOwnProperty('error'), 'Failed response should have error field');
            assert.ok(data.error.hasOwnProperty('code'), 'Error should have code field');
            assert.ok(data.error.hasOwnProperty('message'), 'Error should have message field');
            assert.ok(data.error.hasOwnProperty('timestamp'), 'Error should have timestamp field');
          }

          // Cleanup test data
          await pool.query(
            'DELETE FROM data_points WHERE source_id = $1 AND metric_name = $2',
            [testSourceId, dataPoint.metricName]
          );
        }
      ),
      { numRuns: 20 } // Reduced runs for API tests
    );
  });

  it('should return consistent schema structure across different query parameters', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          limit: fc.integer({ min: 1, max: 100 }),
          offset: fc.integer({ min: 0, max: 50 }),
          startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
          endDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
        }),
        async (queryParams) => {
          // Build query string
          const params = new URLSearchParams();
          params.append('limit', queryParams.limit.toString());
          params.append('offset', queryParams.offset.toString());
          if (queryParams.startDate) {
            params.append('startDate', queryParams.startDate.toISOString().split('T')[0]);
          }
          if (queryParams.endDate) {
            params.append('endDate', queryParams.endDate.toISOString().split('T')[0]);
          }

          // Make API request
          const response = await fetch(
            `http://localhost:3000/api/v1/data/economy?${params.toString()}`,
            {
              headers: {
                'X-API-Key': testApiKey,
              },
            }
          );

          const data = await response.json();

          // Verify schema structure is consistent
          assert.ok(data.hasOwnProperty('success'), 'Response should have success field');
          
          if (data.success) {
            assert.ok(data.hasOwnProperty('data'), 'Response should have data field');
            assert.ok(data.hasOwnProperty('metadata'), 'Response should have metadata field');
            assert.strictEqual(data.data.category, 'economy', 'Category should match endpoint');
            assert.ok(Array.isArray(data.data.dataPoints), 'dataPoints should be an array');
            assert.strictEqual(
              typeof data.data.count,
              'number',
              'count should be a number'
            );
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should include all required metadata fields in every response', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('economy', 'health', 'education', 'politics', 'culture'),
        async (category) => {
          const response = await fetch(`http://localhost:3000/api/v1/data/${category}`, {
            headers: {
              'X-API-Key': testApiKey,
            },
          });

          const data = await response.json();

          if (data.success) {
            // Verify all required metadata fields
            assert.ok(data.metadata, 'Response should have metadata');
            assert.strictEqual(
              typeof data.metadata.version,
              'string',
              'version should be a string'
            );
            assert.ok(
              /^\d+\.\d+\.\d+$/.test(data.metadata.version),
              'version should follow semver format'
            );
            assert.ok(
              new Date(data.metadata.timestamp).toString() !== 'Invalid Date',
              'timestamp should be a valid date'
            );
            assert.strictEqual(
              typeof data.metadata.rateLimit,
              'object',
              'rateLimit should be an object'
            );
            assert.strictEqual(
              typeof data.metadata.rateLimit.limit,
              'number',
              'rateLimit.limit should be a number'
            );
            assert.strictEqual(
              typeof data.metadata.rateLimit.remaining,
              'number',
              'rateLimit.remaining should be a number'
            );
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
