/**
 * Eswatini Facts - Main Entry Point
 */

import { logger } from './modules/utils.js';
import { initializeCharts } from './modules/charts.js';
import { initializeSmoothScrolling, addScrollProgress, enhanceNavigation } from './modules/navigation.js';
import { initializeResponsiveFeatures, initializeSearch, initializeAccessibility, optimizePerformance, initializeEnhancedUX } from './modules/ui.js';
import { initializeContactForm, initializeJoinForm } from './modules/forms.js';
import { initializeVideoPage, initializeVideoSearch, trackVideoEngagement } from './modules/videos.js';
import { initializeLayout } from './modules/layout.js';
import { initializeCookieConsent } from './modules/consent.js';

// Initialize all features
async function initializeCore() {
    // Prevent duplicate initialization
    if (window.initializationComplete) {
        logger.warn('Initialization already completed, skipping duplicate initialization');
        return;
    }

    logger.info('Initializing Eswatini Facts Application...');

    // Layout (Header/Footer) - Wait for this!
    // Note: initializeLayout handles initializing navigation listeners after header load
    await initializeLayout();

    // Core Visualizations
    initializeCharts();

    // UI/UX
    initializeSmoothScrolling();
    initializeResponsiveFeatures();

    // Initialize Enhanced UX (Tooltips, specific nav enhancements)
    initializeEnhancedUX();
    enhanceNavigation();
    addScrollProgress();

    // Utilities
    initializeSearch();
    initializeAccessibility();
    optimizePerformance();

    // Forms
    initializeContactForm();
    initializeJoinForm();

    // Video Page
    if (document.querySelector('.video-card')) {
        initializeVideoPage();
        initializeVideoSearch();
        trackVideoEngagement();
    }

    // Cookie / analytics consent banner
    initializeCookieConsent();

    // Mark initialization as complete
    window.initializationComplete = true;
    logger.info('Initialization complete.');
}

// Error Handling
window.addEventListener('error', function (e) {
    logger.error('JavaScript error:', e.error);
});

// Bootstrapper
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCore);
} else {
    // DOM already loaded
    initializeCore();
}
