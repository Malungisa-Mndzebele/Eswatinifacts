/**
 * Eswatini Facts - Cookie / Analytics Consent
 *
 * Google Analytics is gated behind explicit consent. A small inline guard in
 * each page's <head> sets window['ga-disable-G-WPM6NBHSQB'] = true unless the
 * visitor has previously granted consent, so GA does not run on the first view.
 * This module shows the banner and, on acceptance, enables GA for this session
 * and future visits.
 */

import { logger } from './utils.js';

const GA_ID = 'G-WPM6NBHSQB';
const STORAGE_KEY = 'ef-consent';

function enableAnalytics() {
    try {
        window['ga-disable-' + GA_ID] = false;
        if (typeof window.gtag === 'function') {
            window.gtag('consent', 'update', { analytics_storage: 'granted' });
            window.gtag('config', GA_ID);
            logger.info('Analytics enabled after consent.');
        }
    } catch (e) {
        logger.error('Failed to enable analytics:', e);
    }
}

function buildBanner() {
    const banner = document.createElement('div');
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
        '<p class="cookie-consent-text">We use Google Analytics to understand how visitors use this site. ' +
        'Analytics cookies are only set if you accept. See our <a href="privacy.html">Privacy Policy</a>.</p>' +
        '<div class="cookie-consent-actions">' +
        '<button type="button" class="btn-decline">Decline</button>' +
        '<button type="button" class="btn-accept">Accept</button>' +
        '</div>';
    return banner;
}

function storeChoice(value) {
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
        logger.warn('Could not persist consent choice:', e);
    }
}

export function initializeCookieConsent() {
    let choice = null;
    try {
        choice = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
        // Storage unavailable (e.g. private mode) — show the banner each time.
    }

    // Already granted: make sure analytics is on for this session, no banner.
    if (choice === 'granted') {
        enableAnalytics();
        return;
    }

    // Already declined: respect it, no banner.
    if (choice === 'denied') {
        return;
    }

    // No decision yet — show the banner.
    const banner = buildBanner();
    document.body.appendChild(banner);

    banner.querySelector('.btn-accept').addEventListener('click', () => {
        storeChoice('granted');
        enableAnalytics();
        banner.remove();
    });

    banner.querySelector('.btn-decline').addEventListener('click', () => {
        storeChoice('denied');
        banner.remove();
    });
}
