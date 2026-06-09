# Modo "Sem Provider (copiar/colar)" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um provider `'manual'` que, em vez de chamar uma API, abre um modal único para o usuário copiar o prompt, colar a resposta de qualquer LLM e seguir o fluxo como se a resposta tivesse vindo de uma API — viabilizando uso a custo $0.

**Architecture:** Um broker baseado em Zustand (`useManualCallStore`) transforma a chamada `async` profunda numa ida-e-volta de UI. A interceptação acontece no topo dos dois dispatchers (`callAI`, `callAIStream`) em cada uma das 5 cópias de `useAIIntegration`. Um único `<ManualCallModal>` global lê o store. PDF puro é proibido no modo manual (rebaixado para extração, como o Grok). Recursos incompatíveis (voz, double-check, multi-call paralelo) são desligados; refino de modelo / jurisprudência / legislação seguem só em IA local.

**Tech Stack:** React + TypeScript, Zustand + immer, Vitest, Tailwind (temas claro/escuro via `dark:`), `BaseModal` + `Button` do design-system.

**Spec:** `docs/superpowers/specs/2026-06-09-modo-sem-provider-copiar-colar-design.md`

---

## File Structure

**Criar:**
- `src/utils/manualCall.ts` — serialização do prompt, normalização da resposta, helper `isPdfBinaryAllowed`, erros tipados.
- `src/utils/manualCall.test.ts` — testes do util.
- `src/stores/useManualCallStore.ts` — broker (fila de 1, Promise pendente).
- `src/stores/useManualCallStore.test.ts` — testes do broker.
- `src/components/modals/ManualCallModal.tsx` — modal único (copiar prompt / colar resposta).
- `src/components/modals/ManualCallModal.test.tsx` — testes do modal.

**Modificar:**
- `src/types/index.ts:250` — adicionar `'manual'` ao `AIProvider`; adicionar `manualTitle?` em `AICallOptions`.
- `src/stores/useAIStore.ts:923` — `selectCurrentModel` retorna `'manual'`.
- `src/components/ui/ProviderIcon.tsx:100` — ícone para `'manual'`.
- `src/hooks/useAIIntegration.ts` — interceptação em `callAI` (~1473) e `callAIStream` (~2160).
- `src/apps/{prova-oral,embargos,noticias,analisador}/hooks/useAIIntegration.ts` — mesma interceptação.
- `src/apps/prova-oral/hooks/useProvaOralAnalysis.ts` — passar `manualTitle` nas 3 fases.
- `src/hooks/useDocumentAnalysis.ts:275-280` — `pdf-puro` bloqueado quando `provider==='manual'`.
- `src/hooks/{useReportGeneration,useProofAnalysis,useFactsComparison}.ts` — idem (bloquear binário no manual).
- `src/utils/context-helpers.ts:272,474` — anexos: não usar `pdf-puro` no manual.
- `src/hooks/useFactsComparison.ts:292` — pular double-check no manual.
- `src/hooks/useVoiceImprovement.ts` — no-op/erro claro no manual; UI desabilita botão.
- `src/hooks/useModelSuggestions.ts:232` — só IA local no manual.
- `src/utils/jurisprudencia.ts:170` — pular LLM no manual.
- `src/components/modals/ConfigModal.tsx:602` — card do provider manual.
- `src/components/modals/ModalRoot.tsx` — montar `<ManualCallModal>`.
- Versão: `CLAUDE.md:7`, `src/App.tsx` (`APP_VERSION`), `src/constants/changelog.js`, `package.json`.

**Convenções do projeto a respeitar:**
- NUNCA editar arquivo via shell (`sed`/`echo`/heredoc) — só `Edit`/`Write` (UTF-8).
- Testes importam código de PRODUÇÃO (sem duplicar constantes/funções).
- Toda UI funciona em tema claro e escuro (`dark:`).
- Caminhos relativos.

---

## Phase 1 — Fundação

### Task 1: Adicionar `'manual'` ao tipo e selectors

**Files:**
- Modify: `src/types/index.ts:250`
- Modify: `src/stores/useAIStore.ts:923`
- Modify: `src/components/ui/ProviderIcon.tsx:100`
- Test: `src/stores/useAIStore.test.ts`

- [ ] **Step 1: Escrever teste que falha**

Adicionar em `src/stores/useAIStore.test.ts` (dentro de um `describe` adequado; importar `selectCurrentModel` do módulo de produção):

```ts
import { selectCurrentModel } from './useAIStore';

it('selectCurrentModel retorna "manual" quando provider é manual', () => {
  const state = {
    aiSettings: {
      provider: 'manual',
      claudeModel: 'claude-x', claudeCliModel: '', codexCliModel: '',
      geminiModel: '', openaiModel: '', grokModel: '', deepseekModel: '',
    },
  } as any;
  expect(selectCurrentModel(state)).toBe('manual');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/stores/useAIStore.test.ts -t "manual"`
Expected: FAIL — `selectCurrentModel` cai no `default` e retorna `claude-x`.

- [ ] **Step 3: Implementar**

Em `src/types/index.ts:250`:

```ts
export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek' | 'claude-cli' | 'codex-cli' | 'manual';
```

Em `src/stores/useAIStore.ts`, no `switch` de `selectCurrentModel` (linha ~925), adicionar antes do `default`:

```ts
    case 'manual': return 'manual';
```

Em `src/components/ui/ProviderIcon.tsx`, no `switch` (linha ~100), adicionar antes do `default`. Importar `ClipboardCopy` de `lucide-react` no topo do arquivo:

```tsx
    case 'manual':
      return <ClipboardCopy size={size} className={className} />;
```

- [ ] **Step 4: Rodar e ver passar + checar tipos**

Run: `npx vitest run src/stores/useAIStore.test.ts -t "manual"`
Expected: PASS
Run: `npx tsc --noEmit`
Expected: sem novos erros relativos a `AIProvider`.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/stores/useAIStore.ts src/stores/useAIStore.test.ts src/components/ui/ProviderIcon.tsx
git commit -m "feat(manual): adiciona provider 'manual' ao tipo e selectors"
```

---

### Task 2: Util `manualCall.ts`

**Files:**
- Create: `src/utils/manualCall.ts`
- Test: `src/utils/manualCall.test.ts`

- [ ] **Step 1: Escrever testes que falham**

Criar `src/utils/manualCall.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  serializeForManual,
  normalizeManualResponse,
  isPdfBinaryAllowed,
  ManualUnsupportedError,
} from './manualCall';

describe('manualCall', () => {
  const instr = () => [{ type: 'text' as const, text: 'INSTRUÇÕES DO SISTEMA' }];

  it('serializeForManual junta instruções + texto das mensagens', () => {
    const out = serializeForManual(
      [{ role: 'user', content: [{ type: 'text', text: 'Olá juiz' }] }],
      { useInstructions: true },
      instr
    );
    expect(out).toContain('INSTRUÇÕES DO SISTEMA');
    expect(out).toContain('Olá juiz');
  });

  it('serializeForManual aceita content string direto', () => {
    const out = serializeForManual(
      [{ role: 'user', content: 'texto simples' }],
      {},
      instr
    );
    expect(out).toContain('texto simples');
  });

  it('serializeForManual lança ManualUnsupportedError em bloco binário', () => {
    expect(() =>
      serializeForManual(
        [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'AAAA' } } as any,
        ] }],
        {},
        instr
      )
    ).toThrow(ManualUnsupportedError);
  });

  it('normalizeManualResponse remove cercas markdown e faz trim', () => {
    expect(normalizeManualResponse('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(normalizeManualResponse('  oi  ')).toBe('oi');
    expect(normalizeManualResponse('```\nx\n```')).toBe('x');
  });

  it('isPdfBinaryAllowed é false para manual e grok', () => {
    expect(isPdfBinaryAllowed('manual')).toBe(false);
    expect(isPdfBinaryAllowed('grok')).toBe(false);
    expect(isPdfBinaryAllowed('claude')).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/utils/manualCall.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `src/utils/manualCall.ts`:

```ts
import type { AIProvider, AIMessage, AIMessageContent } from '../types';

/** Lançado quando o modo manual recebe conteúdo que não consegue serializar (ex.: PDF binário). */
export class ManualUnsupportedError extends Error {
  constructor(message = 'Este recurso não está disponível no modo Sem Provider (requer provider real).') {
    super(message);
    this.name = 'ManualUnsupportedError';
  }
}

/** Lançado quando o usuário cancela o modal manual. */
export class ManualCancelledError extends Error {
  constructor(message = 'Operação cancelada.') {
    super(message);
    this.name = 'ManualCancelledError';
  }
}

/** PDF binário só é aceito por providers que o suportam. Manual e Grok exigem texto extraído. */
export function isPdfBinaryAllowed(provider: AIProvider): boolean {
  return provider !== 'manual' && provider !== 'grok';
}

/** Extrai o texto de um bloco de conteúdo; lança em blocos binários (document/image). */
function blockToText(block: AIMessageContent): string {
  if (typeof block === 'string') return block;
  if (block && typeof block === 'object' && 'type' in block) {
    if (block.type === 'text') return block.text ?? '';
    // document / image / qualquer binário
    throw new ManualUnsupportedError();
  }
  return '';
}

/**
 * Monta um prompt único, copiável e autossuficiente: instruções de sistema (se aplicável)
 * + texto de todas as mensagens. Lança ManualUnsupportedError se houver bloco binário.
 */
export function serializeForManual(
  messages: AIMessage[],
  options: { useInstructions?: boolean },
  getAiInstructions: () => Array<{ type: 'text'; text: string }>,
): string {
  const parts: string[] = [];

  if (options.useInstructions !== false) {
    const instr = getAiInstructions();
    const instrText = instr.map((b) => b.text).join('\n\n').trim();
    if (instrText) parts.push(instrText);
  }

  for (const msg of messages) {
    const content = msg.content;
    if (typeof content === 'string') {
      parts.push(content);
    } else if (Array.isArray(content)) {
      for (const block of content) parts.push(blockToText(block));
    }
  }

  return parts.filter((p) => p && p.trim()).join('\n\n').trim();
}

/** Remove cercas markdown (```json / ```) e espaços externos da resposta colada. */
export function normalizeManualResponse(raw: string): string {
  let text = (raw ?? '').trim();
  const fence = /^```[a-zA-Z0-9]*\s*\n?([\s\S]*?)\n?```$/;
  const m = text.match(fence);
  if (m) text = m[1].trim();
  return text;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/utils/manualCall.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/utils/manualCall.ts src/utils/manualCall.test.ts
git commit -m "feat(manual): util de serialização/normalização e helper isPdfBinaryAllowed"
```

---

### Task 3: Broker `useManualCallStore`

**Files:**
- Create: `src/stores/useManualCallStore.ts`
- Test: `src/stores/useManualCallStore.test.ts`

- [ ] **Step 1: Escrever testes que falham**

Criar `src/stores/useManualCallStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useManualCallStore } from './useManualCallStore';
import { ManualCancelledError, ManualUnsupportedError } from '../utils/manualCall';

describe('useManualCallStore', () => {
  beforeEach(() => {
    useManualCallStore.setState({ pending: null });
  });

  it('enqueue seta pending e resolve com o texto confirmado', async () => {
    const p = useManualCallStore.getState().enqueue('PROMPT');
    expect(useManualCallStore.getState().pending?.prompt).toBe('PROMPT');
    useManualCallStore.getState().resolveCurrent('RESPOSTA');
    await expect(p).resolves.toBe('RESPOSTA');
    expect(useManualCallStore.getState().pending).toBeNull();
  });

  it('rejectCurrent rejeita com ManualCancelledError por padrão', async () => {
    const p = useManualCallStore.getState().enqueue('PROMPT');
    useManualCallStore.getState().rejectCurrent();
    await expect(p).rejects.toBeInstanceOf(ManualCancelledError);
    expect(useManualCallStore.getState().pending).toBeNull();
  });

  it('chamada concorrente (sem resolver a anterior) é rejeitada', async () => {
    const p1 = useManualCallStore.getState().enqueue('A');
    const p2 = useManualCallStore.getState().enqueue('B');
    await expect(p2).rejects.toBeInstanceOf(ManualUnsupportedError);
    // a primeira segue válida
    useManualCallStore.getState().resolveCurrent('ok');
    await expect(p1).resolves.toBe('ok');
  });

  it('chamadas sequenciais (await) resolvem ambas', async () => {
    const p1 = useManualCallStore.getState().enqueue('A');
    useManualCallStore.getState().resolveCurrent('r1');
    await expect(p1).resolves.toBe('r1');
    const p2 = useManualCallStore.getState().enqueue('B', { title: 'fase 2' });
    expect(useManualCallStore.getState().pending?.meta?.title).toBe('fase 2');
    useManualCallStore.getState().resolveCurrent('r2');
    await expect(p2).resolves.toBe('r2');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/stores/useManualCallStore.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `src/stores/useManualCallStore.ts`:

```ts
import { create } from 'zustand';
import { ManualCancelledError, ManualUnsupportedError } from '../utils/manualCall';

interface PendingCall {
  id: string;
  prompt: string;
  meta?: { title?: string };
  resolve: (text: string) => void;
  reject: (err: Error) => void;
}

interface ManualCallState {
  pending: PendingCall | null;
  enqueue: (prompt: string, meta?: { title?: string }) => Promise<string>;
  resolveCurrent: (text: string) => void;
  rejectCurrent: (reason?: Error) => void;
}

let counter = 0;

export const useManualCallStore = create<ManualCallState>((set, get) => ({
  pending: null,

  enqueue: (prompt, meta) => {
    // Multi-call paralelo está desligado no modo manual; se algo disparar uma
    // segunda chamada antes de resolver a anterior, rejeita a nova de forma clara.
    if (get().pending) {
      return Promise.reject(
        new ManualUnsupportedError('Já existe uma chamada manual em andamento.')
      );
    }
    return new Promise<string>((resolve, reject) => {
      counter += 1;
      set({ pending: { id: `manual-${counter}`, prompt, meta, resolve, reject } });
    });
  },

  resolveCurrent: (text) => {
    const p = get().pending;
    if (!p) return;
    set({ pending: null });
    p.resolve(text);
  },

  rejectCurrent: (reason) => {
    const p = get().pending;
    if (!p) return;
    set({ pending: null });
    p.reject(reason ?? new ManualCancelledError());
  },
}));
```

> Nota: o store NÃO usa `persist` (callbacks não são serializáveis). Confirme que segue o padrão `create` simples (sem middleware immer), já que mutamos via `set` com objeto novo.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/stores/useManualCallStore.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/stores/useManualCallStore.ts src/stores/useManualCallStore.test.ts
git commit -m "feat(manual): broker useManualCallStore (Promise pendente via Zustand)"
```

---

### Task 4: `ManualCallModal` + montagem no ModalRoot

**Files:**
- Create: `src/components/modals/ManualCallModal.tsx`
- Test: `src/components/modals/ManualCallModal.test.tsx`
- Modify: `src/components/modals/ModalRoot.tsx`

- [ ] **Step 1: Escrever teste que falha**

Criar `src/components/modals/ManualCallModal.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManualCallModal } from './ManualCallModal';
import { useManualCallStore } from '../../stores/useManualCallStore';

describe('ManualCallModal', () => {
  beforeEach(() => useManualCallStore.setState({ pending: null }));

  it('não renderiza nada sem pending', () => {
    const { container } = render(<ManualCallModal />);
    expect(container.textContent).not.toContain('Sem Provider');
  });

  it('mostra o prompt e resolve ao confirmar', async () => {
    const p = useManualCallStore.getState().enqueue('PROMPT-X');
    render(<ManualCallModal />);
    expect(screen.getByText(/PROMPT-X/)).toBeTruthy();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'RESP-Y' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await expect(p).resolves.toBe('RESP-Y');
  });

  it('Confirmar fica desabilitado com textarea vazia', () => {
    useManualCallStore.getState().enqueue('PROMPT-X');
    render(<ManualCallModal />);
    const btn = screen.getByRole('button', { name: /confirmar/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/modals/ManualCallModal.test.tsx`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar o modal**

Criar `src/components/modals/ManualCallModal.tsx`. Verificar antes as props reais de `BaseModal` (`src/components/modals/BaseModal.tsx`) e ajustar nomes se divergirem; usar `Button` do design-system.

```tsx
import React from 'react';
import { ClipboardCopy, Check } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Button } from '../ui/Button';
import { useManualCallStore } from '../../stores/useManualCallStore';

/**
 * Modal do modo "Sem Provider": mostra o prompt para copiar e recebe a resposta
 * colada de qualquer LLM. Resolve/rejeita a Promise pendente no useManualCallStore.
 */
export const ManualCallModal: React.FC = () => {
  const pending = useManualCallStore((s) => s.pending);
  const resolveCurrent = useManualCallStore((s) => s.resolveCurrent);
  const rejectCurrent = useManualCallStore((s) => s.rejectCurrent);

  const [response, setResponse] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  // Limpa o campo a cada nova chamada.
  React.useEffect(() => {
    setResponse('');
    setCopied(false);
  }, [pending?.id]);

  if (!pending) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pending.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível: usuário seleciona manualmente */
    }
  };

  const handleConfirm = () => {
    if (!response.trim()) return;
    resolveCurrent(response);
  };

  const handleCancel = () => rejectCurrent();

  return (
    <BaseModal
      isOpen
      onClose={handleCancel}
      title={pending.meta?.title || 'Chamada manual — cole no seu LLM'}
      subtitle="Sem Provider · copie o prompt, gere a resposta em qualquer LLM e cole abaixo"
      icon={<ClipboardCopy className="w-5 h-5" />}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!response.trim()}>
            Confirmar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold theme-text-muted">PROMPT</label>
            <Button variant="ghost" size="sm" onClick={handleCopy}
              icon={copied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}>
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg p-3 text-sm
            theme-bg-secondary-30 theme-text-primary border theme-border-input">
            {pending.prompt}
          </pre>
        </div>
        <div>
          <label className="block text-xs font-semibold theme-text-muted mb-1">
            RESPOSTA (cole aqui)
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={8}
            autoFocus
            className="w-full rounded-lg p-3 text-sm resize-y
              theme-bg-secondary-30 theme-text-primary border theme-border-input
              focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Cole aqui a resposta gerada pelo seu LLM…"
          />
        </div>
      </div>
    </BaseModal>
  );
};

export default ManualCallModal;
```

> Se `BaseModal` usar nomes de prop diferentes (ex.: `header` em vez de `title`), ajuste conforme `BaseModal.tsx`. As classes `theme-*` já existem no projeto e cobrem claro/escuro.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/modals/ManualCallModal.test.tsx`
Expected: PASS (3 testes). Se algum seletor falhar por causa de props do `BaseModal`, ajuste o componente (não o teste).

- [ ] **Step 5: Montar no ModalRoot**

Em `src/components/modals/ModalRoot.tsx`, importar e renderizar (junto aos demais modais 100% Zustand):

```tsx
import { ManualCallModal } from './ManualCallModal';
```
E no JSX retornado, adicionar `<ManualCallModal />` ao lado dos outros modais.

- [ ] **Step 6: Checar tipos + commit**

Run: `npx tsc --noEmit`
Expected: sem novos erros.

```bash
git add src/components/modals/ManualCallModal.tsx src/components/modals/ManualCallModal.test.tsx src/components/modals/ModalRoot.tsx
git commit -m "feat(manual): ManualCallModal global montado no ModalRoot"
```

---

## Phase 2 — Interceptação nos dispatchers

### Task 5: Interceptar `'manual'` no `useAIIntegration` principal

**Files:**
- Modify: `src/types/index.ts` (`AICallOptions` — adicionar `manualTitle?`)
- Modify: `src/hooks/useAIIntegration.ts` (`callAI` ~1473, `callAIStream` ~2160)
- Test: `src/hooks/useAIIntegration.test.ts`

- [ ] **Step 1: Escrever teste que falha**

Em `src/hooks/useAIIntegration.test.ts`, adicionar um teste que renderiza o hook com `provider: 'manual'`, dispara `callAI`, e resolve a chamada via `useManualCallStore`. Seguir o padrão de setup já usado no arquivo (provavelmente `renderHook` + mock de `useAIStore`). Esqueleto:

```ts
import { useManualCallStore } from '../stores/useManualCallStore';

it('callAI no modo manual enfileira no broker e retorna a resposta normalizada', async () => {
  // configurar aiSettings.provider = 'manual' conforme o setup do arquivo
  const { result } = renderHook(() => useAIIntegration(/* deps do arquivo */));
  let promise: Promise<string>;
  act(() => {
    promise = result.current.callAI([{ role: 'user', content: [{ type: 'text', text: 'oi' }] }], {});
  });
  // espera o broker receber a chamada
  await waitFor(() => expect(useManualCallStore.getState().pending).not.toBeNull());
  act(() => useManualCallStore.getState().resolveCurrent('```json\n{"ok":1}\n```'));
  await expect(promise!).resolves.toBe('{"ok":1}');
});
```

> Use os mesmos utilitários (`renderHook`, `act`, `waitFor`) e o mesmo jeito de injetar `aiSettings.provider` que os testes vizinhos nesse arquivo já usam.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/hooks/useAIIntegration.test.ts -t "modo manual"`
Expected: FAIL — sem interceptação, cai no Claude e tenta fetch.

- [ ] **Step 3: Implementar**

Em `src/types/index.ts`, no `interface AICallOptions` (linha ~918), adicionar:

```ts
  /** Título opcional exibido no modal do modo manual (ex.: "Prova oral — fase 2 de 3"). */
  manualTitle?: string;
```

No topo de `src/hooks/useAIIntegration.ts`, importar:

```ts
import { serializeForManual, normalizeManualResponse } from '../utils/manualCall';
import { useManualCallStore } from '../stores/useManualCallStore';
```

Em `callAI` (logo após `const provider = options.provider || aiSettings.provider || 'claude';`, linha ~1474), inserir antes dos demais `if`:

```ts
    if (provider === 'manual') {
      const promptText = serializeForManual(messages, options, getAiInstructions);
      const raw = await useManualCallStore.getState().enqueue(promptText, { title: options.manualTitle });
      return normalizeManualResponse(raw);
    }
```

Em `callAIStream` (dentro do `switch (provider)`, linha ~2166), adicionar um `case` antes do `default`:

```ts
      case 'manual': {
        const promptText = serializeForManual(messages, options, getAiInstructions);
        const raw = await useManualCallStore.getState().enqueue(promptText, { title: options.manualTitle });
        return normalizeManualResponse(raw);
      }
```

Adicionar `getAiInstructions` aos arrays de deps do `useCallback` de `callAI` e `callAIStream` (se ainda não estiver — `callAIStream` hoje não lista; incluir).

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/hooks/useAIIntegration.test.ts -t "modo manual"`
Expected: PASS
Run: `npx tsc --noEmit`
Expected: sem novos erros.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/hooks/useAIIntegration.ts src/hooks/useAIIntegration.test.ts
git commit -m "feat(manual): intercepta provider 'manual' em callAI/callAIStream (app principal)"
```

---

### Task 6: Interceptar `'manual'` nas 4 cópias dos subapps

**Files:**
- Modify: `src/apps/prova-oral/hooks/useAIIntegration.ts`
- Modify: `src/apps/embargos/hooks/useAIIntegration.ts`
- Modify: `src/apps/noticias/hooks/useAIIntegration.ts`
- Modify: `src/apps/analisador/hooks/useAIIntegration.ts`

- [ ] **Step 1: Inspecionar cada cópia**

Para cada arquivo, localizar o equivalente a `callAI` e `callAIStream` (mesma estrutura `switch (provider)` / cadeia de `if`). Confirmar onde fica `const provider = ...` e o `getAiInstructions` local.

Run: `grep -n "const provider =\|switch (provider)\|getAiInstructions\|const callAI\|const callAIStream" src/apps/prova-oral/hooks/useAIIntegration.ts src/apps/embargos/hooks/useAIIntegration.ts src/apps/noticias/hooks/useAIIntegration.ts src/apps/analisador/hooks/useAIIntegration.ts`

- [ ] **Step 2: Implementar em cada cópia**

Em cada arquivo, importar no topo:

```ts
import { serializeForManual, normalizeManualResponse } from '../../../utils/manualCall';
import { useManualCallStore } from '../../../stores/useManualCallStore';
```
(ajustar a profundidade `../` conforme a localização real do arquivo).

E inserir o mesmo bloco de interceptação no início de `callAI` e no `switch`/cadeia de `callAIStream`, idêntico ao da Task 5:

```ts
    if (provider === 'manual') {
      const promptText = serializeForManual(messages, options, getAiInstructions);
      const raw = await useManualCallStore.getState().enqueue(promptText, { title: options.manualTitle });
      return normalizeManualResponse(raw);
    }
```

> Se alguma cópia só expõe `callAIStream` (sem `callAI`), interceptar apenas onde existir. Manter o array de deps correto.

- [ ] **Step 3: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem novos erros.

- [ ] **Step 4: Rodar a suíte dos subapps**

Run: `npx vitest run src/apps`
Expected: PASS (sem regressões).

- [ ] **Step 5: Commit**

```bash
git add src/apps/prova-oral/hooks/useAIIntegration.ts src/apps/embargos/hooks/useAIIntegration.ts src/apps/noticias/hooks/useAIIntegration.ts src/apps/analisador/hooks/useAIIntegration.ts
git commit -m "feat(manual): intercepta provider 'manual' nas 4 cópias de useAIIntegration dos subapps"
```

---

### Task 7: Prova oral — título por fase

**Files:**
- Modify: `src/apps/prova-oral/hooks/useProvaOralAnalysis.ts:279,362,464`

- [ ] **Step 1: Implementar**

Nas 3 chamadas `callAIStream` (fase 1, 2 e 3), acrescentar a opção `manualTitle` ao objeto de options:

```ts
        manualTitle: 'Prova oral — fase 1 de 3',
```
```ts
        manualTitle: 'Prova oral — fase 2 de 3',
```
```ts
        manualTitle: 'Prova oral — fase 3 de 3',
```

> Como as fases já fazem `await` em sequência, cada `enqueue` ocorre sozinho — sem conflito com o guard de chamada concorrente do broker.

- [ ] **Step 2: Checar tipos + rodar testes do subapp**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/apps/prova-oral`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/prova-oral/hooks/useProvaOralAnalysis.ts
git commit -m "feat(manual): rotula fases da prova oral no modal manual"
```

---

## Phase 3 — Bloqueio de PDF puro no modo manual

### Task 8: `getEffectiveMode` bloqueia `pdf-puro` no manual

**Files:**
- Modify: `src/hooks/useDocumentAnalysis.ts:275-280`
- Test: `src/hooks/useDocumentAnalysis.test.ts`

- [ ] **Step 1: Escrever teste que falha**

O `getEffectiveMode` está hoje como função interna. Para testá-lo importando produção, extrair para um util puro `src/utils/documentMode.ts` e cobri-lo. Criar `src/utils/documentMode.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveEffectiveMode } from './documentMode';

describe('resolveEffectiveMode', () => {
  it('rebaixa pdf-puro para extração quando provider é manual', () => {
    expect(resolveEffectiveMode('pdf-puro', { provider: 'manual', anonymizationEnabled: false, globalOcrEngine: 'pdfjs' })).toBe('pdfjs');
  });
  it('rebaixa pdf-puro/vision quando anonimização ligada (comportamento atual preservado)', () => {
    expect(resolveEffectiveMode('claude-vision', { provider: 'claude', anonymizationEnabled: true, globalOcrEngine: 'tesseract' })).toBe('pdfjs');
  });
  it('mantém pdf-puro para provider que suporta binário sem anonimização', () => {
    expect(resolveEffectiveMode('pdf-puro', { provider: 'claude', anonymizationEnabled: false, globalOcrEngine: 'pdfjs' })).toBe('pdf-puro');
  });
  it('default cai para globalOcrEngine ou pdfjs', () => {
    expect(resolveEffectiveMode(undefined, { provider: 'manual', anonymizationEnabled: false, globalOcrEngine: undefined })).toBe('pdfjs');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/utils/documentMode.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o util e usar nos hooks**

Criar `src/utils/documentMode.ts`:

```ts
import type { AIProvider } from '../types';

type Mode = 'pdfjs' | 'tesseract' | 'claude-vision' | 'gemini-vision' | 'pdf-puro' | string;

/** Modos que produzem binário/vision e devem ser rebaixados em certos contextos. */
const BLOCKED_WITH_ANON = ['claude-vision', 'gemini-vision', 'pdf-puro'];

/**
 * Resolve o modo efetivo de processamento de um documento.
 * - Anonimização ligada: rebaixa modos binário/vision para 'pdfjs' (comportamento atual).
 * - Provider 'manual' (e 'grok'): proíbe 'pdf-puro' (sem binário) → cai para extração.
 */
export function resolveEffectiveMode(
  docMode: string | undefined,
  ctx: { provider: AIProvider; anonymizationEnabled: boolean; globalOcrEngine?: string },
): Mode {
  if (ctx.anonymizationEnabled && docMode && BLOCKED_WITH_ANON.includes(docMode)) {
    return 'pdfjs';
  }
  const pdfBinaryAllowed = ctx.provider !== 'manual' && ctx.provider !== 'grok';
  if (!pdfBinaryAllowed && docMode === 'pdf-puro') {
    return ctx.globalOcrEngine && ctx.globalOcrEngine !== 'pdf-puro' ? ctx.globalOcrEngine : 'pdfjs';
  }
  return docMode || ctx.globalOcrEngine || 'pdfjs';
}
```

Em `src/hooks/useDocumentAnalysis.ts`, substituir a função interna `getEffectiveMode` (linhas 277-280) por uma chamada ao util, preservando o uso de `globalOcrEngine` e `anonymizationEnabled` já capturados (linhas 272-274) e o `provider` (já disponível no hook):

```ts
      const getEffectiveMode = (docMode: string | undefined) =>
        resolveEffectiveMode(docMode, {
          provider: aiIntegration.aiSettings.provider,
          anonymizationEnabled: !!anonymizationEnabled,
          globalOcrEngine,
        });
```
E importar no topo:
```ts
import { resolveEffectiveMode } from '../utils/documentMode';
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/utils/documentMode.test.ts`
Expected: PASS (4 testes).
Run: `npx vitest run src/hooks/useDocumentAnalysis.test.ts`
Expected: PASS (sem regressão).

- [ ] **Step 5: Commit**

```bash
git add src/utils/documentMode.ts src/utils/documentMode.test.ts src/hooks/useDocumentAnalysis.ts
git commit -m "feat(manual): pdf-puro rebaixado para extração no modo manual (useDocumentAnalysis)"
```

---

### Task 9: Bloquear binário em report/proof/facts e anexos

**Files:**
- Modify: `src/hooks/useReportGeneration.ts:185-239`
- Modify: `src/hooks/useProofAnalysis.ts:194-250`
- Modify: `src/hooks/useFactsComparison.ts:221-254`
- Modify: `src/utils/context-helpers.ts:272,474`

- [ ] **Step 1: Mapear o gate de binário em cada arquivo**

Run: `grep -n "pdf-puro\|usePdfPuro\|type: 'document'\|provider\|processingMode" src/hooks/useReportGeneration.ts src/hooks/useProofAnalysis.ts src/hooks/useFactsComparison.ts src/utils/context-helpers.ts`

Identificar onde cada um decide enviar `type: 'document'` (binário). Em `useReportGeneration`/`useProofAnalysis`/`useFactsComparison`, o binário vem de `docsToUse.*`/`analyzedDocuments.*` (base64 já extraído na fase de análise). Em `context-helpers.ts`, o gate é `attachment.processingMode === 'pdf-puro'`.

- [ ] **Step 2: Implementar o gate**

Em `src/utils/context-helpers.ts`, nas linhas 272 e 474, trocar:
```ts
const usePdfPuro = attachment.processingMode === 'pdf-puro';
```
por (assumindo que o `provider` esteja acessível no escopo; se não, recebê-lo como parâmetro da função que monta o contexto):
```ts
import { isPdfBinaryAllowed } from './manualCall';
// ...
const usePdfPuro = attachment.processingMode === 'pdf-puro' && isPdfBinaryAllowed(provider);
```
Quando `usePdfPuro` for `false`, o código já cai no caminho de texto extraído (`attachment.extractedText`). Garantir que esse caminho exista; se o `extractedText` estiver vazio, exibir aviso (reusar o padrão de `showToast`/log do arquivo).

Em `useReportGeneration`/`useProofAnalysis`/`useFactsComparison`: estes anexam binário a partir de base64 já presente em `docsToUse`/`analyzedDocuments`. Quando `provider === 'manual'`, **não anexar os blocos `type: 'document'`** e usar o texto extraído correspondente (estes hooks já têm o texto extraído disponível na fase de análise — confirmar a variável: `extractedTexts`/`peticoesTextFinal`/equivalente). Envolver o bloco que faz `contentArray.push({ type: 'document', ... })` em:
```ts
if (isPdfBinaryAllowed(aiIntegration.aiSettings.provider)) {
  // ...push binário existente...
} else {
  // push do texto extraído equivalente (mesmo formato usado pelo branch de texto)
}
```
Importar `isPdfBinaryAllowed` de `'../utils/manualCall'` em cada hook.

> Se algum desses hooks NÃO tiver o texto extraído à mão no ponto da montagem, e só tiver o base64, então neste arquivo o recurso lança `ManualUnsupportedError` (rede de segurança) com toast — registrar no commit qual hook caiu nesse caso para revisão.

- [ ] **Step 3: Checar tipos + testes**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/hooks/useReportGeneration.test.ts src/hooks/useProofAnalysis.test.ts src/hooks/useFactsComparison.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useReportGeneration.ts src/hooks/useProofAnalysis.ts src/hooks/useFactsComparison.ts src/utils/context-helpers.ts
git commit -m "feat(manual): usa texto extraído em vez de PDF binário no modo manual (report/proof/facts/anexos)"
```

---

## Phase 4 — Desligamentos

### Task 10: Double-check desligado no modo manual

**Files:**
- Modify: `src/hooks/useFactsComparison.ts:292-294`
- Modify: `src/components/modals/ConfigModal.tsx` (seção double-check, ~1321/1370)
- Test: `src/hooks/useFactsComparison.test.ts`

- [ ] **Step 1: Escrever teste que falha**

Em `src/hooks/useFactsComparison.test.ts`, adicionar teste: com `provider==='manual'` e `doubleCheck.enabled===true`, `performDoubleCheck` NÃO é chamado. Seguir o setup/mocks já presentes no arquivo. Esqueleto:

```ts
it('não roda double-check no modo manual', async () => {
  // setup com aiSettings.provider='manual', doubleCheck.enabled=true, operations.factsComparison=true
  // mock performDoubleCheck = vi.fn()
  // ...dispara a comparação e resolve o broker...
  expect(performDoubleCheckMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/hooks/useFactsComparison.test.ts -t "manual"`
Expected: FAIL — double-check ainda dispara.

- [ ] **Step 3: Implementar**

Em `src/hooks/useFactsComparison.ts`, na condição da linha ~293, adicionar guarda de provider:

```ts
      if (aiIntegration.aiSettings.provider !== 'manual' &&
          aiIntegration.aiSettings.doubleCheck?.enabled &&
          aiIntegration.aiSettings.doubleCheck?.operations.factsComparison) {
```

Em `ConfigModal.tsx`, na seção de double-check, desabilitar os controles e mostrar nota quando `aiSettings.provider === 'manual'` (ex.: `disabled={aiSettings.provider === 'manual'}` no toggle e texto auxiliar "Indisponível no modo Sem Provider").

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/hooks/useFactsComparison.test.ts -t "manual"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFactsComparison.ts src/components/modals/ConfigModal.tsx src/hooks/useFactsComparison.test.ts
git commit -m "feat(manual): desliga double-check no modo Sem Provider"
```

---

### Task 11: Voz desligada no modo manual

**Files:**
- Modify: `src/hooks/useVoiceImprovement.ts:157,194`
- Modify: componente que renderiza o botão de voz/mic (localizar)

- [ ] **Step 1: Localizar UI de voz**

Run: `grep -rln "useVoiceImprovement\|useVoiceToText\|microfone\|Mic\b" src/components --include=*.tsx`

- [ ] **Step 2: Implementar**

Em `useVoiceImprovement.ts`, no início das funções que chamam `callAI` (linhas 157 e 194), se `provider === 'manual'` retornar o texto original sem chamar IA (no-op):

```ts
  if (aiSettings.provider === 'manual') {
    return text; // melhoria de voz indisponível no modo Sem Provider
  }
```
(ajustar o nome da variável de entrada/retorno conforme cada função).

Na UI do botão de voz/mic, adicionar `disabled` + tooltip quando `provider === 'manual'` (ex.: "Indisponível no modo Sem Provider").

- [ ] **Step 3: Checar tipos + testes**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/hooks/useVoiceImprovement.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useVoiceImprovement.ts src/components
git commit -m "feat(manual): desativa voz no modo Sem Provider"
```

---

### Task 12: Refino de modelo e jurisprudência → só IA local

**Files:**
- Modify: `src/hooks/useModelSuggestions.ts:232`
- Modify: `src/utils/jurisprudencia.ts:170`
- Test: `src/hooks/useModelSuggestions.test.ts`

- [ ] **Step 1: Escrever teste que falha**

Em `src/hooks/useModelSuggestions.test.ts`, teste: com `provider==='manual'`, o refino NÃO chama `callAI` e retorna o ranking local. Seguir setup do arquivo:

```ts
it('não chama LLM no modo manual (usa ranking local)', async () => {
  // provider='manual'; callAI mock = vi.fn()
  // ...dispara refino...
  expect(callAIMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/hooks/useModelSuggestions.test.ts -t "manual"`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Em `useModelSuggestions.ts`, antes do bloco que chama `callAI` (linha ~232), retornar o resultado local quando `provider === 'manual'` (pular o reordenamento por LLM):

```ts
    if (aiIntegration.aiSettings.provider === 'manual') {
      return localRankedResult; // já calculado pelo ranking lexical+semântico (E5)
    }
```
(usar o nome real da variável do ranking local nesse hook).

Em `utils/jurisprudencia.ts`, na função que chama `callLLM` (linha ~170), receber/checar o provider e, se `'manual'`, retornar o caminho local (ou um resultado vazio/sem reescrita por LLM) sem chamar `callLLM`. Ajustar a assinatura para receber `provider` se necessário.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/hooks/useModelSuggestions.test.ts -t "manual"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useModelSuggestions.ts src/utils/jurisprudencia.ts src/hooks/useModelSuggestions.test.ts
git commit -m "feat(manual): refino de modelo e jurisprudência ficam só em IA local no modo Sem Provider"
```

---

## Phase 5 — UI do seletor de provider

### Task 13: Card do provider manual no ConfigModal

**Files:**
- Modify: `src/components/modals/ConfigModal.tsx:602` (após o card `codex-cli`)

- [ ] **Step 1: Implementar o card**

Após o `<button>` do `codex-cli` (linha ~618), adicionar, seguindo o mesmo padrão visual (cores neutras, sem API key — já tratado em `:350`):

```tsx
              <button
                onClick={() => setAiSettings({ ...aiSettings, provider: 'manual' })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  aiSettings.provider === 'manual'
                    ? 'bg-slate-600/20 border-slate-500'
                    : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider="manual" size={20} className="text-slate-400" />
                  <div>
                    <div className="font-semibold theme-text-primary text-sm">Sem Provider</div>
                    <div className="text-xs theme-text-muted">copiar / colar · $0</div>
                  </div>
                </div>
              </button>
```

- [ ] **Step 2: Ajustar a seção de Modelo**

Na label de modelo (linha ~622) e nos blocos condicionais `aiSettings.provider === '...'`, garantir que no modo `'manual'` não apareça seletor de modelo nem campo de API key (o provider não tem nenhum). Adicionar, onde fizer sentido, uma nota: "Modo manual: cada chamada abre um modal para copiar o prompt e colar a resposta."

- [ ] **Step 3: Checar tipos + smoke de render**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/components/modals/ConfigModal.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/ConfigModal.tsx
git commit -m "feat(manual): card 'Sem Provider' no seletor de provedores"
```

---

## Phase 6 — Verificação final e versionamento

### Task 14: Suíte completa + tipos

**Files:** nenhum (verificação)

- [ ] **Step 1: Rodar tudo**

Run: `npx tsc --noEmit`
Expected: sem erros.
Run: `npx vitest run`
Expected: toda a suíte passa (incluindo os novos testes).

- [ ] **Step 2: Verificação manual rápida (opcional, recomendada)**

Subir o app, selecionar "Sem Provider", gerar texto de decisão, confirmar que o modal abre com o prompt, copiar/colar uma resposta e ver o fluxo concluir. Verificar tema claro e escuro.

---

### Task 15: Bump de versão (4 arquivos, mesmo commit)

**Files:**
- Modify: `CLAUDE.md:7`
- Modify: `src/App.tsx` (`APP_VERSION`)
- Modify: `src/constants/changelog.js`
- Modify: `package.json`

- [ ] **Step 1: Definir a nova versão**

Próxima minor (feature): de `1.52.49` para `1.53.0`. Atualizar:
- `CLAUDE.md` linha 7: `**Version**: 1.53.0`.
- `src/App.tsx`: `APP_VERSION` → `v1.53.0`.
- `package.json`: `"version": "1.53.0"`.
- `src/constants/changelog.js`: nova entrada no topo:

```js
{
  version: 'v1.53.0',
  date: '2026-06-09',
  changes: [
    'Novo provider "Sem Provider (copiar/colar)": rode qualquer chamada de IA copiando o prompt e colando a resposta de qualquer LLM — custo $0.',
    'Modo manual desativa voz, double-check e multiagente; refino de modelo, legislação e jurisprudência seguem em IA local.',
    'PDF puro é proibido no modo manual (usa texto extraído via PDF.js/Tesseract/Vision, como o Grok).',
    'Prova oral no modo manual abre um modal por fase (1 a 3).',
  ],
},
```

- [ ] **Step 2: Checar build de tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md src/App.tsx src/constants/changelog.js package.json
git commit -m "chore: bump v1.53.0 (modo Sem Provider copiar/colar)"
```

---

## Self-Review (preenchido)

**Cobertura do spec:**
- Provider `'manual'` no enum/selectors/ícone → Task 1, 13.
- Util `serializeForManual`/`normalizeManualResponse`/`isPdfBinaryAllowed`/erros → Task 2.
- Broker → Task 3.
- Modal global + ModalRoot → Task 4.
- Interceptação nos 2 dispatchers × 5 cópias → Task 5, 6.
- Streaming vira não-stream no manual → coberto pela interceptação no `callAIStream` (ignora `onChunk`).
- Prova oral sequencial com rótulo → Task 7.
- Bloqueio de PDF puro (4 hooks + anexos) → Task 8, 9.
- Double-check off → Task 10. Voz off → Task 11. Refino/jurisprudência/legislação local → Task 12 (legislação já não chama LLM).
- Multi-call paralelo: coberto pelo guard de chamada concorrente do broker (Task 3) — sem código extra.
- Token tracking $0: chamadas manuais não passam por `addTokenUsage` (a interceptação retorna antes), então custo é naturalmente $0 — sem task dedicada.
- Versionamento → Task 15.

**Placeholders:** os pontos "localizar variável real" em Task 9/11/12 são inerentes às 5 cópias/hooks com nomes locais; cada um traz o `grep` exato para resolver na hora, com o código a inserir já escrito. Sem "TODO/TBD".

**Consistência de tipos:** `enqueue(prompt, meta?)`, `resolveCurrent(text)`, `rejectCurrent(reason?)`, `serializeForManual(messages, options, getAiInstructions)`, `normalizeManualResponse(raw)`, `isPdfBinaryAllowed(provider)`, `resolveEffectiveMode(docMode, ctx)`, `manualTitle?` — nomes usados de forma idêntica entre tasks.
