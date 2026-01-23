/**
 * Eswatini Facts - Chart Visualizations
 */

import { logger, THEME } from './utils.js';

// Chart Initialization
export function initializeCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        logger.warn('Chart.js not loaded. Charts will not be initialized.');
        return;
    }

    // GDP Growth Chart
    createGDPChart();

    // Economic Structure Chart
    createSectorChart();

    // HIV Prevalence Chart
    createHIVChart();

    // Health Comparison Chart
    createHealthComparisonChart();

    // Education Chart
    createEducationChart();
}

// GDP Growth Trend Chart
function createGDPChart() {
    const ctx = document.getElementById('gdpChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['2020', '2021', '2022', '2023', '2024'],
            datasets: [{
                label: 'Eswatini GDP Growth (%)',
                data: [0.5, 3.2, 2.8, 4.8, 4.9],
                borderColor: THEME.primary,
                backgroundColor: 'rgba(30, 58, 138, 0.12)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }, {
                label: 'Regional Average (%)',
                data: [1.2, 2.8, 3.1, 3.8, 3.9],
                borderColor: THEME.blue,
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'GDP Growth Rate Comparison',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Growth Rate (%)',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Year',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Economic Structure Pie Chart
function createSectorChart() {
    const ctx = document.getElementById('sectorChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Services', 'Industry', 'Agriculture'],
            datasets: [{
                data: [53.5, 33.0, 8.1],
                backgroundColor: [THEME.primary, THEME.blue, THEME.green],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'GDP Composition by Sector (2024)',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// HIV Prevalence Trend Chart
function createHIVChart() {
    const ctx = document.getElementById('hivChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['2020', '2021', '2022', '2023', '2024'],
            datasets: [{
                label: 'HIV Prevalence (%)',
                data: [27.2, 26.8, 26.4, 26.0, 25.6],
                borderColor: THEME.primary,
                backgroundColor: 'rgba(30, 58, 138, 0.12)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'HIV Prevalence Trend (Adults 15-49)',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 20,
                    max: 30,
                    title: {
                        display: true,
                        text: 'Prevalence (%)',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Year',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Health Outcomes Comparison Chart
function createHealthComparisonChart() {
    const ctx = document.getElementById('healthComparisonChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Eswatini', 'South Africa', 'Botswana', 'Namibia', 'Lesotho'],
            datasets: [{
                label: 'Life Expectancy (years)',
                data: [59.0, 64.2, 69.3, 63.4, 54.3],
                backgroundColor: [THEME.primary, THEME.blue, THEME.green, THEME.orange, THEME.purple],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Life Expectancy Comparison',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 50,
                    max: 75,
                    title: {
                        display: true,
                        text: 'Life Expectancy (years)',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Education Enrollment Chart
function createEducationChart() {
    const ctx = document.getElementById('educationChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Primary', 'Secondary', 'Tertiary'],
            datasets: [{
                label: 'Enrollment Rate (%)',
                data: [99.7, 72.4, 15.6],
                backgroundColor: [THEME.green, THEME.blue, THEME.primary],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Education Enrollment Rates (2024)',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Enrollment Rate (%)',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}
