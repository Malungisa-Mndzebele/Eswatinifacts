import { describe, it } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';

/**
 * Feature: eswatini-facts-platform, Property 7: Search result ordering
 * Validates: Requirements 2.4
 * 
 * Property: For any search results sorted by a criterion (relevance, date, title),
 * each result should be ordered correctly according to that criterion
 */

// Helper functions to simulate sorting
function sortByRelevance(results, searchQuery) {
  if (!searchQuery) {
    return results;
  }
  
  // Calculate relevance score based on keyword matches
  const scoredResults = results.map(result => {
    let score = 0;
    const query = searchQuery.toLowerCase();
    const title = result.title.toLowerCase();
    const content = result.content.toLowerCase();
    
    // Title matches are worth more
    if (title.includes(query)) {
      score += 10;
    }
    
    // Content matches
    if (content.includes(query)) {
      score += 5;
    }
    
    // Exact title match is worth even more
    if (title === query) {
      score += 20;
    }
    
    return { ...result, relevanceScore: score };
  });
  
  // Sort by score descending
  return scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function sortByDate(results) {
  return [...results].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA; // Newest first
  });
}

function sortByTitle(results) {
  return [...results].sort((a, b) => {
    return a.title.localeCompare(b.title);
  });
}

describe('Search Result Ordering Property Tests', () => {
  // Generator for search results
  const searchResultArbitrary = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 5, maxLength: 100 }),
    content: fc.string({ minLength: 10, maxLength: 500 }),
    category: fc.constantFrom('Economy', 'Health', 'Education', 'Politics', 'Culture'),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
    url: fc.webUrl(),
  });

  it('should sort by relevance score in descending order', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 3, maxLength: 20 }),
        (results, searchQuery) => {
          const sortedResults = sortByRelevance(results, searchQuery);
          
          // Check that results are in descending order of relevance score
          for (let i = 0; i < sortedResults.length - 1; i++) {
            assert.ok(
              sortedResults[i].relevanceScore >= sortedResults[i + 1].relevanceScore,
              `Result at index ${i} (score: ${sortedResults[i].relevanceScore}) should have higher or equal relevance than result at index ${i + 1} (score: ${sortedResults[i + 1].relevanceScore})`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sort by date in descending order (newest first)', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        (results) => {
          const sortedResults = sortByDate(results);
          
          // Check that results are in descending order of date
          for (let i = 0; i < sortedResults.length - 1; i++) {
            const dateA = new Date(sortedResults[i].createdAt);
            const dateB = new Date(sortedResults[i + 1].createdAt);
            
            assert.ok(
              dateA >= dateB,
              `Result at index ${i} (date: ${dateA.toISOString()}) should be newer than or equal to result at index ${i + 1} (date: ${dateB.toISOString()})`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sort by title in alphabetical order', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        (results) => {
          const sortedResults = sortByTitle(results);
          
          // Check that results are in alphabetical order
          for (let i = 0; i < sortedResults.length - 1; i++) {
            assert.ok(
              sortedResults[i].title.localeCompare(sortedResults[i + 1].title) <= 0,
              `Result at index ${i} (title: "${sortedResults[i].title}") should come before or equal to result at index ${i + 1} (title: "${sortedResults[i + 1].title}") alphabetically`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain stable sort for equal values', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.constantFrom('Same Title', 'Another Title', 'Third Title'),
            content: fc.string({ minLength: 10, maxLength: 100 }),
            category: fc.constantFrom('Economy', 'Health'),
            createdAt: fc.constantFrom(new Date('2024-01-01'), new Date('2024-06-01')),
            url: fc.webUrl(),
          }),
          { minLength: 10, maxLength: 30 }
        ),
        (results) => {
          // Sort by title
          const sortedResults = sortByTitle(results);
          
          // Find groups with same title
          const titleGroups = {};
          sortedResults.forEach((result, index) => {
            if (!titleGroups[result.title]) {
              titleGroups[result.title] = [];
            }
            titleGroups[result.title].push({ result, originalIndex: results.findIndex(r => r.id === result.id) });
          });
          
          // For each group with same title, check that relative order is preserved
          Object.values(titleGroups).forEach(group => {
            if (group.length > 1) {
              for (let i = 0; i < group.length - 1; i++) {
                // Original order should be preserved for equal values
                assert.ok(
                  group[i].originalIndex <= group[i + 1].originalIndex,
                  'Stable sort should preserve original order for equal values'
                );
              }
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not modify original results array when sorting', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        (results) => {
          const originalResults = [...results];
          const originalLength = results.length;
          
          // Sort by different criteria
          sortByDate(results);
          sortByTitle(results);
          sortByRelevance(results, 'test');
          
          // Original array should be unchanged
          assert.strictEqual(
            results.length,
            originalLength,
            'Original results array length should not change'
          );
          
          // Content should be unchanged
          for (let i = 0; i < results.length; i++) {
            assert.deepStrictEqual(
              results[i],
              originalResults[i],
              'Original results content should not be modified'
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty results array', () => {
    const emptyResults = [];
    
    const sortedByDate = sortByDate(emptyResults);
    const sortedByTitle = sortByTitle(emptyResults);
    const sortedByRelevance = sortByRelevance(emptyResults, 'test');
    
    assert.strictEqual(sortedByDate.length, 0, 'Sorting empty array by date should return empty array');
    assert.strictEqual(sortedByTitle.length, 0, 'Sorting empty array by title should return empty array');
    assert.strictEqual(sortedByRelevance.length, 0, 'Sorting empty array by relevance should return empty array');
  });

  it('should handle single result', () => {
    fc.assert(
      fc.property(
        searchResultArbitrary,
        (result) => {
          const singleResult = [result];
          
          const sortedByDate = sortByDate(singleResult);
          const sortedByTitle = sortByTitle(singleResult);
          const sortedByRelevance = sortByRelevance(singleResult, 'test');
          
          assert.strictEqual(sortedByDate.length, 1, 'Single result should remain single after sorting by date');
          assert.strictEqual(sortedByTitle.length, 1, 'Single result should remain single after sorting by title');
          assert.strictEqual(sortedByRelevance.length, 1, 'Single result should remain single after sorting by relevance');
          
          assert.deepStrictEqual(sortedByDate[0].id, result.id, 'Single result should be unchanged after sorting by date');
          assert.deepStrictEqual(sortedByTitle[0].id, result.id, 'Single result should be unchanged after sorting by title');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle results with identical dates', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 5, maxLength: 100 }),
            content: fc.string({ minLength: 10, maxLength: 100 }),
            category: fc.constantFrom('Economy', 'Health'),
            createdAt: fc.constant(new Date('2024-01-01')), // All same date
            url: fc.webUrl(),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (results) => {
          const sortedResults = sortByDate(results);
          
          // All results should have the same date
          for (let i = 0; i < sortedResults.length - 1; i++) {
            const dateA = new Date(sortedResults[i].createdAt);
            const dateB = new Date(sortedResults[i + 1].createdAt);
            
            assert.strictEqual(
              dateA.getTime(),
              dateB.getTime(),
              'All results should have identical dates'
            );
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle results with identical titles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.constant('Same Title'), // All same title
            content: fc.string({ minLength: 10, maxLength: 100 }),
            category: fc.constantFrom('Economy', 'Health'),
            createdAt: fc.date(),
            url: fc.webUrl(),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (results) => {
          const sortedResults = sortByTitle(results);
          
          // All results should have the same title
          for (let i = 0; i < sortedResults.length; i++) {
            assert.strictEqual(
              sortedResults[i].title,
              'Same Title',
              'All results should have identical titles'
            );
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should produce consistent results for same input', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArbitrary, { minLength: 5, maxLength: 50 }),
        fc.constantFrom('relevance', 'date', 'title'),
        (results, sortCriterion) => {
          // Sort twice with same criterion
          let sorted1, sorted2;
          
          if (sortCriterion === 'relevance') {
            sorted1 = sortByRelevance(results, 'test');
            sorted2 = sortByRelevance(results, 'test');
          } else if (sortCriterion === 'date') {
            sorted1 = sortByDate(results);
            sorted2 = sortByDate(results);
          } else {
            sorted1 = sortByTitle(results);
            sorted2 = sortByTitle(results);
          }
          
          // Results should be identical
          assert.strictEqual(
            sorted1.length,
            sorted2.length,
            'Same sort should produce same number of results'
          );
          
          for (let i = 0; i < sorted1.length; i++) {
            assert.strictEqual(
              sorted1[i].id,
              sorted2[i].id,
              `Result at index ${i} should be same in both sorts`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
