/**
 * TopicCurationModal.jsx
 * Modal de curadoria de tópicos pré-geração de mini-relatórios
 * v1.35.30 - Permite ao usuário revisar, reordenar, mesclar, separar e apagar tópicos
 *            ANTES de gastar tokens com a geração dos mini-relatórios
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Trash2,
  GitMerge,
  Scissors,
  Plus,
  X,
  Check,
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  ChevronDown,
  Pin
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_COLORS = {
  'PRELIMINAR': 'bg-amber-600/30 text-amber-300 border border-amber-500/30',
  'PREJUDICIAL': 'bg-purple-600/30 text-purple-300 border border-purple-500/30',
  'MÉRITO': 'bg-blue-600/30 text-blue-300 border border-blue-500/30',
  'PROCESSUAL': 'bg-slate-600/30 text-slate-300 border border-slate-500/30',
  'RELATÓRIO': 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
};

const CATEGORIES = ['PRELIMINAR', 'PREJUDICIAL', 'MÉRITO', 'PROCESSUAL'];

// Preços por 1M tokens (USD)
const MODEL_PRICES = {
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'gemini-2.0-flash-001': { input: 0.10, output: 0.40 },
  'gemini-2.5-pro-preview-06-05': { input: 1.25, output: 10 }
};

const TOKENS_PER_TOPIC = 4000; // Estimativa média de tokens por tópico
const USD_TO_BRL = 5.50;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estima custo e tempo para geração de mini-relatórios
 */
const estimateCostAndTime = (topicCount, model = 'claude-sonnet-4-20250514', parallelRequests = 5) => {
  const totalTokens = topicCount * TOKENS_PER_TOPIC;
  const prices = MODEL_PRICES[model] || MODEL_PRICES['claude-sonnet-4-20250514'];

  // Custo: 70% input, 30% output (estimativa)
  const costUSD = (totalTokens / 1000000) * (prices.input * 0.7 + prices.output * 0.3);
  const costBRL = costUSD * USD_TO_BRL;

  // Tempo: ~15s por tópico, dividido pelo paralelismo
  const timeSeconds = Math.ceil((topicCount * 15) / Math.min(parallelRequests, topicCount));
  const timeMinutes = Math.ceil(timeSeconds / 60);

  return {
    tokens: totalTokens,
    costBRL: costBRL.toFixed(2),
    costUSD: costUSD.toFixed(3),
    timeMinutes,
    timeSeconds
  };
};

/**
 * Verifica se é tópico especial (RELATÓRIO)
 */
const isSpecialTopic = (topic) => {
  return topic?.title?.toUpperCase() === 'RELATÓRIO';
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TopicPreviewCard (Card sortável com edição inline)
// ═══════════════════════════════════════════════════════════════════════════════

const TopicPreviewCard = ({
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
  const [localCategory, setLocalCategory] = useState(topic.category);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const inputRef = useRef(null);
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

  const style = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  };

  // Focus no input quando entra em modo de edição
  useEffect(() => {
    if (editingTitle === topic.title && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTitle, topic.title]);

  // Reset local state quando topic muda
  useEffect(() => {
    setLocalTitle(topic.title);
    setLocalCategory(topic.category);
  }, [topic.title, topic.category]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveTitle(topic.title, localTitle.trim().toUpperCase(), localCategory);
    } else if (e.key === 'Escape') {
      setLocalTitle(topic.title);
      setLocalCategory(topic.category);
      onSaveTitle(topic.title, topic.title, topic.category); // Cancela mantendo original
    }
  };

  const handleBlur = () => {
    // Pequeno delay para permitir clique no dropdown de categoria
    setTimeout(() => {
      if (editingTitle === topic.title && !showCategoryDropdown) {
        onSaveTitle(topic.title, localTitle.trim().toUpperCase() || topic.title, localCategory);
      }
    }, 150);
  };

  const handleCategorySelect = (cat) => {
    setLocalCategory(cat);
    setShowCategoryDropdown(false);
  };

  const categoryColor = CATEGORY_COLORS[topic.category] || CATEGORY_COLORS['MÉRITO'];

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
      {/* Drag Handle */}
      {isSpecial ? (
        <Pin className="w-4 h-4 text-emerald-500 flex-shrink-0" title="Posição fixa" />
      ) : (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-slate-500 hover:text-slate-300" />
        </div>
      )}

      {/* Posição */}
      <span className={`text-xs w-6 flex-shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {index + 1}.
      </span>

      {/* Título (editável) */}
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
          {/* Dropdown de categoria inline */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-xs
                ${CATEGORY_COLORS[localCategory]}
              `}
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

      {/* Categoria Badge (quando não editando) */}
      {editingTitle !== topic.title && (
        <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${categoryColor}`}>
          {topic.category}
        </span>
      )}

      {/* Ações */}
      {!isSpecial && editingTitle !== topic.title && (
        <div className="flex gap-1 flex-shrink-0">
          {/* Merge Select */}
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

          {/* Split */}
          <button
            onClick={() => onStartSplit(topic)}
            className={`p-1.5 rounded transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
            title="Separar em subtópicos"
          >
            <Scissors className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(topic)}
            className={`p-1.5 rounded transition-colors text-red-400 ${isDarkMode ? 'hover:bg-red-900/50' : 'hover:bg-red-100'}`}
            title="Remover tópico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Badge de posição fixa */}
      {isSpecial && (
        <span className="text-xs text-emerald-400 flex-shrink-0">
          Fixo
        </span>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: SplitModal (Mini-modal inline para separar tópico)
// ═══════════════════════════════════════════════════════════════════════════════

const SplitModal = ({ topic, onConfirm, onCancel, isDarkMode }) => {
  const [splitNames, setSplitNames] = useState(['', '']);
  const [category, setCategory] = useState(topic?.category || 'MÉRITO');

  const addField = () => {
    if (splitNames.length < 5) {
      setSplitNames([...splitNames, '']);
    }
  };

  const updateField = (index, value) => {
    const newNames = [...splitNames];
    newNames[index] = value.toUpperCase();
    setSplitNames(newNames);
  };

  const removeField = (index) => {
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
// COMPONENTE: MergeConfirm (Confirmação de merge)
// ═══════════════════════════════════════════════════════════════════════════════

const MergeConfirm = ({ topics, onConfirm, onCancel, isDarkMode }) => {
  const [mergedTitle, setMergedTitle] = useState(
    topics.map(t => t.title).join(' + ')
  );
  const [category, setCategory] = useState(topics[0]?.category || 'MÉRITO');

  return (
    <div className={`
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
          onChange={(e) => setCategory(e.target.value)}
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
// COMPONENTE: AddTopicInline (Adicionar novo tópico)
// ═══════════════════════════════════════════════════════════════════════════════

const AddTopicInline = ({ onAdd, onCancel, isDarkMode }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('MÉRITO');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAdd = () => {
    if (title.trim()) {
      onAdd(title.trim().toUpperCase(), category);
    }
  };

  const handleKeyDown = (e) => {
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
        onChange={(e) => setCategory(e.target.value)}
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

const TopicCurationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  initialTopics = [],
  model = 'claude-sonnet-4-20250514',
  parallelRequests = 5,
  isDarkMode = true
}) => {
  // Estados
  const [topics, setTopics] = useState([]);
  const [editingTitle, setEditingTitle] = useState(null);
  const [selectedForMerge, setSelectedForMerge] = useState([]);
  const [splittingTopic, setSplittingTopic] = useState(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [deletedTopics, setDeletedTopics] = useState([]); // Para undo

  // Inicializar tópicos
  useEffect(() => {
    if (isOpen && initialTopics.length > 0) {
      // Garantir que cada tópico tem um ID único
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

  // Sensores para dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  // Estimativa de custo
  const estimate = useMemo(() => {
    // Contar tópicos que precisam de mini-relatório (excluir RELATÓRIO)
    const topicsToGenerate = topics.filter(t => !isSpecialTopic(t)).length;
    return estimateCostAndTime(topicsToGenerate, model, parallelRequests);
  }, [topics, model, parallelRequests]);

  // IDs dos tópicos especiais para collision detection
  const specialTopicIds = useMemo(() => {
    return new Set(
      topics
        .filter(t => isSpecialTopic(t))
        .map(t => t.id || t.title)
    );
  }, [topics]);

  // Collision detection customizado (ignora RELATÓRIO)
  const customCollisionDetection = useCallback((args) => {
    const { droppableContainers, ...rest } = args;
    const filteredContainers = droppableContainers.filter(
      container => !specialTopicIds.has(container.id)
    );
    return closestCenter({ ...rest, droppableContainers: filteredContainers });
  }, [specialTopicIds]);

  // Handler de drag end
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = topics.findIndex(t => (t.id || t.title) === active.id);
    const newIndex = topics.findIndex(t => (t.id || t.title) === over.id);

    // Proteger tópicos especiais
    if (isSpecialTopic(topics[oldIndex]) || isSpecialTopic(topics[newIndex])) {
      return;
    }

    setTopics(arrayMove(topics, oldIndex, newIndex));
  }, [topics]);

  // Handler de edição de título
  const handleStartEdit = useCallback((title) => {
    setEditingTitle(title);
  }, []);

  const handleSaveTitle = useCallback((oldTitle, newTitle, newCategory) => {
    if (newTitle && newTitle !== oldTitle) {
      setTopics(topics.map(t =>
        t.title === oldTitle
          ? { ...t, title: newTitle, category: newCategory || t.category }
          : t
      ));
    } else if (newCategory) {
      setTopics(topics.map(t =>
        t.title === oldTitle
          ? { ...t, category: newCategory }
          : t
      ));
    }
    setEditingTitle(null);
  }, [topics]);

  // Handler de delete
  const handleDelete = useCallback((topic) => {
    setDeletedTopics([...deletedTopics, topic]);
    setTopics(topics.filter(t => t.title !== topic.title));
    setSelectedForMerge(selectedForMerge.filter(t => t.title !== topic.title));
  }, [topics, deletedTopics, selectedForMerge]);

  // Handler de undo delete
  const handleUndoDelete = useCallback(() => {
    if (deletedTopics.length > 0) {
      const lastDeleted = deletedTopics[deletedTopics.length - 1];
      setTopics([...topics, lastDeleted]);
      setDeletedTopics(deletedTopics.slice(0, -1));
    }
  }, [topics, deletedTopics]);

  // Handler de toggle merge select
  const handleToggleMergeSelect = useCallback((topic) => {
    const isSelected = selectedForMerge.some(t => t.title === topic.title);
    if (isSelected) {
      setSelectedForMerge(selectedForMerge.filter(t => t.title !== topic.title));
    } else {
      setSelectedForMerge([...selectedForMerge, topic]);
    }
    setShowMergeConfirm(false);
  }, [selectedForMerge]);

  // Handler de confirmar merge
  const handleConfirmMerge = useCallback((mergedTitle, category) => {
    if (selectedForMerge.length < 2) return;

    // Encontrar posição do primeiro tópico selecionado
    const firstIndex = topics.findIndex(t =>
      selectedForMerge.some(st => st.title === t.title)
    );

    // Criar novo tópico mesclado
    const mergedTopic = {
      id: `merged-${Date.now()}`,
      title: mergedTitle,
      category: category,
      mergedFrom: selectedForMerge.map(t => t.title)
    };

    // Remover tópicos originais e inserir mesclado
    const remainingTopics = topics.filter(t =>
      !selectedForMerge.some(st => st.title === t.title)
    );
    remainingTopics.splice(firstIndex, 0, mergedTopic);

    setTopics(remainingTopics);
    setSelectedForMerge([]);
    setShowMergeConfirm(false);
  }, [topics, selectedForMerge]);

  // Handler de split
  const handleStartSplit = useCallback((topic) => {
    setSplittingTopic(topic);
  }, []);

  const handleConfirmSplit = useCallback((newTitles, category) => {
    if (!splittingTopic || newTitles.length < 2) return;

    // Encontrar posição do tópico original
    const originalIndex = topics.findIndex(t => t.title === splittingTopic.title);

    // Criar novos tópicos
    const newTopics = newTitles.map((title, idx) => ({
      id: `split-${Date.now()}-${idx}`,
      title: title,
      category: category,
      splitFrom: splittingTopic.title
    }));

    // Substituir tópico original pelos novos
    const updatedTopics = [...topics];
    updatedTopics.splice(originalIndex, 1, ...newTopics);

    setTopics(updatedTopics);
    setSplittingTopic(null);
  }, [topics, splittingTopic]);

  // Handler de adicionar novo tópico
  const handleAddTopic = useCallback((title, category) => {
    const newTopic = {
      id: `new-${Date.now()}`,
      title: title,
      category: category,
      isNew: true
    };
    setTopics([...topics, newTopic]);
    setIsAddingTopic(false);
  }, [topics]);

  // Handler de confirmar curadoria
  const handleConfirm = useCallback(() => {
    // Limpar flags temporárias antes de enviar
    const cleanedTopics = topics.map(({ id, mergedFrom, splitFrom, isNew, ...rest }) => rest);
    onConfirm(cleanedTopics);
  }, [topics, onConfirm]);

  // ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !editingTitle && !splittingTopic && !showMergeConfirm && !isAddingTopic) {
        onCancel();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingTitle, splittingTopic, showMergeConfirm, isAddingTopic, onCancel]);

  if (!isOpen) return null;

  const topicsToGenerateCount = topics.filter(t => !isSpecialTopic(t)).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className={`
        relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl
        ${isDarkMode
          ? 'bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-slate-700/50'
          : 'bg-white border border-slate-200'
        }
      `}>
        {/* Header */}
        <div className={`
          flex items-center justify-between p-4 border-b
          ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}
        `}>
          <div className="flex items-center gap-3">
            <div className={`
              p-2 rounded-lg
              ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}
            `}>
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
          <button
            onClick={onCancel}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instruções */}
        <div className={`
          px-4 py-3 text-sm flex items-center gap-4 border-b
          ${isDarkMode ? 'bg-slate-800/50 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}
        `}>
          <span>☰ Arraste para reordenar</span>
          <span>📝 Clique para editar</span>
          <span>🗑️ Apague desnecessários</span>
        </div>

        {/* Lista de Tópicos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Merge Confirm */}
          {showMergeConfirm && selectedForMerge.length >= 2 && (
            <MergeConfirm
              topics={selectedForMerge}
              onConfirm={handleConfirmMerge}
              onCancel={() => setShowMergeConfirm(false)}
              isDarkMode={isDarkMode}
            />
          )}

          {/* DnD Context */}
          <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragEnd={handleDragEnd}
          >
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

                  {/* Split Modal inline */}
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
          </DndContext>

          {/* Add Topic Inline */}
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

        {/* Footer com ações */}
        <div className={`
          p-4 border-t
          ${isDarkMode ? 'border-slate-700/50 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}
        `}>
          {/* Merge button (quando selecionados) */}
          {selectedForMerge.length >= 2 && !showMergeConfirm && (
            <button
              onClick={() => setShowMergeConfirm(true)}
              className="w-full mb-3 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <GitMerge className="w-4 h-4" />
              Mesclar {selectedForMerge.length} tópicos selecionados
            </button>
          )}

          {/* Undo delete */}
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
              ↩️ Desfazer exclusão de "{deletedTopics[deletedTopics.length - 1]?.title}"
            </button>
          )}

          {/* Estimativa de custo */}
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
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                ~R$ {estimate.costBRL}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                ~{estimate.timeMinutes} min
              </span>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className={`
                flex-1 py-3 px-4 rounded-lg font-medium transition-colors
                ${isDarkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }
              `}
            >
              Cancelar
            </button>
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
