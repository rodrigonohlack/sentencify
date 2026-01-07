/**
 * ModelGeneratorModal - Gera prompts personalizados a partir de exemplos do juiz
 *
 * FLUXO:
 * 1. Juiz cola 1-5 exemplos de texto (relatório/dispositivo/mini-relatório)
 * 2. Sistema envia para LLM com meta-prompt + prompt hardcoded como referência
 * 3. LLM analisa estilo e gera prompt personalizado
 * 4. Juiz revisa/edita antes de salvar
 * 5. Prompt salvo substitui o hardcoded nas gerações futuras
 *
 * @version 1.35.73
 */

import React, { useState, useCallback } from 'react';
import { Wand2, Plus, Trash2, Loader2, ArrowLeft, Save, X } from 'lucide-react';
import { buildMetaPrompt, FIELD_LABELS, type TargetField } from '../prompts/meta-prompts';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

type Step = 'input' | 'preview';

interface ModelGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetField: TargetField | null;
  onSave: (generatedPrompt: string) => void;
  callAI: (messages: any[], options: any) => Promise<string>;
  hardcodedPrompt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const MAX_EXAMPLES = 5;
const MIN_EXAMPLES = 1;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const ModelGeneratorModal: React.FC<ModelGeneratorModalProps> = ({
  isOpen,
  onClose,
  targetField,
  onSave,
  callAI,
  hardcodedPrompt
}) => {
  // --- Estado ---
  const [examples, setExamples] = useState<string[]>(['']);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');

  // --- Reset e Close (definido antes dos useEffects) ---
  const resetAndClose = useCallback(() => {
    setExamples(['']);
    setGeneratedPrompt('');
    setStep('input');
    setError('');
    onClose();
  }, [onClose]);

  // --- ESC handler (padrão BaseModal) ---
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // Impede que chegue ao modal de baixo
        resetAndClose();
      }
    };
    if (isOpen && targetField) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, targetField, resetAndClose]);

  // --- Bloquear scroll do body (padrão BaseModal) ---
  React.useEffect(() => {
    if (isOpen && targetField) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, targetField]);

  // --- Handlers ---
  const handleAddExample = useCallback(() => {
    if (examples.length < MAX_EXAMPLES) {
      setExamples(prev => [...prev, '']);
    }
  }, [examples.length]);

  const handleRemoveExample = useCallback((index: number) => {
    if (examples.length > MIN_EXAMPLES) {
      setExamples(prev => prev.filter((_, i) => i !== index));
    }
  }, [examples.length]);

  const handleExampleChange = useCallback((index: number, value: string) => {
    setExamples(prev => prev.map((ex, i) => i === index ? value : ex));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!targetField) return;

    const validExamples = examples.filter(e => e.trim().length > 0);
    if (validExamples.length === 0) {
      setError('Insira pelo menos 1 exemplo.');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const result = await generateModelFromExamples(
        validExamples,
        targetField,
        hardcodedPrompt,
        callAI
      );
      setGeneratedPrompt(result);
      setStep('preview');
    } catch (err) {
      setError('Erro ao gerar modelo. Tente novamente.');
      console.error('[ModelGenerator] Erro:', err);
    } finally {
      setGenerating(false);
    }
  }, [examples, targetField, hardcodedPrompt, callAI]);

  const handleSave = useCallback(() => {
    onSave(generatedPrompt);
    resetAndClose();
  }, [generatedPrompt, onSave, resetAndClose]);

  const handleBack = useCallback(() => {
    setStep('input');
  }, []);

  // --- Render ---
  if (!isOpen || !targetField) return null;

  const label = FIELD_LABELS[targetField];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={resetAndClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto
                      theme-bg-primary border theme-border rounded-xl shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4
                        theme-bg-primary backdrop-blur-sm border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Wand2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold theme-text-primary">
                {step === 'input' ? 'Gerar Modelo Automaticamente' : 'Revisar Modelo Gerado'}
              </h2>
              <p className="text-sm theme-text-secondary">{label}</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 theme-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'input' ? (
            <InputStep
              examples={examples}
              onExampleChange={handleExampleChange}
              onAddExample={handleAddExample}
              onRemoveExample={handleRemoveExample}
              onGenerate={handleGenerate}
              generating={generating}
              error={error}
              label={label}
            />
          ) : (
            <PreviewStep
              generatedPrompt={generatedPrompt}
              onPromptChange={setGeneratedPrompt}
              onBack={handleBack}
              onSave={handleSave}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

interface InputStepProps {
  examples: string[];
  onExampleChange: (index: number, value: string) => void;
  onAddExample: () => void;
  onRemoveExample: (index: number) => void;
  onGenerate: () => void;
  generating: boolean;
  error: string;
  label: string;
}

const InputStep: React.FC<InputStepProps> = ({
  examples, onExampleChange, onAddExample, onRemoveExample,
  onGenerate, generating, error, label
}) => (
  <div className="space-y-4">
    <p className="theme-text-secondary">
      Cole abaixo 1-5 exemplos de <strong className="theme-text-primary">{label}</strong> que você escreveu anteriormente.
      A IA analisará seu estilo e gerará instruções personalizadas.
    </p>

    {/* Exemplos */}
    <div className="space-y-3">
      {examples.map((example, index) => (
        <div key={index} className="relative">
          <label className="block text-sm theme-text-tertiary mb-1">
            Exemplo {index + 1} {index === 0 ? '(obrigatório)' : '(opcional)'}
          </label>
          <textarea
            value={example}
            onChange={(e) => onExampleChange(index, e.target.value)}
            placeholder={`Cole aqui um exemplo de ${label}...`}
            className="w-full h-32 p-3 theme-bg-secondary border theme-border-input rounded-lg
                       theme-text-primary placeholder-slate-500 resize-none
                       focus:border-purple-500 focus:outline-none"
          />
          {index > 0 && (
            <button
              onClick={() => onRemoveExample(index)}
              className="absolute top-8 right-2 p-1 text-red-400 hover:text-red-300 transition-colors"
              title="Remover exemplo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>

    {/* Adicionar exemplo */}
    {examples.length < MAX_EXAMPLES && (
      <button
        onClick={onAddExample}
        className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Adicionar outro exemplo
      </button>
    )}

    {/* Erro */}
    {error && (
      <p className="text-sm text-red-400">{error}</p>
    )}

    {/* Botões */}
    <div className="flex justify-end gap-3 pt-4">
      <button
        onClick={onGenerate}
        disabled={generating}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500
                   text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Gerar Modelo
          </>
        )}
      </button>
    </div>
  </div>
);

interface PreviewStepProps {
  generatedPrompt: string;
  onPromptChange: (value: string) => void;
  onBack: () => void;
  onSave: () => void;
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  generatedPrompt, onPromptChange, onBack, onSave
}) => (
  <div className="space-y-4">
    <p className="theme-text-secondary">
      Revise o modelo gerado abaixo. Você pode editar antes de salvar.
    </p>

    <textarea
      value={generatedPrompt}
      onChange={(e) => onPromptChange(e.target.value)}
      className="w-full h-80 p-3 theme-bg-secondary border theme-border-input rounded-lg
                 theme-text-primary font-mono text-sm resize-none
                 focus:border-purple-500 focus:outline-none"
    />

    <div className="flex justify-between pt-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 theme-text-secondary hover:theme-text-primary
                   transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>
      <button
        onClick={onSave}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500
                   text-white rounded-lg transition-colors"
      >
        <Save className="w-4 h-4" />
        Salvar Modelo
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO DE GERAÇÃO (Core Logic)
// ═══════════════════════════════════════════════════════════════════════════

async function generateModelFromExamples(
  examples: string[],
  targetField: TargetField,
  hardcodedPrompt: string,
  callAI: (messages: any[], options: any) => Promise<string>
): Promise<string> {
  // buildMetaPrompt importado de ../prompts/meta-prompts
  const metaPrompt = buildMetaPrompt(targetField, examples, hardcodedPrompt);

  const response = await callAI([{
    role: 'user',
    content: [{ type: 'text', text: metaPrompt }]
  }], {
    maxTokens: 4000,
    temperature: 0.3,
    useInstructions: false
  });

  return response.trim();
}

export default ModelGeneratorModal;
