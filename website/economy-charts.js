// Economy Page - Enhanced Chart Initialization with API Integration

document.addEventListener('DOMContentLoaded', async function() {
  // Check if Chart.js and EnhancedChartCreator are loaded
  if (typeof Chart === 'undefined' || typeof EnhancedChartCreator === 'undefined') {
    console.error('Required libraries not loaded');
    return;
  }

  // Initialize date range filter for economy page
  const dateFilter = new DateRangeFilter('economyDateFilter', async (filters) => {
    await refreshEconomyCharts(filters);
  });

  // Initial chart load
  await initializeEconomyCharts();
});

/**
 * Initialize all economy charts
 */
async function initializeEconomyCharts(filters = {}) {
  // GDP Growth Chart
  await EnhancedChartCreator.createChart({
    canvasId: 'gdpChart',
    category: 'economy',
    chartType: 'line',
    filters: {
      metric: 'GDP Growth Rate',
      ...filters,
    },
    dataTransform: (apiData) => {
      // If API returns no data, use fallback static data
      if (!apiData.dataPoints || apiData.dataPoints.length === 0) {
        return getFallbackGDPData();
      }
      return DataTransformers.timeSeriesTransform(apiData);
    },
    chartOptions: {
      plugins: {
        title: {
          display: true,
          text: 'GDP Growth Rate Comparison',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Growth Rate (%)',
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

  // Economic Sector Chart
  await EnhancedChartCreator.createChart({
    canvasId: 'sectorChart',
    category: 'economy',
    chartType: 'doughnut',
    filters: {
      subcategory: 'GDP Composition',
      ...filters,
    },
    dataTransform: (apiData) => {
      // If API returns no data, use fallback static data
      if (!apiData.dataPoints || apiData.dataPoints.length === 0) {
        return getFallbackSectorData();
      }
      return DataTransformers.pieChartTransform(apiData);
    },
    chartOptions: {
      plugins: {
        title: {
          display: true,
          text: 'GDP Composition by Sector (2024)',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: true,
          position: 'bottom',
        },
      },
    },
  });
}

/**
 * Refresh charts with new filters
 */
async function refreshEconomyCharts(filters) {
  // Destroy existing charts
  if (window.chartInstances) {
    const gdpChart = window.chartInstances.get('gdpChart');
    const sectorChart = window.chartInstances.get('sectorChart');
    
    if (gdpChart) gdpChart.destroy();
    if (sectorChart) sectorChart.destroy();
  }

  // Reinitialize with new filters
  await initializeEconomyCharts(filters);
}

/**
 * Fallback data for GDP chart (used when API is unavailable)
 */
function getFallbackGDPData() {
  return {
    labels: ['2020', '2021', '2022', '2023', '2024'],
    datasets: [
      {
        label: 'Eswatini GDP Growth (%)',
        data: [0.5, 3.2, 2.8, 4.8, 4.9],
        borderColor: '#1e3a8a',
        backgroundColor: 'rgba(30, 58, 138, 0.12)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        unit: '%',
        source: 'World Bank',
      },
      {
        label: 'Regional Average (%)',
        data: [1.2, 2.8, 3.1, 3.8, 3.9],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        unit: '%',
        source: 'World Bank',
      },
    ],
  };
}

/**
 * Fallback data for sector chart (used when API is unavailable)
 */
function getFallbackSectorData() {
  return {
    labels: ['Services', 'Industry', 'Agriculture'],
    datasets: [
      {
        data: [53.5, 33.0, 8.1],
        backgroundColor: ['#1e3a8a', '#2563eb', '#10b981'],
        borderWidth: 2,
        borderColor: '#fff',
        unit: '%',
        source: 'World Bank',
      },
    ],
  };
}
