// Health Page - Enhanced Chart Initialization with API Integration

document.addEventListener('DOMContentLoaded', async function() {
  if (typeof Chart === 'undefined' || typeof EnhancedChartCreator === 'undefined') {
    console.error('Required libraries not loaded');
    return;
  }

  // Initialize date range filter
  const dateFilter = new DateRangeFilter('healthDateFilter', async (filters) => {
    await refreshHealthCharts(filters);
  });

  // Initial chart load
  await initializeHealthCharts();
});

/**
 * Initialize all health charts
 */
async function initializeHealthCharts(filters = {}) {
  // HIV Prevalence Chart
  await EnhancedChartCreator.createChart({
    canvasId: 'hivChart',
    category: 'health',
    chartType: 'line',
    filters: {
      metric: 'HIV Prevalence',
      ...filters,
    },
    dataTransform: (apiData) => {
      if (!apiData.dataPoints || apiData.dataPoints.length === 0) {
        return getFallbackHIVData();
      }
      return DataTransformers.timeSeriesTransform(apiData);
    },
    chartOptions: {
      plugins: {
        title: {
          display: true,
          text: 'HIV Prevalence Trend (Adults 15-49)',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 20,
          max: 30,
          title: {
            display: true,
            text: 'Prevalence (%)',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Year',
          },
        },
      },
    },
  });

  // Health Comparison Chart
  await EnhancedChartCreator.createChart({
    canvasId: 'healthComparisonChart',
    category: 'health',
    chartType: 'bar',
    filters: {
      metric: 'Life Expectancy',
      ...filters,
    },
    dataTransform: (apiData) => {
      if (!apiData.dataPoints || apiData.dataPoints.length === 0) {
        return getFallbackHealthComparisonData();
      }
      return DataTransformers.barChartTransform(apiData);
    },
    chartOptions: {
      plugins: {
        title: {
          display: true,
          text: 'Life Expectancy Comparison',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 50,
          max: 75,
          title: {
            display: true,
            text: 'Life Expectancy (years)',
          },
        },
      },
    },
  });
}

/**
 * Refresh charts with new filters
 */
async function refreshHealthCharts(filters) {
  if (window.chartInstances) {
    const hivChart = window.chartInstances.get('hivChart');
    const healthChart = window.chartInstances.get('healthComparisonChart');
    
    if (hivChart) hivChart.destroy();
    if (healthChart) healthChart.destroy();
  }

  await initializeHealthCharts(filters);
}

/**
 * Fallback data for HIV chart
 */
function getFallbackHIVData() {
  return {
    labels: ['2020', '2021', '2022', '2023', '2024'],
    datasets: [
      {
        label: 'HIV Prevalence (%)',
        data: [27.2, 26.8, 26.4, 26.0, 25.6],
        borderColor: '#1e3a8a',
        backgroundColor: 'rgba(30, 58, 138, 0.12)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        unit: '%',
        source: 'UNAIDS',
      },
    ],
  };
}

/**
 * Fallback data for health comparison chart
 */
function getFallbackHealthComparisonData() {
  return {
    labels: ['Eswatini', 'South Africa', 'Botswana', 'Namibia', 'Lesotho'],
    datasets: [
      {
        label: 'Life Expectancy (years)',
        data: [59.0, 64.2, 69.3, 63.4, 54.3],
        backgroundColor: ['#1e3a8a', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'],
        borderWidth: 1,
        unit: 'years',
        source: 'WHO',
      },
    ],
  };
}
