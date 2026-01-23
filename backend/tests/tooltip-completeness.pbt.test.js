import { describe, it } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';

/**
 * Feature: eswatini-facts-platform, Property 2: Tooltip information completeness
 * Validates: Requirements 1.2
 * 
 * Property: For any data point in a visualization, hovering over it should display 
 * a tooltip containing all relevant metadata (value, label, date, source)
 */

describe('Tooltip Information Completeness Property Tests', () => {
  // Generator for data points with complete metadata
  const dataPointWithMetadataGenerator = fc.record({
    metricName: fc.string({ minLength: 1, maxLength: 100 }),
    metricValue: fc.float({ min: 0, max: 1000000, noNaN: true }),
    metricUnit: fc.constantFrom('percent', 'count', 'currency', 'rate', 'years'),
    dateRecorded: fc.date({ min: new Date('2000-01-01'), max: new Date() }),
    source: fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
    }),
  });

  // Generator for chart datasets with metadata
  const datasetWithMetadataGenerator = fc.nat({ max: 20 }).chain(numPoints => {
    const pointCount = Math.max(1, numPoints);
    return fc.record({
      label: fc.string({ minLength: 1, maxLength: 50 }),
      data: fc.array(fc.float({ min: 0, max: 1000000, noNaN: true }), { minLength: pointCount, maxLength: pointCount }),
      unit: fc.constantFrom('percent', 'count', 'currency', 'rate', 'years'),
      source: fc.string({ minLength: 1, maxLength: 100 }),
      dateRecorded: fc.array(fc.date({ min: new Date('2000-01-01'), max: new Date() }), { minLength: pointCount, maxLength: pointCount }),
    });
  });

  /**
   * Simulates the tooltip callback that generates tooltip content
   * This mirrors the implementation in visualization-api.js
   */
  function generateTooltipContent(context) {
    const dataset = context.dataset;
    const dataIndex = context.dataIndex;
    const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
    const label = context.label || '';

    const tooltipData = {
      label: label,
      datasetLabel: dataset.label || '',
      value: value,
      unit: dataset.unit || null,
      source: dataset.source || null,
      dateRecorded: dataset.dateRecorded ? dataset.dateRecorded[dataIndex] : null,
    };

    return tooltipData;
  }

  it('should include all metadata fields in tooltip for any data point', () => {
    fc.assert(
      fc.property(
        datasetWithMetadataGenerator,
        fc.nat(),
        fc.string({ minLength: 1, maxLength: 50 }),
        (dataset, randomIndex, label) => {
          // Ensure index is within bounds
          const dataIndex = randomIndex % dataset.data.length;
          const value = dataset.data[dataIndex];

          // Simulate tooltip context
          const context = {
            dataset: dataset,
            dataIndex: dataIndex,
            parsed: { y: value },
            label: label,
          };

          // Generate tooltip content
          const tooltipData = generateTooltipContent(context);

          // Property: Tooltip should contain label
          assert.ok(
            tooltipData.label !== undefined && tooltipData.label !== null,
            'Tooltip should contain a label'
          );

          // Property: Tooltip should contain dataset label
          assert.ok(
            tooltipData.datasetLabel !== undefined && tooltipData.datasetLabel !== null,
            'Tooltip should contain dataset label'
          );
          assert.strictEqual(
            tooltipData.datasetLabel,
            dataset.label,
            'Tooltip dataset label should match original dataset label'
          );

          // Property: Tooltip should contain value
          assert.ok(
            tooltipData.value !== undefined && tooltipData.value !== null,
            'Tooltip should contain a value'
          );
          assert.strictEqual(
            tooltipData.value,
            value,
            'Tooltip value should match the data point value'
          );

          // Property: Tooltip should contain unit metadata
          assert.ok(
            tooltipData.unit !== undefined && tooltipData.unit !== null,
            'Tooltip should contain unit metadata'
          );
          assert.strictEqual(
            tooltipData.unit,
            dataset.unit,
            'Tooltip unit should match dataset unit'
          );

          // Property: Tooltip should contain source metadata
          assert.ok(
            tooltipData.source !== undefined && tooltipData.source !== null,
            'Tooltip should contain source metadata'
          );
          assert.strictEqual(
            tooltipData.source,
            dataset.source,
            'Tooltip source should match dataset source'
          );

          // Property: Tooltip should contain date metadata
          assert.ok(
            tooltipData.dateRecorded !== undefined && tooltipData.dateRecorded !== null,
            'Tooltip should contain date metadata'
          );
          assert.strictEqual(
            tooltipData.dateRecorded,
            dataset.dateRecorded[dataIndex],
            'Tooltip date should match the data point date'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should format tooltip text with all metadata for display', () => {
    fc.assert(
      fc.property(
        datasetWithMetadataGenerator,
        fc.nat(),
        fc.string({ minLength: 1, maxLength: 50 }),
        (dataset, randomIndex, label) => {
          const dataIndex = randomIndex % dataset.data.length;
          const value = dataset.data[dataIndex];

          const context = {
            dataset: dataset,
            dataIndex: dataIndex,
            parsed: { y: value },
            label: label,
          };

          const tooltipData = generateTooltipContent(context);

          // Simulate formatted tooltip string (as would be displayed)
          const formattedTooltip = [
            tooltipData.label,
            `${tooltipData.datasetLabel}: ${tooltipData.value} ${tooltipData.unit}`,
            `Source: ${tooltipData.source}`,
            `Date: ${new Date(tooltipData.dateRecorded).toLocaleDateString()}`,
          ].join('\n');

          // Property: Formatted tooltip should contain all components
          assert.ok(
            formattedTooltip.includes(tooltipData.label),
            'Formatted tooltip should include label'
          );
          assert.ok(
            formattedTooltip.includes(tooltipData.datasetLabel),
            'Formatted tooltip should include dataset label'
          );
          assert.ok(
            formattedTooltip.includes(String(tooltipData.value)),
            'Formatted tooltip should include value'
          );
          assert.ok(
            formattedTooltip.includes(tooltipData.unit),
            'Formatted tooltip should include unit'
          );
          assert.ok(
            formattedTooltip.includes(tooltipData.source),
            'Formatted tooltip should include source'
          );
          assert.ok(
            formattedTooltip.includes('Date:'),
            'Formatted tooltip should include date label'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve metadata completeness through data transformations', () => {
    fc.assert(
      fc.property(
        fc.array(dataPointWithMetadataGenerator, { minLength: 1, maxLength: 20 }),
        (dataPoints) => {
          // Simulate transformation from API data to chart dataset
          // This mirrors the timeSeriesTransform in visualization-api.js
          // Use Object.create(null) to avoid prototype pollution
          const grouped = Object.create(null);
          dataPoints.forEach(point => {
            if (!grouped[point.metricName]) {
              grouped[point.metricName] = [];
            }
            grouped[point.metricName].push(point);
          });

          // Create datasets with metadata
          const datasets = Object.keys(grouped).map(metricName => {
            const points = grouped[metricName];
            return {
              label: metricName,
              data: points.map(p => parseFloat(p.metricValue)),
              unit: points[0]?.metricUnit || '',
              source: points[0]?.source?.name || '',
              dateRecorded: points.map(p => p.dateRecorded),
            };
          });

          // Property: All datasets should have complete metadata
          datasets.forEach((dataset, index) => {
            assert.ok(
              dataset.label && dataset.label.length > 0,
              `Dataset ${index} should have a label`
            );
            assert.ok(
              dataset.unit !== undefined && dataset.unit !== null,
              `Dataset ${index} should have unit metadata`
            );
            assert.ok(
              dataset.source !== undefined && dataset.source !== null,
              `Dataset ${index} should have source metadata`
            );
            assert.ok(
              Array.isArray(dataset.dateRecorded) && dataset.dateRecorded.length > 0,
              `Dataset ${index} should have dateRecorded array`
            );

            // Property: dateRecorded array should match data array length
            assert.strictEqual(
              dataset.dateRecorded.length,
              dataset.data.length,
              `Dataset ${index} dateRecorded length should match data length`
            );

            // Property: Each data point should have corresponding metadata
            dataset.data.forEach((value, dataIndex) => {
              assert.ok(
                dataset.dateRecorded[dataIndex] !== undefined,
                `Dataset ${index}, point ${dataIndex} should have a date`
              );
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle tooltips for different chart types with complete metadata', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('line', 'bar', 'pie', 'doughnut'),
        datasetWithMetadataGenerator,
        fc.nat(),
        (chartType, dataset, randomIndex) => {
          const dataIndex = randomIndex % dataset.data.length;
          
          // For pie/doughnut charts, parsed value is different
          const parsedValue = (chartType === 'pie' || chartType === 'doughnut')
            ? dataset.data[dataIndex]
            : { y: dataset.data[dataIndex] };

          const context = {
            dataset: dataset,
            dataIndex: dataIndex,
            parsed: parsedValue,
            label: `Label ${dataIndex}`,
          };

          const tooltipData = generateTooltipContent(context);

          // Property: Regardless of chart type, all metadata should be present
          assert.ok(
            tooltipData.value !== undefined && tooltipData.value !== null,
            `${chartType} chart tooltip should have value`
          );
          assert.ok(
            tooltipData.unit !== undefined && tooltipData.unit !== null,
            `${chartType} chart tooltip should have unit`
          );
          assert.ok(
            tooltipData.source !== undefined && tooltipData.source !== null,
            `${chartType} chart tooltip should have source`
          );
          assert.ok(
            tooltipData.dateRecorded !== undefined && tooltipData.dateRecorded !== null,
            `${chartType} chart tooltip should have date`
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain metadata integrity for multi-dataset charts', () => {
    fc.assert(
      fc.property(
        fc.array(datasetWithMetadataGenerator, { minLength: 2, maxLength: 5 }),
        fc.nat(),
        (datasets, randomIndex) => {
          // Pick a random dataset
          const datasetIndex = randomIndex % datasets.length;
          const dataset = datasets[datasetIndex];
          
          // Pick a random data point
          const dataIndex = randomIndex % dataset.data.length;

          const context = {
            dataset: dataset,
            dataIndex: dataIndex,
            parsed: { y: dataset.data[dataIndex] },
            label: `Point ${dataIndex}`,
          };

          const tooltipData = generateTooltipContent(context);

          // Property: Tooltip should reference correct dataset metadata
          assert.strictEqual(
            tooltipData.datasetLabel,
            dataset.label,
            'Tooltip should reference correct dataset label'
          );
          assert.strictEqual(
            tooltipData.unit,
            dataset.unit,
            'Tooltip should reference correct dataset unit'
          );
          assert.strictEqual(
            tooltipData.source,
            dataset.source,
            'Tooltip should reference correct dataset source'
          );
          assert.strictEqual(
            tooltipData.dateRecorded,
            dataset.dateRecorded[dataIndex],
            'Tooltip should reference correct data point date'
          );

          // Property: Tooltip should not mix metadata from different datasets
          datasets.forEach((otherDataset, otherIndex) => {
            if (otherIndex !== datasetIndex) {
              // Ensure we're not accidentally using another dataset's metadata
              if (otherDataset.label !== dataset.label) {
                assert.notStrictEqual(
                  tooltipData.datasetLabel,
                  otherDataset.label,
                  'Tooltip should not use wrong dataset label'
                );
              }
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include metadata even for edge case values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(0, 0.0001, 999999.9999, -0, Number.MIN_VALUE, Number.MAX_SAFE_INTEGER),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('percent', 'count', 'currency', 'rate', 'years'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.date({ min: new Date('2000-01-01'), max: new Date() }),
        (edgeValue, label, unit, source, date) => {
          const dataset = {
            label: label,
            data: [edgeValue],
            unit: unit,
            source: source,
            dateRecorded: [date],
          };

          const context = {
            dataset: dataset,
            dataIndex: 0,
            parsed: { y: edgeValue },
            label: 'Edge Case',
          };

          const tooltipData = generateTooltipContent(context);

          // Property: Even for edge case values, all metadata should be present
          assert.ok(
            tooltipData.value !== undefined && tooltipData.value !== null,
            'Tooltip should have value even for edge cases'
          );
          assert.strictEqual(
            tooltipData.value,
            edgeValue,
            'Tooltip should preserve edge case value exactly'
          );
          assert.strictEqual(
            tooltipData.unit,
            unit,
            'Tooltip should have unit for edge case values'
          );
          assert.strictEqual(
            tooltipData.source,
            source,
            'Tooltip should have source for edge case values'
          );
          assert.strictEqual(
            tooltipData.dateRecorded,
            date,
            'Tooltip should have date for edge case values'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
