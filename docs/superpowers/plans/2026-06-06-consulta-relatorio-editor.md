# Consulta rápida a Mini-relatório e Relatório no editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar, abaixo da barra de botões do editor de decisão (`QuillDecisionEditor`), dois chips "Consultar:" — Mini-relatório (tópico atual) e Relatório (RELATÓRIO geral do processo) — que abrem um card flutuante no hover e fixam no clique, em ambos os modos (normal e fullscreen).

**Architecture:** Um componente novo e isolado `RelatorioConsultaPanel` (chip + card read-only, hover/fixa/clique-fora) recebe texto pronto. O `QuillDecisionEditor` monta dois deles numa nova linha. O texto do RELATÓRIO geral chega por uma nova prop `processoRelatorio`, calculada no `DecisionEditorContainer` a partir do `useTopicsStore`.

**Tech Stack:** React + TypeScript, Tailwind (tokens `theme-*`), lucide-react, vitest + @testing-library/react.

---

### Task 1: Componente `RelatorioConsultaPanel` (TDD)

**Files:**
- Create: `src/components/editors/RelatorioConsultaPanel.tsx`
- Test: `src/components/editors/RelatorioConsultaPanel.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RelatorioConsultaPanel } from './RelatorioConsultaPanel';

describe('RelatorioConsultaPanel', () => {
  it('não mostra o card até o hover, mostra no mouseEnter e some no mouseLeave', () => {
    render(<RelatorioConsultaPanel label="Mini-relatório" html="<p>conteudo</p>" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Mini-relatório/ }).parentElement!);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('conteudo')).toBeTruthy();
    fireEvent.mouseLeave(screen.getByRole('button', { name: /Mini-relatório/ }).parentElement!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clique fixa o card (continua aberto após mouseLeave) e clique-fora fecha', () => {
    render(<RelatorioConsultaPanel label="Relatório" html="<p>texto</p>" />);
    const wrapper = screen.getByRole('button', { name: /Relatório/ }).parentElement!;
    fireEvent.click(screen.getByRole('button', { name: /Relatório/ }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.mouseLeave(wrapper); // fixado: continua aberto
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.mouseDown(document.body); // clique-fora
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('quando disabled, renderiza chip não-interativo e nunca abre card', () => {
    render(<RelatorioConsultaPanel label="Relatório" html="" disabled />);
    expect(screen.queryByRole('button')).toBeNull();
    const chip = screen.getByText('Relatório');
    fireEvent.mouseEnter(chip);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('aplica sanitizeHTML ao conteúdo', () => {
    const sanitize = vi.fn((h: string) => h.replace('<script>x</script>', ''));
    render(<RelatorioConsultaPanel label="Mini-relatório" html="<p>ok</p><script>x</script>" sanitizeHTML={sanitize} />);
    fireEvent.click(screen.getByRole('button', { name: /Mini-relatório/ }));
    expect(sanitize).toHaveBeenCalledWith('<p>ok</p><script>x</script>');
    expect(document.querySelector('script')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/components/editors/RelatorioConsultaPanel.test.tsx`
Expected: FAIL — `Failed to resolve import './RelatorioConsultaPanel'`.

- [ ] **Step 3: Implementar o componente**

```tsx
/**
 * @file RelatorioConsultaPanel.tsx
 * @description Chip de consulta rápida que abre um card flutuante read-only
 *              no hover e o fixa no clique. Recebe texto HTML pronto.
 * @version 1.52.31
 */

import React from 'react';
import { FileText, X } from 'lucide-react';

export interface RelatorioConsultaPanelProps {
  /** Rótulo do chip e título do card */
  label: string;
  /** Conteúdo HTML (do Quill) a exibir, read-only */
  html: string;
  /** Sanitizador opcional aplicado ao html antes de renderizar */
  sanitizeHTML?: (html: string) => string;
  /** Quando true, renderiza um chip esmaecido não-interativo */
  disabled?: boolean;
}

/**
 * RelatorioConsultaPanel — gatilho de consulta com card flutuante.
 * Hover abre; clique fixa; clique-fora ou ✕ fecha quando fixado.
 */
export const RelatorioConsultaPanel: React.FC<RelatorioConsultaPanelProps> = ({
  label,
  html,
  sanitizeHTML,
  disabled = false,
}) => {
  const [hovering, setHovering] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const open = hovering || pinned;

  React.useEffect(() => {
    if (!pinned) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPinned(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pinned]);

  const safeHTML = React.useMemo(
    () => (sanitizeHTML ? sanitizeHTML(html || '') : (html || '')),
    [html, sanitizeHTML]
  );

  if (disabled) {
    return (
      <span
        className="px-2 py-1 text-xs rounded flex items-center gap-1 border theme-border-input theme-text-muted opacity-40 cursor-not-allowed select-none"
        title={`${label} indisponível`}
        aria-disabled="true"
      >
        <FileText className="w-3 h-3" />
        {label}
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        onClick={() => setPinned((p) => !p)}
        className={`px-2 py-1 text-xs rounded flex items-center gap-1 border theme-border-input theme-text-primary transition-colors ${
          pinned ? 'theme-bg-tertiary' : 'theme-bg-secondary theme-hover-bg'
        }`}
        title={pinned ? `${label} (fixado — clique para soltar)` : `${label} (clique para fixar)`}
        aria-expanded={open}
      >
        <FileText className="w-3 h-3" />
        {label}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-[60] w-[min(680px,90vw)] max-h-[60vh] overflow-auto rounded-lg border theme-border-input theme-bg-primary shadow-xl"
          role="dialog"
          aria-label={label}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b theme-border-input sticky top-0 theme-bg-primary">
            <span className="text-xs font-semibold theme-text-secondary uppercase tracking-wide">
              {label}
            </span>
            {pinned && (
              <button
                type="button"
                onClick={() => setPinned(false)}
                className="theme-text-muted hover:theme-text-primary transition-colors"
                title="Fechar"
                aria-label="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div
            className="sentence-serif px-4 py-3 text-sm theme-text-primary leading-relaxed [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-current [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:opacity-80"
            dangerouslySetInnerHTML={{ __html: safeHTML }}
          />
        </div>
      )}
    </div>
  );
};

RelatorioConsultaPanel.displayName = 'RelatorioConsultaPanel';
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/components/editors/RelatorioConsultaPanel.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/editors/RelatorioConsultaPanel.tsx src/components/editors/RelatorioConsultaPanel.test.tsx
git commit -m "feat(editor): componente RelatorioConsultaPanel (consulta rápida hover/fixa)"
```

---

### Task 2: Nova prop `processoRelatorio` no tipo do editor

**Files:**
- Modify: `src/types/index.ts` (interface `QuillDecisionEditorProps`, perto de `topicRelatorio?: string;` na linha ~1991)

- [ ] **Step 1: Adicionar a prop ao tipo**

Localizar dentro de `export interface QuillDecisionEditorProps {` a linha:

```ts
  topicRelatorio?: string;
```

E adicionar logo abaixo dela:

```ts
  /** v1.52.31: texto do RELATÓRIO geral do processo (para consulta rápida no editor) */
  processoRelatorio?: string;
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros (a prop é opcional; nada quebra).

---

### Task 3: Renderizar a linha "Consultar:" no `QuillDecisionEditor`

**Files:**
- Modify: `src/components/editors/QuillEditors.tsx` (desestruturação de props ~688; nova linha após o `</div>` da toolbar ~1033; import)

- [ ] **Step 1: Importar o componente**

No topo de `QuillEditors.tsx`, junto aos imports de `'../VoiceButton'` / componentes locais, adicionar:

```ts
import { RelatorioConsultaPanel } from './RelatorioConsultaPanel';
```

- [ ] **Step 2: Desestruturar a nova prop**

Na desestruturação de props do `QuillDecisionEditor`, localizar:

```ts
  topicRelatorio = '',
```

E adicionar logo abaixo:

```ts
  processoRelatorio = '',
```

- [ ] **Step 3: Inserir a linha de consulta**

Localizar o fechamento da barra de botões (a `</div>` que encerra `<div className="flex flex-wrap gap-2 mb-2 flex-shrink-0">`, imediatamente antes do bloco `<div key={isFullscreen ? 'fullscreen-wrapper' : 'normal-wrapper'} ...>`). Inserir entre os dois:

```tsx
        {/* v1.52.31: consulta rápida ao mini-relatório do tópico e ao RELATÓRIO processual.
            Aparece em ambos os modos (normal e fullscreen). */}
        <div className="flex flex-wrap items-center gap-2 mb-2 flex-shrink-0">
          <span className={CSS.textMuted}>Consultar:</span>
          <RelatorioConsultaPanel
            label="Mini-relatório"
            html={topicRelatorio || ''}
            sanitizeHTML={sanitizeHTML}
            disabled={!(topicRelatorio || '').trim()}
          />
          {topicTitle.toUpperCase() !== 'RELATÓRIO' && (
            <RelatorioConsultaPanel
              label="Relatório"
              html={processoRelatorio || ''}
              sanitizeHTML={sanitizeHTML}
              disabled={!(processoRelatorio || '').trim()}
            />
          )}
        </div>
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros (`CSS`, `sanitizeHTML`, `topicTitle`, `topicRelatorio` já existem no escopo).

---

### Task 4: Alimentar `processoRelatorio` no `DecisionEditorContainer`

**Files:**
- Modify: `src/components/editors/DecisionEditorContainer.tsx` (import; useMemo; passagem da prop ~310)

- [ ] **Step 1: Importar `isRelatorio`**

Junto aos imports do arquivo, adicionar:

```ts
import { isRelatorio } from '../../utils/text';
```

- [ ] **Step 2: Calcular o texto do RELATÓRIO geral**

Após a desestruturação dos stores (depois do bloco `useTopicsStore()` que expõe `storeSelectedTopics` e `storeExtractedTopics`), adicionar:

```ts
  // v1.52.31: texto do RELATÓRIO geral do processo para a consulta rápida no editor
  const processoRelatorio = React.useMemo(() => {
    const source =
      storeSelectedTopics && storeSelectedTopics.length > 0
        ? storeSelectedTopics
        : storeExtractedTopics;
    const relatorioTopic = source?.find(isRelatorio);
    return relatorioTopic
      ? relatorioTopic.editedRelatorio || relatorioTopic.relatorio || ''
      : '';
  }, [storeSelectedTopics, storeExtractedTopics]);
```

- [ ] **Step 3: Passar a prop ao `QuillDecisionEditor`**

Localizar na instanciação do `<QuillDecisionEditor ...>` a linha:

```tsx
          topicRelatorio={topic.relatorio || topic.editedRelatorio || ''}
```

E adicionar logo abaixo:

```tsx
          processoRelatorio={processoRelatorio}
```

- [ ] **Step 4: Verificar tipos e rodar a suíte do editor**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npx vitest run src/components/editors/`
Expected: PASS (incluindo `RelatorioConsultaPanel.test.tsx` e os testes existentes de editores).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/components/editors/QuillEditors.tsx src/components/editors/DecisionEditorContainer.tsx
git commit -m "feat(editor): linha Consultar com Mini-relatório e Relatório no editor de decisão"
```

---

### Task 5: Bump de versão (4 arquivos) + changelog

**Files:**
- Modify: `CLAUDE.md` (linha 7)
- Modify: `src/constants/app-version.ts`
- Modify: `package.json` (linha 3)
- Modify: `src/constants/changelog.js` (nova entrada no topo do array)

- [ ] **Step 1: `CLAUDE.md`**

Trocar `**Version**: 1.52.30` por `**Version**: 1.52.31`.

- [ ] **Step 2: `src/constants/app-version.ts`**

Trocar `export const APP_VERSION = '1.52.30';` por `export const APP_VERSION = '1.52.31';`.

- [ ] **Step 3: `package.json`**

Trocar `"version": "1.52.30",` por `"version": "1.52.31",`.

- [ ] **Step 4: `src/constants/changelog.js`**

Inserir como primeiro item do array `CHANGELOG` (antes da entrada `1.52.30`):

```js
  {
    version: '1.52.31',
    date: '2026-06-06',
    feature: 'feat(editor): consulta rápida ao mini-relatório do tópico e ao RELATÓRIO processual direto no editor de decisão. Abaixo da barra de botões (Salvar/Voz/...), uma linha "Consultar:" exibe dois chips — Mini-relatório (resumo de fatos do tópico atual) e Relatório (texto do tópico RELATÓRIO geral do processo). Passar o mouse abre um card flutuante read-only com o texto (sanitizado, serif, claro/escuro); clicar fixa o card, que fica rolável (max-height 60vh) até clicar fora ou no ✕. Disponível em ambos os modos do editor (normal e tela cheia) — resolve a perda de acesso ao relatório quando se edita em fullscreen. Chip fica desabilitado quando o texto está vazio; o chip "Relatório" é ocultado ao editar o próprio tópico RELATÓRIO. Novo componente isolado RelatorioConsultaPanel (com testes); o texto do RELATÓRIO geral é resolvido no DecisionEditorContainer via useTopicsStore e repassado por nova prop processoRelatorio.',
  },
```

- [ ] **Step 5: Verificação final + commit + push**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npx vitest run`
Expected: toda a suíte passa.

```bash
git add CLAUDE.md src/constants/app-version.ts package.json src/constants/changelog.js
git commit -m "chore: bump v1.52.31 (consulta rápida de relatório no editor)"
git push origin main
```

---

## Self-Review

- **Cobertura do spec:** linha "Consultar:" abaixo dos botões (Task 3) ✓; dois chips Mini-relatório/Relatório (Task 3) ✓; hover abre + clique fixa + clique-fora/✕ fecha (Task 1) ✓; read-only + sanitize + serif + tema (Task 1) ✓; ambos os modos (sem guard de fullscreen, Task 3) ✓; chip vazio desabilitado (Task 3 passa `disabled`, Task 1 renderiza) ✓; "Relatório" oculto ao editar RELATÓRIO (Task 3) ✓; dado do RELATÓRIO via store + prop nova (Tasks 2 e 4) ✓; z-[60] (Task 1) ✓; teste importando produção (Task 1) ✓; tsc + temas + bump 4 arquivos (Task 5) ✓.
- **Placeholders:** nenhum — todo passo tem código/comando concreto.
- **Consistência de tipos:** prop `processoRelatorio?: string` definida em `QuillDecisionEditorProps` (Task 2), consumida em `QuillEditors.tsx` (Task 3) e fornecida em `DecisionEditorContainer.tsx` (Task 4); componente `RelatorioConsultaPanel` com props (`label`, `html`, `sanitizeHTML?`, `disabled?`) idênticas entre definição (Task 1) e uso (Task 3).
