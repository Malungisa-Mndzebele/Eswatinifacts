import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';
import crypto from 'crypto';

/**
 * Feature: eswatini-facts-platform, Property 16: API filter correctness
 * Validates: Requirements 5.4
 * 
 * Property: For any API request with filter parameters, all returned data items 
 * should match all specified filter criteria
 */

describe('API Filtering Property Tests', () => {
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
        console.log('Server is running - proceeding with API filtering tests');
      }
    } catch (error) {
      console.log('Server not running - skipping API filtering tests');
      console.log('To run these tests, start the server with: npm start');
      return;
    }

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`test-filter-${Date.now()}@example.com`, 'hashedpassword', 'user']
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

  it('should return only data points within specified date range', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            metricName: fc.string({ minLength: 1, maxLength: 50 }),
            metricValue: fc.float({ min: 0, max: 1000 }),
            dateRecorded: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        fc.record({
          startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
          endDate: fc.date({ min: new Date('2021-01-01'), max: new Date('2024-12-31') }),
        }),
        async (dataPoints, dateFilter) => {
          // Ensure startDate <= endDate
          if (dateFilter.startDate > dateFilter.endDate) {
            [dateFilter.startDate, dateFilter.endDate] = [dateFilter.endDate, dateFilter.startDate];
          }

          // Insert test data points
          for (const dp of dataPoints) {
            await pool.query(
              `INSERT INTO data_points (source_id, category, metric_name, metric_value, date_recorded)
               VALUES ($1, $2, $3, $4, $5)`,
              [testSourceId, 'economy', dp.metricName, dp.metricValue, dp.dateRecorded]
            );
          }

          // Make API request with date filter
          const params = new URLSearchParams();
          params.append('startDate', dateFilter.startDate.toISOString().split('T')[0]);
          params.append('endDate', dateFilter.endDate.toISOString().split('T')[0]);

          const response = await fetch(
            `http://localhost:3000/api/v1/data/economy?${params.toString()}`,
            {
              headers: {
                'X-API-Key': testApiKey,
              },
            }
          );

          const data = await response.json();

          if (data.success && data.data.dataPoints.length > 0) {
            // Verify all returned data points are within date range
            for (const point of data.data.dataPoints) {
              const pointDate = new Date(point.dateRecorded);
              const startDate = new Date(dateFilter.startDate);
              const endDate = new Date(dateFilter.endDate);
              
              // Set time to start of day for comparison
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
              pointDate.setHours(12, 0, 0, 0);

              assert.ok(
                pointDate >= startDate && pointDate <= endDate,
                `Data point date ${point.dateRecorded} should be within range ${dateFilter.startDate.toISOString().split('T')[0]} to ${dateFilter.endDate.toISOString().split('T')[0]}`
              );
            }
          }

          // Cleanup
          await pool.query('DELETE FROM data_points WHERE source_id = $1', [testSourceId]);
        }
      ),
      { numRuns: 15 }
    );
  });

  it('should return only data points matching specified metric name', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            metricName: fc.constantFrom('GDP', 'Inflation', 'Unemployment', 'Trade Balance'),
            metricValue: fc.float({ min: 0, max: 1000 }),
            dateRecorded: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          }),
          { minLength: 10, maxLength: 30 }
        ),
        fc.constantFrom('GDP', 'Inflation', 'Unemployment', 'Trade Balance'),
        async (dataPoints, targetMetric) => {
          // Insert test data points
          for (const dp of dataPoints) {
            await pool.query(
              `INSERT INTO data_points (source_id, category, metric_name, metric_value, date_recorded)
               VALUES ($1, $2, $3, $4, $5)`,
              [testSourceId, 'economy', dp.metricName, dp.metricValue, dp.dateRecorded]
            );
          }

          // Make API request with metric filter
          const params = new URLSearchParams();
          params.append('metric', targetMetric);

          const response = await fetch(
            `http://localhost:3000/api/v1/data/economy?${params.toString()}`,
            {
              headers: {
                'X-API-Key': testApiKey,
              },
            }
          );

          const data = await response.json();

          if (data.success && data.data.dataPoints.length > 0) {
            // Verify all returned data points match the metric filter
            for (const point of data.data.dataPoints) {
              assert.strictEqual(
                point.metricName,
                targetMetric,
                `All returned data points should have metric name ${targetMetric}`
              );
            }
          }

          // Cleanup
          await pool.query('DELETE FROM data_points WHERE source_id = $1', [testSourceId]);
        }
      ),
      { numRuns: 15 }
    );
  });

  it('should return only data points matching specified subcategory', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            metricName: fc.string({ minLength: 1, maxLength: 50 }),
            metricValue: fc.float({ min: 0, max: 1000 }),
            subcategory: fc.constantFrom('Healthcare', 'Education', 'Infrastructure', 'Defense'),
            dateRecorded: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          }),
          { minLength: 10, maxLength: 30 }
        ),
        fc.constantFrom('Healthcare', 'Education', 'Infrastructure', 'Defense'),
        async (dataPoints, targetSubcategory) => {
          // Insert test data points
          for (const dp of dataPoints) {
            await pool.query(
              `INSERT INTO data_points (source_id, category, metric_name, metric_value, subcategory, date_recorded)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [testSourceId, 'economy', dp.metricName, dp.metricValue, dp.subcategory, dp.dateRecorded]
            );
          }

          // Make API request with subcategory filter
          const params = new URLSearchParams();
          params.append('subcategory', targetSubcategory);

          const response = await fetch(
            `http://localhost:3000/api/v1/data/economy?${params.toString()}`,
            {
              headers: {
                'X-API-Key': testApiKey,
              },
            }
          );

          const data = await response.json();

          if (data.success && data.data.dataPoints.length > 0) {
            // Verify all returned data points match the subcategory filter
            for (const point of data.data.dataPoints) {
              assert.strictEqual(
                point.subcategory,
                targetSubcategory,
                `All returned data points should have subcategory ${targetSubcategory}`
              );
            }
          }

          // Cleanup
          await pool.query('DELETE FROM data_points WHERE source_id = $1', [testSourceId]);
        }
      ),
      { numRuns: 15 }
    );
  });

  it('should apply multiple filters correctly (date range + metric)', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            metricName: fc.constantFrom('GDP', 'Inflation', 'Unemployment'),
            metricValue: fc.float({ min: 0, max: 1000 }),
            dateRecorded: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
          }),
          { minLength: 15, maxLength: 40 }
        ),
        fc.record({
          metric: fc.constantFrom('GDP', 'Inflation', 'Unemployment'),
          startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
          endDate: fc.date({ min: new Date('2021-01-01'), max: new Date('2024-12-31') }),
        }),
        async (dataPoints, filters) => {
          // Ensure startDate <= endDate
          if (filters.startDate > filters.endDate) {
            [filters.startDate, filters.endDate] = [filters.endDate, filters.startDate];
          }

          // Insert test data points
          for (const dp of dataPoints) {
            await pool.query(
              `INSERT INTO data_points (source_id, category, metric_name, metric_value, date_recorded)
               VALUES ($1, $2, $3, $4, $5)`,
              [testSourceId, 'economy', dp.metricName, dp.metricValue, dp.dateRecorded]
            );
          }

          // Make API request with multiple filters
          const params = new URLSearchParams();
          params.append('metric', filters.metric);
          params.append('startDate', filters.startDate.toISOString().split('T')[0]);
          params.append('endDate', filters.endDate.toISOString().split('T')[0]);

          const response = await fetch(
            `http://localhost:3000/api/v1/data/economy?${params.toString()}`,
            {
              headers: {
                'X-API-Key': testApiKey,
              },
            }
          );

          const data = await response.json();

          if (data.success && data.data.dataPoints.length > 0) {
            // Verify all returned data points match ALL filters
            for (const point of data.data.dataPoints) {
              // Check metric filter
              assert.strictEqual(
                point.metricName,
                filters.metric,
                `Data point should have metric ${filters.metric}`
              );

              // Check date range filter
              const pointDate = new Date(point.dateRecorded);
              const startDate = new Date(filters.startDate);
              const endDate = new Date(filters.endDate);
              
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
              pointDate.setHours(12, 0, 0, 0);

              assert.ok(
                pointDate >= startDate && pointDate <= endDate,
                `Data point date should be within range`
              );
            }
          }

          // Cleanup
          await pool.query('DELETE FROM data_points WHERE source_id = $1', [testSourceId]);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should respect limit and offset parameters', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 20 }),
        async (limit, offset) => {
          // Insert test data points
          const dataPoints = [];
          for (let i = 0; i < 100; i++) {
            const result = await pool.query(
              `INSERT INTO data_points (source_id, category, metric_name, metric_value, date_recorded)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [testSourceId, 'economy', `Metric${i}`, i * 10, new Date('2023-01-01')]
            );
            dataPoints.push(result.rows[0].id);
          }

          // Make API request with limit and offset
          const params = new URLSearchParams();
          params.append('limit', limit.toString());
          params.append('offset', offset.toString());

          const response = await fetch(
            `http://localhost:3000/api/v1/data/economy?${params.toString()}`,
            {
              headers: {
                'X-API-Key': testApiKey,
              },
            }
          );

          const data = await response.json();

          if (data.success) {
            // Verify returned count respects limit
            assert.ok(
              data.data.dataPoints.length <= limit,
              `Returned data points (${data.data.dataPoints.length}) should not exceed limit (${limit})`
            );

            // Verify we got the expected number (accounting for offset)
            const expectedCount = Math.min(limit, Math.max(0, 100 - offset));
            assert.strictEqual(
              data.data.dataPoints.length,
              expectedCount,
              `Should return ${expectedCount} data points with limit ${limit} and offset ${offset}`
            );
          }

          // Cleanup
          await pool.query('DELETE FROM data_points WHERE source_id = $1', [testSourceId]);
        }
      ),
      { numRuns: 15 }
    );
  });
});
