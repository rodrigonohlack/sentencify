/**
 * TopicCurationModal.tsx
 * Modal de curadoria de tópicos pré-geração de mini-relatórios
 * v1.39.05 - Fix: MeasuringStrategy.Always + touch-action:none para auto-scroll durante drag
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, MeasuringStrategy } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Trash2,
  GitMerge,
  Scissors,
  Plus,
  X,
  Check,
  Clock,
  DollarSign,
  FileText,
  ChevronDown,
  Pin
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type TopicCategory = 'PRELIMINAR' | 'PREJUDICIAL' | 'MÉRITO' | 'PROCESSUAL' | 'RELATÓRIO' | 'DISPOSITIVO';

export interface Topic {
  id?: string | number;
  title: string;
  category: TopicCategory;
  content?: string;
  mergedFrom?: string[];
  splitFrom?: string;
  isNew?: boolean;
}

interface CostEstimate {
  tokens: number;
  costBRL: string;
  costUSD: string;
  timeMinutes: number;
  timeSeconds: number;
  // Breakdown para tooltip
  breakdown: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    inputCostBRL: string;
    outputCostBRL: string;
    thinkingCostBRL: string;
  };
  thinkingLabel: string;  // ex: "thinking high" ou "10K tokens"
}

interface TopicCurationModalProps {
  isOpen: boolean;
  onConfirm: (topics: Topic[]) => void;
  onCancel: () => void;
  initialTopics?: Topic[];
  model?: string;
  parallelRequests?: number;
  isDarkMode?: boolean;
  // Configurações de custo
  provider?: 'anthropic' | 'gemini' | 'claude' | 'openai' | 'grok';
  thinkingBudget?: string;
  useExtendedThinking?: boolean;
  geminiThinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  topicsPerRequest?: number | 'all';
}

interface TopicPreviewCardProps {
  topic: Topic;
  index: number;
  editingTitle: string | null;
  onStartEdit: (title: string) => void;
  onSaveTitle: (oldTitle: string, newTitle: string, newCategory: TopicCategory) => void;
  onDelete: (topic: Topic) => void;
  onToggleMergeSelect: (topic: Topic) => void;
  isSelectedForMerge: boolean;
  onStartSplit: (topic: Topic) => void;
  isDarkMode: boolean;
}

interface SplitModalProps {
  topic: Topic | null;
  onConfirm: (titles: string[], category: TopicCategory) => void;
  onCancel: () => void;
  isDarkMode: boolean;
}

interface MergeConfirmProps {
  topics: Topic[];
  onConfirm: (title: string, category: TopicCategory) => void;
  onCancel: () => void;
  isDarkMode: boolean;
}

interface AddTopicInlineProps {
  onAdd: (title: string, category: TopicCategory) => void;
  onCancel: () => void;
  isDarkMode: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

// v1.35.49: Função para cores adaptativas ao tema (antes constante com baixo contraste no tema claro)
const getCategoryColors = (isDarkMode: boolean): Record<TopicCategory, string> => ({
  'PRELIMINAR': isDarkMode
    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30'
    : 'bg-amber-100 text-amber-800 border border-amber-300',
  'PREJUDICIAL': isDarkMode
    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
    : 'bg-purple-100 text-purple-800 border border-purple-300',
  'MÉRITO': isDarkMode
    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
    : 'bg-blue-100 text-blue-800 border border-blue-300',
  'PROCESSUAL': isDarkMode
    ? 'bg-slate-600/30 text-slate-300 border border-slate-500/30'
    : 'bg-slate-200 text-slate-700 border border-slate-300',
  'RELATÓRIO': isDarkMode
    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
    : 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  'DISPOSITIVO': isDarkMode
    ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/30'
    : 'bg-cyan-100 text-cyan-800 border border-cyan-300'
});

const CATEGORIES: TopicCategory[] = ['PRELIMINAR', 'PREJUDICIAL', 'MÉRITO', 'PROCESSUAL'];

// Preços por 1M tokens (USD)
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  // Claude
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-opus-4-5-20251101': { input: 15, output: 75 },
  // Gemini
  'gemini-3-flash-preview': { input: 0.50, output: 3.00 },
  'gemini-3-pro-preview': { input: 2.00, output: 12.00 },
  // OpenAI
  'gpt-5.2': { input: 2.50, output: 10.00 },
  'gpt-5.2-chat-latest': { input: 2.50, output: 10.00 },
  // Grok (xAI) - v1.36.35
  'grok-4-1-fast-reasoning': { input: 0.30, output: 1.50 },
  'grok-4-1-fast-non-reasoning': { input: 0.15, output: 0.75 }
};

// Nomes amigáveis dos modelos
const MODEL_NAMES: Record<string, string> = {
  // Claude
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-opus-4-20250514': 'Claude Opus 4',
  'claude-opus-4-5-20251101': 'Claude Opus 4.5',
  // Gemini
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'gemini-3-pro-preview': 'Gemini 3 Pro',
  // OpenAI
  'gpt-5.2': 'GPT-5.2',
  'gpt-5.2-chat-latest': 'GPT-5.2 Instant',
  // Grok (xAI)
  'grok-4-1-fast-reasoning': 'Grok 4.1 Fast',
  'grok-4-1-fast-non-reasoning': 'Grok 4.1 Lite'
};

// Estimativas de tokens para cálculo de custo (calibrado com dados reais)
const BASE_CONTEXT_TOKENS = 3500;    // petição + contestação típicas
const TOKENS_PER_TOPIC_PROMPT = 300; // prompt do tópico
const TOKENS_PER_TOPIC_OUTPUT = 1800; // mini-relatório gerado

// Tokens de thinking por nível (Gemini) - calibrado com custos reais
const GEMINI_THINKING_TOKENS: Record<string, number> = {
  'minimal': 500,
  'low': 1000,
  'medium': 2500,
  'high': 5000
};

const USD_TO_BRL = 5.50;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS
// ═══════════════════════════════════════════════════════════════════════════════

interface EstimateOptions {
  provider?: 'anthropic' | 'gemini' | 'openai' | 'grok';
  thinkingBudget?: string;
  useExtendedThinking?: boolean;
  geminiThinkingLevel?: string;
  topicsPerRequest?: number | 'all';
  grokModel?: string;
}

const estimateCostAndTime = (
  topicCount: number,
  model: string = 'claude-sonnet-4-20250514',
  parallelRequests: number = 5,
  options: EstimateOptions = {}
): CostEstimate => {
  const {
    provider = 'anthropic',
    thinkingBudget = '10000',
    useExtendedThinking = true,
    geminiThinkingLevel = 'high',
    topicsPerRequest = 1
  } = options;

  const prices = MODEL_PRICES[model] || MODEL_PRICES['claude-sonnet-4-20250514'];

  // Calcular tokens de input considerando batch size
  const batchSize = topicsPerRequest === 'all'
    ? topicCount
    : (typeof topicsPerRequest === 'number' ? topicsPerRequest : 1);

  // Contexto é dividido pelo batch (enviado 1x por batch, não por tópico)
  const numberOfBatches = Math.ceil(topicCount / batchSize);
  const contextTokensTotal = BASE_CONTEXT_TOKENS * numberOfBatches;
  const promptTokensTotal = TOKENS_PER_TOPIC_PROMPT * topicCount;
  const inputTokens = contextTokensTotal + promptTokensTotal;

  // Tokens de output (mini-relatórios)
  const outputTokens = TOKENS_PER_TOPIC_OUTPUT * topicCount;

  // Tokens de thinking
  let thinkingTokens = 0;
  let thinkingLabel = '';

  if (provider === 'gemini') {
    thinkingTokens = GEMINI_THINKING_TOKENS[geminiThinkingLevel] || 0;
    thinkingLabel = thinkingTokens > 0 ? `thinking ${geminiThinkingLevel}` : '';
  } else if (provider === 'grok') {
    // Grok: reasoning está embutido no modelo (sem budget separado)
    const isReasoning = model.includes('reasoning');
    thinkingLabel = isReasoning ? 'thinking embutido' : '';
    thinkingTokens = 0; // Já incluso no preço do modelo
  } else if (provider === 'openai') {
    // OpenAI: sem thinking explícito
    thinkingLabel = '';
    thinkingTokens = 0;
  } else {
    // Claude (anthropic)
    thinkingTokens = useExtendedThinking ? parseInt(thinkingBudget || '0', 10) : 0;
    if (thinkingTokens > 0) {
      thinkingLabel = `${Math.round(thinkingTokens / 1000)}K tokens thinking`;
    }
  }

  // Thinking tokens são multiplicados pelo número de requests (batches)
  const thinkingTokensTotal = thinkingTokens * numberOfBatches;

  // Calcular custos (USD)
  const inputCostUSD = (inputTokens / 1000000) * prices.input;
  const outputCostUSD = (outputTokens / 1000000) * prices.output;
  // Thinking é cobrado como output tokens
  const thinkingCostUSD = (thinkingTokensTotal / 1000000) * prices.output;

  const totalCostUSD = inputCostUSD + outputCostUSD + thinkingCostUSD;
  const totalCostBRL = totalCostUSD * USD_TO_BRL;

  // Tempo estimado
  const timeSeconds = Math.ceil((topicCount * 15) / Math.min(parallelRequests, topicCount || 1));
  const timeMinutes = Math.ceil(timeSeconds / 60);

  return {
    tokens: inputTokens + outputTokens + thinkingTokensTotal,
    costBRL: totalCostBRL.toFixed(2),
    costUSD: totalCostUSD.toFixed(3),
    timeMinutes,
    timeSeconds,
    breakdown: {
      inputTokens,
      outputTokens,
      thinkingTokens: thinkingTokensTotal,
      inputCostBRL: (inputCostUSD * USD_TO_BRL).toFixed(2),
      outputCostBRL: (outputCostUSD * USD_TO_BRL).toFixed(2),
      thinkingCostBRL: (thinkingCostUSD * USD_TO_BRL).toFixed(2)
    },
    thinkingLabel
  };
};

const isSpecialTopic = (topic: Topic | null): boolean => {
  return topic?.title?.toUpperCase() === 'RELATÓRIO';
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TopicCardVisual (visual puro, sem lógica de drag)
// Usado tanto na lista quanto no DragOverlay
// ═══════════════════════════════════════════════════════════════════════════════

interface TopicCardVisualProps {
  topic: Topic;
  index: number;
  isDarkMode: boolean;
  isOverlay?: boolean;
  isDragging?: boolean;
  isSelectedForMerge?: boolean;
}

const TopicCardVisual: React.FC<TopicCardVisualProps> = ({
  topic,
  index,
  isDarkMode,
  isOverlay = false,
  isDragging = false,
  isSelectedForMerge = false
}) => {
  const isSpecial = isSpecialTopic(topic);
  const categoryColors = getCategoryColors(isDarkMode);
  const categoryColor = categoryColors[topic.category] || categoryColors['MÉRITO'];

  return (
    <div
      className={`
        flex items-center gap-2 p-3 rounded-lg border transition-all
        ${isDragging && !isOverlay ? 'ring-2 ring-blue-500' : ''}
        ${isOverlay ? 'ring-2 ring-blue-500 shadow-2xl' : ''}
        ${isSelectedForMerge ? 'ring-2 ring-green-500 bg-green-900/20' : ''}
        ${isSpecial ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-slate-800/50 border-slate-700'}
        ${isDarkMode ? '' : 'bg-white/90 border-slate-300'}
      `}
      style={isOverlay ? {
        cursor: 'grabbing',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      } : undefined}
    >
      {isSpecial ? (
        <Pin className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-label="Posição fixa" />
      ) : (
        <div className={isOverlay ? 'cursor-grabbing' : 'cursor-grab'}>
          <GripVertical className="w-4 h-4 text-slate-500" />
        </div>
      )}

      <span className={`text-xs w-6 flex-shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {index + 1}.
      </span>

      <span className={`flex-1 truncate ${isSpecial ? 'text-emerald-400' : isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        {topic.title}
      </span>

      <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${categoryColor}`}>
        {topic.category}
      </span>

      {isSpecial && (
        <span className="text-xs text-emerald-400 flex-shrink-0">
          Fixo
        </span>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TopicPreviewCard (com React.memo para evitar re-renders)
// ═══════════════════════════════════════════════════════════════════════════════

const TopicPreviewCard = React.memo<TopicPreviewCardProps>(({
  topic,
  index,
  editingTitle,
  onStartEdit,
  onSaveTitle,
  onDelete,
  onToggleMergeSelect,
  isSelectedForMerge,
  onStartSplit,
  isDarkMode
}) => {
  const [localTitle, setLocalTitle] = useState(topic.title);
  const [localCategory, setLocalCategory] = useState<TopicCategory>(topic.category);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSpecial = isSpecialTopic(topic);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: topic.id || topic.title,
    disabled: isSpecial
  });

  // Usar Translate em vez de Transform para melhor performance
  // Opacity baixa porque o DragOverlay mostra o "ghost" real
  const style: React.CSSProperties = {
    transform: DndCSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1
  };

  useEffect(() => {
    if (editingTitle === topic.title && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTitle, topic.title]);

  useEffect(() => {
    setLocalTitle(topic.title);
    setLocalCategory(topic.category);
  }, [topic.title, topic.category]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveTitle(topic.title, localTitle.trim().toUpperCase(), localCategory);
    } else if (e.key === 'Escape') {
      setLocalTitle(topic.title);
      setLocalCategory(topic.category);
      onSaveTitle(topic.title, topic.title, topic.category);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (editingTitle === topic.title && !showCategoryDropdown) {
        onSaveTitle(topic.title, localTitle.trim().toUpperCase() || topic.title, localCategory);
      }
    }, 150);
  };

  const handleCategorySelect = (cat: TopicCategory) => {
    setLocalCategory(cat);
    setShowCategoryDropdown(false);
  };

  const categoryColors = getCategoryColors(isDarkMode);
  const categoryColor = categoryColors[topic.category] || categoryColors['MÉRITO'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-3 rounded-lg border transition-all
        ${isDragging ? 'ring-2 ring-blue-500 shadow-lg' : ''}
        ${isSelectedForMerge ? 'ring-2 ring-green-500 bg-green-900/20' : ''}
        ${isSpecial ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}
        ${isDarkMode ? '' : 'bg-white/90 border-slate-300 hover:border-slate-400'}
      `}
    >
      {isSpecial ? (
        <Pin className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-label="Posição fixa" />
      ) : (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
          <GripVertical className="w-4 h-4 text-slate-500 hover:text-slate-300" />
        </div>
      )}

      <span className={`text-xs w-6 flex-shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {index + 1}.
      </span>

      {editingTitle === topic.title ? (
        <div className="flex-1 flex gap-2">
          <input
            ref={inputRef}
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={`
              flex-1 px-2 py-1 rounded border-2 border-blue-500
              focus:ring-2 focus:ring-blue-500/50 focus:outline-none
              ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}
            `}
            placeholder="Título do tópico"
          />
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${categoryColors[localCategory]}`}
            >
              {localCategory}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showCategoryDropdown && (
              <div className={`
                absolute right-0 top-full mt-1 z-50 rounded-lg shadow-xl border
                ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}
              `}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className={`
                      block w-full text-left px-3 py-2 text-xs
                      ${localCategory === cat ? 'bg-blue-600/30' : ''}
                      ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}
                    `}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <span
          onClick={() => !isSpecial && onStartEdit(topic.title)}
          className={`
            flex-1 truncate
            ${isSpecial
              ? 'text-emerald-400 cursor-default'
              : `cursor-pointer hover:text-blue-400 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`
            }
          `}
          title={isSpecial ? 'Tópico fixo (não editável)' : 'Clique para editar'}
        >
          {topic.title}
        </span>
      )}

      {editingTitle !== topic.title && (
        <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${categoryColor}`}>
          {topic.category}
        </span>
      )}

      {!isSpecial && editingTitle !== topic.title && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onToggleMergeSelect(topic)}
            className={`
              p-1.5 rounded transition-colors
              ${isSelectedForMerge
                ? 'bg-green-600 text-white'
                : `${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`
              }
            `}
            title={isSelectedForMerge ? 'Remover da seleção' : 'Selecionar para mesclar'}
          >
            <GitMerge className="w-4 h-4" />
          </button>

          <button
            onClick={() => onStartSplit(topic)}
            className={`p-1.5 rounded transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
            title="Separar em subtópicos"
          >
            <Scissors className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(topic)}
            className={`p-1.5 rounded transition-colors text-red-400 ${isDarkMode ? 'hover:bg-red-900/50' : 'hover:bg-red-100'}`}
            title="Remover tópico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {isSpecial && (
        <span className="text-xs text-emerald-400 flex-shrink-0">
          Fixo
        </span>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: SplitModal
// ═══════════════════════════════════════════════════════════════════════════════

const SplitModal: React.FC<SplitModalProps> = ({ topic, onConfirm, onCancel, isDarkMode }) => {
  const [splitNames, setSplitNames] = useState<string[]>(['', '']);
  const [category, _setCategory] = useState<TopicCategory>(topic?.category || 'MÉRITO');

  const addField = () => {
    if (splitNames.length < 5) {
      setSplitNames([...splitNames, '']);
    }
  };

  const updateField = (index: number, value: string) => {
    const newNames = [...splitNames];
    newNames[index] = value.toUpperCase();
    setSplitNames(newNames);
  };

  const removeField = (index: number) => {
    if (splitNames.length > 2) {
      setSplitNames(splitNames.filter((_, i) => i !== index));
    }
  };

  const validNames = splitNames.filter(n => n.trim().length > 0);
  const canConfirm = validNames.length >= 2;

  return (
    <div className={`
      mt-2 p-4 rounded-lg border
      ${isDarkMode ? 'bg-slate-800/80 border-slate-600' : 'bg-slate-50 border-slate-300'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Separar "{topic?.title}" em:
        </h4>
        <button
          onClick={onCancel}
          className={`p-1 rounded ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {splitNames.map((name, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              value={name}
              onChange={(e) => updateField(idx, e.target.value)}
              placeholder={`Subtópico ${idx + 1}`}
              className={`
                flex-1 px-3 py-2 rounded border
                ${isDarkMode
                  ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }
              `}
            />
            {splitNames.length > 2 && (
              <button
                onClick={() => removeField(idx)}
                className="p-2 text-red-400 hover:bg-red-900/30 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {splitNames.length < 5 && (
        <button
          onClick={addField}
          className={`
            w-full py-2 rounded border border-dashed text-sm
            ${isDarkMode
              ? 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
              : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600'
            }
          `}
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Adicionar subtópico
        </button>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onCancel}
          className={`px-4 py-2 rounded ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
        >
          Cancelar
        </button>
        <button
          onClick={() => canConfirm && onConfirm(validNames, category)}
          disabled={!canConfirm}
          className={`
            px-4 py-2 rounded font-medium
            ${canConfirm
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          Separar ({validNames.length} tópicos)
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: MergeConfirm
// ═══════════════════════════════════════════════════════════════════════════════

const MergeConfirm: React.FC<MergeConfirmProps> = ({ topics, onConfirm, onCancel, isDarkMode }) => {
  const [mergedTitle, setMergedTitle] = useState(topics.map(t => t.title).join(' + '));
  const [category, setCategory] = useState<TopicCategory>(topics[0]?.category || 'MÉRITO');

  // v1.36.13: Refs para auto-scroll e focus
  const mergeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // v1.36.13: Scroll suave para o topo e foca no input quando abre
  // v1.36.43: Guard para JSDOM (testes) que não implementa scrollIntoView
  useEffect(() => {
    if (typeof mergeRef.current?.scrollIntoView === 'function') {
      mergeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    inputRef.current?.focus();
  }, []);

  return (
    <div ref={mergeRef} className={`
      p-4 rounded-lg border mb-4
      ${isDarkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200'}
    `}>
      <div className="flex items-center gap-2 mb-3">
        <GitMerge className="w-5 h-5 text-green-500" />
        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Mesclar {topics.length} tópicos
        </h4>
      </div>

      <div className="text-sm text-slate-400 mb-3">
        {topics.map((t, i) => (
          <span key={t.title}>
            {i > 0 && ' + '}
            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t.title}</span>
          </span>
        ))}
      </div>

      <input
        ref={inputRef}
        value={mergedTitle}
        onChange={(e) => setMergedTitle(e.target.value.toUpperCase())}
        placeholder="Título do tópico mesclado"
        className={`
          w-full px-3 py-2 rounded border mb-3
          ${isDarkMode
            ? 'bg-slate-900 border-slate-600 text-white'
            : 'bg-white border-slate-300 text-slate-900'
          }
        `}
      />

      <div className="flex items-center gap-3 mb-3">
        <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Categoria:
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TopicCategory)}
          className={`
            px-3 py-1.5 rounded border text-sm
            ${isDarkMode
              ? 'bg-slate-900 border-slate-600 text-white'
              : 'bg-white border-slate-300 text-slate-900'
            }
          `}
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className={`px-4 py-2 rounded ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
        >
          Cancelar
        </button>
        <button
          onClick={() => mergedTitle.trim() && onConfirm(mergedTitle.trim(), category)}
          disabled={!mergedTitle.trim()}
          className={`
            px-4 py-2 rounded font-medium
            ${mergedTitle.trim()
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-4 h-4 inline mr-1" />
          Confirmar Mesclagem
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: AddTopicInline
// ═══════════════════════════════════════════════════════════════════════════════

const AddTopicInline: React.FC<AddTopicInlineProps> = ({ onAdd, onCancel, isDarkMode }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TopicCategory>('MÉRITO');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAdd = () => {
    if (title.trim()) {
      onAdd(title.trim().toUpperCase(), category);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={`
      flex items-center gap-2 p-3 rounded-lg border
      ${isDarkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'}
    `}>
      <Plus className="w-4 h-4 text-blue-500 flex-shrink-0" />

      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        placeholder="Título do novo tópico"
        className={`
          flex-1 px-3 py-2 rounded border
          ${isDarkMode
            ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
          }
        `}
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as TopicCategory)}
        className={`
          px-3 py-2 rounded border text-sm
          ${isDarkMode
            ? 'bg-slate-900 border-slate-600 text-white'
            : 'bg-white border-slate-300 text-slate-900'
          }
        `}
      >
        {CATEGORIES.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <button
        onClick={handleAdd}
        disabled={!title.trim()}
        className={`
          p-2 rounded
          ${title.trim()
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        <Check className="w-4 h-4" />
      </button>

      <button
        onClick={onCancel}
        className={`p-2 rounded ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: TopicCurationModal
// ═══════════════════════════════════════════════════════════════════════════════

const TopicCurationModal: React.FC<TopicCurationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel: _onCancel,
  initialTopics = [],
  model = 'claude-sonnet-4-20250514',
  parallelRequests = 5,
  isDarkMode = true,
  // Novas props de custo
  provider = 'anthropic',
  thinkingBudget = '10000',
  useExtendedThinking = true,
  geminiThinkingLevel = 'high',
  topicsPerRequest = 1
}) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<Topic[]>([]);
  const [splittingTopic, setSplittingTopic] = useState<Topic | null>(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [deletedTopics, setDeletedTopics] = useState<{topic: Topic, index: number}[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen && initialTopics.length > 0) {
      const topicsWithIds = initialTopics.map((t, idx) => ({
        ...t,
        id: t.id || `topic-${idx}-${t.title}`
      }));
      setTopics(topicsWithIds);
      setSelectedForMerge([]);
      setSplittingTopic(null);
      setShowMergeConfirm(false);
      setIsAddingTopic(false);
      setDeletedTopics([]);
    }
  }, [isOpen, initialTopics]);

  // v1.39.01: Bloqueia scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // v1.39.01: Previne scroll da página durante drag (captura wheel fora do modal)
  useEffect(() => {
    if (!isDragging) return;

    const preventScroll = (e: WheelEvent) => {
      // Permite scroll apenas dentro do container scrollável do modal
      const target = e.target as HTMLElement;
      const modalContent = document.querySelector('[data-modal-scroll-container]');
      if (modalContent && !modalContent.contains(target)) {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', preventScroll, { passive: false });
    return () => document.removeEventListener('wheel', preventScroll);
  }, [isDragging]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const estimate = useMemo(() => {
    const topicsToGenerate = topics.filter(t => !isSpecialTopic(t)).length;
    // v1.36.35: Mapear providers corretamente (claude -> anthropic, demais mantém)
    const estimateProvider = provider === 'claude' ? 'anthropic' : provider;
    return estimateCostAndTime(topicsToGenerate, model, parallelRequests, {
      provider: estimateProvider as 'anthropic' | 'gemini' | 'openai' | 'grok',
      thinkingBudget,
      useExtendedThinking,
      geminiThinkingLevel,
      topicsPerRequest
    });
  }, [topics, model, parallelRequests, provider, thinkingBudget, useExtendedThinking, geminiThinkingLevel, topicsPerRequest]);

  const specialTopicIds = useMemo(() => {
    return new Set(
      topics
        .filter(t => isSpecialTopic(t))
        .map(t => t.id || t.title)
    );
  }, [topics]);

  // Encontrar tópico ativo para o DragOverlay
  const activeTopic = useMemo(() => {
    if (!activeId) return null;
    return topics.find(t => (t.id || t.title) === activeId) || null;
  }, [activeId, topics]);

  const activeIndex = useMemo(() => {
    if (!activeId) return -1;
    return topics.findIndex(t => (t.id || t.title) === activeId);
  }, [activeId, topics]);

  const customCollisionDetection = useCallback((args: Parameters<typeof closestCenter>[0]) => {
    const { droppableContainers, ...rest } = args;
    const filteredContainers = droppableContainers.filter(
      container => !specialTopicIds.has(container.id as string)
    );
    return closestCenter({ ...rest, droppableContainers: filteredContainers });
  }, [specialTopicIds]);

  // Handler para início do drag - salva o ID do item ativo e ativa lock de scroll
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  }, []);

  // Handler para cancelamento do drag (ex: ESC) - limpa estados
  const handleDragCancel = useCallback(() => {
    setIsDragging(false);
    setActiveId(null);
  }, []);

  // Handler para fim do drag - reordena e limpa o ID ativo e desativa lock de scroll
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveId(null);  // Limpar sempre ao terminar

    if (!over || active.id === over.id) return;

    setTopics(prevTopics => {
      const oldIndex = prevTopics.findIndex(t => (t.id || t.title) === active.id);
      const newIndex = prevTopics.findIndex(t => (t.id || t.title) === over.id);

      if (isSpecialTopic(prevTopics[oldIndex]) || isSpecialTopic(prevTopics[newIndex])) {
        return prevTopics;
      }

      return arrayMove(prevTopics, oldIndex, newIndex);
    });
  }, []);

  const handleStartEdit = useCallback((title: string) => {
    setEditingTitle(title);
  }, []);

  const handleSaveTitle = useCallback((oldTitle: string, newTitle: string, newCategory: TopicCategory) => {
    if (newTitle && newTitle !== oldTitle) {
      setTopics(prevTopics => prevTopics.map(t =>
        t.title === oldTitle
          ? { ...t, title: newTitle, category: newCategory || t.category }
          : t
      ));
    } else if (newCategory) {
      setTopics(prevTopics => prevTopics.map(t =>
        t.title === oldTitle
          ? { ...t, category: newCategory }
          : t
      ));
    }
    setEditingTitle(null);
  }, []);

  const handleDelete = useCallback((topic: Topic) => {
    setTopics(prevTopics => {
      const index = prevTopics.findIndex(t => t.title === topic.title);
      setDeletedTopics(prev => [...prev, { topic, index }]);
      return prevTopics.filter(t => t.title !== topic.title);
    });
    setSelectedForMerge(prev => prev.filter(t => t.title !== topic.title));
  }, []);

  const handleUndoDelete = useCallback(() => {
    setDeletedTopics(prevDeleted => {
      if (prevDeleted.length > 0) {
        const { topic, index } = prevDeleted[prevDeleted.length - 1];
        setTopics(prevTopics => {
          const newTopics = [...prevTopics];
          newTopics.splice(Math.min(index, newTopics.length), 0, topic);
          return newTopics;
        });
        return prevDeleted.slice(0, -1);
      }
      return prevDeleted;
    });
  }, []);

  const handleToggleMergeSelect = useCallback((topic: Topic) => {
    setSelectedForMerge(prev => {
      const isSelected = prev.some(t => t.title === topic.title);
      return isSelected
        ? prev.filter(t => t.title !== topic.title)
        : [...prev, topic];
    });
    setShowMergeConfirm(false);
  }, []);

  const handleConfirmMerge = useCallback((mergedTitle: string, category: TopicCategory) => {
    if (selectedForMerge.length < 2) return;

    const firstIndex = topics.findIndex(t =>
      selectedForMerge.some(st => st.title === t.title)
    );

    const mergedTopic: Topic = {
      id: `merged-${Date.now()}`,
      title: mergedTitle,
      category: category,
      mergedFrom: selectedForMerge.map(t => t.title)
    };

    const remainingTopics = topics.filter(t =>
      !selectedForMerge.some(st => st.title === t.title)
    );
    remainingTopics.splice(firstIndex, 0, mergedTopic);

    setTopics(remainingTopics);
    setSelectedForMerge([]);
    setShowMergeConfirm(false);
  }, [topics, selectedForMerge]);

  const handleStartSplit = useCallback((topic: Topic) => {
    setSplittingTopic(topic);
  }, []);

  const handleConfirmSplit = useCallback((newTitles: string[], category: TopicCategory) => {
    if (!splittingTopic || newTitles.length < 2) return;

    const originalIndex = topics.findIndex(t => t.title === splittingTopic.title);

    const newTopics: Topic[] = newTitles.map((title, idx) => ({
      id: `split-${Date.now()}-${idx}`,
      title: title,
      category: category,
      splitFrom: splittingTopic.title
    }));

    const updatedTopics = [...topics];
    updatedTopics.splice(originalIndex, 1, ...newTopics);

    setTopics(updatedTopics);
    setSplittingTopic(null);
  }, [topics, splittingTopic]);

  const handleAddTopic = useCallback((title: string, category: TopicCategory) => {
    const newTopic: Topic = {
      id: `new-${Date.now()}`,
      title: title,
      category: category,
      isNew: true
    };
    setTopics([...topics, newTopic]);
    setIsAddingTopic(false);
  }, [topics]);

  const handleConfirm = useCallback(() => {
    const cleanedTopics = topics.map(({ id, mergedFrom, splitFrom, isNew, ...rest }) => rest as Topic);
    onConfirm(cleanedTopics);
  }, [topics, onConfirm]);

  // ESC handler removido - modal não pode ser fechado acidentalmente

  if (!isOpen) return null;

  const topicsToGenerateCount = topics.filter(t => !isSpecialTopic(t)).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop sem onClick - modal não pode ser fechado acidentalmente */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className={`
        relative w-full max-w-[80vw] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl
        ${isDarkMode
          ? 'bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-slate-700/50'
          : 'bg-white border border-slate-200'
        }
      `}>
        <div className={`
          flex items-center justify-between p-4 border-b
          ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}
        `}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Revisão de Tópicos
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {topics.length} tópicos identificados
              </p>
            </div>
          </div>
          {/* Botão X removido - modal não pode ser fechado acidentalmente */}
        </div>

        <div className={`
          px-4 py-3 text-sm flex items-center gap-4 border-b
          ${isDarkMode ? 'bg-slate-800/50 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}
        `}>
          <span>☰ Arraste para reordenar</span>
          <span>📝 Clique para editar</span>
          <span>🗑️ Apague desnecessários</span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          autoScroll={true}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
        >
        <div className="flex-1 overflow-y-auto p-4 space-y-2" data-modal-scroll-container>
          {showMergeConfirm && selectedForMerge.length >= 2 && (
            <MergeConfirm
              topics={selectedForMerge}
              onConfirm={handleConfirmMerge}
              onCancel={() => setShowMergeConfirm(false)}
              isDarkMode={isDarkMode}
            />
          )}

            <SortableContext
              items={topics.map(t => t.id || t.title)}
              strategy={verticalListSortingStrategy}
            >
              {topics.map((topic, index) => (
                <div key={topic.id || topic.title}>
                  <TopicPreviewCard
                    topic={topic}
                    index={index}
                    editingTitle={editingTitle}
                    onStartEdit={handleStartEdit}
                    onSaveTitle={handleSaveTitle}
                    onDelete={handleDelete}
                    onToggleMergeSelect={handleToggleMergeSelect}
                    isSelectedForMerge={selectedForMerge.some(t => t.title === topic.title)}
                    onStartSplit={handleStartSplit}
                    isDarkMode={isDarkMode}
                  />

                  {splittingTopic?.title === topic.title && (
                    <SplitModal
                      topic={topic}
                      onConfirm={handleConfirmSplit}
                      onCancel={() => setSplittingTopic(null)}
                      isDarkMode={isDarkMode}
                    />
                  )}
                </div>
              ))}
            </SortableContext>

          {isAddingTopic ? (
            <AddTopicInline
              onAdd={handleAddTopic}
              onCancel={() => setIsAddingTopic(false)}
              isDarkMode={isDarkMode}
            />
          ) : (
            <button
              onClick={() => setIsAddingTopic(true)}
              className={`
                w-full py-3 rounded-lg border border-dashed transition-colors
                ${isDarkMode
                  ? 'border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400'
                  : 'border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-500'
                }
              `}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Adicionar Tópico
            </button>
          )}
        </div>

          {/* DragOverlay fora do scroll container para posicionar livremente */}
          <DragOverlay dropAnimation={null}>
            {activeTopic && (
              <TopicCardVisual
                topic={activeTopic}
                index={activeIndex}
                isDarkMode={isDarkMode}
                isOverlay={true}
                isSelectedForMerge={selectedForMerge.some(t => t.title === activeTopic.title)}
              />
            )}
          </DragOverlay>
        </DndContext>

        <div className={`
          p-4 border-t
          ${isDarkMode ? 'border-slate-700/50 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}
        `}>
          {selectedForMerge.length >= 2 && !showMergeConfirm && (
            <button
              onClick={() => setShowMergeConfirm(true)}
              className="w-full mb-3 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <GitMerge className="w-4 h-4" />
              Mesclar {selectedForMerge.length} tópicos selecionados
            </button>
          )}

          {deletedTopics.length > 0 && (
            <button
              onClick={handleUndoDelete}
              className={`
                w-full mb-3 py-2 px-4 rounded-lg border border-dashed
                ${isDarkMode
                  ? 'border-amber-600/50 text-amber-400 hover:bg-amber-900/20'
                  : 'border-amber-400 text-amber-600 hover:bg-amber-50'
                }
              `}
            >
              ↩️ Desfazer exclusão de "{deletedTopics[deletedTopics.length - 1]?.topic.title}"
            </button>
          )}

          <div className={`
            flex items-center justify-center gap-6 mb-4 py-2 px-4 rounded-lg
            ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'}
          `}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {topicsToGenerateCount} tópicos
              </span>
            </div>
            <div
              className="flex items-center gap-2 cursor-help"
              title={`Estimativa detalhada:
• Documentos + prompts (${Math.round(estimate.breakdown.inputTokens / 1000)}K tokens): R$ ${estimate.breakdown.inputCostBRL}
• Mini-relatórios (${Math.round(estimate.breakdown.outputTokens / 1000)}K tokens): R$ ${estimate.breakdown.outputCostBRL}${estimate.breakdown.thinkingTokens > 0 ? `
• Thinking (${Math.round(estimate.breakdown.thinkingTokens / 1000)}K tokens): R$ ${estimate.breakdown.thinkingCostBRL}` : ''}
• Batch: ${topicsPerRequest === 'all' ? 'todos em 1 request' : `${topicsPerRequest} tópico(s)/request`}`}
            >
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                ~R$ {estimate.costBRL} ({MODEL_NAMES[model] || model}{estimate.thinkingLabel ? ` + ${estimate.thinkingLabel}` : ''})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                ~{estimate.timeMinutes} min
              </span>
            </div>
          </div>

          {/* Botão Cancelar removido - apenas Confirmar disponível */}
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={topicsToGenerateCount === 0}
              className={`
                flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                ${topicsToGenerateCount > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              <Check className="w-4 h-4" />
              Confirmar e Gerar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicCurationModal;
