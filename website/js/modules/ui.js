/**
 * Eswatini Facts - UI/UX Enhancements
 */

import { logger } from './utils.js';

// Responsive Features
export function initializeResponsiveFeatures() {
    // Handle window resize
    window.addEventListener('resize', function () {
        // Recalculate chart sizes if needed
        if (typeof Chart !== 'undefined') {
            Chart.helpers.each(Chart.instances, function (chart) {
                chart.resize();
            });
        }
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
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

// Search Functionality
export function initializeSearch() {
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
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
export function initializeAccessibility() {
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
        skipLink.addEventListener('focus', function () {
            this.classList.remove('sr-only');
        });
        skipLink.addEventListener('blur', function () {
            this.classList.add('sr-only');
        });
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    // Ensure all images have alt text or aria-label
    const images = document.querySelectorAll('img:not([alt]):not([aria-label])');
    if (images.length > 0) {
        logger.warn(`${images.length} images missing alt text or aria-label`);
        images.forEach((img) => {
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
export function optimizePerformance() {
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
                        newImg.onload = function () {
                            img.src = dataSrc;
                            img.classList.add('loaded');
                            img.classList.remove('lazy');
                            img.removeAttribute('data-src');
                        };
                        newImg.onerror = function () {
                            logger.warn('Failed to load image:', dataSrc);
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
                logger.warn('Image missing alt text:', img);
            }
            imageObserver.observe(img);
        });
    }

    // Also handle native lazy loading images (check if alt exists)
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    lazyImages.forEach(img => {
        if (!img.alt && !img.getAttribute('aria-label')) {
            logger.warn('Lazy-loaded image missing alt text:', img);
        }
    });

    // Debounce resize events
    let resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            if (typeof Chart !== 'undefined') {
                Chart.helpers.each(Chart.instances, function (chart) {
                    chart.resize();
                });
            }
        }, 250);
    });
}

// Add loading states
export function addLoadingStates() {
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

// Keyboard navigation
export function addKeyboardNavigation() {
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
export function addTooltips() {
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

// Enhanced UX Features initializer
export function initializeEnhancedUX() {
    addLoadingStates();
    // enhanceNavigation is called from navigation.js if needed, or separately
    // addScrollProgress is called from navigation.js
    addKeyboardNavigation();
    addTooltips();
}
