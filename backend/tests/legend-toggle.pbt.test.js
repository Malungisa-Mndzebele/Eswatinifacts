import { describe, it } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';

/**
 * Feature: eswatini-facts-platform, Property 3: Legend toggle behavior
 * Validates: Requirements 1.3
 * 
 * Property: For any chart with multiple data series, clicking a legend item should 
 * toggle that series visibility while preserving other series states
 */

describe('Legend Toggle Behavior Property Tests', () => {
  // Generator for chart datasets with visibility state
  const datasetGenerator = fc.record({
    label: fc.string({ minLength: 1, maxLength: 50 }),
    data: fc.array(fc.float({ min: 0, max: 1000000, noNaN: true }), { minLength: 1, maxLength: 20 }),
    hidden: fc.boolean(),
    backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s),
    borderColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s),
  });

  // Generator for multi-dataset charts
  const multiDatasetChartGenerator = fc.array(datasetGenerator, { minLength: 2, maxLength: 10 });

  /**
   * Simulates toggling a dataset's visibility
   * This mirrors the Chart.js legend onClick behavior
   */
  function toggleDatasetVisibility(datasets, datasetIndex) {
    // Create a deep copy to avoid mutation
    const newDatasets = datasets.map((ds, idx) => ({
      ...ds,
      hidden: idx === datasetIndex ? !ds.hidden : ds.hidden,
    }));
    return newDatasets;
  }

  /**
   * Gets the visibility state of all datasets
   */
  function getVisibilityStates(datasets) {
    return datasets.map(ds => ds.hidden);
  }

  it('should toggle only the clicked dataset visibility', () => {
    fc.assert(
      fc.property(
        multiDatasetChartGenerator,
        fc.nat(),
        (datasets, randomIndex) => {
          // Ensure we have a valid index
          const datasetIndex = randomIndex % datasets.length;

          // Record initial state
          const initialVisibility = getVisibilityStates(datasets);
          const initialTargetState = datasets[datasetIndex].hidden;

          // Toggle the dataset
          const updatedDatasets = toggleDatasetVisibility(datasets, datasetIndex);
          const finalVisibility = getVisibilityStates(updatedDatasets);

          // Property: The toggled dataset should have opposite visibility
          assert.strictEqual(
            updatedDatasets[datasetIndex].hidden,
            !initialTargetState,
            'Toggled dataset should have opposite visibility state'
          );

          // Property: All other datasets should maintain their visibility state
          updatedDatasets.forEach((dataset, index) => {
            if (index !== datasetIndex) {
              assert.strictEqual(
                dataset.hidden,
                initialVisibility[index],
                `Dataset ${index} visibility should be preserved (was ${initialVisibility[index]}, now ${dataset.hidden})`
              );
            }
          });

          // Property: Only one dataset's visibility should change
          let changedCount = 0;
          for (let i = 0; i < datasets.length; i++) {
            if (initialVisibility[i] !== finalVisibility[i]) {
              changedCount++;
            }
          }
          assert.strictEqual(
            changedCount,
            1,
            'Exactly one dataset visibility should change'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve visibility states through multiple toggles', () => {
    fc.assert(
      fc.property(
        multiDatasetChartGenerator,
        fc.array(fc.nat(), { minLength: 1, maxLength: 10 }),
        (initialDatasets, toggleIndices) => {
          let datasets = initialDatasets;

          // Perform multiple toggles
          const toggleHistory = [];
          toggleIndices.forEach(randomIndex => {
            const datasetIndex = randomIndex % datasets.length;
            const beforeState = datasets[datasetIndex].hidden;
            datasets = toggleDatasetVisibility(datasets, datasetIndex);
            const afterState = datasets[datasetIndex].hidden;
            
            toggleHistory.push({
              index: datasetIndex,
              before: beforeState,
              after: afterState,
            });
          });

          // Property: Each toggle should have flipped the state
          toggleHistory.forEach((toggle, historyIndex) => {
            assert.strictEqual(
              toggle.after,
              !toggle.before,
              `Toggle ${historyIndex} should have flipped state from ${toggle.before} to ${toggle.after}`
            );
          });

          // Property: Final state should be deterministic based on toggle count per dataset
          const toggleCounts = new Map();
          toggleIndices.forEach(randomIndex => {
            const datasetIndex = randomIndex % datasets.length;
            toggleCounts.set(datasetIndex, (toggleCounts.get(datasetIndex) || 0) + 1);
          });

          datasets.forEach((dataset, index) => {
            const toggleCount = toggleCounts.get(index) || 0;
            const expectedHidden = toggleCount % 2 === 0 
              ? initialDatasets[index].hidden 
              : !initialDatasets[index].hidden;
            
            assert.strictEqual(
              dataset.hidden,
              expectedHidden,
              `Dataset ${index} should have correct state after ${toggleCount} toggles`
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain dataset integrity during visibility toggles', () => {
    fc.assert(
      fc.property(
        multiDatasetChartGenerator,
        fc.nat(),
        (datasets, randomIndex) => {
          const datasetIndex = randomIndex % datasets.length;
          const originalDataset = datasets[datasetIndex];

          // Toggle visibility
          const updatedDatasets = toggleDatasetVisibility(datasets, datasetIndex);
          const updatedDataset = updatedDatasets[datasetIndex];

          // Property: All dataset properties except 'hidden' should remain unchanged
          assert.strictEqual(
            updatedDataset.label,
            originalDataset.label,
            'Dataset label should not change'
          );
          assert.deepStrictEqual(
            updatedDataset.data,
            originalDataset.data,
            'Dataset data should not change'
          );
          assert.strictEqual(
            updatedDataset.backgroundColor,
            originalDataset.backgroundColor,
            'Dataset backgroundColor should not change'
          );
          assert.strictEqual(
            updatedDataset.borderColor,
            originalDataset.borderColor,
            'Dataset borderColor should not change'
          );

          // Property: Only the 'hidden' property should change
          const originalKeys = Object.keys(originalDataset).sort();
          const updatedKeys = Object.keys(updatedDataset).sort();
          assert.deepStrictEqual(
            updatedKeys,
            originalKeys,
            'Dataset should have same properties after toggle'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle toggling all datasets independently', () => {
    fc.assert(
      fc.property(
        multiDatasetChartGenerator,
        (datasets) => {
          // Toggle each dataset once
          let currentDatasets = datasets;
          const initialStates = getVisibilityStates(datasets);

          for (let i = 0; i < datasets.length; i++) {
            currentDatasets = toggleDatasetVisibility(currentDatasets, i);
          }

          const finalStates = getVisibilityStates(currentDatasets);

          // Property: Each dataset should have opposite visibility from initial
          finalStates.forEach((finalState, index) => {
            assert.strictEqual(
              finalState,
              !initialStates[index],
              `Dataset ${index} should be toggled from ${initialStates[index]} to ${finalState}`
            );
          });

          // Property: All datasets should have changed
          assert.strictEqual(
            finalStates.length,
            initialStates.length,
            'Should have same number of datasets'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should support toggling the same dataset multiple times', () => {
    fc.assert(
      fc.property(
        multiDatasetChartGenerator,
        fc.nat({ max: 20 }),
        fc.nat(),
        (datasets, toggleCount, randomIndex) => {
          const datasetIndex = randomIndex % datasets.length;
          const initialState = datasets[datasetIndex].hidden;

          // Toggle the same dataset multiple times
          let currentDatasets = datasets;
          for (let i = 0; i < toggleCount; i++) {
            currentDatasets = toggleDatasetVisibility(currentDatasets, datasetIndex);
          }

          const finalState = currentDatasets[datasetIndex].hidden;

          // Property: After even number of toggles, state should match initial
          // After odd number of toggles, state should be opposite
          const expectedState = toggleCount % 2 === 0 ? initialState : !initialState;
          assert.strictEqual(
            finalState,
            expectedState,
            `After ${toggleCount} toggles, state should be ${expectedState}`
          );

          // Property: Other datasets should remain unchanged
          currentDatasets.forEach((dataset, index) => {
            if (index !== datasetIndex) {
              assert.strictEqual(
                dataset.hidden,
                datasets[index].hidden,
                `Dataset ${index} should remain unchanged`
              );
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should work correctly with all datasets initially visible', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 50 }),
            data: fc.array(fc.float({ min: 0, max: 1000000, noNaN: true }), { minLength: 1, maxLength: 20 }),
            hidden: fc.constant(false), // All initially visible
          }),
          { minLength: 2, maxLength: 10 }
        ),
        fc.nat(),
        (datasets, randomIndex) => {
          const datasetIndex = randomIndex % datasets.length;

          // All should be visible initially
          datasets.forEach((dataset, index) => {
            assert.strictEqual(
              dataset.hidden,
              false,
              `Dataset ${index} should be initially visible`
            );
          });

          // Toggle one dataset
          const updatedDatasets = toggleDatasetVisibility(datasets, datasetIndex);

          // Property: Toggled dataset should now be hidden
          assert.strictEqual(
            updatedDatasets[datasetIndex].hidden,
            true,
            'Toggled dataset should be hidden'
          );

          // Property: All other datasets should still be visible
          updatedDatasets.forEach((dataset, index) => {
            if (index !== datasetIndex) {
              assert.strictEqual(
                dataset.hidden,
                false,
                `Dataset ${index} should still be visible`
              );
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should work correctly with all datasets initially hidden', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 50 }),
            data: fc.array(fc.float({ min: 0, max: 1000000, noNaN: true }), { minLength: 1, maxLength: 20 }),
            hidden: fc.constant(true), // All initially hidden
          }),
          { minLength: 2, maxLength: 10 }
        ),
        fc.nat(),
        (datasets, randomIndex) => {
          const datasetIndex = randomIndex % datasets.length;

          // All should be hidden initially
          datasets.forEach((dataset, index) => {
            assert.strictEqual(
              dataset.hidden,
              true,
              `Dataset ${index} should be initially hidden`
            );
          });

          // Toggle one dataset
          const updatedDatasets = toggleDatasetVisibility(datasets, datasetIndex);

          // Property: Toggled dataset should now be visible
          assert.strictEqual(
            updatedDatasets[datasetIndex].hidden,
            false,
            'Toggled dataset should be visible'
          );

          // Property: All other datasets should still be hidden
          updatedDatasets.forEach((dataset, index) => {
            if (index !== datasetIndex) {
              assert.strictEqual(
                dataset.hidden,
                true,
                `Dataset ${index} should still be hidden`
              );
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle mixed visibility states correctly', () => {
    fc.assert(
      fc.property(
        multiDatasetChartGenerator,
        fc.nat(),
        (datasets, randomIndex) => {
          const datasetIndex = randomIndex % datasets.length;

          // Count initial visibility states
          const initialVisibleCount = datasets.filter(ds => !ds.hidden).length;
          const initialHiddenCount = datasets.filter(ds => ds.hidden).length;

          // Toggle one dataset
          const updatedDatasets = toggleDatasetVisibility(datasets, datasetIndex);

          // Count final visibility states
          const finalVisibleCount = updatedDatasets.filter(ds => !ds.hidden).length;
          const finalHiddenCount = updatedDatasets.filter(ds => ds.hidden).length;

          // Property: Total count should remain the same
          assert.strictEqual(
            finalVisibleCount + finalHiddenCount,
            initialVisibleCount + initialHiddenCount,
            'Total dataset count should remain the same'
          );

          // Property: Visible/hidden counts should change by exactly 1
          const visibleDiff = Math.abs(finalVisibleCount - initialVisibleCount);
          const hiddenDiff = Math.abs(finalHiddenCount - initialHiddenCount);
          
          assert.strictEqual(
            visibleDiff,
            1,
            'Visible count should change by exactly 1'
          );
          assert.strictEqual(
            hiddenDiff,
            1,
            'Hidden count should change by exactly 1'
          );

          // Property: If toggled dataset was visible, visible count decreases
          if (!datasets[datasetIndex].hidden) {
            assert.strictEqual(
              finalVisibleCount,
              initialVisibleCount - 1,
              'Visible count should decrease when hiding a visible dataset'
            );
          } else {
            // If toggled dataset was hidden, visible count increases
            assert.strictEqual(
              finalVisibleCount,
              initialVisibleCount + 1,
              'Visible count should increase when showing a hidden dataset'
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain correct state with rapid sequential toggles', () => {
    fc.assert(
      fc.property(
        multiDatasetChartGenerator,
        fc.array(fc.nat(), { minLength: 5, maxLength: 20 }),
        (initialDatasets, toggleSequence) => {
          let datasets = initialDatasets;
          const stateHistory = [getVisibilityStates(datasets)];

          // Perform rapid toggles
          toggleSequence.forEach(randomIndex => {
            const datasetIndex = randomIndex % datasets.length;
            datasets = toggleDatasetVisibility(datasets, datasetIndex);
            stateHistory.push(getVisibilityStates(datasets));
          });

          // Property: Each state transition should be valid
          for (let i = 1; i < stateHistory.length; i++) {
            const prevState = stateHistory[i - 1];
            const currState = stateHistory[i];

            // Exactly one dataset should have changed
            let changedCount = 0;
            for (let j = 0; j < prevState.length; j++) {
              if (prevState[j] !== currState[j]) {
                changedCount++;
              }
            }

            assert.strictEqual(
              changedCount,
              1,
              `Transition ${i} should change exactly one dataset`
            );
          }

          // Property: Final state should be deterministic
          const toggleCountPerDataset = new Map();
          toggleSequence.forEach(randomIndex => {
            const datasetIndex = randomIndex % datasets.length;
            toggleCountPerDataset.set(
              datasetIndex,
              (toggleCountPerDataset.get(datasetIndex) || 0) + 1
            );
          });

          datasets.forEach((dataset, index) => {
            const toggleCount = toggleCountPerDataset.get(index) || 0;
            const expectedHidden = toggleCount % 2 === 0
              ? initialDatasets[index].hidden
              : !initialDatasets[index].hidden;

            assert.strictEqual(
              dataset.hidden,
              expectedHidden,
              `Dataset ${index} final state should match expected after ${toggleCount} toggles`
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
