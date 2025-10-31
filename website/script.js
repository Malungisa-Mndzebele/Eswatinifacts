// Eswatini Facts - Interactive Data Visualization
const THEME = {
    primary: '#1e3a8a',
    blue: '#2563eb',
    green: '#2ecc71',
    orange: '#f39c12',
    purple: '#9b59b6',
    grayBorder: '#e1e8ed'
};

// Chart Initialization
function initializeCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded. Charts will not be initialized.');
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
    charts.forEach((chart, index) => {
        chart.setAttribute('tabindex', '0');
        chart.setAttribute('role', 'img');
        chart.setAttribute('aria-label', chart.getAttribute('aria-label') || `Data visualization chart ${index + 1}`);
        
        // Add keyboard support for charts
        chart.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const title = chart.closest('.chart-container')?.querySelector('h3');
                if (title) {
                    title.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    chart.focus();
                }
            }
        });
    });
    
    // Add skip links (only if not already present)
    if (!document.querySelector('.skip-link')) {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content, main, .hero, section';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link sr-only';
        skipLink.addEventListener('focus', function() {
            this.classList.remove('sr-only');
        });
        skipLink.addEventListener('blur', function() {
            this.classList.add('sr-only');
        });
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    // Ensure all images have alt text or aria-label
    const images = document.querySelectorAll('img:not([alt]):not([aria-label])');
    if (images.length > 0) {
        console.warn(`${images.length} images missing alt text or aria-label`);
        images.forEach((img, index) => {
            // For decorative images, add empty alt
            if (img.closest('.decorative') || img.offsetWidth === 0) {
                img.setAttribute('alt', '');
            } else {
                // Try to infer from context
                const parent = img.closest('article, section, .card, .topic-card');
                if (parent) {
                    const title = parent.querySelector('h1, h2, h3, h4, h5, h6');
                    if (title) {
                        img.setAttribute('alt', title.textContent);
                    }
                }
            }
        });
    }
}

// Performance Optimization
function optimizePerformance() {
    // Enhanced lazy load images with better error handling
    const images = document.querySelectorAll('img[data-src]');
    
    if (images.length > 0) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const dataSrc = img.dataset.src;
                    
                    if (dataSrc) {
                        // Create a new image to preload
                        const newImg = new Image();
                        newImg.onload = function() {
                            img.src = dataSrc;
                            img.classList.add('loaded');
                            img.classList.remove('lazy');
                            img.removeAttribute('data-src');
                        };
                        newImg.onerror = function() {
                            console.warn('Failed to load image:', dataSrc);
                            img.classList.add('error');
                            // Optionally set a placeholder
                            img.alt = img.alt || 'Image failed to load';
                        };
                        newImg.src = dataSrc;
                    }
                    
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px' // Start loading 50px before image comes into view
        });
        
        images.forEach(img => {
            // Ensure alt text exists for accessibility
            if (!img.alt && !img.getAttribute('aria-label')) {
                console.warn('Image missing alt text:', img);
            }
            imageObserver.observe(img);
        });
    }
    
    // Also handle native lazy loading images (check if alt exists)
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    lazyImages.forEach(img => {
        if (!img.alt && !img.getAttribute('aria-label')) {
            console.warn('Lazy-loaded image missing alt text:', img);
        }
    });
    
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
function initializeCore() {
    // Prevent duplicate initialization
    if (window.initializationComplete) {
        console.warn('Initialization already completed, skipping duplicate initialization');
        return;
    }
    
    // Charts
    initializeCharts();
    // UI/UX
    initializeNavigation();
    initializeSmoothScrolling();
    initializeResponsiveFeatures();
    initializeEnhancedUX();
    // Utilities
    initializeSearch();
    initializeAccessibility();
    optimizePerformance();
    // Page specific
    initializeContactForm();
    initializeJoinForm();
    initializeVideoPage();
    initializeVideoSearch();
    trackVideoEngagement();
    
    // Mark initialization as complete
    window.initializationComplete = true;
}

// Only initialize once
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCore);
} else {
    // DOM already loaded
    initializeCore();
}

// Error Handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    // Could send error to analytics service
});

// Enhanced UX Features
function initializeEnhancedUX() {
    // Animated counter for statistics
    // animateCounters(); // Disabled - numbers no longer count up
    
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
    // Only add if not already present
    if (document.querySelector('.scroll-progress')) {
        return;
    }
    
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-label', 'Page scroll progress');
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-valuenow', '0');
    document.body.appendChild(progressBar);
    
    let ticking = false;
    function updateScrollProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
        
        progressBar.style.width = scrollPercent + '%';
        progressBar.setAttribute('aria-valuenow', Math.round(scrollPercent));
        
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateScrollProgress);
            ticking = true;
        }
    }, { passive: true });
    
    // Initial update
    updateScrollProgress();
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

// Email routing mapping based on subject selection
const EMAIL_ROUTING = {
    'data-question': 'data@eswatinifacts.com',
    'error-report': 'issues@eswatinifacts.com',
    'collaboration': 'data@eswatinifacts.com',
    'media-inquiry': 'media@eswatinifacts.com',
    'general': 'info@eswatinifacts.com',
    'other': 'info@eswatinifacts.com'
};

// CSRF Token Generation (Simple client-side token)
function generateCSRFToken() {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    // Store token in sessionStorage
    sessionStorage.setItem('csrf_token', token);
    sessionStorage.setItem('csrf_token_time', Date.now().toString());
    
    return token;
}

// Validate CSRF Token
function validateCSRFToken(token) {
    const storedToken = sessionStorage.getItem('csrf_token');
    const tokenTime = sessionStorage.getItem('csrf_token_time');
    
    // Token expires after 1 hour
    if (!storedToken || !tokenTime) {
        return false;
    }
    
    const timeDiff = Date.now() - parseInt(tokenTime, 10);
    if (timeDiff > 3600000) { // 1 hour
        sessionStorage.removeItem('csrf_token');
        sessionStorage.removeItem('csrf_token_time');
        return false;
    }
    
    return storedToken === token;
}

// Contact Form Functionality
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');
    
    if (contactForm) {
        // Generate and add CSRF token
        const csrfToken = generateCSRFToken();
        let csrfInput = contactForm.querySelector('input[name="csrf_token"]');
        if (!csrfInput) {
            csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = csrfToken;
            contactForm.appendChild(csrfInput);
        } else {
            csrfInput.value = csrfToken;
        }
        
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('.submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');
            
            // Validate CSRF token
            const formToken = this.querySelector('input[name="csrf_token"]')?.value;
            if (!formToken || !validateCSRFToken(formToken)) {
                alert('Security validation failed. Please refresh the page and try again.');
                // Regenerate token
                const newToken = generateCSRFToken();
                this.querySelector('input[name="csrf_token"]').value = newToken;
                return;
            }
            
            // Validate form
            if (!validateContactForm(this)) {
                return;
            }
            
            // Show loading state
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            submitBtn.disabled = true;
            
            // Collect form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Get the recipient email based on subject
            const subject = data.subject;
            const recipientEmail = EMAIL_ROUTING[subject] || 'info@eswatinifacts.com';
            
            // Send email using EmailJS or Formspree
            sendContactEmail(data, recipientEmail, function(success) {
                if (success) {
                    // Hide form and show success message
                    contactForm.style.display = 'none';
                    formSuccess.style.display = 'block';
                    
                    // Scroll to success message
                    formSuccess.scrollIntoView({ behavior: 'smooth' });
                    
                    // Reset form
                    contactForm.reset();
                } else {
                    // Show error message
                    alert('There was an error sending your message. Please try again or email us directly.');
                }
                
                // Reset form state
                btnText.style.display = 'block';
                btnLoading.style.display = 'none';
                submitBtn.disabled = false;
            });
        });
        
        // Add real-time validation
        addFormValidation(contactForm);
    }
}

// Send email using Formspree or EmailJS
function sendContactEmail(formData, recipientEmail, callback) {
    // Map recipient emails to Formspree form IDs
    // IMPORTANT: Replace these with your actual Formspree form IDs
    // Create forms at https://formspree.io/ and configure each to send to the respective email
    // 
    // Configuration: Set these in a config object that can be easily updated
    // You can also use environment variables or a separate config file for production
    const FORMPREE_ENDPOINTS = {
        'data@eswatinifacts.com': 'YOUR_FORMSPREE_FORM_ID_DATA', // e.g., 'https://formspree.io/f/xxxxx'
        'issues@eswatinifacts.com': 'YOUR_FORMSPREE_FORM_ID_ISSUES',
        'media@eswatinifacts.com': 'YOUR_FORMSPREE_FORM_ID_MEDIA',
        'info@eswatinifacts.com': 'YOUR_FORMSPREE_FORM_ID_INFO'
    };
    
    // Check if configuration is set (not placeholder values)
    const isConfigured = (endpoint) => {
        return endpoint && 
               typeof endpoint === 'string' &&
               !endpoint.startsWith('YOUR_') &&
               endpoint.length > 10; // Basic validation that it's not a placeholder
    };
    
    const formspreeId = FORMPREE_ENDPOINTS[recipientEmail] || FORMPREE_ENDPOINTS['info@eswatinifacts.com'];
    
    // Log configuration status (remove in production if needed)
    if (!isConfigured(formspreeId)) {
        console.warn('Formspree endpoints not configured. Using mailto fallback.');
    }
    
    // Option 1: Using Formspree (recommended - simple setup, no backend needed)
    // Check if Formspree is configured (has valid form ID)
    if (isConfigured(formspreeId)) {
        sendViaFormspree(formData, recipientEmail, formspreeId, callback);
        return;
    }
    
    // Option 2: Using EmailJS (requires EmailJS account)
    if (typeof emailjs !== 'undefined') {
        sendViaEmailJS(formData, recipientEmail, callback);
        return;
    }
    
    // Option 3: Fallback - Use mailto (opens email client)
    // This always works but requires user's email client to be configured
    sendViaMailto(formData, recipientEmail);
    callback(true);
}

// Send email via EmailJS
function sendViaEmailJS(formData, recipientEmail, callback) {
    // EmailJS configuration
    // Replace 'YOUR_SERVICE_ID' and 'YOUR_TEMPLATE_ID' with your actual EmailJS service and template IDs
    const SERVICE_ID = 'YOUR_SERVICE_ID'; // Update this with your EmailJS service ID
    const TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; // Update this with your EmailJS template ID
    
    // Prepare email template parameters
    const templateParams = {
        to_email: recipientEmail,
        from_name: formData.name,
        from_email: formData.email,
        subject: getSubjectLabel(formData.subject),
        message: formData.message,
        newsletter: formData.newsletter ? 'Yes' : 'No'
    };
    
    // Send email via EmailJS
    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
        .then(function(response) {
            console.log('Email sent successfully:', response.status, response.text);
            callback(true);
        }, function(error) {
            console.error('Email send failed:', error);
            // Fallback to mailto if EmailJS fails
            sendViaMailto(formData, recipientEmail);
            callback(true); // Still show success to user as mailto was attempted
        });
}

// Send email via Formspree
function sendViaFormspree(formData, recipientEmail, formspreeId, callback) {
    // Construct Formspree endpoint
    const endpoint = formspreeId.startsWith('http') ? formspreeId : `https://formspree.io/f/${formspreeId}`;
    
    // Prepare form data for Formspree
    // Note: Configure _to in Formspree dashboard for each form, or use _replyto for reply-to
    const formPayload = {
        _replyto: formData.email, // Reply-to email
        name: formData.name,
        email: formData.email,
        subject: getSubjectLabel(formData.subject),
        message: formData.message,
        newsletter: formData.newsletter ? 'Yes' : 'No',
        recipient_email: recipientEmail // Include for reference
    };
    
    // Send to Formspree
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(formPayload)
    })
    .then(response => {
        if (response.ok) {
            console.log('Email sent successfully via Formspree to', recipientEmail);
            callback(true);
        } else {
            return response.json().then(err => {
                throw new Error(err.error || 'Formspree submission failed');
            });
        }
    })
    .catch(error => {
        console.error('Formspree send failed:', error);
        // Fallback to mailto
        sendViaMailto(formData, recipientEmail);
        callback(true);
    });
}

// Fallback: Send via mailto (opens email client)
function sendViaMailto(formData, recipientEmail) {
    const subject = encodeURIComponent(getSubjectLabel(formData.subject));
    const body = encodeURIComponent(
        `From: ${formData.name} (${formData.email})\n\n` +
        `Message:\n${formData.message}\n\n` +
        `Newsletter subscription: ${formData.newsletter ? 'Yes' : 'No'}`
    );
    
    const mailtoLink = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
}

// Get human-readable subject label
function getSubjectLabel(subjectValue) {
    const subjectLabels = {
        'data-question': 'Data Question',
        'error-report': 'Error Report',
        'collaboration': 'Collaboration Request',
        'media-inquiry': 'Media Inquiry',
        'general': 'General Question',
        'other': 'Other'
    };
    return subjectLabels[subjectValue] || 'General Question';
}

// Form validation
function validateContactForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });
    
    // Email validation
    const emailField = form.querySelector('#email');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            showFieldError(emailField, 'Please enter a valid email address');
            isValid = false;
        }
    }
    
    return isValid;
}

// Show field error
function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#1e3a8a';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';
    
    field.style.borderColor = '#1e3a8a';
    field.parentNode.appendChild(errorDiv);
}

// Clear field error
function clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.style.borderColor = '#e1e8ed';
}

// Add real-time form validation
function addFormValidation(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                showFieldError(this, 'This field is required');
            } else {
                clearFieldError(this);
            }
        });
        
        input.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(231, 76, 60)') {
                clearFieldError(this);
            }
        });
    });
}

// Join Form Functionality
function initializeJoinForm() {
    const joinForm = document.getElementById('joinForm');
    const formSuccess = document.getElementById('formSuccess');
    
    if (joinForm) {
        // Generate and add CSRF token
        const csrfToken = generateCSRFToken();
        let csrfInput = joinForm.querySelector('input[name="csrf_token"]');
        if (!csrfInput) {
            csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = csrfToken;
            joinForm.appendChild(csrfInput);
        } else {
            csrfInput.value = csrfToken;
        }
        
        joinForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('.submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');
            
            // Validate CSRF token
            const formToken = this.querySelector('input[name="csrf_token"]')?.value;
            if (!formToken || !validateCSRFToken(formToken)) {
                alert('Security validation failed. Please refresh the page and try again.');
                // Regenerate token
                const newToken = generateCSRFToken();
                this.querySelector('input[name="csrf_token"]').value = newToken;
                return;
            }
            
            // Validate form
            if (!validateJoinForm(this)) {
                return;
            }
            
            // Show loading state
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            submitBtn.disabled = true;
            
            // Collect form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Simulate form submission (replace with actual form handling)
            setTimeout(() => {
                // Hide form and show success message
                joinForm.style.display = 'none';
                formSuccess.style.display = 'block';
                
                // Reset form state
                btnText.style.display = 'block';
                btnLoading.style.display = 'none';
                submitBtn.disabled = false;
                
                // Log form data (in production, send to server)
                console.log('Join application submitted:', data);
                
                // Scroll to success message
                formSuccess.scrollIntoView({ behavior: 'smooth' });
            }, 2000);
        });
        
        // Add real-time validation
        addJoinFormValidation(joinForm);
    }
}

// Join form validation
function validateJoinForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });
    
    // Email validation
    const emailField = form.querySelector('#email');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            showFieldError(emailField, 'Please enter a valid email address');
            isValid = false;
        }
    }
    
    // Check if at least one interest is selected
    const interests = form.querySelectorAll('input[name="interests"]:checked');
    if (interests.length === 0) {
        const interestsLabel = form.querySelector('label[for="interests"]');
        showFieldError(interestsLabel, 'Please select at least one area of interest');
        isValid = false;
    }
    
    // Check agreement checkbox
    const agreeCheckbox = form.querySelector('#agree');
    if (agreeCheckbox && !agreeCheckbox.checked) {
        showFieldError(agreeCheckbox, 'You must agree to the terms and privacy policy');
        isValid = false;
    }
    
    return isValid;
}

// Add real-time form validation for join form
function addJoinFormValidation(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                showFieldError(this, 'This field is required');
            } else {
                clearFieldError(this);
            }
        });
        
        input.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(231, 76, 60)') {
                clearFieldError(this);
            }
        });
    });
    
    // Special handling for checkboxes
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.style.borderColor === 'rgb(231, 76, 60)') {
                clearFieldError(this);
            }
        });
    });
}

// Video Page Functionality
function initializeVideoPage() {
    // Category filtering
    const tabButtons = document.querySelectorAll('.tab-btn');
    const videoCards = document.querySelectorAll('.video-card');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            // Update active tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter videos
            videoCards.forEach(card => {
                if (category === 'all' || card.getAttribute('data-category') === category) {
                    card.classList.remove('hidden');
                    card.style.animation = 'fadeInUp 0.5s ease forwards';
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });
    
    // Lazy loading for video iframes
    const videoIframes = document.querySelectorAll('.video-thumbnail iframe');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const iframe = entry.target;
                if (!iframe.src.includes('autoplay=1')) {
                    // Add autoplay parameter when video comes into view
                    const currentSrc = iframe.src;
                    if (currentSrc.includes('?')) {
                        iframe.src = currentSrc + '&autoplay=1&mute=1';
                    } else {
                        iframe.src = currentSrc + '?autoplay=1&mute=1';
                    }
                }
                observer.unobserve(iframe);
            }
        });
    }, { threshold: 0.5 });
    
    videoIframes.forEach(iframe => {
        observer.observe(iframe);
    });
    
    // Video card hover effects
    videoCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // YouTube subscribe button tracking
    const subscribeBtn = document.querySelector('.subscribe-btn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', function() {
            // Track subscription click (you can add analytics here)
            console.log('YouTube subscription clicked');
        });
    }
}

// Video search functionality
function initializeVideoSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search videos...';
    searchInput.className = 'video-search';
    searchInput.style.cssText = `
        width: 100%;
        max-width: 400px;
        padding: 0.75rem 1rem;
        border: 2px solid #e1e8ed;
        border-radius: 25px;
        font-size: 1rem;
        margin: 1rem auto;
        display: block;
        transition: border-color 0.3s ease;
    `;
    
    // Add search input to video categories section
    const categoriesSection = document.querySelector('.video-categories .container');
    if (categoriesSection) {
        categoriesSection.appendChild(searchInput);
        
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const videoCards = document.querySelectorAll('.video-card');
            
            videoCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const description = card.querySelector('p').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    card.classList.remove('hidden');
                    card.style.animation = 'fadeInUp 0.5s ease forwards';
                } else {
                    card.classList.add('hidden');
                }
            });
        });
        
        searchInput.addEventListener('focus', function() {
            this.style.borderColor = '#1e3a8a';
        });
        
        searchInput.addEventListener('blur', function() {
            this.style.borderColor = '#e1e8ed';
        });
    }
}

// Video analytics tracking
function trackVideoEngagement() {
    const videoCards = document.querySelectorAll('.video-card');
    
    videoCards.forEach(card => {
        const iframe = card.querySelector('iframe');
        if (iframe) {
            // Track when video is clicked/played
            iframe.addEventListener('load', function() {
                console.log('Video loaded:', iframe.title);
                // You can add analytics tracking here
            });
        }
        
        // Track card clicks
        card.addEventListener('click', function() {
            const title = this.querySelector('h3').textContent;
            console.log('Video card clicked:', title);
            // You can add analytics tracking here
        });
    });
}

// Video page initialization is now handled by initializeCore()
// This prevents duplicate initialization

// Online-only website - no service worker needed
