// Eswatini Facts - Interactive Data Visualization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all charts
    initializeCharts();
    
    // Initialize navigation
    initializeNavigation();
    
    // Initialize smooth scrolling
    initializeSmoothScrolling();
    
    // Initialize responsive features
    initializeResponsiveFeatures();
    
    // Initialize enhanced UX features
    initializeEnhancedUX();
});

// Chart Initialization
function initializeCharts() {
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
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }, {
                label: 'Regional Average (%)',
                data: [1.2, 2.8, 3.1, 3.8, 3.9],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
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
                backgroundColor: [
                    '#e74c3c',
                    '#3498db',
                    '#2ecc71'
                ],
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
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
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
                backgroundColor: [
                    '#e74c3c',
                    '#3498db',
                    '#2ecc71',
                    '#f39c12',
                    '#9b59b6'
                ],
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
                backgroundColor: [
                    '#2ecc71',
                    '#3498db',
                    '#e74c3c'
                ],
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

// Navigation Functions
function initializeNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking on links
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
}

// Smooth Scrolling
function initializeSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed header
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Responsive Features
function initializeResponsiveFeatures() {
    // Handle window resize
    window.addEventListener('resize', function() {
        // Recalculate chart sizes if needed
        Chart.helpers.each(Chart.instances, function(chart) {
            chart.resize();
        });
    });
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.fact-card, .topic-card, .metric, .info-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });
}

// Utility Functions
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatPercentage(num) {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(num / 100);
}

// Data Export Functions
function exportChartAsImage(chartId) {
    const canvas = document.getElementById(chartId);
    if (canvas) {
        const link = document.createElement('a');
        link.download = `${chartId}-chart.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
}

function exportDataAsCSV(data, filename) {
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

// Search Functionality
function initializeSearch() {
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const sections = document.querySelectorAll('.data-section');
            
            sections.forEach(section => {
                const content = section.textContent.toLowerCase();
                if (content.includes(searchTerm)) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });
        });
    }
}

// Accessibility Features
function initializeAccessibility() {
    // Add keyboard navigation for charts
    const charts = document.querySelectorAll('canvas');
    charts.forEach(chart => {
        chart.setAttribute('tabindex', '0');
        chart.setAttribute('role', 'img');
        chart.setAttribute('aria-label', 'Data visualization chart');
    });
    
    // Add skip links
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link sr-only';
    document.body.insertBefore(skipLink, document.body.firstChild);
}

// Performance Optimization
function optimizePerformance() {
    // Lazy load images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
    
    // Debounce resize events
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            Chart.helpers.each(Chart.instances, function(chart) {
                chart.resize();
            });
        }, 250);
    });
}

// Initialize all features
document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
    initializeAccessibility();
    optimizePerformance();
});

// Error Handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    // Could send error to analytics service
});

// Enhanced UX Features
function initializeEnhancedUX() {
    // Animated counter for statistics
    animateCounters();
    
    // Add loading states
    addLoadingStates();
    
    // Enhanced navigation with active states
    enhanceNavigation();
    
    // Add scroll progress indicator
    addScrollProgress();
    
    // Add keyboard navigation
    addKeyboardNavigation();
    
    // Add tooltips for better information
    addTooltips();
}

// Animated Counter Function
function animateCounters() {
    const counters = document.querySelectorAll('.fact-number[data-count], .metric-value[data-count]');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseFloat(counter.getAttribute('data-count'));
                const duration = 2000; // 2 seconds
                const increment = target / (duration / 16); // 60fps
                let current = 0;
                
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    
                    // Format the number based on the original format
                    const originalText = counter.textContent;
                    if (originalText.includes('$')) {
                        if (originalText.includes('B')) {
                            counter.textContent = '$' + current.toFixed(2) + 'B';
                        } else {
                            counter.textContent = '$' + Math.floor(current).toLocaleString();
                        }
                    } else if (originalText.includes('%')) {
                        counter.textContent = current.toFixed(1) + '%';
                    } else if (originalText.includes('M')) {
                        counter.textContent = current.toFixed(2) + 'M';
                    } else if (originalText.includes(':')) {
                        counter.textContent = Math.floor(current) + ':1';
                    } else if (originalText.includes('.')) {
                        counter.textContent = current.toFixed(1);
                    } else {
                        counter.textContent = Math.floor(current).toLocaleString();
                    }
                }, 16);
                
                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => observer.observe(counter));
}

// Smooth scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Add loading states
function addLoadingStates() {
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach(chart => {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chart-loading';
        loadingDiv.innerHTML = '<div class="spinner"></div><p>Loading chart...</p>';
        chart.appendChild(loadingDiv);
        
        // Remove loading state after chart is rendered
        setTimeout(() => {
            loadingDiv.remove();
        }, 1000);
    });
}

// Enhanced navigation
function enhanceNavigation() {
    const navLinks = document.querySelectorAll('.nav-menu a');
    const sections = document.querySelectorAll('section[id]');
    
    // Add active state based on scroll position
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
}

// Scroll progress indicator
function addScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
}

// Keyboard navigation
function addKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close any open modals or menus
            const navToggle = document.querySelector('.nav-toggle');
            if (navToggle && navToggle.classList.contains('active')) {
                navToggle.click();
            }
        }
    });
}

// Add tooltips
function addTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = e.target.getAttribute('data-tooltip');
            document.body.appendChild(tooltip);
            
            const rect = e.target.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
        });
        
        element.addEventListener('mouseleave', () => {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) tooltip.remove();
        });
    });
}

// Service Worker Registration (for PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed');
            });
    });
}
