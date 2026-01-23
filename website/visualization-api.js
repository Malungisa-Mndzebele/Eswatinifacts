// Eswatini Facts - Enhanced Visualization API Integration
// This module handles API integration for interactive data visualizations

// API Configuration
const API_CONFIG = {
  baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : 'https://eswatinifacts.com/api',
  version: 'v1',
  timeout: 10000, // 10 seconds
};

// Chart instances storage for updates and legend toggle
const chartInstances = new Map();

// Loading state management
class LoadingManager {
  static show(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chart-loading-overlay';
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <p>Loading data...</p>
    `;
    container.appendChild(loadingDiv);
  }

  static hide(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const loadingDiv = container.querySelector('.chart-loading-overlay');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  static showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'chart-error-overlay';
    errorDiv.innerHTML = `
      <div class="error-icon">⚠️</div>
      <p>${message}</p>
      <button class="retry-btn" onclick="location.reload()">Retry</button>
    `;
    container.appendChild(errorDiv);
  }
}

// API Client
class DataAPI {
  static async fetchData(category, filters = {}) {
    const url = new URL(`${API_CONFIG.baseURL}/data/${category}`);
    
    // Add query parameters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        url.searchParams.append(key, filters[key]);
      }
    });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(API_CONFIG.timeout),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'API request failed');
      }

      return data.data;
    } catch (error) {
      console.error(`Failed to fetch ${category} data:`, error);
      throw error;
    }
  }
}

// Enhanced Chart Creator with API Integration
class EnhancedChartCreator {
  /**
   * Create a chart with API data
   */
  static async createChart(config) {
    const {
      canvasId,
      category,
      chartType,
      filters = {},
      chartOptions = {},
      dataTransform,
    } = config;

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas element ${canvasId} not found`);
      return null;
    }

    const containerId = canvas.closest('.chart-container')?.id || canvasId + '-container';

    try {
      // Show loading state
      LoadingManager.show(containerId);

      // Fetch data from API
      const apiData = await DataAPI.fetchData(category, filters);

      // Transform data for chart
      const chartData = dataTransform ? dataTransform(apiData) : apiData;

      // Hide loading state
      LoadingManager.hide(containerId);

      // Create chart
      const chart = this.renderChart(canvas, chartType, chartData, chartOptions);

      // Store chart instance
      chartInstances.set(canvasId, chart);

      // Add legend toggle functionality
      this.addLegendToggle(chart, canvasId);

      // Add responsive behavior
      this.makeResponsive(chart, canvas);

      return chart;
    } catch (error) {
      LoadingManager.hide(containerId);
      LoadingManager.showError(containerId, 'Failed to load chart data. Please try again.');
      console.error('Chart creation error:', error);
      return null;
    }
  }

  /**
   * Render chart with Chart.js
   */
  static renderChart(canvas, type, data, options) {
    const ctx = canvas.getContext('2d');

    // Enhanced default options
    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: {
              size: 12,
              family: 'Inter, sans-serif',
            },
            padding: 15,
            usePointStyle: true,
          },
          onClick: (e, legendItem, legend) => {
            // Custom legend click handler for state preservation
            const index = legendItem.datasetIndex;
            const chart = legend.chart;
            const meta = chart.getDatasetMeta(index);

            // Toggle visibility
            meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;

            // Save state to localStorage
            this.saveLegendState(chart.canvas.id, index, meta.hidden);

            chart.update();
          },
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: {
            size: 14,
            family: 'Inter, sans-serif',
          },
          bodyFont: {
            size: 13,
            family: 'Inter, sans-serif',
          },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            // Enhanced tooltip with metadata
            title: (tooltipItems) => {
              return tooltipItems[0].label || '';
            },
            label: (context) => {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y;
                if (context.dataset.unit) {
                  label += ' ' + context.dataset.unit;
                }
              }
              return label;
            },
            afterLabel: (context) => {
              // Add source and date metadata
              const dataset = context.dataset;
              const metadata = [];
              
              if (dataset.source) {
                metadata.push(`Source: ${dataset.source}`);
              }
              
              if (dataset.dateRecorded) {
                const date = new Date(dataset.dateRecorded);
                metadata.push(`Date: ${date.toLocaleDateString()}`);
              }

              return metadata.length > 0 ? '\n' + metadata.join('\n') : '';
            },
          },
        },
      },
      scales: type !== 'pie' && type !== 'doughnut' ? {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 11,
              family: 'Inter, sans-serif',
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
        },
        x: {
          ticks: {
            font: {
              size: 11,
              family: 'Inter, sans-serif',
            },
          },
          grid: {
            display: false,
          },
        },
      } : undefined,
    };

    // Merge options
    const mergedOptions = this.deepMerge(defaultOptions, options);

    // Create chart
    const chart = new Chart(ctx, {
      type: type,
      data: data,
      options: mergedOptions,
    });

    // Restore legend state
    this.restoreLegendState(canvas.id, chart);

    return chart;
  }

  /**
   * Add legend toggle functionality with state preservation
   */
  static addLegendToggle(chart, canvasId) {
    // Legend toggle is handled in the onClick callback above
    // This method can be used for additional legend functionality
  }

  /**
   * Save legend state to localStorage
   */
  static saveLegendState(canvasId, datasetIndex, hidden) {
    const key = `chart_legend_${canvasId}`;
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    state[datasetIndex] = hidden;
    localStorage.setItem(key, JSON.stringify(state));
  }

  /**
   * Restore legend state from localStorage
   */
  static restoreLegendState(canvasId, chart) {
    const key = `chart_legend_${canvasId}`;
    const state = JSON.parse(localStorage.getItem(key) || '{}');

    Object.keys(state).forEach(index => {
      const meta = chart.getDatasetMeta(parseInt(index));
      if (meta) {
        meta.hidden = state[index];
      }
    });

    chart.update('none'); // Update without animation
  }

  /**
   * Make chart responsive
   */
  static makeResponsive(chart, canvas) {
    // Handle window resize with debouncing
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        chart.resize();
      }, 250);
    });

    resizeObserver.observe(canvas.parentElement);
  }

  /**
   * Deep merge objects
   */
  static deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

// Date Range Filter Component
class DateRangeFilter {
  constructor(containerId, onFilterChange) {
    this.container = document.getElementById(containerId);
    this.onFilterChange = onFilterChange;
    this.render();
  }

  render() {
    if (!this.container) return;

    const filterHTML = `
      <div class="date-range-filter">
        <label for="startDate">From:</label>
        <input type="date" id="startDate" class="date-input">
        
        <label for="endDate">To:</label>
        <input type="date" id="endDate" class="date-input">
        
        <button class="filter-apply-btn" id="applyFilter">Apply</button>
        <button class="filter-reset-btn" id="resetFilter">Reset</button>
      </div>
    `;

    this.container.innerHTML = filterHTML;

    // Add event listeners
    document.getElementById('applyFilter').addEventListener('click', () => {
      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;
      
      if (this.onFilterChange) {
        this.onFilterChange({ startDate, endDate });
      }
    });

    document.getElementById('resetFilter').addEventListener('click', () => {
      document.getElementById('startDate').value = '';
      document.getElementById('endDate').value = '';
      
      if (this.onFilterChange) {
        this.onFilterChange({ startDate: null, endDate: null });
      }
    });
  }
}

// Data Transformers
const DataTransformers = {
  /**
   * Transform API data for time series chart
   */
  timeSeriesTransform(apiData) {
    const dataPoints = apiData.dataPoints || [];
    
    // Group by metric name
    const grouped = {};
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

    // Create datasets
    const labels = grouped[Object.keys(grouped)[0]]?.map(p => 
      new Date(p.dateRecorded).getFullYear()
    ) || [];

    const datasets = Object.keys(grouped).map((metricName, index) => {
      const points = grouped[metricName];
      const colors = ['#1e3a8a', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
      
      return {
        label: metricName,
        data: points.map(p => parseFloat(p.metricValue)),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        unit: points[0]?.metricUnit || '',
        source: points[0]?.source?.name || '',
        dateRecorded: points.map(p => p.dateRecorded),
      };
    });

    return { labels, datasets };
  },

  /**
   * Transform API data for bar chart
   */
  barChartTransform(apiData) {
    const dataPoints = apiData.dataPoints || [];
    
    const labels = dataPoints.map(p => p.metricName);
    const data = dataPoints.map(p => parseFloat(p.metricValue));
    const colors = ['#10b981', '#2563eb', '#f59e0b', '#8b5cf6', '#1e3a8a'];

    return {
      labels,
      datasets: [{
        label: apiData.category || 'Data',
        data,
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 0,
        unit: dataPoints[0]?.metricUnit || '',
        source: dataPoints[0]?.source?.name || '',
      }],
    };
  },

  /**
   * Transform API data for pie/doughnut chart
   */
  pieChartTransform(apiData) {
    const dataPoints = apiData.dataPoints || [];
    
    const labels = dataPoints.map(p => p.metricName);
    const data = dataPoints.map(p => parseFloat(p.metricValue));
    const colors = ['#1e3a8a', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 2,
        borderColor: '#fff',
        unit: dataPoints[0]?.metricUnit || '',
        source: dataPoints[0]?.source?.name || '',
      }],
    };
  },
};

// Export for use in other scripts
window.EnhancedChartCreator = EnhancedChartCreator;
window.DateRangeFilter = DateRangeFilter;
window.DataTransformers = DataTransformers;
window.chartInstances = chartInstances;
