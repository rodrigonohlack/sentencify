/**
 * @file QuillEditors.tsx
 * @description Componentes de editor Quill (Base, Model, Decision, MiniRelatorio)
 * @version 1.36.94
 *
 * Extraído do App.tsx v1.36.93
 */

import React from 'react';
import { Save, Sparkles, Scale, BookOpen, X, ChevronDown } from 'lucide-react';
import { CSS } from '../modals/BaseModal';
import { VoiceButton } from '../VoiceButton';
import { SpacingDropdown, FontSizeDropdown } from '../ui';
import { useQuillEditor, sanitizeQuillHTML } from '../../hooks/useQuillEditor';
import { useSpacingControl, useFontSizeControl, useFullscreen } from '../../hooks';
import { stripInlineColors } from '../../utils/color-stripper';
import { FullscreenModelPanel } from '../panels';
import { VersionSelect } from '../version';
import type {
  QuillInstance,
  QuillEditorBaseProps,
  QuillModelEditorProps,
  QuillDecisionEditorProps,
  QuillMiniRelatorioEditorProps,
  QuillDelta,
  Model
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: getQuillToolbarConfig
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retorna configuração de toolbar do Quill.js
 */
export const getQuillToolbarConfig = (type = 'full') => {
  const configs: Record<string, unknown> = {
    // Toolbar completa para editor de decisão (28 opções)
    full: [
      [{ 'header': [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote'],
      ['clean']
    ],
    // Toolbar simplificada para editor de modelos (15 opções)
    simple: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
    // Toolbar mínima ou desabilitada para mini-relatório
    minimal: false
  };

  return configs[type] || configs.full;
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: QuillEditorBase
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Editor Quill base com toolbar configurável
 * v1.35.94: Tipagem correta com QuillEditorBaseProps
 */
export const QuillEditorBase = React.forwardRef<QuillInstance, QuillEditorBaseProps>(({
  content = '',
  onChange,
  onReady,
  onSelectionChange,
  onSlashCommand,
  toolbarConfig = null,
  placeholder = 'Digite aqui...',
  readOnly = false,
  className = '',
  theme = 'snow',
  modules = {},
  quillReady = false,
  quillError = null
}, quillRef) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const quillInstanceRef = React.useRef<QuillInstance | null>(null);
  const isInitializedRef = React.useRef<boolean>(false);
  const lastContentRef = React.useRef<string>('');
  const copyHandlerRef = React.useRef<((e: ClipboardEvent) => void) | null>(null);
  const copyListenerAddedRef = React.useRef<boolean>(false);
  const onSlashCommandRef = React.useRef(onSlashCommand);
  const onChangeDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // v1.15.4: Manter ref atualizada para slash command
  React.useEffect(() => {
    onSlashCommandRef.current = onSlashCommand;
  }, [onSlashCommand]);

  // Inicialização do Quill (apenas uma vez)
  React.useEffect(() => {
    if (!quillReady || !window.Quill) {
      return;
    }

    if (isInitializedRef.current || !containerRef.current) {
      return;
    }

    // v1.30 FIX: Destruir qualquer instância Quill existente no container
    const existingQuill = window.Quill?.find?.(containerRef.current);
    if (existingQuill) {
      try {
        existingQuill.off('text-change');
        existingQuill.off('selection-change');
      } catch (e) {}
    }
    containerRef.current.innerHTML = '';

    try {
      const quillModules = {
        toolbar: toolbarConfig !== null ? toolbarConfig : false,
        clipboard: {
          matchVisual: false,
          // v1.37.81: Matcher para remover cores inline ao colar (Word, Google Docs, etc.)
          matchers: [
            [Node.ELEMENT_NODE, (node: HTMLElement, delta: { ops?: Array<{ attributes?: Record<string, unknown> }> }) => {
              // Remover style com cores do elemento DOM
              if (node.hasAttribute && node.hasAttribute('style')) {
                const style = node.getAttribute('style') || '';
                const tempHtml = `<temp style="${style}"></temp>`;
                const cleanedHtml = stripInlineColors(tempHtml);
                const match = cleanedHtml.match(/style="([^"]*)"/);
                if (match && match[1]?.trim()) {
                  node.setAttribute('style', match[1]);
                } else {
                  node.removeAttribute('style');
                }
              }

              // Remover atributos de cor do delta Quill
              if (delta?.ops) {
                delta.ops = delta.ops.map((op) => {
                  if (op.attributes) {
                    delete op.attributes.color;
                    delete op.attributes.background;
                  }
                  return op;
                });
              }
              return delta;
            }]
          ]
        },
        ...modules
      };

      quillInstanceRef.current = new window.Quill(containerRef.current, {
        theme: theme,
        placeholder: placeholder,
        readOnly: readOnly,
        modules: quillModules
      });

      if (content) {
        const finalContent = sanitizeQuillHTML(content);
        quillInstanceRef.current.root.innerHTML = finalContent;
        lastContentRef.current = finalContent;
      }

      // Event listener - mudanças de texto
      quillInstanceRef.current.on('text-change', ((delta: unknown, _oldDelta: unknown, source: string) => {
        // v1.15.4: Detectar "\" para slash command
        if (source === 'user' && onSlashCommandRef.current) {
          const ops = (delta as QuillDelta).ops || [];
          const lastOp = ops[ops.length - 1];
          if (typeof lastOp?.insert === 'string' && lastOp.insert.endsWith('\\')) {
            const quill = quillInstanceRef.current;
            if (!quill) return;
            const range = quill.getSelection();
            if (range) {
              const bounds = quill.getBounds(range.index);
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                onSlashCommandRef.current({
                  position: {
                    top: rect.top + bounds.top + bounds.height + 5,
                    left: rect.left + bounds.left
                  },
                  quillInstance: quill,
                  triggerPosition: range.index - 1
                });
              }
            }
          }
        }

        // v1.35.3: Debounce onChange (150ms)
        if (onChangeDebounceRef.current) {
          clearTimeout(onChangeDebounceRef.current);
        }
        onChangeDebounceRef.current = setTimeout(() => {
          const html = quillInstanceRef.current?.root?.innerHTML;
          if (!html) return;
          const finalHTML = sanitizeQuillHTML(html);

          if (finalHTML !== lastContentRef.current) {
            lastContentRef.current = finalHTML;
            if (onChange) {
              onChange(finalHTML);
            }
          }
        }, 150);
      }) as (...args: unknown[]) => void);

      // Event listener - mudança de seleção
      if (onSelectionChange) {
        quillInstanceRef.current.on('selection-change', ((range: { index: number; length: number } | null, oldRange: { index: number; length: number } | null, source: string) => {
          onSelectionChange(range, oldRange, source);
        }) as (...args: unknown[]) => void);
      }

      // Handler de clipboard
      copyHandlerRef.current = (e) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());

        const indentElements = container.querySelectorAll('[class*="ql-indent-"]');
        indentElements.forEach(el => {
          const classList = Array.from(el.classList);
          const indentClass = classList.find(cls => cls.startsWith('ql-indent-'));
          if (indentClass && el instanceof HTMLElement) {
            const level = parseInt(indentClass.replace('ql-indent-', ''));
            const marginLeft = `${level * 3}em`;
            el.style.marginLeft = marginLeft;
            el.classList.remove(indentClass);
          }
        });

        if (e.clipboardData) {
          e.clipboardData.setData('text/html', container.innerHTML);
          e.clipboardData.setData('text/plain', selection.toString());
        }
        e.preventDefault();
      };

      if (!copyListenerAddedRef.current) {
        quillInstanceRef.current.root.addEventListener('copy', copyHandlerRef.current);
        copyListenerAddedRef.current = true;
      }

      // Expor instância via ref
      if (quillRef) {
        if (typeof quillRef === 'function') {
          quillRef(quillInstanceRef.current);
        } else {
          quillRef.current = quillInstanceRef.current;
        }
      }

      if (onReady) {
        onReady(quillInstanceRef.current);
      }

      isInitializedRef.current = true;

    } catch (error) {
      // Error handling silencioso
    }

  }, [quillReady]);

  // Atualizar conteúdo quando props.content mudar externamente
  React.useEffect(() => {
    if (!quillInstanceRef.current) return;

    const currentHTML = quillInstanceRef.current.root.innerHTML;
    const newContent = sanitizeQuillHTML(content || '');

    if (newContent !== currentHTML && newContent !== lastContentRef.current) {
      try {
        quillInstanceRef.current.root.innerHTML = newContent;
        lastContentRef.current = newContent;
      } catch (error) {
        // Error handling silencioso
      }
    }
  }, [content]);

  // Atualizar readOnly mode
  React.useEffect(() => {
    if (quillInstanceRef.current) {
      quillInstanceRef.current.enable(!readOnly);
    }
  }, [readOnly]);

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (quillInstanceRef.current) {
        quillInstanceRef.current.off('text-change');
        quillInstanceRef.current.off('selection-change');
        if (copyHandlerRef.current) {
          quillInstanceRef.current.root?.removeEventListener('copy', copyHandlerRef.current);
        }
        copyListenerAddedRef.current = false;
        quillInstanceRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      isInitializedRef.current = false;
    };
  }, []);

  // Renderização
  if (!quillReady) {
    return (
      <div className={`theme-bg-primary border theme-border-input rounded-lg p-4 ${className}`}>
        <p className="theme-text-muted text-center">
          ⏳ Carregando editor Quill.js...
        </p>
      </div>
    );
  }

  if (quillError) {
    return (
      <div className={`bg-red-900/20 border border-red-600 rounded-lg p-4 ${className}`}>
        <p className="text-red-400 text-sm">
          ❌ {quillError instanceof Error ? quillError.message : quillError}
        </p>
        <p className="theme-text-muted text-xs mt-2">
          Usando editor alternativo. Verifique sua conexão com a internet.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: '150px', height: '100%' }}
    />
  );
});

QuillEditorBase.displayName = 'QuillEditorBase';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: QuillModelEditor
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Editor para modelos/templates
 * v1.35.94: Tipagem correta com QuillModelEditorProps
 */
export const QuillModelEditor = React.forwardRef<QuillInstance, QuillModelEditorProps>(({
  content,
  onChange,
  onSaveWithoutClosing,
  onOpenAIAssistant,
  toolbarRef,
  quillReady = false,
  quillError = null,
  editorTheme,
  toggleEditorTheme
}, ref) => {
  const { quillInstanceRef, customModules, handleQuillReady } = useQuillEditor({
    ref,
    onSaveWithoutClosing,
    enableCtrlS: true
  });

  const { spacing, setSpacing } = useSpacingControl();
  const { fontSize, setFontSize } = useFontSizeControl();
  const { isFullscreen, toggleFullscreen, containerRef } = useFullscreen();

  const toolbarConfig = React.useMemo(() => getQuillToolbarConfig('full'), []);

  const handleVoiceTranscript = React.useCallback((text: string) => {
    const quill = quillInstanceRef.current;
    if (quill) {
      requestAnimationFrame(() => {
        const range = quill.getSelection() || { index: quill.getLength() - 1 };
        quill.insertText(range.index, text + ' ');
        quill.setSelection(range.index + text.length + 1);
      });
    }
  }, []);

  return (
    <div ref={containerRef} className={isFullscreen ? 'editor-fullscreen' : ''}>
      <div className={isFullscreen ? 'flex flex-col flex-1 min-h-0' : ''}>
        {!isFullscreen && (
          <label className={CSS.label}>
            Conteúdo
          </label>
        )}

        <div className="flex flex-wrap gap-2 mb-2 flex-shrink-0">
          <button
            onClick={onSaveWithoutClosing}
            className="px-3 py-1.5 text-white text-xs rounded flex items-center gap-1 bg-green-600 hover-green-700-from-600"
            title="Salvar (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar
          </button>

          <VoiceButton
            onTranscript={handleVoiceTranscript}
            size="md"
            onError={(err: unknown) => console.warn('[VoiceToText]', err)}
          />

          {onOpenAIAssistant && (
            <button
              onClick={onOpenAIAssistant}
              className="hover-purple-700 px-3 py-1.5 text-white text-xs rounded flex items-center gap-1 bg-purple-600"
              title="Assistente de IA"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Assistente IA
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 text-white text-xs rounded flex items-center gap-1 theme-bg-tertiary hover-slate-500"
            title={isFullscreen ? 'Sair do Fullscreen (ESC ou Ctrl+F)' : 'Tela Cheia (Ctrl+F)'}
          >
            {isFullscreen ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={CSS.textMuted}>Fonte:</span>
              <FontSizeDropdown
                value={fontSize}
                onChange={setFontSize}
                ariaLabel="Tamanho da fonte do editor de modelos"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={CSS.textMuted}>Espaçamento:</span>
              <SpacingDropdown
                value={spacing}
                onChange={setSpacing}
                ariaLabel="Espaçamento do editor de modelos"
              />
            </div>
          </div>
        </div>

        <div
          key={isFullscreen ? 'fullscreen-model' : 'normal-model'}
          className={`fontsize-${fontSize} spacing-${spacing} ${editorTheme === 'light' ? 'quill-light-theme bg-white' : 'theme-bg-primary'} border theme-border-input rounded-lg ${isFullscreen ? 'fullscreen-editor-wrapper' : ''}`}
        >
          <QuillEditorBase
            content={content}
            onChange={onChange}
            onReady={handleQuillReady}
            toolbarConfig={toolbarConfig}
            modules={customModules}
            placeholder="Digite o conteúdo do modelo..."
            className={isFullscreen ? 'fullscreen-quill-fill' : 'min-h-[300px] max-h-[60vh]'}
            quillReady={quillReady}
            quillError={quillError}
          />
        </div>
      </div>
    </div>
  );
});

QuillModelEditor.displayName = 'QuillModelEditor';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: AIRegenerationSection
// ═══════════════════════════════════════════════════════════════════════════════

interface AIRegenerationSectionProps {
  customInstruction?: string;
  onInstructionChange?: (instruction: string) => void;
  regenerating?: boolean;
  onRegenerate: () => void;
  contextLabel?: string;
}

/**
 * Seção de regeneração com IA
 * v1.35.10: Estado local bufferizado para evitar re-render
 */
export const AIRegenerationSection = React.memo(({
  customInstruction = '',
  onInstructionChange,
  regenerating = false,
  onRegenerate,
  contextLabel = 'texto'
}: AIRegenerationSectionProps) => {
  const [localInstruction, setLocalInstruction] = React.useState(customInstruction);

  React.useEffect(() => {
    setLocalInstruction(customInstruction);
  }, [customInstruction]);

  const handleInstructionChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalInstruction(e.target.value);
  }, []);

  const handleBlur = React.useCallback(() => {
    if (onInstructionChange && localInstruction !== customInstruction) {
      onInstructionChange(localInstruction);
    }
  }, [onInstructionChange, localInstruction, customInstruction]);

  const handleMouseEnterButton = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!regenerating) {
      e.currentTarget.style.backgroundColor = '#7e22ce';
    }
  }, [regenerating]);

  const handleMouseLeaveButton = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = regenerating ? '#6b7280' : '#9333ea';
  }, [regenerating]);

  const handleRegenerate = React.useCallback(() => {
    if (onInstructionChange && localInstruction !== customInstruction) {
      onInstructionChange(localInstruction);
    }
    setTimeout(() => onRegenerate(), 0);
  }, [onInstructionChange, localInstruction, customInstruction, onRegenerate]);

  const handleVoiceTranscript = React.useCallback((text: string) => {
    setLocalInstruction((prev: string) => (prev ? prev + ' ' : '') + text);
  }, []);

  return (
    <div className="mt-4 pt-4 border-t theme-border-input">
      <p className="text-xs theme-text-muted mb-2">
        ✨ <strong>Regenerar com IA:</strong> Adicione uma instrução opcional abaixo e clique em "Gerar" para que a IA recrie este {contextLabel}
      </p>

      <div className="flex gap-2">
        <textarea
          value={localInstruction}
          onChange={handleInstructionChange}
          onBlur={handleBlur}
          placeholder="Instrução opcional (ex: 'Seja mais objetivo', 'Adicione detalhes sobre...')"
          className="flex-1 px-3 py-2 theme-bg-primary border theme-border-input rounded theme-text-tertiary text-sm theme-placeholder focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
          rows={2}
        />
        <VoiceButton
          onTranscript={handleVoiceTranscript}
          size="sm"
          className="self-start mt-1"
        />
      </div>

      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        onMouseEnter={handleMouseEnterButton}
        onMouseLeave={handleMouseLeaveButton}
        style={{
          backgroundColor: regenerating ? '#6b7280' : '#9333ea',
          transition: 'background-color 0.3s ease',
          cursor: regenerating ? 'not-allowed' : 'pointer'
        }}
        className="mt-2 px-3 py-1.5 text-white text-xs rounded flex items-center gap-1"
      >
        {regenerating ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Gerando...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            Gerar com IA
          </>
        )}
      </button>
    </div>
  );
});

AIRegenerationSection.displayName = 'AIRegenerationSection';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: SplitDivider
// ═══════════════════════════════════════════════════════════════════════════════

interface SplitDividerProps {
  onDragStart: (e: React.MouseEvent) => void;
}

const SplitDivider = React.memo(({ onDragStart }: SplitDividerProps) => (
  <div
    className="split-divider"
    onMouseDown={onDragStart}
    title="Arraste para redimensionar"
  />
));

SplitDivider.displayName = 'SplitDivider';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: QuillDecisionEditor
// ═══════════════════════════════════════════════════════════════════════════════

// Note: FullscreenModelPanel e VersionSelect são importados estaticamente (v1.37.47)
// para evitar dependências circulares

/**
 * Editor para decisões judiciais
 * v1.15.4: Adicionado onSlashCommand
 * v1.35.94: Tipagem correta com QuillDecisionEditorProps
 */
export const QuillDecisionEditor = React.forwardRef<QuillInstance, QuillDecisionEditorProps>(({
  content = '',
  onChange,
  onSaveWithoutClosing,
  onOpenAIAssistant,
  onOpenJurisModal,
  onExtractModel,
  onSaveAsModel,
  extractingModel = false,
  showExtractButton = false,
  label = '✍️ Sua Decisão:',
  placeholder = 'Digite aqui sua decisão...',
  topicTitle = '',
  topicCategory = '',
  quillReady = false,
  quillError = null,
  onRegenerate,
  customInstruction = '',
  onInstructionChange,
  regenerating = false,
  showRegenerateSection = false,
  editorTheme,
  toggleEditorTheme,
  models = [],
  onInsertModel,
  onPreviewModel,
  sanitizeHTML,
  topicRelatorio = '',
  onFindSuggestions,
  onSlashCommand,
  isDirty = false,
  versioning = null,
  onBlur = null,
  onOpenFactsComparison = null
}, ref) => {
  const { quillInstanceRef, customModules, handleQuillReady } = useQuillEditor({
    ref,
    onSaveWithoutClosing,
    enableCtrlS: true,
    topicTitle,
    content,
    enableTopicChangeDetection: true
  });

  const { spacing, setSpacing } = useSpacingControl();
  const { fontSize, setFontSize } = useFontSizeControl();
  const { isFullscreen, toggleFullscreen, isSplitMode, toggleSplitMode, splitPosition, handleSplitDrag, containerRef } = useFullscreen();

  const [isDragging, setIsDragging] = React.useState(false);

  const startDrag = React.useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleSplitDrag(e);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleSplitDrag]);

  // v1.24: Listener de blur para versionamento
  React.useEffect(() => {
    const quillRoot = quillInstanceRef.current?.root;
    if (!quillRoot || !onBlur) return;
    const handleBlur = () => {
      setTimeout(() => {
        const html = quillInstanceRef.current?.root?.innerHTML || '';
        if (html && html !== '<p><br></p>') onBlur(html);
      }, 0);
    };
    quillRoot.addEventListener('blur', handleBlur);
    return () => quillRoot.removeEventListener('blur', handleBlur);
  }, [onBlur]);

  const toolbarConfig = React.useMemo(() => getQuillToolbarConfig('full'), []);

  const handleInsertModel = React.useCallback((modelContent: string) => {
    onInsertModel?.(modelContent);
  }, [onInsertModel]);

  const handlePreviewModel = React.useCallback((model: Model) => {
    onPreviewModel?.(model);
  }, [onPreviewModel]);

  const handleVoiceTranscript = React.useCallback((text: string) => {
    const quill = quillInstanceRef.current;
    if (quill) {
      requestAnimationFrame(() => {
        const range = quill.getSelection() || { index: quill.getLength() - 1 };
        quill.insertText(range.index, text + ' ');
        quill.setSelection(range.index + text.length + 1);
      });
    }
  }, []);

  const editorPaneStyle = React.useMemo(() =>
    isSplitMode ? { width: `${splitPosition}%` } : undefined
  , [isSplitMode, splitPosition]);

  const modelPaneStyle = React.useMemo(() =>
    isSplitMode ? { width: `${100 - splitPosition}%` } : undefined
  , [isSplitMode, splitPosition]);

  // v1.37.47: Imports estáticos (antes eram dinâmicos para evitar circular deps,
  // mas já estão no bundle via src/components/index.ts)

  return (
    <div ref={containerRef} className={`${isFullscreen ? 'editor-fullscreen' : ''} ${isSplitMode ? 'editor-fullscreen-split' : ''}`}>
      <div
        className={`flex flex-col flex-1 min-h-0 ${isSplitMode ? 'split-editor-pane' : ''}`}
        style={editorPaneStyle}
      >
        {isFullscreen ? (
          <div className="flex items-center gap-2 mb-2 flex-shrink-0">
            <span className="theme-text-primary font-semibold text-lg">
              📝 {topicTitle}
            </span>
            {topicCategory && (
              <span className="px-2 py-1 text-xs rounded theme-bg-purple-accent theme-text-purple">
                {topicCategory}
              </span>
            )}
          </div>
        ) : (
          <label className={CSS.label}>
            {label}
          </label>
        )}

        <div className="flex flex-wrap gap-2 mb-2 flex-shrink-0">
          <button
            onClick={onSaveWithoutClosing}
            className="px-3 py-1.5 text-white text-xs rounded flex items-center gap-1 bg-green-600 hover-green-700-from-600"
            title="Salvar (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar
          </button>

          <VoiceButton
            onTranscript={handleVoiceTranscript}
            size="md"
            onError={(err: unknown) => console.warn('[VoiceToText]', err)}
          />

          {onOpenAIAssistant && (
            <button
              onClick={onOpenAIAssistant}
              className="hover-purple-700 px-3 py-1.5 text-white text-xs rounded flex items-center gap-1 bg-purple-600"
              title="Assistente de IA"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Assistente IA
            </button>
          )}

          {onOpenJurisModal && (
            <button
              onClick={onOpenJurisModal}
              className="px-3 py-1.5 text-white text-xs rounded flex items-center gap-1 bg-blue-600 hover-blue-700-from-600"
              title="Buscar jurisprudência relevante"
            >
              <Scale className="w-3.5 h-3.5" />
              Jurisprudência
            </button>
          )}

          {onOpenFactsComparison && (
            <button
              onClick={onOpenFactsComparison}
              className="px-3 py-1.5 text-white text-xs rounded flex items-center gap-1 bg-amber-600 hover-amber-700"
              title="Confronto de Fatos (Inicial vs Contestação)"
            >
              <Scale className="w-3.5 h-3.5" />
              Confronto
            </button>
          )}

          {showExtractButton && onExtractModel && (
            <button
              onClick={onExtractModel}
              disabled={extractingModel}
              className="px-3 py-1.5 text-white text-xs rounded flex items-center gap-1 bg-pink-600 hover-pink-700 disabled:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
              title="Extrair como modelo reutilizável (usa IA)"
            >
              {extractingModel ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Extraindo...
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5" />
                  Extrair Modelo
                </>
              )}
            </button>
          )}

          {showExtractButton && onSaveAsModel && (
            <button
              onClick={onSaveAsModel}
              className="px-3 py-1.5 text-white text-xs rounded flex items-center gap-1 bg-blue-600 hover-blue-700-from-600"
              title="Salvar texto atual como modelo (preserva 100%)"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar como Modelo
            </button>
          )}

          {isFullscreen && (
            <button
              onClick={toggleSplitMode}
              className={`px-3 py-1.5 text-white text-xs rounded flex items-center gap-1.5 transition-all ${
                isSplitMode
                  ? 'bg-amber-700 ring-2 ring-amber-400'
                  : 'bg-amber-600 hover-amber-700'
              }`}
              title={isSplitMode ? 'Fechar Modelos (ESC ou Ctrl+M)' : '📚 Abrir Biblioteca de Modelos (Ctrl+M)'}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {isSplitMode ? 'Fechar Modelos' : '📚 Modelos'}
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 text-white text-xs rounded flex items-center gap-1 theme-bg-tertiary hover-slate-500"
            title={isFullscreen ? 'Sair do Fullscreen (ESC ou Ctrl+F)' : 'Tela Cheia (Ctrl+F)'}
          >
            {isFullscreen ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>

          {versioning && topicTitle && (
            <VersionSelect
              topicTitle={topicTitle}
              versioning={versioning}
              currentContent={content}
              onRestore={(restoredContent: string) => onChange?.(restoredContent)}
            />
          )}

          {isDirty && (
            <span className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Não salvo
            </span>
          )}

          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={CSS.textMuted}>Fonte:</span>
              <FontSizeDropdown
                value={fontSize}
                onChange={setFontSize}
                ariaLabel="Tamanho da fonte do editor de tópicos"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={CSS.textMuted}>Espaçamento:</span>
              <SpacingDropdown
                value={spacing}
                onChange={setSpacing}
                ariaLabel="Espaçamento do editor de tópicos"
              />
            </div>
          </div>
        </div>

        <div
          key={isFullscreen ? 'fullscreen-wrapper' : 'normal-wrapper'}
          className={`fontsize-${fontSize} spacing-${spacing} ${editorTheme === 'light' ? 'quill-light-theme bg-white' : 'theme-bg-primary'} border theme-border-input rounded-lg ${isFullscreen ? 'fullscreen-editor-wrapper' : ''}`}
        >
          <QuillEditorBase
            content={content}
            onChange={onChange}
            onReady={handleQuillReady}
            onSlashCommand={onSlashCommand}
            toolbarConfig={toolbarConfig}
            modules={customModules}
            placeholder={placeholder}
            className={isFullscreen ? 'fullscreen-quill-fill' : 'min-h-[400px] max-h-[80vh]'}
            quillReady={quillReady}
            quillError={quillError}
          />
        </div>

        {showRegenerateSection && onRegenerate && !isFullscreen && (
          <AIRegenerationSection
            customInstruction={customInstruction}
            onInstructionChange={onInstructionChange}
            regenerating={regenerating}
            onRegenerate={onRegenerate}
            contextLabel="dispositivo"
          />
        )}
      </div>

      {isSplitMode && (
        <SplitDivider onDragStart={startDrag} />
      )}

      {isSplitMode && (
        <div
          className="split-editor-pane"
          style={modelPaneStyle}
        >
          <FullscreenModelPanel
            models={models}
            topicTitle={topicTitle}
            topicCategory={topicCategory}
            topicRelatorio={topicRelatorio}
            onInsert={handleInsertModel}
            onPreview={handlePreviewModel}
            sanitizeHTML={sanitizeHTML || ((html: string) => html)}
            onFindSuggestions={onFindSuggestions}
          />
        </div>
      )}
    </div>
  );
});

QuillDecisionEditor.displayName = 'QuillDecisionEditor';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: QuillMiniRelatorioEditor
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mini-relatório sem toolbar
 * v1.15.6: Adicionado onSlashCommand
 * v1.35.94: Tipagem correta com QuillMiniRelatorioEditorProps
 */
export const QuillMiniRelatorioEditor = React.memo(React.forwardRef<QuillInstance, QuillMiniRelatorioEditorProps>(({
  content = '',
  onChange,
  onRegenerate,
  onSaveWithoutClosing,
  customInstruction = '',
  onInstructionChange,
  regenerating = false,
  topicTitle = '',
  label = 'Mini-relatório (editável):',
  showRegenerateSection = true,
  quillReady = false,
  quillError = null,
  editorTheme,
  toggleEditorTheme,
  onSlashCommand
}, ref) => {
  const { quillInstanceRef, customModules, handleQuillReady } = useQuillEditor({
    ref,
    onSaveWithoutClosing,
    enableCtrlS: true,
    topicTitle,
    content,
    enableTopicChangeDetection: true
  });

  const { spacing } = useSpacingControl();
  const { fontSize } = useFontSizeControl();

  const toolbarConfig = React.useMemo(() => false, []);

  return (
    <div className="theme-bg-secondary-30 p-4 rounded-lg border theme-border-input">
      <p className="text-blue-400 font-medium mb-2">{label}</p>

      <div className={`fontsize-${fontSize} spacing-${spacing} ${editorTheme === 'light' ? 'quill-light-theme bg-white' : 'theme-bg-primary-50'} border theme-border-input rounded`}>
        <QuillEditorBase
          content={content}
          onChange={onChange}
          onReady={handleQuillReady}
          onSlashCommand={onSlashCommand}
          toolbarConfig={toolbarConfig}
          modules={customModules}
          placeholder="O reclamante narra que... Sustenta que... Postula... A primeira reclamada, em defesa, alega que..."
          className="min-h-32"
          quillReady={quillReady}
          quillError={quillError}
        />
      </div>

      <p className="text-xs theme-text-disabled mt-2">
        💡 Formato sugerido: "O reclamante narra que... Sustenta que... Postula... A primeira reclamada, em defesa, alega que..."
        <br />
        ⌨️ <strong>Ctrl+S</strong> = Salvar sem fechar
      </p>

      {showRegenerateSection && onRegenerate && (
        <AIRegenerationSection
          customInstruction={customInstruction}
          onInstructionChange={onInstructionChange}
          regenerating={regenerating}
          onRegenerate={onRegenerate}
          contextLabel="mini-relatório"
        />
      )}
    </div>
  );
}));

QuillMiniRelatorioEditor.displayName = 'QuillMiniRelatorioEditor';
