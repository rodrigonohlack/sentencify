/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Strip debugger no bundle de produção (mantém console para debug)
  esbuild: {
    drop: mode === 'production' ? ['debugger'] : [],
  },
  // Configuração do Vitest para testes unitários
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/services/',         // Requires real SQLite/network (integration tests)
        'src/hooks/useGoogleDrive.ts',   // Requires OAuth2 flow
        'src/hooks/useQuillEditor.ts',   // Requires Quill DOM instantiation
        'src/hooks/useQuillEditorSerialization.ts',
        'src/hooks/useLocalStorage.ts',  // 1535 LOC heavy IndexedDB I/O
        'src/hooks/useJurisprudencia.ts', // Heavy network/IndexedDB
        'src/hooks/useLegislacao.ts',     // Heavy network/IndexedDB
        'src/utils/quill-styles-injector.ts',
        'src/utils/jurisprudencia.ts',    // Heavy network/IndexedDB I/O
        'src/utils/models.ts',            // File system I/O
        'src/hooks/useSearchHandlers.ts', // Integration with search services
        'src/hooks/useModelGeneration.ts', // Heavy AI generation pipeline
        'src/**/index.ts',                // Barrel re-exports (no logic)
        'src/components/editors/',         // Quill/rich-text editors (integration-level)
        'src/components/panels/ModelPanel.tsx', // Heavy panel component
        'src/components/modals/ConfigModal.tsx', // 2500+ LOC settings modal
        'src/components/modals/AdvancedModals.tsx', // Large advanced modals
        'src/components/forms/',            // Complex form components
        'src/hooks/useSemanticSearchHandlers.ts', // Integration with search services
        'src/components/modals/SentenceReviewModals.tsx', // Complex review UI
        'src/components/modals/PreviewModals.tsx', // Complex preview UI
      ],
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
