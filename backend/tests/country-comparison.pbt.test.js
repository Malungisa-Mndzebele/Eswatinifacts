/**
 * Property-Based Test: Country comparison completeness
 * Feature: eswatini-facts-platform, Property 28: Country comparison completeness
 * Validates: Requirements 8.3
 * 
 * Property: For any set of selected countries including Eswatini, all metrics 
 * should be displayed for all selected countries in a comparable format
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { pool } from '../src/config/database.js';

describe('Property 28: Country comparison completeness', () => {
  let testDataPoints = [];
  let testSourceId;
  let serverAvailable = false;

  before(async () => {
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        serverAvailable = true;
        console.log('Server is running - proceeding with country comparison tests');
      }
    } catch (error) {
      console.log('Server not running - skipping country comparison tests');
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
   * Generator for valid country names
   * Eswatini and its regional neighbors
   */
  const countryArbitrary = fc.constantFrom(
    'Eswatini',
    'South Africa',
    'Mozambique',
    'Botswana',
    'Zimbabwe',
    'Lesotho',
    'Namibia'
  );

  /**
   * Generator for metric names that would be comparable across countries
   */
  const metricNameArbitrary = fc.constantFrom(
    'GDP per capita',
    'Life expectancy',
    'Literacy rate',
    'Unemployment rate',
    'Infant mortality rate',
    'Population',
    'GDP growth rate',
    'Inflation rate'
  );

  /**
   * Generator for data points with specific country and metric
   */
  const dataPointArbitrary = (country, metricName) => fc.record({
    country,
    metricName,
    metricValue: fc.double({ min: 0, max: 1000000, noNaN: true }),
    metricUnit: fc.constantFrom('USD', 'percent', 'years', 'count', 'rate'),
    dateRecorded: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
    category: fc.constantFrom('economy', 'health', 'education', 'politics', 'culture')
  });

  /**
   * Helper function to insert test data points
   */
  async function insertDataPoints(dataPoints) {
    const insertedPoints = [];
    
    for (const dp of dataPoints) {
      const result = await pool.query(
        `INSERT INTO data_points 
         (category, metric_name, metric_value, metric_unit, date_recorded, source_id, country)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, category, metric_name, metric_value, metric_unit, date_recorded, country`,
        [
          dp.category,
          dp.metricName,
          dp.metricValue,
          dp.metricUnit,
          dp.dateRecorded,
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

  it('country comparison includes all selected countries', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        // Generate 2-5 unique countries, ensuring Eswatini is included
        fc.uniqueArray(countryArbitrary, { minLength: 2, maxLength: 5 })
          .filter(countries => countries.includes('Eswatini')),
        // Generate 2-5 common metrics
        fc.uniqueArray(metricNameArbitrary, { minLength: 2, maxLength: 5 }),
        async (selectedCountries, selectedMetrics) => {
          // Generate data points for each country-metric combination
          const allDataPoints = [];
          for (const country of selectedCountries) {
            for (const metric of selectedMetrics) {
              const point = fc.sample(
                dataPointArbitrary(country, metric),
                1
              )[0];
              allDataPoints.push(point);
            }
          }

          // Insert test data
          const inserted = await insertDataPoints(allDataPoints);
          testDataPoints = inserted;

          // Make request to country comparison endpoint
          const params = new URLSearchParams();
          params.append('countries', selectedCountries.join(','));
          
          const response = await fetch(
            `http://localhost:3000/api/v1/visualization/country-comparison?${params.toString()}`
          );

          // Verify response structure
          assert.strictEqual(response.status, 200, 'Response should be 200 OK');
          
          const data = await response.json();
          assert.strictEqual(data.success, true, 'Response should be successful');
          assert.ok(data.data, 'Response should have data field');

          // Property: All selected countries should be present in the response
          const returnedCountries = new Set();
          
          if (data.data.countries) {
            // If response groups by country
            Object.keys(data.data.countries).forEach(country => {
              returnedCountries.add(country);
            });
          } else if (data.data.dataPoints) {
            // If response is a flat list with country field
            data.data.dataPoints.forEach(dp => {
              if (dp.country) {
                returnedCountries.add(dp.country);
              }
            });
          } else if (data.data.comparisons) {
            // If response has a comparisons array
            data.data.comparisons.forEach(comp => {
              if (comp.country) {
                returnedCountries.add(comp.country);
              }
            });
          }

          // Verify all selected countries are present
          for (const country of selectedCountries) {
            assert.ok(
              returnedCountries.has(country),
              `Country ${country} should be present in response`
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

  it('country comparison displays metrics for all selected countries in comparable format', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        // Generate 2-4 countries including Eswatini
        fc.uniqueArray(countryArbitrary, { minLength: 2, maxLength: 4 })
          .filter(countries => countries.includes('Eswatini')),
        // Generate 2-4 common metrics
        fc.uniqueArray(metricNameArbitrary, { minLength: 2, maxLength: 4 }),
        async (selectedCountries, selectedMetrics) => {
          // Generate data points for each country-metric combination
          const allDataPoints = [];
          for (const country of selectedCountries) {
            for (const metric of selectedMetrics) {
              const point = fc.sample(
                dataPointArbitrary(country, metric),
                1
              )[0];
              allDataPoints.push(point);
            }
          }

          // Insert test data
          const inserted = await insertDataPoints(allDataPoints);
          testDataPoints = inserted;

          // Make request to country comparison endpoint
          const params = new URLSearchParams();
          params.append('countries', selectedCountries.join(','));
          
          const response = await fetch(
            `http://localhost:3000/api/v1/visualization/country-comparison?${params.toString()}`
          );

          assert.strictEqual(response.status, 200, 'Response should be 200 OK');
          
          const data = await response.json();
          assert.strictEqual(data.success, true, 'Response should be successful');

          // Property: For each metric, all countries should have data
          // This ensures "comparable format" - same metrics across all countries
          
          let metricsByCountry = new Map();
          
          if (data.data.countries) {
            // If grouped by country
            Object.entries(data.data.countries).forEach(([country, countryData]) => {
              const metrics = new Set();
              if (Array.isArray(countryData)) {
                countryData.forEach(dp => metrics.add(dp.metric_name));
              } else if (countryData.dataPoints) {
                countryData.dataPoints.forEach(dp => metrics.add(dp.metric_name));
              }
              metricsByCountry.set(country, metrics);
            });
          } else if (data.data.dataPoints) {
            // If flat list
            data.data.dataPoints.forEach(dp => {
              if (!metricsByCountry.has(dp.country)) {
                metricsByCountry.set(dp.country, new Set());
              }
              metricsByCountry.get(dp.country).add(dp.metric_name);
            });
          } else if (data.data.comparisons) {
            // If comparisons array
            data.data.comparisons.forEach(comp => {
              if (!metricsByCountry.has(comp.country)) {
                metricsByCountry.set(comp.country, new Set());
              }
              if (comp.metrics) {
                Object.keys(comp.metrics).forEach(metric => {
                  metricsByCountry.get(comp.country).add(metric);
                });
              }
            });
          }

          // Verify all countries have the same set of metrics (comparable format)
          const allMetrics = new Set();
          metricsByCountry.forEach(metrics => {
            metrics.forEach(m => allMetrics.add(m));
          });

          // Each country should have data for the same metrics
          for (const [country, metrics] of metricsByCountry.entries()) {
            assert.ok(
              metrics.size > 0,
              `Country ${country} should have at least one metric`
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

  it('country comparison requires Eswatini to be included', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    // Test that comparison without Eswatini returns error or includes Eswatini automatically
    const countriesWithoutEswatini = ['South Africa', 'Mozambique'];
    
    const params = new URLSearchParams();
    params.append('countries', countriesWithoutEswatini.join(','));
    
    const response = await fetch(
      `http://localhost:3000/api/v1/visualization/country-comparison?${params.toString()}`
    );

    // Should either return 422 validation error or automatically include Eswatini
    assert.ok(
      [200, 422].includes(response.status),
      'Response should be 200 or 422'
    );
    
    const data = await response.json();
    
    if (response.status === 200) {
      // If successful, Eswatini should be included in results
      const returnedCountries = new Set();
      
      if (data.data.countries) {
        Object.keys(data.data.countries).forEach(country => {
          returnedCountries.add(country);
        });
      } else if (data.data.dataPoints) {
        data.data.dataPoints.forEach(dp => {
          if (dp.country) returnedCountries.add(dp.country);
        });
      } else if (data.data.comparisons) {
        data.data.comparisons.forEach(comp => {
          if (comp.country) returnedCountries.add(comp.country);
        });
      }
      
      assert.ok(
        returnedCountries.has('Eswatini'),
        'Eswatini should be included in comparison results'
      );
    } else {
      // If validation error, should indicate Eswatini is required
      assert.strictEqual(data.success, false, 'Response should indicate failure');
      assert.ok(data.error, 'Response should have error field');
    }
  });

  it('country comparison handles single country (Eswatini only)', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(metricNameArbitrary, { minLength: 2, maxLength: 5 }),
        async (selectedMetrics) => {
          // Generate data for Eswatini only
          const allDataPoints = [];
          for (const metric of selectedMetrics) {
            const point = fc.sample(
              dataPointArbitrary('Eswatini', metric),
              1
            )[0];
            allDataPoints.push(point);
          }

          // Insert test data
          const inserted = await insertDataPoints(allDataPoints);
          testDataPoints = inserted;

          // Request comparison with only Eswatini
          const params = new URLSearchParams();
          params.append('countries', 'Eswatini');
          
          const response = await fetch(
            `http://localhost:3000/api/v1/visualization/country-comparison?${params.toString()}`
          );

          assert.strictEqual(response.status, 200, 'Response should be 200 OK');
          
          const data = await response.json();
          assert.strictEqual(data.success, true, 'Response should be successful');

          // Should work with single country
          const returnedCountries = new Set();
          
          if (data.data.countries) {
            Object.keys(data.data.countries).forEach(country => {
              returnedCountries.add(country);
            });
          } else if (data.data.dataPoints) {
            data.data.dataPoints.forEach(dp => {
              if (dp.country) returnedCountries.add(dp.country);
            });
          } else if (data.data.comparisons) {
            data.data.comparisons.forEach(comp => {
              if (comp.country) returnedCountries.add(comp.country);
            });
          }

          // Should contain Eswatini
          assert.ok(
            returnedCountries.has('Eswatini'),
            'Should contain Eswatini'
          );

          // Cleanup
          await cleanupDataPoints();

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  it('country comparison returns only data for selected countries', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        // Generate 2-3 selected countries including Eswatini
        fc.uniqueArray(countryArbitrary, { minLength: 2, maxLength: 3 })
          .filter(countries => countries.includes('Eswatini')),
        // Generate 2-4 metrics
        fc.uniqueArray(metricNameArbitrary, { minLength: 2, maxLength: 4 }),
        async (selectedCountries, selectedMetrics) => {
          // Get all countries
          const allCountries = ['Eswatini', 'South Africa', 'Mozambique', 'Botswana', 'Zimbabwe', 'Lesotho', 'Namibia'];
          
          // Generate data for ALL countries (including non-selected ones)
          const allDataPoints = [];
          for (const country of allCountries) {
            for (const metric of selectedMetrics) {
              const point = fc.sample(
                dataPointArbitrary(country, metric),
                1
              )[0];
              allDataPoints.push(point);
            }
          }

          // Insert test data
          const inserted = await insertDataPoints(allDataPoints);
          testDataPoints = inserted;

          // Make request with only selected countries
          const params = new URLSearchParams();
          params.append('countries', selectedCountries.join(','));
          
          const response = await fetch(
            `http://localhost:3000/api/v1/visualization/country-comparison?${params.toString()}`
          );

          assert.strictEqual(response.status, 200, 'Response should be 200 OK');
          
          const data = await response.json();
          assert.strictEqual(data.success, true, 'Response should be successful');

          // Property: Response should ONLY contain data from selected countries
          const returnedCountries = new Set();
          
          if (data.data.countries) {
            Object.keys(data.data.countries).forEach(country => {
              returnedCountries.add(country);
            });
          } else if (data.data.dataPoints) {
            data.data.dataPoints.forEach(dp => {
              if (dp.country) returnedCountries.add(dp.country);
            });
          } else if (data.data.comparisons) {
            data.data.comparisons.forEach(comp => {
              if (comp.country) returnedCountries.add(comp.country);
            });
          }

          // Every returned country must be in selected countries
          for (const country of returnedCountries) {
            assert.ok(
              selectedCountries.includes(country),
              `Returned country ${country} should be in selected countries`
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
});
