/**
 * Property-Based Test: Time filter propagation
 * Feature: eswatini-facts-platform, Property 27: Time filter propagation
 * Validates: Requirements 8.2
 * 
 * Property: For any time period filter applied, all visualizations on the page 
 * should update to show only data within that time period
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';

describe('Property 27: Time filter propagation', () => {
  let testDataPoints = [];
  let testSourceId;
  let serverAvailable = false;

  before(async () => {
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        serverAvailable = true;
        console.log('Server is running - proceeding with time filter tests');
      }
    } catch (error) {
      console.log('Server not running - skipping time filter tests');
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
   * Generator for data points with specific category and date
   */
  const dataPointArbitrary = (category, dateRange) => fc.record({
    metricName: fc.string({ minLength: 5, maxLength: 50 }),
    metricValue: fc.double({ min: 0, max: 1000000, noNaN: true }),
    metricUnit: fc.constantFrom('USD', 'percent', 'count', 'rate', 'index'),
    dateRecorded: fc.date({ 
      min: dateRange.min, 
      max: dateRange.max 
    }),
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

  /**
   * Helper function to fetch data from a category endpoint with time filter
   */
  async function fetchCategoryData(category, startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) {
      params.append('startDate', startDate.toISOString());
    }
    if (endDate) {
      params.append('endDate', endDate.toISOString());
    }
    
    const response = await fetch(
      `http://localhost:3000/api/data/${category}?${params.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${category} data: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  }

  it('time filter propagates to all category endpoints', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate 2-5 categories to test
        fc.uniqueArray(categoryArbitrary, { minLength: 2, maxLength: 5 }),
        // Generate a time range for filtering
        fc.date({ min: new Date('2020-01-01'), max: new Date('2024-01-01') }),
        fc.integer({ min: 30, max: 365 }), // days in range
        // Generate number of data points per category
        fc.integer({ min: 5, max: 15 }),
        async (categories, filterStartDate, daysInRange, pointsPerCategory) => {
          const filterEndDate = new Date(filterStartDate);
          filterEndDate.setDate(filterEndDate.getDate() + daysInRange);

          // Create a wider date range for test data (before and after filter range)
          const dataStartDate = new Date(filterStartDate);
          dataStartDate.setDate(dataStartDate.getDate() - 60); // 60 days before
          
          const dataEndDate = new Date(filterEndDate);
          dataEndDate.setDate(dataEndDate.getDate() + 60); // 60 days after

          // Generate data points for each category across the wider range
          const allDataPoints = [];
          for (const category of categories) {
            const categoryPoints = fc.sample(
              dataPointArbitrary(category, { min: dataStartDate, max: dataEndDate }),
              pointsPerCategory
            );
            allDataPoints.push(...categoryPoints);
          }

          // Insert test data
          const inserted = await insertDataPoints(allDataPoints);
          testDataPoints = inserted;

          // Fetch data from each category endpoint with time filter
          const results = await Promise.all(
            categories.map(category => 
              fetchCategoryData(category, filterStartDate, filterEndDate)
            )
          );

          // Property: All returned data points must be within the filter range
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const category = categories[i];

            assert.strictEqual(result.success, true, 
              `Response for ${category} should be successful`);
            assert.ok(result.data, 
              `Response for ${category} should have data field`);
            assert.ok(result.data.dataPoints, 
              `Response for ${category} should have dataPoints array`);

            // Check each data point is within the time range
            for (const dp of result.data.dataPoints) {
              const dpDate = new Date(dp.dateRecorded);
              
              assert.ok(
                dpDate >= filterStartDate,
                `Data point date ${dpDate.toISOString()} in ${category} should be >= filter start ${filterStartDate.toISOString()}`
              );
              
              assert.ok(
                dpDate <= filterEndDate,
                `Data point date ${dpDate.toISOString()} in ${category} should be <= filter end ${filterEndDate.toISOString()}`
              );
            }
          }

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  it('time filter with only startDate filters correctly across categories', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate 2-3 categories
        fc.uniqueArray(categoryArbitrary, { minLength: 2, maxLength: 3 }),
        // Generate a start date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2023-01-01') }),
        // Generate number of data points
        fc.integer({ min: 5, max: 10 }),
        async (categories, filterStartDate, pointsPerCategory) => {
          // Create data range: some before, some after start date
          const dataStartDate = new Date(filterStartDate);
          dataStartDate.setDate(dataStartDate.getDate() - 90);
          
          const dataEndDate = new Date(filterStartDate);
          dataEndDate.setDate(dataEndDate.getDate() + 90);

          // Generate data points
          const allDataPoints = [];
          for (const category of categories) {
            const categoryPoints = fc.sample(
              dataPointArbitrary(category, { min: dataStartDate, max: dataEndDate }),
              pointsPerCategory
            );
            allDataPoints.push(...categoryPoints);
          }

          // Insert test data
          const inserted = await insertDataPoints(allDataPoints);
          testDataPoints = inserted;

          // Fetch with only startDate filter
          const results = await Promise.all(
            categories.map(category => 
              fetchCategoryData(category, filterStartDate, null)
            )
          );

          // Property: All returned data points must be >= startDate
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const category = categories[i];

            assert.strictEqual(result.success, true);
            
            for (const dp of result.data.dataPoints) {
              const dpDate = new Date(dp.dateRecorded);
              
              assert.ok(
                dpDate >= filterStartDate,
                `Data point date ${dpDate.toISOString()} in ${category} should be >= filter start ${filterStartDate.toISOString()}`
              );
            }
          }

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  it('time filter with only endDate filters correctly across categories', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate 2-3 categories
        fc.uniqueArray(categoryArbitrary, { minLength: 2, maxLength: 3 }),
        // Generate an end date
        fc.date({ min: new Date('2021-01-01'), max: new Date('2024-01-01') }),
        // Generate number of data points
        fc.integer({ min: 5, max: 10 }),
        async (categories, filterEndDate, pointsPerCategory) => {
          // Create data range: some before, some after end date
          const dataStartDate = new Date(filterEndDate);
          dataStartDate.setDate(dataStartDate.getDate() - 90);
          
          const dataEndDate = new Date(filterEndDate);
          dataEndDate.setDate(dataEndDate.getDate() + 90);

          // Generate data points
          const allDataPoints = [];
          for (const category of categories) {
            const categoryPoints = fc.sample(
              dataPointArbitrary(category, { min: dataStartDate, max: dataEndDate }),
              pointsPerCategory
            );
            allDataPoints.push(...categoryPoints);
          }

          // Insert test data
          const inserted = await insertDataPoints(allDataPoints);
          testDataPoints = inserted;

          // Fetch with only endDate filter
          const results = await Promise.all(
            categories.map(category => 
              fetchCategoryData(category, null, filterEndDate)
            )
          );

          // Property: All returned data points must be <= endDate
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const category = categories[i];

            assert.strictEqual(result.success, true);
            
            for (const dp of result.data.dataPoints) {
              const dpDate = new Date(dp.dateRecorded);
              
              assert.ok(
                dpDate <= filterEndDate,
                `Data point date ${dpDate.toISOString()} in ${category} should be <= filter end ${filterEndDate.toISOString()}`
              );
            }
          }

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  it('time filter excludes data outside the range across all categories', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate 2-4 categories
        fc.uniqueArray(categoryArbitrary, { minLength: 2, maxLength: 4 }),
        // Generate a narrow time range
        fc.date({ min: new Date('2022-01-01'), max: new Date('2023-01-01') }),
        fc.integer({ min: 7, max: 30 }), // narrow range: 7-30 days
        fc.integer({ min: 8, max: 12 }),
        async (categories, filterStartDate, daysInRange, pointsPerCategory) => {
          const filterEndDate = new Date(filterStartDate);
          filterEndDate.setDate(filterEndDate.getDate() + daysInRange);

          // Create data OUTSIDE the filter range
          const beforeStartDate = new Date(filterStartDate);
          beforeStartDate.setDate(beforeStartDate.getDate() - 60);
          
          const afterEndDate = new Date(filterEndDate);
          afterEndDate.setDate(afterEndDate.getDate() + 60);

          // Generate data points: half before range, half after range
          const allDataPoints = [];
          for (const category of categories) {
            // Points before the range
            const beforePoints = fc.sample(
              dataPointArbitrary(category, { 
                min: beforeStartDate, 
                max: new Date(filterStartDate.getTime() - 1) 
              }),
              Math.floor(pointsPerCategory / 2)
            );
            
            // Points after the range
            const afterPoints = fc.sample(
              dataPointArbitrary(category, { 
                min: new Date(filterEndDate.getTime() + 1), 
                max: afterEndDate 
              }),
              Math.ceil(pointsPerCategory / 2)
            );
            
            allDataPoints.push(...beforePoints, ...afterPoints);
          }

          // Insert test data
          const inserted = await insertDataPoints(allDataPoints);
          testDataPoints = inserted;

          // Fetch with time filter
          const results = await Promise.all(
            categories.map(category => 
              fetchCategoryData(category, filterStartDate, filterEndDate)
            )
          );

          // Property: No data points should be returned (all are outside range)
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const category = categories[i];

            assert.strictEqual(result.success, true);
            assert.strictEqual(
              result.data.dataPoints.length,
              0,
              `${category} should return no data points when all data is outside filter range`
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

  it('time filter handles edge case of exact boundary dates', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        categoryArbitrary,
        fc.date({ min: new Date('2022-01-01'), max: new Date('2023-01-01') }),
        async (category, boundaryDate) => {
          // Create data points exactly at the boundary
          const dataPoints = [
            {
              category,
              metricName: 'Boundary Test Metric',
              metricValue: 100,
              metricUnit: 'count',
              dateRecorded: boundaryDate,
              subcategory: null
            }
          ];

          // Insert test data
          const inserted = await insertDataPoints(dataPoints);
          testDataPoints = inserted;

          // Test 1: Boundary date as startDate (should include)
          const result1 = await fetchCategoryData(category, boundaryDate, null);
          assert.strictEqual(result1.success, true);
          assert.ok(
            result1.data.dataPoints.length > 0,
            'Should include data point when date equals startDate'
          );

          // Test 2: Boundary date as endDate (should include)
          const result2 = await fetchCategoryData(category, null, boundaryDate);
          assert.strictEqual(result2.success, true);
          assert.ok(
            result2.data.dataPoints.length > 0,
            'Should include data point when date equals endDate'
          );

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });
});
