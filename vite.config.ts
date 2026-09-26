import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/binance-api': {
          target: 'https://api.binance.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/binance-api/, ''),
          secure: true,
        },
        '/binance-us-api': {
          target: 'https://api.binance.us',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/binance-us-api/, ''),
          secure: true,
        },
        '/binance-fapi': {
          target: 'https://fapi.binance.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/binance-fapi/, ''),
          secure: true,
        },
        '/binance-testnet': {
          target: 'https://testnet.binance.vision',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/binance-testnet/, ''),
          secure: true,
        },
      },
    },
  };
});
