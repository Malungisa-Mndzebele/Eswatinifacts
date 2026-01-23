/**
 * Eswatini Facts - Utility Functions
 */

// Production mode detection
export const IS_DEVELOPMENT = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('dev');

// Logger utility for production-safe logging
export const logger = {
    log: (...args) => IS_DEVELOPMENT && console.log(...args),
    warn: (...args) => IS_DEVELOPMENT && console.warn(...args),
    error: (...args) => console.error(...args), // Always log errors
    info: (...args) => IS_DEVELOPMENT && console.info(...args)
};

export const THEME = {
    primary: '#1e3a8a',
    blue: '#2563eb',
    green: '#2ecc71',
    orange: '#f39c12',
    purple: '#9b59b6',
    grayBorder: '#e1e8ed'
};

// Formatting Functions
export function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

export function formatPercentage(num) {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(num / 100);
}

// Data Export Functions
export function exportChartAsImage(chartId) {
    const canvas = document.getElementById(chartId);
    if (canvas) {
        const link = document.createElement('a');
        link.download = `${chartId}-chart.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
}

export function exportDataAsCSV(data, filename) {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
}

function convertToCSV(data) {
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    return csvContent;
}
