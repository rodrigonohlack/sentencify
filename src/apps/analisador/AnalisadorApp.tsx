/**
 * @file AnalisadorApp.tsx
 * @description Componente principal do Analisador de Prepauta Trabalhista
 */

import React, { useState } from 'react';
import { Play, RotateCcw, Key } from 'lucide-react';

// Layout
import { Header } from './components/layout';

// Upload
import { UploadSection } from './components/upload';

// Settings
import { SettingsModal } from './components/settings';

// Results
import { ResultsContainer } from './components/results';

// UI
import { Button, Card, CardContent, ProgressBar, ToastProvider, useToast } from './components/ui';

// Stores & Hooks
import { useDocumentStore, useResultStore, useAIStore } from './stores';
import { useAnalysis } from './hooks';

const AnalisadorContent: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { showToast } = useToast();

  // Stores
  const { peticao, contestacao, clearAll } = useDocumentStore();
  const { isAnalyzing, progress, progressMessage, error, reset: resetResults } = useResultStore();
  const apiKeys = useAIStore((s) => s.aiSettings.apiKeys);
  const provider = useAIStore((s) => s.aiSettings.provider);

  // Hooks
  const { analyze, canAnalyze } = useAnalysis();

  const hasApiKey = !!apiKeys[provider];

  const handleAnalyze = async () => {
    if (!hasApiKey) {
      showToast('warning', 'Configure a API Key nas configurações antes de analisar.');
      setSettingsOpen(true);
      return;
    }

    if (!canAnalyze) {
      showToast('warning', 'Faça upload da petição inicial para analisar.');
      return;
    }

    try {
      await analyze();
      showToast('success', 'Análise concluída com sucesso!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao realizar análise');
    }
  };

  const handleReset = () => {
    clearAll();
    resetResults();
    showToast('info', 'Documentos e resultados limpos.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload and Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Section */}
            <UploadSection />

            {/* Action Buttons */}
            <Card>
              <CardContent className="space-y-4">
                {/* API Key Warning */}
                {!hasApiKey && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Key className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">API Key não configurada</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Configure sua API Key nas configurações para usar a análise com IA.
                        </p>
                        <button
                          onClick={() => setSettingsOpen(true)}
                          className="text-sm text-amber-700 font-medium underline mt-2 hover:text-amber-800"
                        >
                          Abrir Configurações
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {isAnalyzing && (
                  <ProgressBar progress={progress} message={progressMessage} />
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze || isAnalyzing || !hasApiKey}
                    loading={isAnalyzing}
                    icon={isAnalyzing ? undefined : <Play className="w-4 h-4" />}
                    className="flex-1"
                  >
                    {isAnalyzing ? 'Analisando...' : 'Analisar'}
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={handleReset}
                    disabled={isAnalyzing}
                    icon={<RotateCcw className="w-4 h-4" />}
                  >
                    Limpar
                  </Button>
                </div>

                {/* Status Info */}
                <div className="text-sm text-slate-500 text-center">
                  {peticao?.status === 'ready' && contestacao?.status === 'ready' ? (
                    <span>Petição e Contestação carregadas</span>
                  ) : peticao?.status === 'ready' ? (
                    <span>Apenas Petição carregada (análise parcial)</span>
                  ) : (
                    <span>Carregue a petição inicial para começar</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            <ResultsContainer />
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

const AnalisadorApp: React.FC = () => {
  return (
    <ToastProvider>
      <AnalisadorContent />
    </ToastProvider>
  );
};

export default AnalisadorApp;
