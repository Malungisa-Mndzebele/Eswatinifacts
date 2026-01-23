/**
 * Eswatini Facts - Layout & Component Loading
 */

import { logger } from './utils.js';
import { initializeNavigation, enhanceNavigation } from './navigation.js';

// Load component from file
async function loadComponent(elementId, componentPath) {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            // It's okay if not found, some pages might not have it (though header/footer usually everywhere)
            return false;
        }

        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to load ${componentPath}`);
        }

        const html = await response.text();
        if (!html || html.trim().length === 0) {
            throw new Error(`Empty content from ${componentPath}`);
        }

        element.innerHTML = html;

        // Dispatch event to notify component loaded
        element.dispatchEvent(new CustomEvent('componentLoaded', {
            detail: { elementId, componentPath }
        }));

        return true;
    } catch (error) {
        logger.error(`Error loading component "${elementId}" from "${componentPath}":`, error);

        // Show fallback content for critical components
        const element = document.getElementById(elementId);
        if (element) {
            if (elementId === 'header-placeholder') {
                element.innerHTML = '<div style="padding: 1rem; text-align: center; background: #f3f4f6;">Navigation temporarily unavailable</div>';
            } else if (elementId === 'footer-placeholder') {
                element.innerHTML = '<div style="padding: 1rem; text-align: center; background: #1a1a1a; color: white;">© 2025 Eswatini Facts</div>';
            }
        }

        return false;
    }
}

// Initialize components
export async function initializeLayout() {
    try {
        // Load header and footer with error handling
        const results = await Promise.allSettled([
            loadComponent('header-placeholder', 'components/header.html'),
            loadComponent('footer-placeholder', 'components/footer.html')
        ]);

        // Log results
        results.forEach((result, index) => {
            const componentName = index === 0 ? 'Header' : 'Footer';
            if (result.status === 'fulfilled' && result.value) {
                logger.log(`${componentName} component loaded successfully`);
            } else {
                logger.warn(`${componentName} component failed to load`);
            }
        });

        // Only if header loaded successfully
        if (results[0].status === 'fulfilled' && results[0].value) {
            // We need to re-run navigation initialization because the DOM elements 
            // were just injected.

            // Set active navigation link based on current page
            setActiveNavLink();

            // Initialize navigation toggle
            initializeNavigation();
        }
    } catch (error) {
        logger.error('Fatal error initializing components:', error);
    }
}

// Set active class on current page navigation link
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-menu a');

    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;

        // Check if this is the current page
        if (currentPath === linkPath ||
            currentPath === linkPath + '.html' ||
            (currentPath === '/' && linkPath === '/') ||
            (currentPath.includes(linkPath) && linkPath !== '/')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}
