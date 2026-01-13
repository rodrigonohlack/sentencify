/**
 * @file ErrorBoundary.tsx
 * @description Error Boundary para prevenir tela branca em erros
 * @version 1.37.1
 */

import React from 'react';
import { AlertCircle, RefreshCw, Download, Info, Code } from 'lucide-react';
import { APP_VERSION } from '../constants/app-version';
import type { ErrorBoundaryProps, ErrorBoundaryState } from '../types';

/**
 * ErrorBoundary - Previne tela branca em erros (v1.8.5)
 * Captura erros de renderização e exibe fallback amigável
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {

    this.setState({ error, errorInfo });

    // Salvar log de erro
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent
      };
      localStorage.setItem('sentencify-last-error', JSON.stringify(errorLog));
    } catch (e) {
    }
  }

  exportEmergencyData = () => {
    try {
      const session = localStorage.getItem('sentencifySession');
      const aiSettings = localStorage.getItem('sentencify-ai-settings');
      const models = localStorage.getItem('sentencify-models');

      const emergencyData = {
        exportDate: new Date().toISOString(),
        session: session ? JSON.parse(session) : null,
        aiSettings: aiSettings ? JSON.parse(aiSettings) : null,
        models: models ? JSON.parse(models) : null,
        error: {
          message: this.state.error?.toString(),
          stack: this.state.error?.stack,
          componentStack: this.state.errorInfo?.componentStack
        }
      };

      const blob = new Blob([JSON.stringify(emergencyData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentencify-emergency-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Dados exportados! Verifique seus downloads.');
    } catch (e) {
      alert('Erro ao exportar: ' + (e as Error).message);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full bg-gray-800 rounded-lg p-6 shadow-2xl border border-red-500/30">

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <div>
                <h1 className="text-2xl font-bold text-red-400">Erro na Aplicação</h1>
                <p className="text-gray-400 text-sm">Algo inesperado aconteceu</p>
              </div>
            </div>

            {/* Mensagem */}
            <div className="bg-gray-700/50 rounded p-4 mb-4 border border-gray-600">
              <p className="theme-text-secondary mb-2">
                <strong className="text-green-400">Boa notícia:</strong> Seus dados estão seguros.
              </p>
              <p className="theme-text-muted text-sm">
                Todas suas informações foram salvas automaticamente no navegador.
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar
              </button>

              <button
                onClick={this.exportEmergencyData}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Backup
              </button>
            </div>

            {/* Instruções */}
            <div className="theme-info-box mb-4">
              <h3 className="font-semibold theme-text-blue mb-1 flex items-center gap-2 text-sm">
                <Info className="w-4 h-4" />
                O que fazer:
              </h3>
              <ol className="theme-text-muted text-sm ml-5 list-decimal space-y-1">
                <li>Clique em "Recarregar"</li>
                <li>Se persistir, exporte o backup</li>
                <li>Recarregue o navegador (F5)</li>
              </ol>
            </div>

            {/* Stack trace */}
            <details className="bg-gray-900/50 rounded border border-gray-700">
              <summary className="cursor-pointer p-3 hover:bg-gray-700/30 flex items-center gap-2 font-semibold text-sm">
                <Code className="w-4 h-4 text-yellow-400" />
                Detalhes Técnicos
              </summary>
              <div className="p-3 border-t border-gray-700">
                <pre className="text-xs theme-text-red bg-gray-950 p-2 rounded overflow-auto max-h-48">
                  {this.state.error?.toString()}
                  {this.state.error?.stack && '\n\n' + this.state.error.stack}
                  {this.state.errorInfo?.componentStack && '\n\nComponent Stack:' + this.state.errorInfo.componentStack}
                </pre>
              </div>
            </details>

            {/* Footer */}
            <div className="mt-4 text-center text-gray-500 text-xs">
              <p>SentencifyAI v{APP_VERSION} - <span className="text-amber-500">PROTÓTIPO</span></p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
