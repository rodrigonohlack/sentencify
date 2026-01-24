/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Strip console.log/warn/error e debugger no bundle de produção
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  // Configuração do Vitest para testes unitários
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    },
    // v1.31.04: Headers COOP/COEP para habilitar SharedArrayBuffer e multi-threading
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Suprimir warning do onnxruntime-web (dependência do @xenova/transformers)
    // O eval é usado internamente para WebAssembly - não podemos modificar código de terceiros
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignorar warning de eval do onnxruntime-web
        if (warning.code === 'EVAL' && warning.id?.includes('onnxruntime-web')) {
          return;
        }
        warn(warning);
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
}));
