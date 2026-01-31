/**
 * @file InputForm.tsx
 * @description Formulário de entrada para análise de prova oral
 * v1.39.08: Integração com StreamingModal para feedback em tempo real
 */

import React, { useState, useCallback } from 'react';
import {
  Mic,
  FileText,
  Play,
  Trash2,
  Import,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button, TextArea, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { AnalysisSelectorModal } from './AnalysisSelectorModal';
import { StreamingModal } from '../StreamingModal';
import { useProvaOralStore } from '../../stores';
import { useProvaOralAnalysis, useProvaOralAPI } from '../../hooks';
import { useAIStore } from '../../stores';

interface InputFormProps {
  onAnalysisComplete?: () => void;
}

export const InputForm: React.FC<InputFormProps> = ({ onAnalysisComplete }) => {
  const {
    transcricao,
    sinteseProcesso,
    isAnalyzing,
    progress,
    progressMessage,
    error,
    result,
    setTranscricao,
    setSinteseProcesso,
    clearInputs,
    clearResult,
  } = useProvaOralStore();

  const {
    analyze,
    isStreaming,
    streamingText,
    showStreamingModal,
    closeStreamingModal
  } = useProvaOralAnalysis();
  const { createAnalysis } = useProvaOralAPI();

  // Pegar nome do provedor para exibir no modal
  const aiSettings = useAIStore((s) => s.aiSettings);
  const providerNames: Record<string, string> = {
    claude: 'Claude',
    gemini: 'Gemini',
    openai: 'OpenAI',
    grok: 'Grok'
  };
  const providerName = providerNames[aiSettings.provider] || 'IA';

  const [showImportModal, setShowImportModal] = useState(false);

  const handleAnalyze = useCallback(async () => {
    const analysisResult = await analyze(transcricao, sinteseProcesso);

    // Salvar automaticamente no backend se análise foi bem-sucedida
    if (analysisResult) {
      await createAnalysis({
        resultado: analysisResult,
        transcricao,
        sinteseProcesso,
      });
      // Notificar que análise completou
      onAnalysisComplete?.();
    }
  }, [analyze, createAnalysis, transcricao, sinteseProcesso, onAnalysisComplete]);

  const handleClear = useCallback(() => {
    clearInputs();
    clearResult();
  }, [clearInputs, clearResult]);

  const handleImportSintese = useCallback((sintese: string) => {
    setSinteseProcesso(sintese);
  }, [setSinteseProcesso]);

  const canAnalyze = transcricao.trim().length > 0 && !isAnalyzing;

  return (
    <>
      <div className="space-y-6">
        {/* Card de Transcrição */}
        <Card>
          <CardHeader>
            <CardTitle icon={<Mic className="w-5 h-5" />}>
              Transcrição da Audiência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TextArea
              placeholder="Cole aqui a transcrição completa da audiência (depoimentos do autor, preposto e testemunhas)..."
              value={transcricao}
              onChange={(e) => setTranscricao(e.target.value)}
              rows={12}
              disabled={isAnalyzing}
              hint={`${transcricao.length.toLocaleString()} caracteres`}
            />
          </CardContent>
        </Card>

        {/* Card de Síntese */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle icon={<FileText className="w-5 h-5" />}>
              Síntese do Processo
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImportModal(true)}
              disabled={isAnalyzing}
              icon={<Import className="w-4 h-4" />}
            >
              Importar do Analisador
            </Button>
          </CardHeader>
          <CardContent>
            <TextArea
              placeholder="Informações do processo: partes, pedidos, alegações do autor, defesas da ré...

Você pode:
1. Digitar manualmente a síntese
2. Importar de uma análise existente do Analisador de Prepauta (clique no botão acima)"
              value={sinteseProcesso}
              onChange={(e) => setSinteseProcesso(e.target.value)}
              rows={8}
              disabled={isAnalyzing}
              hint="Opcional, mas melhora a qualidade da análise"
            />
          </CardContent>
        </Card>

        {/* Barra de Progresso */}
        {isAnalyzing && (
          <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
            <CardContent>
              <div className="flex items-center gap-4">
                <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                      {progressMessage || 'Analisando...'}
                    </span>
                    <span className="text-sm text-indigo-600 dark:text-indigo-400">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Erro */}
        {error && !isAnalyzing && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Erro na análise
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            onClick={handleClear}
            disabled={isAnalyzing || (!transcricao && !sinteseProcesso && !result)}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Limpar
          </Button>

          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            loading={isAnalyzing}
            icon={<Play className="w-4 h-4" />}
          >
            {isAnalyzing ? 'Analisando...' : 'Analisar Prova Oral'}
          </Button>
        </div>
      </div>

      {/* Modal de Importação */}
      <AnalysisSelectorModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSelect={handleImportSintese}
      />

      {/* Modal de Streaming - exibe resposta em tempo real */}
      <StreamingModal
        isOpen={showStreamingModal}
        text={streamingText}
        isComplete={!isStreaming}
        onClose={closeStreamingModal}
        providerName={providerName}
      />
    </>
  );
};

export default InputForm;
