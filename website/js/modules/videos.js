/**
 * Eswatini Facts - Video Page Logic
 */

import { logger } from './utils.js';

// Video Page Functionality
export function initializeVideoPage() {
    // Category filtering
    const tabButtons = document.querySelectorAll('.tab-btn');
    const videoCards = document.querySelectorAll('.video-card');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
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
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // YouTube subscribe button tracking
    const subscribeBtn = document.querySelector('.subscribe-btn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', function () {
            // Track subscription click (you can add analytics here)
            logger.log('YouTube subscription clicked');
        });
    }
}

// Video search functionality
export function initializeVideoSearch() {
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

        searchInput.addEventListener('input', function () {
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

        searchInput.addEventListener('focus', function () {
            this.style.borderColor = '#1e3a8a';
        });

        searchInput.addEventListener('blur', function () {
            this.style.borderColor = '#e1e8ed';
        });
    }
}

// Video analytics tracking
export function trackVideoEngagement() {
    const videoCards = document.querySelectorAll('.video-card');

    videoCards.forEach(card => {
        const iframe = card.querySelector('iframe');
        if (iframe) {
            // Track when video is clicked/played
            iframe.addEventListener('load', function () {
                logger.log('Video loaded:', iframe.title);
            });
        }

        // Track card clicks
        card.addEventListener('click', function () {
            const title = this.querySelector('h3').textContent;
            logger.log('Video card clicked:', title);
        });
    });
}
