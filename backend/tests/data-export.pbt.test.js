/**
 * Property-Based Test: Data export correctness
 * Feature: eswatini-facts-platform, Property 29: Data export correctness
 * Validates: Requirements 8.4
 * 
 * Property: For any filtered dataset exported to CSV or JSON, the exported file 
 * should contain exactly the data visible after filters are applied
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';

describe('Property 29: Data export correctness', () => {
  let testDataPoints = [];
  let testSourceId;
  let serverAvailable = false;

  before(async () => {
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        serverAvailable = true;
        console.log('Server is running - proceeding with data export tests');
      }
    } catch (error) {
      console.log('Server not running - skipping data export tests');
      console.log('To run these tests, start the server with: npm start');
      return;
    }

    // Create a test data source
    const sourceResult = await pool.query(
      `INSERT INTO data_sources (name, url, description, reliability_score)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Test Export Source', 'https://test-export.example.com', 'Test data source for export', 0.95]
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
   * Generator for country names
   */
  const countryArbitrary = fc.constantFrom(
    'Eswatini',
    'South Africa',
    'Mozambique',
    'Botswana',
    'Zimbabwe'
  );

  /**
   * Generator for data points
   */
  const dataPointArbitrary = fc.record({
    category: categoryArbitrary,
    country: countryArbitrary,
    metricName: fc.string({ minLength: 5, maxLength: 50 }),
    metricValue: fc.double({ min: 0, max: 1000000, noNaN: true }),
    metricUnit: fc.constantFrom('USD', 'percent', 'count', 'rate', 'index'),
    dateRecorded: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
    subcategory: fc.option(fc.string({ minLength: 3, maxLength: 30 }), { nil: null })
  });

  /**
   * Helper function to insert test data points
   */
  async function insertDataPoints(dataPoints) {
    const insertedPoints = [];
    
    for (const dp of dataPoints) {
      const result = await pool.query(
        `INSERT INTO data_points 
         (category, metric_name, metric_value, metric_unit, date_recorded, subcategory, source_id, country)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, category, metric_name, metric_value, metric_unit, date_recorded, subcategory, country`,
        [
          dp.category,
          dp.metricName,
          dp.metricValue,
          dp.metricUnit,
          dp.dateRecorded,
          dp.subcategory,
          testSourceId,
          dp.country
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
   * Helper function to parse CSV response
   */
  function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let currentValue = '';
      let insideQuotes = false;
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        
        if (char === '"') {
          if (insideQuotes && lines[i][j + 1] === '"') {
            currentValue += '"';
            j++; // Skip next quote
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
    
    return rows;
  }

  /**
   * Helper function to apply filters to data points
   */
  function applyFilters(dataPoints, filters) {
    let filtered = [...dataPoints];
    
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(dp => filters.categories.includes(dp.category));
    }
    
    if (filters.countries && filters.countries.length > 0) {
      filtered = filtered.filter(dp => filters.countries.includes(dp.country));
    }
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(dp => new Date(dp.date_recorded) >= startDate);
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filtered = filtered.filter(dp => new Date(dp.date_recorded) <= endDate);
    }
    
    return filtered;
  }

  it('JSON export contains exactly the filtered dataset', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate 10-30 data points
        fc.array(dataPointArbitrary, { minLength: 10, maxLength: 30 }),
        // Generate filter configuration
        fc.record({
          categories: fc.option(
            fc.uniqueArray(categoryArbitrary, { minLength: 1, maxLength: 3 }),
            { nil: null }
          ),
          countries: fc.option(
            fc.uniqueArray(countryArbitrary, { minLength: 1, maxLength: 3 }),
            { nil: null }
          ),
          startDate: fc.option(
            fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
            { nil: null }
          ),
          endDate: fc.option(
            fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') }),
            { nil: null }
          )
        }),
        async (dataPoints, filters) => {
          // Insert test data
          const inserted = await insertDataPoints(dataPoints);
          testDataPoints = inserted;

          // Build query parameters
          const params = new URLSearchParams();
          params.append('format', 'json');
          
          if (filters.categories) {
            params.append('categories', filters.categories.join(','));
          }
          if (filters.countries) {
            params.append('countries', filters.countries.join(','));
          }
          if (filters.startDate) {
            params.append('startDate', filters.startDate.toISOString());
          }
          if (filters.endDate) {
            params.append('endDate', filters.endDate.toISOString());
          }

          // Make export request
          const response = await fetch(
            `http://localhost:3000/api/visualization/export?${params.toString()}`
          );

          assert.strictEqual(response.status, 200, 'Response should be 200 OK');
          assert.strictEqual(
            response.headers.get('content-type'),
            'application/json; charset=utf-8',
            'Content-Type should be application/json'
          );

          const exportData = await response.json();
          assert.strictEqual(exportData.success, true, 'Export should be successful');
          assert.ok(exportData.data, 'Export should have data field');
          assert.ok(Array.isArray(exportData.data), 'Export data should be an array');

          // Apply same filters to inserted data
          const expectedData = applyFilters(inserted, filters);

          // Property: Exported data should match filtered data exactly
          assert.strictEqual(
            exportData.data.length,
            expectedData.length,
            `Exported ${exportData.data.length} records but expected ${expectedData.length}`
          );

          // Verify each exported record matches a filtered record
          const exportedIds = new Set(exportData.data.map(d => d.id));
          const expectedIds = new Set(expectedData.map(d => d.id));

          assert.strictEqual(
            exportedIds.size,
            expectedIds.size,
            'Number of unique IDs should match'
          );

          for (const expectedId of expectedIds) {
            assert.ok(
              exportedIds.has(expectedId),
              `Expected ID ${expectedId} should be in exported data`
            );
          }

          for (const exportedId of exportedIds) {
            assert.ok(
              expectedIds.has(exportedId),
              `Exported ID ${exportedId} should be in expected data`
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

  it('CSV export contains exactly the filtered dataset', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate 10-30 data points
        fc.array(dataPointArbitrary, { minLength: 10, maxLength: 30 }),
        // Generate filter configuration
        fc.record({
          categories: fc.option(
            fc.uniqueArray(categoryArbitrary, { minLength: 1, maxLength: 3 }),
            { nil: null }
          ),
          countries: fc.option(
            fc.uniqueArray(countryArbitrary, { minLength: 1, maxLength: 3 }),
            { nil: null }
          ),
          startDate: fc.option(
            fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
            { nil: null }
          ),
          endDate: fc.option(
            fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') }),
            { nil: null }
          )
        }),
        async (dataPoints, filters) => {
          // Insert test data
          const inserted = await insertDataPoints(dataPoints);
          testDataPoints = inserted;

          // Build query parameters
          const params = new URLSearchParams();
          params.append('format', 'csv');
          
          if (filters.categories) {
            params.append('categories', filters.categories.join(','));
          }
          if (filters.countries) {
            params.append('countries', filters.countries.join(','));
          }
          if (filters.startDate) {
            params.append('startDate', filters.startDate.toISOString());
          }
          if (filters.endDate) {
            params.append('endDate', filters.endDate.toISOString());
          }

          // Make export request
          const response = await fetch(
            `http://localhost:3000/api/visualization/export?${params.toString()}`
          );

          assert.strictEqual(response.status, 200, 'Response should be 200 OK');
          assert.strictEqual(
            response.headers.get('content-type'),
            'text/csv; charset=utf-8',
            'Content-Type should be text/csv'
          );

          const csvText = await response.text();
          const exportedRows = parseCSV(csvText);

          // Apply same filters to inserted data
          const expectedData = applyFilters(inserted, filters);

          // Property: Exported data should match filtered data exactly
          assert.strictEqual(
            exportedRows.length,
            expectedData.length,
            `Exported ${exportedRows.length} records but expected ${expectedData.length}`
          );

          // Verify each exported record matches a filtered record
          const exportedIds = new Set(exportedRows.map(row => row.id));
          const expectedIds = new Set(expectedData.map(d => d.id));

          assert.strictEqual(
            exportedIds.size,
            expectedIds.size,
            'Number of unique IDs should match'
          );

          for (const expectedId of expectedIds) {
            assert.ok(
              exportedIds.has(expectedId),
              `Expected ID ${expectedId} should be in exported CSV`
            );
          }

          for (const exportedId of exportedIds) {
            assert.ok(
              expectedIds.has(exportedId),
              `Exported ID ${exportedId} should be in expected data`
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

  it('export without filters returns all data', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate 5-15 data points
        fc.array(dataPointArbitrary, { minLength: 5, maxLength: 15 }),
        fc.constantFrom('json', 'csv'),
        async (dataPoints, format) => {
          // Insert test data
          const inserted = await insertDataPoints(dataPoints);
          testDataPoints = inserted;

          // Make export request without filters
          const params = new URLSearchParams();
          params.append('format', format);

          const response = await fetch(
            `http://localhost:3000/api/visualization/export?${params.toString()}`
          );

          assert.strictEqual(response.status, 200, 'Response should be 200 OK');

          let exportedCount;
          if (format === 'json') {
            const exportData = await response.json();
            assert.strictEqual(exportData.success, true, 'Export should be successful');
            exportedCount = exportData.data.length;
          } else {
            const csvText = await response.text();
            const rows = parseCSV(csvText);
            exportedCount = rows.length;
          }

          // Property: Without filters, should export at least the inserted data
          // (may include other test data, so >= instead of ===)
          assert.ok(
            exportedCount >= inserted.length,
            `Should export at least ${inserted.length} records, got ${exportedCount}`
          );

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 30, timeout: 30000 }
    );
  });

  it('export with category filter excludes other categories', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        categoryArbitrary,
        fc.array(dataPointArbitrary, { minLength: 10, maxLength: 20 }),
        async (selectedCategory, dataPoints) => {
          // Insert test data
          const inserted = await insertDataPoints(dataPoints);
          testDataPoints = inserted;

          // Export with single category filter
          const params = new URLSearchParams();
          params.append('format', 'json');
          params.append('categories', selectedCategory);

          const response = await fetch(
            `http://localhost:3000/api/visualization/export?${params.toString()}`
          );

          assert.strictEqual(response.status, 200, 'Response should be 200 OK');

          const exportData = await response.json();
          assert.strictEqual(exportData.success, true, 'Export should be successful');

          // Property: All exported records should belong to selected category
          for (const record of exportData.data) {
            assert.strictEqual(
              record.category,
              selectedCategory,
              `Record category should be ${selectedCategory}`
            );
          }

          // Verify count matches filtered data
          const expectedCount = inserted.filter(dp => dp.category === selectedCategory).length;
          const exportedFromTest = exportData.data.filter(d => 
            inserted.some(ins => ins.id === d.id)
          );
          
          assert.strictEqual(
            exportedFromTest.length,
            expectedCount,
            `Should export ${expectedCount} records from test data`
          );

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  it('export with date range filter excludes data outside range', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(dataPointArbitrary, { minLength: 10, maxLength: 20 }),
        fc.date({ min: new Date('2021-01-01'), max: new Date('2022-12-31') }),
        fc.date({ min: new Date('2023-01-01'), max: new Date('2024-06-30') }),
        async (dataPoints, startDate, endDate) => {
          // Insert test data
          const inserted = await insertDataPoints(dataPoints);
          testDataPoints = inserted;

          // Export with date range filter
          const params = new URLSearchParams();
          params.append('format', 'json');
          params.append('startDate', startDate.toISOString());
          params.append('endDate', endDate.toISOString());

          const response = await fetch(
            `http://localhost:3000/api/visualization/export?${params.toString()}`
          );

          assert.strictEqual(response.status, 200, 'Response should be 200 OK');

          const exportData = await response.json();
          assert.strictEqual(exportData.success, true, 'Export should be successful');

          // Property: All exported records should be within date range
          const exportedFromTest = exportData.data.filter(d => 
            inserted.some(ins => ins.id === d.id)
          );

          for (const record of exportedFromTest) {
            const recordDate = new Date(record.date_recorded);
            assert.ok(
              recordDate >= startDate,
              `Record date ${recordDate.toISOString()} should be >= ${startDate.toISOString()}`
            );
            assert.ok(
              recordDate <= endDate,
              `Record date ${recordDate.toISOString()} should be <= ${endDate.toISOString()}`
            );
          }

          // Verify count matches filtered data
          const expectedCount = inserted.filter(dp => {
            const dpDate = new Date(dp.date_recorded);
            return dpDate >= startDate && dpDate <= endDate;
          }).length;

          assert.strictEqual(
            exportedFromTest.length,
            expectedCount,
            `Should export ${expectedCount} records from test data within date range`
          );

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  it('export rejects invalid format parameter', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    // Test invalid format
    const response = await fetch(
      'http://localhost:3000/api/visualization/export?format=xml'
    );

    assert.strictEqual(response.status, 422, 'Should return 422 for invalid format');

    const data = await response.json();
    assert.strictEqual(data.success, false, 'Response should indicate failure');
    assert.ok(data.error, 'Response should have error field');
    assert.ok(
      data.error.message.toLowerCase().includes('format'),
      'Error message should mention format'
    );
  });

  it('export requires format parameter', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    // Test missing format
    const response = await fetch(
      'http://localhost:3000/api/visualization/export'
    );

    assert.strictEqual(response.status, 422, 'Should return 422 for missing format');

    const data = await response.json();
    assert.strictEqual(data.success, false, 'Response should indicate failure');
    assert.ok(data.error, 'Response should have error field');
  });
});
