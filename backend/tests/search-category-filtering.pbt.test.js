import { describe, it } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';

/**
 * Feature: eswatini-facts-platform, Property 6: Category filter correctness
 * Validates: Requirements 2.3
 * 
 * Property: For any set of selected categories, all search results should belong
 * to at least one of the selected categories
 */

// Helper function to simulate category filtering
function filterByCategories(results, selectedCategories) {
  if (!selectedCategories || selectedCategories.length === 0) {
    return results;
  }
  return results.filter(result => selectedCategories.includes(result.category));
}

describe('Search Category Filtering Property Tests', () => {
  const testCategories = ['Economy', 'Health', 'Education', 'Politics', 'Culture'];

  // Generator for search results
  const searchResultArbitrary = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 5, maxLength: 100 }),
    content: fc.string({ minLength: 10, maxLength: 500 }),
    category: fc.constantFrom(...testCategories),
    url: fc.webUrl(),
  });

  it('should return only results from selected categories', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        fc.array(fc.constantFrom(...testCategories), { minLength: 1, maxLength: testCategories.length }),
        (allResults, selectedCategories) => {
          // Remove duplicates from selected categories
          const uniqueCategories = [...new Set(selectedCategories)];

          // Filter results
          const filteredResults = filterByCategories(allResults, uniqueCategories);

          // All filtered results should have a category in the selected list
          for (const result of filteredResults) {
            assert.ok(
              uniqueCategories.includes(result.category),
              `Result category "${result.category}" should be in selected categories [${uniqueCategories.join(', ')}]`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty results when filtering by non-existent category', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => !testCategories.includes(s)),
        (allResults, nonExistentCategory) => {
          const filteredResults = filterByCategories(allResults, [nonExistentCategory]);

          // Should return no results
          assert.strictEqual(
            filteredResults.length,
            0,
            `Non-existent category "${nonExistentCategory}" should return no results`
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all results when no category filter is applied', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        (allResults) => {
          // Filter with empty array
          const filteredResults = filterByCategories(allResults, []);

          // Should return all results
          assert.strictEqual(
            filteredResults.length,
            allResults.length,
            'Empty category filter should return all results'
          );

          // Filter with null
          const filteredResults2 = filterByCategories(allResults, null);

          assert.strictEqual(
            filteredResults2.length,
            allResults.length,
            'Null category filter should return all results'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple category filters correctly', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 10, maxLength: 50 }),
        fc.array(fc.constantFrom(...testCategories), { minLength: 2, maxLength: testCategories.length }),
        (allResults, selectedCategories) => {
          const uniqueCategories = [...new Set(selectedCategories)];

          // Filter results
          const filteredResults = filterByCategories(allResults, uniqueCategories);

          // Count expected results manually
          const expectedResults = allResults.filter(r => uniqueCategories.includes(r.category));

          // Filtered results count should match expected count
          assert.strictEqual(
            filteredResults.length,
            expectedResults.length,
            'Filtered results count should match expected count'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not modify original results array', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        fc.array(fc.constantFrom(...testCategories), { minLength: 1, maxLength: 3 }),
        (allResults, selectedCategories) => {
          const originalLength = allResults.length;
          const originalResults = [...allResults];

          // Filter results
          filterByCategories(allResults, selectedCategories);

          // Original array should be unchanged
          assert.strictEqual(
            allResults.length,
            originalLength,
            'Original results array should not be modified'
          );

          // Content should be unchanged
          for (let i = 0; i < allResults.length; i++) {
            assert.deepStrictEqual(
              allResults[i],
              originalResults[i],
              'Original results content should not be modified'
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle duplicate categories in filter', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        fc.constantFrom(...testCategories),
        (allResults, category) => {
          // Create filter with duplicates
          const duplicateFilter = [category, category, category];

          const filteredResults = filterByCategories(allResults, duplicateFilter);

          // All results should have the selected category
          for (const result of filteredResults) {
            assert.strictEqual(
              result.category,
              category,
              `All results should have category "${category}"`
            );
          }

          // Should be same as filtering with single category
          const singleFilter = [category];
          const singleFilteredResults = filterByCategories(allResults, singleFilter);

          assert.strictEqual(
            filteredResults.length,
            singleFilteredResults.length,
            'Duplicate categories in filter should not affect results'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve result order when filtering', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 10, maxLength: 50 }),
        fc.array(fc.constantFrom(...testCategories), { minLength: 1, maxLength: 3 }),
        (allResults, selectedCategories) => {
          const filteredResults = filterByCategories(allResults, selectedCategories);

          // Check that filtered results maintain relative order from original
          let lastIndex = -1;
          for (const filteredResult of filteredResults) {
            const currentIndex = allResults.findIndex(r => r.id === filteredResult.id);
            assert.ok(
              currentIndex > lastIndex,
              'Filtered results should maintain original order'
            );
            lastIndex = currentIndex;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle all categories selected', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        (allResults) => {
          // Select all categories
          const allCategories = [...testCategories];

          const filteredResults = filterByCategories(allResults, allCategories);

          // Should return all results since all categories are selected
          assert.strictEqual(
            filteredResults.length,
            allResults.length,
            'Selecting all categories should return all results'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});


