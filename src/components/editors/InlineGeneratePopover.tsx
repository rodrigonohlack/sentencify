/**
 * @file InlineGeneratePopover.tsx
 * @description Mini-painel de instrução + preview da geração inline com IA (Ctrl+K)
 * @version 1.51.0
 *
 * Painel ancorado no cursor que evolui por três estados:
 *  - 'input'      → textarea moderno para o usuário descrever a redação
 *  - 'generating' → preview em streaming (ou spinner, em providers CLI sem stream)
 *  - 'preview'    → texto completo + ações Inserir/Descartar
 *
 * Renderizado via portal em document.body com posição fixa. É ARRASTÁVEL (pela barra de
 * título) e REDIMENSIONÁVEL (alça no canto inferior direito); a última posição e tamanho
 * ficam salvos no localStorage e são reutilizados nas próximas aberturas.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Check, Loader2 } from 'lucide-react';
import { sanitizeHTML } from '../../utils/sanitizeHTML';
import { VoiceButton } from '../VoiceButton';

export type InlineGenerateMode = 'input' | 'generating' | 'preview';

export interface InlineGeneratePopoverProps {
  /** Coordenadas de página (fixed). `top` = base da linha do cursor; `lineTop` = topo da linha */
  anchor: { top: number; left: number; lineTop: number };
  mode: InlineGenerateMode;
  /** HTML gerado (parcial durante streaming, completo no preview) */
  preview: string;
  error: string;
  editorTheme: 'dark' | 'light' | string;
  onSubmit: (instruction: string) => void;
  onAccept: () => void;
  onCancel: () => void;
  /** v1.51.2: se o ditado deve passar pela melhoria por IA (flag de Voz) */
  voiceImproveEnabled?: boolean;
  /** v1.51.2: função de melhoria do texto ditado (recebe cru, retorna melhorado) */
  onImproveVoice?: (text: string) => Promise<string>;
}

interface Geometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

const STORAGE_KEY = 'sentencify:inlineGenerate:geometry';
const MARGIN = 8;
const GAP = 6;
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 440;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;
/** Abaixo deste espaço livre embaixo, o painel abre para cima na primeira vez */
const MIN_SPACE_BELOW = 320;

/** Garante que a geometria caiba na viewport atual */
function clampGeometry(g: Geometry): Geometry {
  if (typeof window === 'undefined') return g;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.max(MIN_WIDTH, Math.min(g.width, vw - 2 * MARGIN));
  const height = Math.max(MIN_HEIGHT, Math.min(g.height, vh - 2 * MARGIN));
  const left = Math.max(MARGIN, Math.min(g.left, vw - width - MARGIN));
  const top = Math.max(MARGIN, Math.min(g.top, vh - height - MARGIN));
  return { left, top, width, height };
}

/** Geometria inicial a partir do cursor (abre para cima quando falta espaço embaixo) */
function geometryFromAnchor(anchor: InlineGeneratePopoverProps['anchor']): Geometry {
  if (typeof window === 'undefined') {
    return { left: anchor.left, top: anchor.top, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }
  const vh = window.innerHeight;
  const spaceBelow = vh - anchor.top - MARGIN - GAP;
  const spaceAbove = anchor.lineTop - MARGIN - GAP;
  const openUp = spaceBelow < MIN_SPACE_BELOW && spaceAbove > spaceBelow;
  const avail = openUp ? spaceAbove : spaceBelow;
  const height = Math.max(MIN_HEIGHT, Math.min(DEFAULT_HEIGHT, avail));
  const top = openUp ? anchor.lineTop - GAP - height : anchor.top + GAP;
  return clampGeometry({ left: anchor.left, top, width: DEFAULT_WIDTH, height });
}

function loadGeometry(): Geometry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw);
    if (typeof g?.left === 'number' && typeof g?.top === 'number' &&
        typeof g?.width === 'number' && typeof g?.height === 'number') {
      return clampGeometry(g);
    }
  } catch { /* ignore */ }
  return null;
}

function saveGeometry(g: Geometry): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); } catch { /* ignore */ }
}

export const InlineGeneratePopover: React.FC<InlineGeneratePopoverProps> = ({
  anchor,
  mode,
  preview,
  error,
  onSubmit,
  onAccept,
  onCancel,
  voiceImproveEnabled = false,
  onImproveVoice,
}) => {
  const [instruction, setInstruction] = React.useState('');
  // Geometria: usa a última salva; senão, ancora no cursor
  const [geometry, setGeometry] = React.useState<Geometry>(() => loadGeometry() ?? geometryFromAnchor(anchor));
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Foco: textarea no input; container no preview (para capturar Tab/Enter/Esc)
  React.useEffect(() => {
    if (mode === 'input') {
      textareaRef.current?.focus();
    } else if (mode === 'preview') {
      containerRef.current?.focus();
    }
  }, [mode]);

  // ── Arrastar (pela barra de título) ──────────────────────────────────────
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, left: geometry.left, top: geometry.top };
    const onMove = (ev: MouseEvent) => {
      setGeometry((g) => clampGeometry({
        ...g,
        left: start.left + (ev.clientX - start.x),
        top: start.top + (ev.clientY - start.y),
      }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setGeometry((g) => { saveGeometry(g); return g; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Redimensionar (alça no canto inferior direito) ───────────────────────
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY, width: geometry.width, height: geometry.height };
    const onMove = (ev: MouseEvent) => {
      setGeometry((g) => clampGeometry({
        ...g,
        width: start.width + (ev.clientX - start.x),
        height: start.height + (ev.clientY - start.y),
      }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setGeometry((g) => { saveGeometry(g); return g; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // v1.51.2: ditado por voz — anexa o texto transcrito à instrução e refoca a caixa
  const handleVoiceTranscript = (text: string) => {
    const t = (text || '').trim();
    if (!t) return;
    setInstruction((prev) => (prev.trim() ? prev.trimEnd() + ' ' : '') + t);
    textareaRef.current?.focus();
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmed = instruction.trim();
      if (trimmed) onSubmit(trimmed);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mode === 'preview') {
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        onAccept();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    } else if (mode === 'generating' && e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const safePreview = preview ? sanitizeHTML(preview) : '';

  return createPortal(
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={handleContainerKeyDown}
      className="fixed z-[120] flex flex-col rounded-xl border theme-border-secondary theme-bg-secondary shadow-2xl outline-none"
      style={{ left: geometry.left, top: geometry.top, width: geometry.width, height: geometry.height }}
      role="dialog"
      aria-label="Gerar redação com IA"
    >
      {/* Cabeçalho (alça de arrasto) */}
      <div
        onMouseDown={startDrag}
        className="flex items-center gap-2 px-3 py-2 border-b theme-border-secondary theme-bg-tertiary shrink-0 cursor-move select-none rounded-t-xl"
      >
        <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-sm font-semibold theme-text-primary flex-1">
          {mode === 'input' ? 'Gerar redação com IA' : mode === 'generating' ? 'Gerando…' : 'Pronto'}
        </span>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onCancel}
          className="p-1 rounded hover:theme-bg-secondary theme-text-muted hover:theme-text-primary transition-colors"
          aria-label="Fechar"
          title="Fechar (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Corpo */}
      <div className="p-3 flex flex-col gap-2 min-h-0 flex-1">
        {mode === 'input' && (
          <>
            <textarea
              ref={textareaRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Descreva a redação a gerar… (ex.: 'fundamente a procedência das horas extras com base na prova oral')"
              className="w-full flex-1 min-h-0 resize-none rounded-lg border theme-border-secondary theme-bg-primary theme-text-primary text-sm px-3 py-2 placeholder:theme-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[11px] theme-text-muted">
                <kbd className="font-mono">Enter</kbd> gerar · <kbd className="font-mono">Shift+Enter</kbd> nova linha · <kbd className="font-mono">Esc</kbd> cancelar
              </span>
              <div className="flex items-center gap-2">
                {/* v1.51.2: ditado por voz da instrução (com melhoria por IA se a flag estiver ativa) */}
                <VoiceButton
                  size="sm"
                  idleText="Ditar"
                  onTranscript={handleVoiceTranscript}
                  improveWithAI={voiceImproveEnabled}
                  onImproveText={onImproveVoice}
                  onError={(err) => console.warn('[InlineGenerate][Voz]', err)}
                />
                <button
                  onClick={() => {
                    const trimmed = instruction.trim();
                    if (trimmed) onSubmit(trimmed);
                  }}
                  disabled={!instruction.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Gerar
                </button>
              </div>
            </div>
          </>
        )}

        {(mode === 'generating' || mode === 'preview') && (
          <>
            {safePreview ? (
              // Scroller nativo único (sem .ql-editor, que tem height:100%+overflow próprios e
              // causava barra dupla / scroll que não chegava ao fim). A saída é HTML padrão,
              // então parágrafos/listas renderizam nativamente com os estilos abaixo.
              <div
                className="flex-1 min-h-0 overflow-y-auto rounded-lg border theme-border-secondary theme-bg-primary px-3 py-2 text-sm theme-text-primary leading-relaxed [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-current [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:opacity-80"
                dangerouslySetInnerHTML={{ __html: safePreview }}
              />
            ) : (
              <div className="flex flex-1 items-center gap-2 py-6 justify-center theme-text-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando redação…
              </div>
            )}

            {mode === 'generating' && safePreview && (
              <div className="flex items-center gap-2 text-[11px] theme-text-muted shrink-0">
                <Loader2 className="w-3 h-3 animate-spin" /> escrevendo… <kbd className="font-mono">Esc</kbd> cancela
              </div>
            )}

            {mode === 'preview' && (
              <div className="flex items-center justify-between shrink-0">
                <span className="text-[11px] theme-text-muted">
                  <kbd className="font-mono">Tab/Enter</kbd> inserir · <kbd className="font-mono">Esc</kbd> descartar
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border theme-border-secondary theme-bg-secondary theme-text-primary text-sm font-medium hover:theme-bg-tertiary transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Descartar
                  </button>
                  <button
                    onClick={onAccept}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Inserir
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2 shrink-0">{error}</div>
        )}
      </div>

      {/* Alça de redimensionamento (canto inferior direito) */}
      <div
        onMouseDown={startResize}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        title="Redimensionar"
        style={{
          backgroundImage:
            'linear-gradient(135deg, transparent 0 50%, currentColor 50% 60%, transparent 60% 70%, currentColor 70% 80%, transparent 80%)',
          opacity: 0.35,
        }}
      />
    </div>,
    document.body
  );
};

export default InlineGeneratePopover;
