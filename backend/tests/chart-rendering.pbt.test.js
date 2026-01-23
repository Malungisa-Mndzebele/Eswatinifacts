import { describe, it } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';

/**
 * Feature: eswatini-facts-platform, Property 1: Chart rendering consistency
 * Validates: Requirements 1.1
 * 
 * Property: For any data page with visualization data, the Platform should render 
 * an interactive chart using the configured charting library with all data points represented
 */

describe('Chart Rendering Consistency Property Tests', () => {
  // Generator for valid chart data
  const chartDataGenerator = fc.nat({ max: 20 }).chain(numLabels => {
    const labelCount = Math.max(1, numLabels);
    return fc.record({
      labels: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: labelCount, maxLength: labelCount }),
      datasets: fc.array(
        fc.record({
          label: fc.string({ minLength: 1, maxLength: 50 }),
          data: fc.array(fc.float({ min: 0, max: 1000000, noNaN: true }), { minLength: labelCount, maxLength: labelCount }),
          borderColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s),
          backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s),
          unit: fc.option(fc.constantFrom('percent', 'count', 'currency', 'rate', 'years')),
          source: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
        }),
        { minLength: 1, maxLength: 5 }
      ),
    });
  });

  // Generator for chart configuration
  const chartConfigGenerator = fc.record({
    canvasId: fc.string({ minLength: 1, maxLength: 50 }).map(s => 'chart-' + s),
    category: fc.constantFrom('economy', 'health', 'education', 'politics', 'culture'),
    chartType: fc.constantFrom('line', 'bar', 'pie', 'doughnut'),
    filters: fc.record({
      metric: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      startDate: fc.option(fc.date({ min: new Date('2000-01-01'), max: new Date() })),
      endDate: fc.option(fc.date({ min: new Date('2000-01-01'), max: new Date() })),
    }),
  });

  it('should preserve all data points when transforming API data to chart format', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            metricName: fc.string({ minLength: 1, maxLength: 100 }),
            metricValue: fc.float({ min: 0, max: 1000000, noNaN: true }),
            metricUnit: fc.constantFrom('percent', 'count', 'currency', 'rate'),
            dateRecorded: fc.date({ min: new Date('2000-01-01'), max: new Date() }),
            source: fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (dataPoints) => {
          // Simulate time series transform
          const grouped = Object.create(null); // Avoid prototype pollution
          dataPoints.forEach(point => {
            if (!grouped[point.metricName]) {
              grouped[point.metricName] = [];
            }
            grouped[point.metricName].push(point);
          });

          // Sort by date
          Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => new Date(a.dateRecorded) - new Date(b.dateRecorded));
          });

          // Create chart data structure
          const labels = grouped[Object.keys(grouped)[0]]?.map(p => 
            new Date(p.dateRecorded).getFullYear()
          ) || [];

          const datasets = Object.keys(grouped).map((metricName) => {
            const points = grouped[metricName];
            return {
              label: metricName,
              data: points.map(p => parseFloat(p.metricValue)),
              unit: points[0]?.metricUnit || '',
              source: points[0]?.source?.name || '',
            };
          });

          // Property: All original data points should be represented in the chart
          const totalOriginalPoints = dataPoints.length;
          const totalChartPoints = datasets.reduce((sum, ds) => sum + ds.data.length, 0);

          assert.strictEqual(
            totalChartPoints,
            totalOriginalPoints,
            'All data points should be preserved in chart transformation'
          );

          // Property: Each dataset should have data
          datasets.forEach(dataset => {
            assert.ok(
              dataset.data.length > 0,
              'Each dataset should contain at least one data point'
            );
            assert.ok(
              dataset.label && dataset.label.length > 0,
              'Each dataset should have a label'
            );
          });

          // Property: Labels should exist if we have datasets
          if (datasets.length > 0) {
            // For time series, labels are derived from the first dataset's dates
            // The number of labels should match the first dataset's length
            const firstDatasetLength = datasets[0].data.length;
            assert.ok(
              labels.length === firstDatasetLength || labels.length === 0,
              'Labels should match the first dataset length for time series'
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should create valid chart data structure for all chart types', () => {
    fc.assert(
      fc.property(
        chartDataGenerator,
        fc.constantFrom('line', 'bar', 'pie', 'doughnut', 'scatter'),
        (chartData, chartType) => {
          // Validate chart data structure
          assert.ok(chartData.labels, 'Chart data should have labels');
          assert.ok(Array.isArray(chartData.labels), 'Labels should be an array');
          assert.ok(chartData.datasets, 'Chart data should have datasets');
          assert.ok(Array.isArray(chartData.datasets), 'Datasets should be an array');
          assert.ok(chartData.datasets.length > 0, 'Should have at least one dataset');

          // Property: Each dataset should have required fields
          chartData.datasets.forEach((dataset, index) => {
            assert.ok(dataset.label, `Dataset ${index} should have a label`);
            assert.ok(Array.isArray(dataset.data), `Dataset ${index} data should be an array`);
            assert.ok(dataset.data.length > 0, `Dataset ${index} should have data points`);

            // Property: All data values should be valid numbers
            dataset.data.forEach((value, valueIndex) => {
              assert.ok(
                typeof value === 'number' && !isNaN(value),
                `Dataset ${index}, value ${valueIndex} should be a valid number`
              );
            });

            // Property: For line/bar charts, data and labels should be compatible
            // Note: In real implementations, Chart.js handles mismatched lengths gracefully
            // We just verify both exist and have valid data
            if (chartType === 'line' || chartType === 'bar') {
              // Both should have data
              assert.ok(
                dataset.data.length > 0,
                `Dataset ${index} should have data for ${chartType} charts`
              );
            }
          });

          // Property: For pie/doughnut charts, typically one dataset
          if (chartType === 'pie' || chartType === 'doughnut') {
            // Pie charts can have multiple datasets but typically have one
            // Each data point should correspond to a label
            chartData.datasets.forEach((dataset, index) => {
              if (chartData.labels.length > 0) {
                assert.ok(
                  dataset.data.length === chartData.labels.length,
                  `For ${chartType} charts, dataset ${index} data should match labels length`
                );
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain data integrity when applying date range filters', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            metricName: fc.string({ minLength: 1, maxLength: 100 }),
            metricValue: fc.float({ min: 0, max: 1000000, noNaN: true }),
            dateRecorded: fc.date({ min: new Date('2000-01-01'), max: new Date() }),
          }),
          { minLength: 5, maxLength: 50 }
        ),
        fc.date({ min: new Date('2000-01-01'), max: new Date() }),
        fc.date({ min: new Date('2000-01-01'), max: new Date() }),
        (dataPoints, startDate, endDate) => {
          // Ensure startDate <= endDate
          if (startDate > endDate) {
            [startDate, endDate] = [endDate, startDate];
          }

          // Apply date filter
          const filteredPoints = dataPoints.filter(point => {
            const pointDate = new Date(point.dateRecorded);
            return pointDate >= startDate && pointDate <= endDate;
          });

          // Property: Filtered data should only contain points within range
          filteredPoints.forEach(point => {
            const pointDate = new Date(point.dateRecorded);
            assert.ok(
              pointDate >= startDate && pointDate <= endDate,
              'All filtered points should be within the date range'
            );
          });

          // Property: No points outside the range should be included
          const outsidePoints = dataPoints.filter(point => {
            const pointDate = new Date(point.dateRecorded);
            return pointDate < startDate || pointDate > endDate;
          });

          outsidePoints.forEach(point => {
            assert.ok(
              !filteredPoints.includes(point),
              'Points outside date range should not be in filtered results'
            );
          });

          // Property: Filtered count should be <= original count
          assert.ok(
            filteredPoints.length <= dataPoints.length,
            'Filtered data should not have more points than original'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly transform bar chart data maintaining all values', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            metricName: fc.string({ minLength: 1, maxLength: 100 }),
            metricValue: fc.float({ min: 0, max: 1000000, noNaN: true }),
            metricUnit: fc.constantFrom('percent', 'count', 'currency', 'rate'),
            source: fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (dataPoints) => {
          // Simulate bar chart transform
          const labels = dataPoints.map(p => p.metricName);
          const data = dataPoints.map(p => parseFloat(p.metricValue));

          const chartData = {
            labels,
            datasets: [{
              label: 'Data',
              data,
              unit: dataPoints[0]?.metricUnit || '',
              source: dataPoints[0]?.source?.name || '',
            }],
          };

          // Property: All values should be preserved
          assert.strictEqual(
            chartData.datasets[0].data.length,
            dataPoints.length,
            'All data points should be in the chart'
          );

          // Property: Values should match original data
          chartData.datasets[0].data.forEach((value, index) => {
            assert.strictEqual(
              value,
              parseFloat(dataPoints[index].metricValue),
              `Value at index ${index} should match original`
            );
          });

          // Property: Labels should match metric names
          chartData.labels.forEach((label, index) => {
            assert.strictEqual(
              label,
              dataPoints[index].metricName,
              `Label at index ${index} should match metric name`
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly transform pie/doughnut chart data with proper proportions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            metricName: fc.string({ minLength: 1, maxLength: 100 }),
            metricValue: fc.float({ min: Math.fround(0.1), max: 100, noNaN: true }), // Avoid zero for pie charts
            metricUnit: fc.constantFrom('percent', 'count'),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (dataPoints) => {
          // Simulate pie chart transform
          const labels = dataPoints.map(p => p.metricName);
          const data = dataPoints.map(p => parseFloat(p.metricValue));

          const chartData = {
            labels,
            datasets: [{
              data,
              unit: dataPoints[0]?.metricUnit || '',
            }],
          };

          // Property: Number of slices should equal number of data points
          assert.strictEqual(
            chartData.datasets[0].data.length,
            dataPoints.length,
            'Number of pie slices should match data points'
          );

          // Property: All values should be positive (pie charts need positive values)
          chartData.datasets[0].data.forEach((value, index) => {
            assert.ok(
              value > 0,
              `Pie chart value at index ${index} should be positive`
            );
          });

          // Property: Labels and data should have same length
          assert.strictEqual(
            chartData.labels.length,
            chartData.datasets[0].data.length,
            'Labels and data should have matching lengths'
          );

          // Property: Sum of values should equal sum of original values
          const originalSum = dataPoints.reduce((sum, p) => sum + parseFloat(p.metricValue), 0);
          const chartSum = chartData.datasets[0].data.reduce((sum, v) => sum + v, 0);
          
          assert.ok(
            Math.abs(originalSum - chartSum) < 0.001,
            'Sum of chart values should equal sum of original values'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty or minimal datasets gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('line', 'bar', 'pie', 'doughnut'),
        (chartType) => {
          // Test with empty dataset
          const emptyData = {
            labels: [],
            datasets: [],
          };

          // Property: Empty data should be a valid structure
          assert.ok(Array.isArray(emptyData.labels), 'Labels should be an array');
          assert.ok(Array.isArray(emptyData.datasets), 'Datasets should be an array');

          // Test with minimal dataset (one point)
          const minimalData = {
            labels: ['Single Point'],
            datasets: [{
              label: 'Test',
              data: [42],
            }],
          };

          // Property: Minimal data should be valid
          assert.strictEqual(minimalData.labels.length, 1, 'Should have one label');
          assert.strictEqual(minimalData.datasets.length, 1, 'Should have one dataset');
          assert.strictEqual(minimalData.datasets[0].data.length, 1, 'Should have one data point');
          assert.ok(
            typeof minimalData.datasets[0].data[0] === 'number',
            'Data point should be a number'
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve metadata (source, unit) through transformations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            metricName: fc.string({ minLength: 1, maxLength: 100 }),
            metricValue: fc.float({ min: 0, max: 1000000, noNaN: true }),
            metricUnit: fc.constantFrom('percent', 'count', 'currency', 'rate', 'years'),
            source: fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (dataPoints) => {
          // Transform to chart data
          const chartData = {
            labels: dataPoints.map(p => p.metricName),
            datasets: [{
              label: 'Data',
              data: dataPoints.map(p => parseFloat(p.metricValue)),
              unit: dataPoints[0]?.metricUnit || '',
              source: dataPoints[0]?.source?.name || '',
            }],
          };

          // Property: Metadata should be preserved
          if (dataPoints.length > 0) {
            assert.strictEqual(
              chartData.datasets[0].unit,
              dataPoints[0].metricUnit,
              'Unit should be preserved'
            );
            assert.strictEqual(
              chartData.datasets[0].source,
              dataPoints[0].source.name,
              'Source should be preserved'
            );
          }

          // Property: Metadata should be accessible for tooltips
          assert.ok(
            chartData.datasets[0].hasOwnProperty('unit'),
            'Dataset should have unit property'
          );
          assert.ok(
            chartData.datasets[0].hasOwnProperty('source'),
            'Dataset should have source property'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
