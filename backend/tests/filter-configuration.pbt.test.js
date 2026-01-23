/**
 * Property-Based Test: Filter configuration round-trip
 * Feature: eswatini-facts-platform, Property 30: Filter configuration round-trip
 * Validates: Requirements 8.5
 * 
 * Property: For any saved filter configuration, retrieving it via the shareable URL 
 * should restore the exact same filter settings
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';

describe('Property 30: Filter configuration round-trip', () => {
  let serverAvailable = false;

  before(async () => {
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        serverAvailable = true;
        console.log('Server is running - proceeding with filter configuration tests');
      }
    } catch (error) {
      console.log('Server not running - skipping filter configuration tests');
      console.log('To run these tests, start the server with: npm start');
      return;
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
    'Zimbabwe',
    'Lesotho',
    'Namibia'
  );

  /**
   * Generator for filter configurations
   */
  const filterConfigArbitrary = fc.record({
    categories: fc.option(
      fc.uniqueArray(categoryArbitrary, { minLength: 1, maxLength: 5 }),
      { nil: null }
    ),
    countries: fc.option(
      fc.uniqueArray(countryArbitrary, { minLength: 1, maxLength: 5 }),
      { nil: null }
    ),
    startDate: fc.option(
      fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
      { nil: null }
    ),
    endDate: fc.option(
      fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') }),
      { nil: null }
    ),
    sortBy: fc.option(
      fc.constantFrom('date', 'value', 'name'),
      { nil: null }
    ),
    sortOrder: fc.option(
      fc.constantFrom('asc', 'desc'),
      { nil: null }
    )
  });

  /**
   * Generator for configuration names
   */
  const configNameArbitrary = fc.option(
    fc.string({ minLength: 3, maxLength: 50 }),
    { nil: null }
  );

  /**
   * Helper function to normalize filter values for comparison
   */
  function normalizeFilters(filters) {
    const normalized = { ...filters };
    
    // Convert dates to ISO strings for comparison
    if (normalized.startDate) {
      normalized.startDate = new Date(normalized.startDate).toISOString();
    }
    if (normalized.endDate) {
      normalized.endDate = new Date(normalized.endDate).toISOString();
    }
    
    return normalized;
  }

  /**
   * Helper function to compare filter objects
   */
  function filtersMatch(original, retrieved) {
    const orig = normalizeFilters(original);
    const retr = normalizeFilters(retrieved);
    
    // Compare each field
    const fields = ['categories', 'countries', 'startDate', 'endDate', 'sortBy', 'sortOrder'];
    
    for (const field of fields) {
      const origValue = orig[field];
      const retrValue = retr[field];
      
      // Both null/undefined
      if ((origValue === null || origValue === undefined) && 
          (retrValue === null || retrValue === undefined)) {
        continue;
      }
      
      // One is null/undefined, other is not
      if ((origValue === null || origValue === undefined) !== 
          (retrValue === null || retrValue === undefined)) {
        return false;
      }
      
      // Compare arrays
      if (Array.isArray(origValue)) {
        if (!Array.isArray(retrValue)) return false;
        if (origValue.length !== retrValue.length) return false;
        
        // Sort both arrays for comparison
        const sortedOrig = [...origValue].sort();
        const sortedRetr = [...retrValue].sort();
        
        for (let i = 0; i < sortedOrig.length; i++) {
          if (sortedOrig[i] !== sortedRetr[i]) return false;
        }
      } else {
        // Compare primitives
        if (origValue !== retrValue) return false;
      }
    }
    
    return true;
  }

  it('saved filter configuration can be retrieved with exact same settings', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        filterConfigArbitrary,
        configNameArbitrary,
        async (filters, name) => {
          // Save filter configuration
          const saveResponse = await fetch(
            'http://localhost:3000/api/visualization/filter-config',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: name,
                filters: filters
              })
            }
          );

          assert.strictEqual(saveResponse.status, 200, 'Save should return 200 OK');

          const saveData = await saveResponse.json();
          assert.strictEqual(saveData.success, true, 'Save should be successful');
          assert.ok(saveData.data, 'Save response should have data field');
          assert.ok(saveData.data.configId, 'Save response should have configId');
          assert.ok(saveData.data.shareableUrl, 'Save response should have shareableUrl');

          const configId = saveData.data.configId;

          // Load filter configuration
          const loadResponse = await fetch(
            `http://localhost:3000/api/visualization/filter-config/${configId}`
          );

          assert.strictEqual(loadResponse.status, 200, 'Load should return 200 OK');

          const loadData = await loadResponse.json();
          assert.strictEqual(loadData.success, true, 'Load should be successful');
          assert.ok(loadData.data, 'Load response should have data field');
          assert.ok(loadData.data.filters, 'Load response should have filters field');

          // Property: Retrieved filters should match original filters exactly
          assert.ok(
            filtersMatch(filters, loadData.data.filters),
            `Retrieved filters should match original filters.\nOriginal: ${JSON.stringify(filters)}\nRetrieved: ${JSON.stringify(loadData.data.filters)}`
          );

          // Verify name is preserved if provided
          if (name) {
            assert.strictEqual(
              loadData.data.name,
              name,
              'Configuration name should be preserved'
            );
          }

          // Verify metadata fields exist
          assert.ok(loadData.data.id, 'Configuration should have id');
          assert.ok(loadData.data.createdAt, 'Configuration should have createdAt timestamp');

          return true;
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  });

  it('filter configuration with all fields populated round-trips correctly', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate filters with all fields populated
        fc.record({
          categories: fc.uniqueArray(categoryArbitrary, { minLength: 2, maxLength: 4 }),
          countries: fc.uniqueArray(countryArbitrary, { minLength: 2, maxLength: 4 }),
          startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2022-12-31') }),
          endDate: fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') }),
          sortBy: fc.constantFrom('date', 'value', 'name'),
          sortOrder: fc.constantFrom('asc', 'desc')
        }),
        fc.string({ minLength: 5, maxLength: 30 }),
        async (filters, name) => {
          // Save configuration
          const saveResponse = await fetch(
            'http://localhost:3000/api/visualization/filter-config',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, filters })
            }
          );

          assert.strictEqual(saveResponse.status, 200);
          const saveData = await saveResponse.json();
          const configId = saveData.data.configId;

          // Load configuration
          const loadResponse = await fetch(
            `http://localhost:3000/api/visualization/filter-config/${configId}`
          );

          assert.strictEqual(loadResponse.status, 200);
          const loadData = await loadResponse.json();

          // Property: All filter fields should be preserved
          assert.ok(
            filtersMatch(filters, loadData.data.filters),
            'All filter fields should be preserved in round-trip'
          );

          // Verify all fields are present
          assert.ok(loadData.data.filters.categories, 'Categories should be present');
          assert.ok(loadData.data.filters.countries, 'Countries should be present');
          assert.ok(loadData.data.filters.startDate, 'Start date should be present');
          assert.ok(loadData.data.filters.endDate, 'End date should be present');
          assert.ok(loadData.data.filters.sortBy, 'Sort by should be present');
          assert.ok(loadData.data.filters.sortOrder, 'Sort order should be present');

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  it('filter configuration with minimal fields round-trips correctly', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate filters with only one field populated
        fc.oneof(
          fc.record({ categories: fc.uniqueArray(categoryArbitrary, { minLength: 1, maxLength: 2 }) }),
          fc.record({ countries: fc.uniqueArray(countryArbitrary, { minLength: 1, maxLength: 2 }) }),
          fc.record({ startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }) }),
          fc.record({ endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }) }),
          fc.record({ sortBy: fc.constantFrom('date', 'value', 'name') })
        ),
        async (filters) => {
          // Save configuration
          const saveResponse = await fetch(
            'http://localhost:3000/api/visualization/filter-config',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filters })
            }
          );

          assert.strictEqual(saveResponse.status, 200);
          const saveData = await saveResponse.json();
          const configId = saveData.data.configId;

          // Load configuration
          const loadResponse = await fetch(
            `http://localhost:3000/api/visualization/filter-config/${configId}`
          );

          assert.strictEqual(loadResponse.status, 200);
          const loadData = await loadResponse.json();

          // Property: Minimal filter configuration should round-trip correctly
          assert.ok(
            filtersMatch(filters, loadData.data.filters),
            'Minimal filter configuration should be preserved'
          );

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });

  it('filter configuration with empty filters object round-trips correctly', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    // Test with empty filters object
    const filters = {};
    const name = 'Empty Configuration';

    const saveResponse = await fetch(
      'http://localhost:3000/api/visualization/filter-config',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, filters })
      }
    );

    assert.strictEqual(saveResponse.status, 200);
    const saveData = await saveResponse.json();
    const configId = saveData.data.configId;

    const loadResponse = await fetch(
      `http://localhost:3000/api/visualization/filter-config/${configId}`
    );

    assert.strictEqual(loadResponse.status, 200);
    const loadData = await loadResponse.json();

    // Property: Empty filters should round-trip correctly
    assert.deepStrictEqual(
      loadData.data.filters,
      filters,
      'Empty filters object should be preserved'
    );
  });

  it('loading non-existent configuration returns 404', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate random hex string as non-existent config ID
        fc.hexaString({ minLength: 32, maxLength: 32 }),
        async (fakeConfigId) => {
          const response = await fetch(
            `http://localhost:3000/api/visualization/filter-config/${fakeConfigId}`
          );

          // Property: Non-existent configuration should return 404
          assert.strictEqual(
            response.status,
            404,
            'Non-existent configuration should return 404'
          );

          const data = await response.json();
          assert.strictEqual(data.success, false, 'Response should indicate failure');
          assert.ok(data.error, 'Response should have error field');
          assert.ok(
            data.error.message.toLowerCase().includes('not found') ||
            data.error.message.toLowerCase().includes('expired'),
            'Error message should indicate configuration not found or expired'
          );

          return true;
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  });

  it('saving configuration without filters field returns error', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    const response = await fetch(
      'http://localhost:3000/api/visualization/filter-config',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Invalid Config' })
      }
    );

    // Property: Missing filters field should return validation error
    assert.strictEqual(response.status, 422, 'Should return 422 for missing filters');

    const data = await response.json();
    assert.strictEqual(data.success, false, 'Response should indicate failure');
    assert.ok(data.error, 'Response should have error field');
    assert.ok(
      data.error.message.toLowerCase().includes('filter'),
      'Error message should mention filters'
    );
  });

  it('multiple configurations can be saved and retrieved independently', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate 3-5 different filter configurations
        fc.array(
          fc.tuple(filterConfigArbitrary, configNameArbitrary),
          { minLength: 3, maxLength: 5 }
        ),
        async (configPairs) => {
          const savedConfigs = [];

          // Save all configurations
          for (const [filters, name] of configPairs) {
            const saveResponse = await fetch(
              'http://localhost:3000/api/visualization/filter-config',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, filters })
              }
            );

            assert.strictEqual(saveResponse.status, 200);
            const saveData = await saveResponse.json();
            savedConfigs.push({
              configId: saveData.data.configId,
              originalFilters: filters,
              originalName: name
            });
          }

          // Load and verify each configuration independently
          for (const config of savedConfigs) {
            const loadResponse = await fetch(
              `http://localhost:3000/api/visualization/filter-config/${config.configId}`
            );

            assert.strictEqual(loadResponse.status, 200);
            const loadData = await loadResponse.json();

            // Property: Each configuration should be retrieved independently with correct data
            assert.ok(
              filtersMatch(config.originalFilters, loadData.data.filters),
              `Configuration ${config.configId} should have correct filters`
            );

            if (config.originalName) {
              assert.strictEqual(
                loadData.data.name,
                config.originalName,
                `Configuration ${config.configId} should have correct name`
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 30, timeout: 30000 }
    );
  });

  it('shareable URL format is consistent', async () => {
    if (!serverAvailable) {
      console.log('  Skipped - server not running');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        filterConfigArbitrary,
        async (filters) => {
          const saveResponse = await fetch(
            'http://localhost:3000/api/visualization/filter-config',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filters })
            }
          );

          assert.strictEqual(saveResponse.status, 200);
          const saveData = await saveResponse.json();

          // Property: Shareable URL should contain the config ID
          assert.ok(
            saveData.data.shareableUrl.includes(saveData.data.configId),
            'Shareable URL should contain the configuration ID'
          );

          // Property: Shareable URL should have expected format
          assert.ok(
            saveData.data.shareableUrl.startsWith('/visualization?config='),
            'Shareable URL should have expected format'
          );

          return true;
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  });
});
