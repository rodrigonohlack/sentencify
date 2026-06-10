import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css'; // Tailwind CSS
import App from './App';
import { installApiAuthInterceptor } from './utils/installApiAuthInterceptor';

// v1.53.3: anexa o JWT de sessão a toda chamada ao backend próprio (/api/...),
// permitindo que as rotas de proxy de IA exijam autenticação (fecha o open proxy).
// Deve rodar ANTES de qualquer fetch da aplicação.
installApiAuthInterceptor();

// v1.35.12: Sentry error tracking
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN_FRONTEND,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1, // 10% das transações para performance
});

// Configurar PDF.js worker
if (typeof window !== 'undefined' && window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// v1.30: Removido React.StrictMode
// O Quill.js não suporta o comportamento de dupla montagem do StrictMode (React 18+)
// Isso causava duas toolbars empilhadas no editor
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
