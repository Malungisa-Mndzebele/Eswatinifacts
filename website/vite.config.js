import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                about: resolve(__dirname, 'about.html'),
                blog: resolve(__dirname, 'blog.html'),
                contact: resolve(__dirname, 'contact.html'),
                culture: resolve(__dirname, 'culture.html'),
                'data-sources': resolve(__dirname, 'data-sources.html'),
                donate: resolve(__dirname, 'donate.html'),
                economy: resolve(__dirname, 'economy.html'),
                education: resolve(__dirname, 'education.html'),
                geography: resolve(__dirname, 'geography.html'),
                health: resolve(__dirname, 'health.html'),
                history: resolve(__dirname, 'history.html'),
                contemporary: resolve(__dirname, 'contemporary.html'),
                join: resolve(__dirname, 'join.html'),
                politics: resolve(__dirname, 'politics.html'),
                videos: resolve(__dirname, 'videos.html'),
            },
        },
    },
    server: {
        port: 3000,
        open: true
    }
});
