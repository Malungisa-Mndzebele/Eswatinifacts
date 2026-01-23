// Culture Page - Enhanced Chart Initialization with API Integration

document.addEventListener('DOMContentLoaded', async function() {
  if (typeof Chart === 'undefined' || typeof EnhancedChartCreator === 'undefined') {
    console.error('Required libraries not loaded');
    return;
  }

  // Initialize date range filter
  const dateFilter = new DateRangeFilter('cultureDateFilter', async (filters) => {
    await refreshCultureCharts(filters);
  });

  // Initial chart load
  await initializeCultureCharts();
});

/**
 * Initialize all culture charts
 */
async function initializeCultureCharts(filters = {}) {
  // Population Distribution Chart
  await EnhancedChartCreator.createChart({
    canvasId: 'populationChart',
    category: 'culture',
    chartType: 'doughnut',
    filters: {
      subcategory: 'Population Distribution',
      ...filters,
    },
    dataTransform: (apiData) => {
      if (!apiData.dataPoints || apiData.dataPoints.length === 0) {
        return getFallbackPopulationData();
      }
      return DataTransformers.pieChartTransform(apiData);
    },
    chartOptions: {
      plugins: {
        title: {
          display: true,
          text: 'Population Distribution by Age',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
          },
        },
      },
      cutout: '60%',
    },
  });
}

/**
 * Refresh charts with new filters
 */
async function refreshCultureCharts(filters) {
  if (window.chartInstances) {
    const populationChart = window.chartInstances.get('populationChart');
    if (populationChart) populationChart.destroy();
  }

  await initializeCultureCharts(filters);
}

/**
 * Fallback data for population chart
 */
function getFallbackPopulationData() {
  return {
    labels: ['0-14 years', '15-64 years', '65+ years'],
    datasets: [
      {
        data: [35.2, 60.8, 4.0],
        backgroundColor: ['#10b981', '#2563eb', '#f59e0b'],
        borderWidth: 2,
        borderColor: '#fff',
        unit: '%',
        source: 'World Bank',
      },
    ],
  };
}
