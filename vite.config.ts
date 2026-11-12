import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icons/*.png', 'icons/*.svg', 'splash/*.png'],
      manifest: {
        id: '/',
        name: 'Fechô - Controle de Gastos',
        short_name: 'Fechô',
        description: 'Registre gastos em até 3 toques e feche o mês no azul.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        display_override: ['standalone'],
        orientation: 'portrait',
        categories: ['finance', 'productivity'],
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Novo Gasto',
            short_name: 'Novo Gasto',
            description: 'Registrar um novo gasto rapidamente',
            url: '/?novo=1',
            icons: [
              {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'motion': ['framer-motion'],
          'excel': ['xlsx'],
        },
      },
    },
  },
  server: {
    host: true, // enables access over local network (e.g. testing PWA on phone)
    port: 5173,
  },
});
