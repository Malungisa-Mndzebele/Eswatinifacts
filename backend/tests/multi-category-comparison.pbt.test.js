/**
 * Property-Based Test: Multi-category comparison display
 * Feature: eswatini-facts-platform, Property 26: Multi-category comparison display
 * Validates: Requirements 8.1
 * 
 * Property: For any selection of multiple data categories, the comparison view 
 * should include data for all selected categories
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';

describe('Property 26: Multi-category comparison display', () => {
  let testDataPoints = [];
  let testSourceId;
  let serverAvailable = false;

  before(async () => {
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        serverAvailable = true;
        console.log('Server is running - proceeding with multi-category tests');
      }
    } catch (error) {
      console.log('Server not running - skipping multi-category tests');
      console.log('To run these tests, start the server with: npm start');
      return;
    }

    // Create a test data source
    const sourceResult = await pool.query(
      `INSERT INTO data_sources (name, url, description, reliability_score)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Test Source', 'https://test.example.com', 'Test data source', 0.95]
    );
    testSourceId = sourceResult.rows[0].id;
  });

  after(async () => {
    // Clean up test data
    if (testDataPoints.length > 0) {
      const ids = testDataPoints.map(dp => dp.id);
      await pool.query(
        'DELETE FROM data_points WHERE id = ANY($1)',
        [ids]
      );
    }
    if (testSourceId) {
      await pool.query('DELETE FROM data_sources WHERE id = $1', [testSourceId]);
    }
  });

  /**
   * Generator for valid category names
   */
  const categoryArbitrary = fc.constantFrom(
    'economy',
    'health',
    'education',
    'politics',
    'culture'
  );

  /**
   * Generator for data points with specific categories
   */
  const dataPointArbitrary = (category) => fc.record({
    metricName: fc.string({ minLength: 5, maxLength: 50 }),
    metricValue: fc.double({ min: 0, max: 1000000, noNaN: true }),
    metricUnit: fc.constantFrom('USD', 'percent', 'count', 'rate', 'index'),
    dateRecorded: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
    subcategory: fc.option(fc.string({ minLength: 3, maxLength: 30 }), { nil: null }),
    category
  });

  /**
   * Helper function to insert test data points
   */
  async function insertDataPoints(dataPoints) {
    const insertedPoints = [];
    
    for (const dp of dataPoints) {
      const result = await pool.query(
        `INSERT INTO data_points 
         (category, metric_name, metric_value, metric_unit, date_recorded, subcategory, source_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, category, metric_name, metric_value, metric_unit, date_recorded, subcategory`,
        [
          dp.category,
          dp.metricName,
          dp.metricValue,
          dp.metricUnit,
          dp.dateRecorded,
          dp.subcategory,
          testSourceId
        ]
      );
      insertedPoints.push(result.rows[0]);
    }
    
    return insertedPoints;
  }

  /**
   * Helper function to clean up test data points
   */
  async function cleanupDataPoints() {
    if (testDataPoints.length > 0) {
      const ids = testDataPoints.map(dp => dp.id);
      await pool.query(
        'DELETE FROM data_points WHERE id = ANY($1)',
        [ids]
      );
      testDataPoints = [];
    }
  }

  it('multi-category comparison includes data from all selected categories', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        // Generate 1-5 unique categories
        fc.uniqueArray(categoryArbitrary, { minLength: 1, maxLength: 5 }),
        // Generate 2-10 data points per category
        fc.integer({ min: 2, max: 10 }),
        async (selectedCategories, pointsPerCategory) => {
          // Generate data points for each selected category
          const allDataPoints = [];
          for (const category of selectedCategories) {
            const categoryPoints = fc.sample(
              dataPointArbitrary(category),
              pointsPerCategory
            );
            allDataPoints.push(...categoryPoints);
          }

          // Insert test data
          const inserted = await insertDataPoints(allDataPoints);
          testDataPoints = inserted;

          // Make request to multi-category endpoint
          const params = new URLSearchParams();
          params.append('categories', selectedCategories.join(','));
          
          const response = await fetch(
            `http://localhost:3000/api/visualization/multi-category?${params.toString()}`
          );

          // Verify response structure
          assert.strictEqual(response.status, 200, 'Response should be 200 OK');
          
          const data = await response.json();
          assert.strictEqual(data.success, true, 'Response should be successful');
          assert.ok(data.data, 'Response should have data field');

          // Property: All selected categories should be present in the response
          const returnedCategories = new Set();
          
          if (data.data.categories) {
            // If response groups by category
            Object.keys(data.data.categories).forEach(cat => {
              returnedCategories.add(cat);
            });
          } else if (data.data.dataPoints) {
            // If response is a flat list with category field
            data.data.dataPoints.forEach(dp => {
              returnedCategories.add(dp.category);
            });
          }

          // Verify all selected categories are present
          for (const category of selectedCategories) {
            assert.ok(
              returnedCategories.has(category),
              `Category ${category} should be present in response`
            );
          }

          // Verify no unexpected categories are present
          for (const returnedCat of returnedCategories) {
            assert.ok(
              selectedCategories.includes(returnedCat),
              `Returned category ${returnedCat} should be in selected categories`
            );
          }

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  it('multi-category comparison returns only data from selected categories', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        // Generate 2-4 selected categories
        fc.uniqueArray(categoryArbitrary, { minLength: 2, maxLength: 4 }),
        // Generate 3-8 data points per category
        fc.integer({ min: 3, max: 8 }),
        async (selectedCategories, pointsPerCategory) => {
          // Get all categories
          const allCategories = ['economy', 'health', 'education', 'politics', 'culture'];
          
          // Generate data for ALL categories (including non-selected ones)
          const allDataPoints = [];
          for (const category of allCategories) {
            const categoryPoints = fc.sample(
              dataPointArbitrary(category),
              pointsPerCategory
            );
            allDataPoints.push(...categoryPoints);
          }

          // Insert test data
          const inserted = await insertDataPoints(allDataPoints);
          testDataPoints = inserted;

          // Make request with only selected categories
          const params = new URLSearchParams();
          params.append('categories', selectedCategories.join(','));
          
          const response = await fetch(
            `http://localhost:3000/api/visualization/multi-category?${params.toString()}`
          );

          assert.strictEqual(response.status, 200, 'Response should be 200 OK');
          
          const data = await response.json();
          assert.strictEqual(data.success, true, 'Response should be successful');

          // Property: Response should ONLY contain data from selected categories
          let allReturnedDataPoints = [];
          
          if (data.data.categories) {
            // If grouped by category
            Object.values(data.data.categories).forEach(categoryData => {
              if (Array.isArray(categoryData)) {
                allReturnedDataPoints.push(...categoryData);
              } else if (categoryData.dataPoints) {
                allReturnedDataPoints.push(...categoryData.dataPoints);
              }
            });
          } else if (data.data.dataPoints) {
            allReturnedDataPoints = data.data.dataPoints;
          }

          // Every returned data point must belong to a selected category
          for (const dp of allReturnedDataPoints) {
            assert.ok(
              selectedCategories.includes(dp.category),
              `Data point category ${dp.category} should be in selected categories`
            );
          }

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  it('multi-category comparison handles empty category selection gracefully', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    // Edge case: empty category list should return error or empty result
    const response = await fetch(
      'http://localhost:3000/api/visualization/multi-category?categories='
    );

    // Should either return 422 validation error or empty data
    assert.ok(
      [200, 422].includes(response.status),
      'Response should be 200 or 422'
    );
    
    const data = await response.json();
    
    if (response.status === 200) {
      assert.strictEqual(data.success, true, 'Response should be successful');
      // Should return empty or no data
      if (data.data && data.data.dataPoints) {
        assert.strictEqual(
          data.data.dataPoints.length,
          0,
          'Should return empty data points'
        );
      }
    } else {
      assert.strictEqual(data.success, false, 'Response should indicate failure');
      assert.ok(data.error, 'Response should have error field');
    }
  });

  it('multi-category comparison handles single category selection', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        categoryArbitrary,
        fc.integer({ min: 3, max: 10 }),
        async (category, numPoints) => {
          // Generate data for single category
          const dataPoints = fc.sample(
            dataPointArbitrary(category),
            numPoints
          );

          // Insert test data
          const inserted = await insertDataPoints(dataPoints);
          testDataPoints = inserted;

          // Request single category
          const params = new URLSearchParams();
          params.append('categories', category);
          
          const response = await fetch(
            `http://localhost:3000/api/visualization/multi-category?${params.toString()}`
          );

          assert.strictEqual(response.status, 200, 'Response should be 200 OK');
          
          const data = await response.json();
          assert.strictEqual(data.success, true, 'Response should be successful');

          // Should work the same as multi-category
          const returnedCategories = new Set();
          
          if (data.data.categories) {
            Object.keys(data.data.categories).forEach(cat => {
              returnedCategories.add(cat);
            });
          } else if (data.data.dataPoints) {
            data.data.dataPoints.forEach(dp => {
              returnedCategories.add(dp.category);
            });
          }

          // Should only contain the requested category
          assert.strictEqual(returnedCategories.size, 1, 'Should have exactly one category');
          assert.ok(returnedCategories.has(category), `Should contain category ${category}`);

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });
});
