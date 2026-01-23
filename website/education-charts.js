// Education Page - Enhanced Chart Initialization with API Integration

document.addEventListener('DOMContentLoaded', async function() {
  if (typeof Chart === 'undefined' || typeof EnhancedChartCreator === 'undefined') {
    console.error('Required libraries not loaded');
    return;
  }

  // Initialize date range filter
  const dateFilter = new DateRangeFilter('educationDateFilter', async (filters) => {
    await refreshEducationCharts(filters);
  });

  // Initial chart load
  await initializeEducationCharts();
});

/**
 * Initialize all education charts
 */
async function initializeEducationCharts(filters = {}) {
  // Education Enrollment Chart
  await EnhancedChartCreator.createChart({
    canvasId: 'educationChart',
    category: 'education',
    chartType: 'bar',
    filters: {
      subcategory: 'Enrollment Rates',
      ...filters,
    },
    dataTransform: (apiData) => {
      if (!apiData.dataPoints || apiData.dataPoints.length === 0) {
        return getFallbackEducationData();
      }
      return DataTransformers.barChartTransform(apiData);
    },
    chartOptions: {
      plugins: {
        title: {
          display: true,
          text: 'Education Enrollment Rates (2024)',
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
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Enrollment Rate (%)',
          },
        },
      },
    },
  });
}

/**
 * Refresh charts with new filters
 */
async function refreshEducationCharts(filters) {
  if (window.chartInstances) {
    const educationChart = window.chartInstances.get('educationChart');
    if (educationChart) educationChart.destroy();
  }

  await initializeEducationCharts(filters);
}

/**
 * Fallback data for education chart
 */
function getFallbackEducationData() {
  return {
    labels: ['Primary', 'Secondary', 'Tertiary'],
    datasets: [
      {
        label: 'Enrollment Rate (%)',
        data: [99.7, 72.4, 15.6],
        backgroundColor: ['#10b981', '#2563eb', '#1e3a8a'],
        borderWidth: 1,
        unit: '%',
        source: 'UNESCO',
      },
    ],
  };
}
