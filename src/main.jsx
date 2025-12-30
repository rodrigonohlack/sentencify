import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Tailwind CSS
import App from './App.jsx';

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
