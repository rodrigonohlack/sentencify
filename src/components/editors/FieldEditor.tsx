/**
 * @file FieldEditor.tsx
 * @description Editor de campo sem toolbar + Toolbar de formatação inline
 * @version 1.36.94
 *
 * Extraído do App.tsx v1.36.93
 */

import React from 'react';
import { VoiceButton } from '../VoiceButton';
import { useAIStore } from '../../stores/useAIStore';
import { useAIIntegration } from '../../hooks';
import { useVoiceImprovement } from '../../hooks/useVoiceImprovement';
import type {
  QuillInstance,
  QuillDelta,
  FieldEditorProps,
  FieldEditorRef,
  ActiveFormatsState
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: FieldEditor
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Editor Quill sem toolbar
 * v1.12.0: Criação inicial
 * v1.15.3: Adicionado suporte a slash command (/)
 * v1.20.4: forwardRef para expor API de formatação
 * v1.35.93: Tipagem correta com FieldEditorProps e FieldEditorRef
 */
export const FieldEditor = React.memo(React.forwardRef<FieldEditorRef, FieldEditorProps>(({
  label,
  content,
  onChange,
  onFocus,
  onBlur,
  onSlashCommand,
  fieldType = 'text',
  quillReady,
  quillError,
  minHeight = '120px',
  editorTheme = 'dark',
  hideVoiceButton = false
}, ref) => {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const quillInstanceRef = React.useRef<QuillInstance | null>(null);

  // v1.37.88: Voice improvement com IA
  // v1.37.90: Usa callAI do useAIIntegration para tracking de tokens
  const aiSettings = useAIStore((state) => state.aiSettings);
  const { callAI } = useAIIntegration();
  const { improveText } = useVoiceImprovement({ callAI });

  // v1.20.4: Expor métodos de formatação para componente pai
  React.useImperativeHandle(ref, () => ({
    format: (name: string, value: unknown) => quillInstanceRef.current?.format(name, value),
    getFormat: () => quillInstanceRef.current?.getFormat() || {},
    focus: () => quillInstanceRef.current?.focus()
  }), []);

  const isInitializedRef = React.useRef<boolean>(false);
  const lastContentRef = React.useRef<string>('');
  const onSlashCommandRef = React.useRef(onSlashCommand);
  const onChangeDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurHandlerRef = React.useRef<(() => void) | null>(null);
  const blurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manter ref atualizada
  React.useEffect(() => {
    onSlashCommandRef.current = onSlashCommand;
  }, [onSlashCommand]);

  // Inicialização do Quill (sem toolbar)
  React.useEffect(() => {
    if (!quillReady || !window.Quill || isInitializedRef.current || !editorRef.current) return;

    try {
      quillInstanceRef.current = new window.Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: false,
          keyboard: {
            bindings: {}
          }
        },
        placeholder: `Digite o ${label.toLowerCase()} aqui...`
      });

      // Setar conteúdo inicial
      if (content) {
        quillInstanceRef.current.root.innerHTML = content;
        lastContentRef.current = content;
      }

      // Event listener - mudanças de texto
      quillInstanceRef.current.on('text-change', ((delta: unknown, _oldDelta: unknown, source: string) => {
        // v1.15.3: Detectar "\" para slash command
        if (source === 'user' && onSlashCommandRef.current) {
          const ops = (delta as QuillDelta).ops || [];
          const lastOp = ops[ops.length - 1];
          if (typeof lastOp?.insert === 'string' && lastOp.insert.endsWith('\\')) {
            const quill = quillInstanceRef.current;
            if (!quill) return;
            const range = quill.getSelection();
            if (range) {
              const bounds = quill.getBounds(range.index);
              const editorRect = editorRef.current?.getBoundingClientRect();
              if (editorRect) {
                onSlashCommandRef.current({
                  position: {
                    top: editorRect.top + bounds.top + bounds.height + 5,
                    left: editorRect.left + bounds.left
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
          if (html !== lastContentRef.current) {
            lastContentRef.current = html;
            onChange?.(html);
          }
        }, 150);
      }) as (...args: unknown[]) => void);

      // Event listener - foco
      if (onFocus) {
        quillInstanceRef.current.root.addEventListener('focus', onFocus);
      }

      // v1.24: Event listener - blur
      if (onBlur) {
        blurHandlerRef.current = () => {
          if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = setTimeout(() => {
            const html = quillInstanceRef.current?.root?.innerHTML || '';
            if (html && html !== '<p><br></p>') onBlur(html);
          }, 0);
        };
        quillInstanceRef.current.root.addEventListener('blur', blurHandlerRef.current);
      }

      isInitializedRef.current = true;
    } catch (error) {
      // Error handling silencioso
    }
  }, [quillReady]);

  React.useEffect(() => {
    if (!quillInstanceRef.current || !isInitializedRef.current) return;

    if (content !== lastContentRef.current) {
      quillInstanceRef.current.root.innerHTML = content || '';
      lastContentRef.current = content || '';
    }
  }, [content]);

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      if (quillInstanceRef.current) {
        quillInstanceRef.current.off('text-change');
        if (onFocus) {
          quillInstanceRef.current.root?.removeEventListener('focus', onFocus);
        }
        if (blurHandlerRef.current) {
          quillInstanceRef.current.root?.removeEventListener('blur', blurHandlerRef.current);
        }
        quillInstanceRef.current = null;
      }
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      isInitializedRef.current = false;
    };
  }, []);

  // v1.35.62: Handler para Voice-to-Text
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

  // Renderização
  if (!quillReady) {
    return (
      <div className="field-editor">
        <label className="block text-xs font-semibold theme-text-muted mb-1">{label}</label>
        <div className="theme-bg-primary border theme-border-input rounded p-3 text-sm theme-text-muted">
          ⏳ Carregando editor...
        </div>
      </div>
    );
  }

  if (quillError) {
    return (
      <div className="field-editor">
        <label className="block text-xs font-semibold theme-text-muted mb-1">{label}</label>
        <div className="bg-red-900/20 border border-red-600 rounded p-3 text-sm text-red-400">
          ❌ {quillError instanceof Error ? quillError.message : quillError}
        </div>
      </div>
    );
  }

  return (
    <div className="field-editor">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold theme-text-muted">{label}</label>
        {!hideVoiceButton && (
          <VoiceButton
            onTranscript={handleVoiceTranscript}
            size="sm"
            onError={(err: unknown) => console.warn('[VoiceToText]', err)}
            improveWithAI={aiSettings.voiceImprovement?.enabled}
            onImproveText={aiSettings.voiceImprovement?.enabled
              ? (text) => improveText(text, aiSettings.voiceImprovement?.model || 'haiku')
              : undefined
            }
          />
        )}
      </div>
      <div
        ref={editorRef}
        className={`${editorTheme === 'light' ? 'quill-light-theme bg-white' : 'theme-bg-primary'} border theme-border-input rounded field-editor-content`}
        style={{
          minHeight,
          overflow: 'hidden'
        }}
      />
    </div>
  );
}));

FieldEditor.displayName = 'FieldEditor';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: InlineFormattingToolbar
// ═══════════════════════════════════════════════════════════════════════════════

interface InlineFormattingToolbarProps {
  editorRef: React.RefObject<FieldEditorRef | null>;
}

/**
 * Toolbar de formatação inline para FieldEditor
 * v1.20.4: Criação inicial
 */
export const InlineFormattingToolbar = React.memo(({ editorRef }: InlineFormattingToolbarProps) => {
  const [activeFormats, setActiveFormats] = React.useState<ActiveFormatsState>({});

  const updateFormats = React.useCallback(() => {
    if (editorRef?.current) {
      setActiveFormats(editorRef.current.getFormat() as ActiveFormatsState);
    }
  }, [editorRef]);

  const toggleFormat = React.useCallback((format: string, value: string | boolean = true) => {
    if (!editorRef?.current) return;
    const current = editorRef.current.getFormat();
    const currentValue = current[format];
    if (format === 'list' || format === 'align') {
      editorRef.current.format(format, currentValue === value ? false : value);
    } else {
      editorRef.current.format(format, currentValue ? false : value);
    }
    updateFormats();
    editorRef.current.focus();
  }, [editorRef, updateFormats]);

  const setHeader = React.useCallback((level: number | false) => {
    if (!editorRef?.current) return;
    editorRef.current.format('header', level || false);
    updateFormats();
    editorRef.current.focus();
  }, [editorRef, updateFormats]);

  // v1.33.21: Limpar formatação
  const removeFormatting = React.useCallback(() => {
    if (!editorRef?.current) return;
    const quill = editorRef.current;
    const formats = quill.getFormat();
    ['bold', 'italic', 'underline', 'strike', 'color', 'background', 'header', 'list', 'align', 'indent', 'link'].forEach(key => {
      if (formats[key]) quill.format(key, false);
    });
    updateFormats();
    quill.focus();
  }, [editorRef, updateFormats]);

  const btnClass = (isActive: boolean) =>
    `px-1.5 py-0.5 text-xs rounded transition-colors ${isActive
      ? 'bg-blue-600 text-white'
      : 'theme-bg-secondary theme-text-secondary'}`;

  return (
    <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
      <select
        className="text-xs px-1 py-0.5 theme-bg-secondary theme-border-input border rounded theme-text-primary"
        onChange={(e) => setHeader(e.target.value ? parseInt(e.target.value) : false)}
        value={typeof activeFormats.header === 'number' ? activeFormats.header : ''}
        onFocus={updateFormats}
      >
        <option value="">¶</option>
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
      </select>
      <span className="text-gray-500 text-xs">|</span>
      <button onClick={() => toggleFormat('bold')} className={btnClass(!!activeFormats.bold)} title="Negrito (Ctrl+B)"><strong>N</strong></button>
      <button onClick={() => toggleFormat('italic')} className={btnClass(!!activeFormats.italic)} title="Itálico (Ctrl+I)"><em>I</em></button>
      <button onClick={() => toggleFormat('underline')} className={btnClass(!!activeFormats.underline)} title="Sublinhado (Ctrl+U)"><u>S</u></button>
      <span className="text-gray-500 text-xs">|</span>
      <button onClick={() => toggleFormat('list', 'ordered')} className={btnClass(activeFormats.list === 'ordered')} title="Lista numerada">1.</button>
      <button onClick={() => toggleFormat('list', 'bullet')} className={btnClass(activeFormats.list === 'bullet')} title="Lista com marcadores">•</button>
      <span className="text-gray-500 text-xs">|</span>
      <button onClick={() => toggleFormat('align', false)} className={btnClass(!activeFormats.align)} title="Alinhar à esquerda">⫷</button>
      <button onClick={() => toggleFormat('align', 'center')} className={btnClass(activeFormats.align === 'center')} title="Centralizar">≡</button>
      <button onClick={() => toggleFormat('align', 'right')} className={btnClass(activeFormats.align === 'right')} title="Alinhar à direita">⫸</button>
      <button onClick={() => toggleFormat('align', 'justify')} className={btnClass(activeFormats.align === 'justify')} title="Justificar">☰</button>
      <span className="text-gray-500 text-xs">|</span>
      <button onClick={() => removeFormatting()} className="px-1.5 py-0.5 text-xs rounded transition-colors theme-bg-secondary theme-text-secondary hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400" title="Limpar formatação">✖</button>
    </div>
  );
});

InlineFormattingToolbar.displayName = 'InlineFormattingToolbar';
