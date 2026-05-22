# Subapp Embargos de Declaração — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um novo subapp em `src/apps/embargos/` que orquestra a redação de minutas de embargos de declaração trabalhistas em duas chamadas à IA (síntese estruturada revisável → minuta em três seções com refino por chat).

**Architecture:** Subapp standalone espelhando o molde do Analisador. Stores Zustand (documents, synthesis, draft) + hooks (upload, IA, refino, autosave) + componentes (upload, synthesis review, draft view, history, settings) + persistência local (IndexedDB nativo). Integração ao app raiz via rota `/embargos` e AppSwitcher.

**Tech Stack:** React + TypeScript + Zustand + Tailwind (dark mode), pdf.js (via window.pdfjsLib), Zod (validação JSON da IA), IndexedDB nativo, lucide-react (ícones). Sem testes automatizados (consistente com os demais subapps — validação via `npx tsc --noEmit` + smoke tests manuais).

**Decisões de execução:**
- Cada tarefa termina com `npx tsc --noEmit` passando (no diretório raiz do projeto). Erros de tipos bloqueiam.
- Commits frequentes ao final de cada tarefa.
- Quando uma tarefa é cópia de arquivo de outro subapp, mostro `cp` + lista de **patches específicos** (imports, nomes), não o código todo.
- Smoke tests manuais (`npm run dev`) em marcos definidos (M1, M2, M3, M4 — anotados no plano).

**Documento de referência:** `docs/superpowers/specs/2026-05-21-embargos-subapp-design.md`.

---

## File Structure

```
src/apps/embargos/
├── EmbargosApp.tsx                    # Root: ToastProvider → LoginGate → EmbargosContent
├── EmbargosContent.tsx                # Lógica de roteamento entre telas
├── index.ts                           # Barrel
├── components/
│   ├── ui/
│   │   ├── Button.tsx                 # Cópia do Analisador
│   │   ├── Toast.tsx                  # Cópia do Analisador
│   │   ├── BaseModal.tsx              # Cópia do Analisador
│   │   └── index.ts
│   ├── auth/
│   │   └── LoginGate.tsx              # Cópia do Analisador
│   ├── upload/
│   │   ├── PdfDropArea.tsx
│   │   ├── PdfSlot.tsx
│   │   ├── UploadView.tsx
│   │   └── index.ts
│   ├── synthesis/
│   │   ├── SynthesisReview.tsx
│   │   ├── IdentificacaoCard.tsx
│   │   ├── ResumosCard.tsx
│   │   ├── PontoCard.tsx
│   │   ├── DiretrizesGeraisTextarea.tsx
│   │   └── index.ts
│   ├── draft/
│   │   ├── DraftView.tsx
│   │   ├── SectionEditor.tsx
│   │   ├── RefinePanel.tsx
│   │   ├── DraftActionBar.tsx
│   │   └── index.ts
│   ├── history/
│   │   ├── HistoricoModal.tsx
│   │   ├── HistoricoItem.tsx
│   │   └── index.ts
│   ├── settings/
│   │   ├── SettingsModal.tsx
│   │   ├── AIProviderSelector.tsx     # Cópia do Analisador
│   │   ├── ModelSelector.tsx          # Cópia do Analisador
│   │   ├── APIKeyInput.tsx            # Cópia do Analisador
│   │   └── index.ts
│   └── shared/
│       └── Header.tsx
├── hooks/
│   ├── index.ts
│   ├── useAIIntegration.ts            # Adaptação do Analisador
│   ├── usePdfUpload.ts
│   ├── useSynthesisAnalysis.ts
│   ├── useDraftGeneration.ts
│   ├── useSectionRefine.ts
│   ├── useAutoSave.ts
│   └── useLocalHistory.ts
├── stores/
│   ├── index.ts
│   ├── useAIStore.ts
│   ├── useDocumentStore.ts
│   ├── useSynthesisStore.ts
│   └── useDraftStore.ts
├── prompts/
│   ├── index.ts
│   ├── style-guide.ts
│   ├── synthesis.ts
│   ├── draft.ts
│   └── refine.ts
├── services/
│   ├── pdfService.ts                  # Cópia do Analisador
│   └── localHistoryService.ts
├── types/
│   ├── index.ts
│   ├── document.types.ts
│   ├── synthesis.types.ts
│   └── draft.types.ts
├── utils/
│   ├── format-date.ts
│   └── concat-draft.ts
└── constants/
    ├── index.ts
    └── providers.ts                   # Cópia do Analisador

src/schemas/ai-responses/
└── embargos.ts                        # Schemas Zod novos (SynthesisResponseSchema, DraftResponseSchema, RefineResponseSchema)
```

---

## Phase 0 — Setup

### Task 0.1: Criar estrutura de pastas vazia

**Files:**
- Create: `src/apps/embargos/` (estrutura completa)

- [ ] **Step 1: Criar diretórios**

```bash
mkdir -p src/apps/embargos/{components/{ui,auth,upload,synthesis,draft,history,settings,shared},hooks,stores,prompts,services,types,utils,constants}
```

- [ ] **Step 2: Validar criação**

```bash
find src/apps/embargos -type d | sort
```

Expected: lista com 12 diretórios (`embargos`, `components`, e 7 sub-pastas de components, + `hooks`, `stores`, `prompts`, `services`, `types`, `utils`, `constants`).

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos
git commit -m "chore(embargos): scaffold directory structure"
```

---

## Phase 1 — Types

### Task 1.1: `types/document.types.ts`

**Files:**
- Create: `src/apps/embargos/types/document.types.ts`

- [ ] **Step 1: Escrever tipos**

```typescript
/**
 * @file document.types.ts
 * @description Tipos de documentos (PDFs) do subapp Embargos.
 */

export type DocumentSlot =
  | 'decisaoEmbargada'
  | 'embargos'
  | 'contrarrazoes'
  | 'inicial'
  | 'contestacao';

export interface DocumentFile {
  id: string;
  slot: DocumentSlot;
  name: string;
  size: number;
  text: string;
  base64: string | null;
  useBinary: boolean;
  status: 'pending' | 'parsing' | 'ready' | 'error';
  errorMessage?: string;
}

export const SLOT_LABELS: Record<DocumentSlot, string> = {
  decisaoEmbargada: 'Decisão Embargada',
  embargos: 'Embargos',
  contrarrazoes: 'Contrarrazões',
  inicial: 'Petição Inicial',
  contestacao: 'Contestação'
};

export const REQUIRED_SLOTS: ReadonlyArray<DocumentSlot> = ['decisaoEmbargada', 'embargos'];
```

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS (sem erros).

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/types/document.types.ts
git commit -m "feat(embargos): document types"
```

### Task 1.2: `types/synthesis.types.ts`

**Files:**
- Create: `src/apps/embargos/types/synthesis.types.ts`

- [ ] **Step 1: Escrever tipos**

```typescript
/**
 * @file synthesis.types.ts
 * @description Tipos da síntese estruturada (1ª chamada à IA) e revisão pelo usuário.
 */

export type VicioTipo = 'omissao' | 'contradicao' | 'obscuridade' | 'erroMaterial';
export type ConclusaoTipo = 'acolher' | 'acolherParcial' | 'rejeitar' | 'sanarOficio';

export interface Tempestividade {
  tempestivo: boolean | null;
  observacao: string | null;
}

export interface Identificacao {
  numeroProcesso: string | null;
  parteEmbargante: string;
  parteEmbargada: string;
  polo: 'reclamante' | 'reclamada' | 'ambas';
  tempestividade: Tempestividade;
}

export interface PontoSuscitado {
  id: string;
  ordem: number;
  trechoEmbargos: string;
  vicioAlegadoPelaParte: VicioTipo[];
  vicioReconhecidoPelaIA: VicioTipo[];
  divergenciaVicio: string | null;
  oQueSentencaDisse: string;
  questaoSuscitadaNoProcesso: boolean | null;
  conclusaoPreliminar: ConclusaoTipo;
  justificativaPreliminar: string;
  efeitosInfringentes: boolean;
  outrosPedidos: string[];
  conclusaoUsuario?: ConclusaoTipo;
  diretrizesUsuario?: string;
}

export interface SynthesisResult {
  identificacao: Identificacao;
  resumoSentenca: string;
  resumoEmbargos: string;
  resumoContrarrazoes: string | null;
  intimacaoContrariaStatus: 'dispensada' | 'manifestouSe' | 'silente' | null;
  pontos: PontoSuscitado[];
  diretrizesGeraisUsuario?: string;
}

export const VICIO_LABELS: Record<VicioTipo, string> = {
  omissao: 'Omissão',
  contradicao: 'Contradição',
  obscuridade: 'Obscuridade',
  erroMaterial: 'Erro material'
};

export const CONCLUSAO_LABELS: Record<ConclusaoTipo, string> = {
  acolher: 'Acolher',
  acolherParcial: 'Acolher parcialmente',
  rejeitar: 'Rejeitar',
  sanarOficio: 'Sanar de ofício'
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/types/synthesis.types.ts
git commit -m "feat(embargos): synthesis types"
```

### Task 1.3: `types/draft.types.ts`

**Files:**
- Create: `src/apps/embargos/types/draft.types.ts`

- [ ] **Step 1: Escrever tipos**

```typescript
/**
 * @file draft.types.ts
 * @description Tipos da minuta gerada (2ª chamada à IA) e do histórico local.
 */

import type { DocumentSlot } from './document.types';
import type { SynthesisResult } from './synthesis.types';

export type DraftSectionKey = 'relatorio' | 'fundamentacao' | 'dispositivo';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Estado persistido de uma seção da minuta.
 * O status de refino em andamento NÃO fica aqui — é tracked exclusivamente em
 * useDraftStore.refiningSection (em memória), para evitar estado "preso" caso
 * o usuário feche a aba durante uma chamada à IA.
 */
export interface DraftSection {
  text: string;
  chatHistory: ChatMessage[];
}

export interface Draft {
  relatorio: DraftSection;
  fundamentacao: DraftSection;
  dispositivo: DraftSection;
}

export interface SavedDocumentMeta {
  slot: DocumentSlot;
  name: string;
  size: number;
}

export interface SavedEmbargos {
  id: string;
  createdAt: number;
  updatedAt: number;
  titulo: string;
  documents: SavedDocumentMeta[];
  synthesis: SynthesisResult;
  draft: Draft | null;
}

export const SECTION_LABELS: Record<DraftSectionKey, string> = {
  relatorio: 'Relatório',
  fundamentacao: 'Fundamentação',
  dispositivo: 'Dispositivo'
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/types/draft.types.ts
git commit -m "feat(embargos): draft types"
```

### Task 1.4: Barrel `types/index.ts`

**Files:**
- Create: `src/apps/embargos/types/index.ts`

- [ ] **Step 1: Escrever**

```typescript
export * from './document.types';
export * from './synthesis.types';
export * from './draft.types';
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/types/index.ts
git commit -m "feat(embargos): types barrel"
```

---

## Phase 2 — Constants e Utils

### Task 2.1: Copiar `constants/providers.ts` do Analisador

**Files:**
- Create: `src/apps/embargos/constants/providers.ts` (cópia)

- [ ] **Step 1: Copiar**

```bash
cp src/apps/analisador/constants/providers.ts src/apps/embargos/constants/providers.ts
```

- [ ] **Step 2: Ajustar imports relativos se houver**

Read `src/apps/embargos/constants/providers.ts`; corrigir qualquer import relativo de `'../../../types/ai'` se mudou de nível (mesmo nível, deve ficar `'../../../types/ai'`). Validar que não há referência a `'../types'` (do Analisador).

- [ ] **Step 3: `npx tsc --noEmit`** — PASS.

- [ ] **Step 4: Commit**

```bash
git add src/apps/embargos/constants/providers.ts
git commit -m "feat(embargos): copy provider constants from analisador"
```

### Task 2.2: `constants/index.ts`

**Files:**
- Create: `src/apps/embargos/constants/index.ts`

- [ ] **Step 1: Escrever**

```typescript
export * from './providers';
export const API_BASE = '';
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/constants/index.ts
git commit -m "feat(embargos): constants barrel"
```

### Task 2.3: `utils/format-date.ts`

**Files:**
- Create: `src/apps/embargos/utils/format-date.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file format-date.ts
 * @description Formatação de datas (Unix timestamp) usadas no histórico.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function formatTimestampBR(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTimestampBROnly(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/utils/format-date.ts
git commit -m "feat(embargos): date formatting util"
```

### Task 2.4: `utils/concat-draft.ts`

**Files:**
- Create: `src/apps/embargos/utils/concat-draft.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file concat-draft.ts
 * @description Concatena seções da minuta em texto único para copy/export.
 */

import type { Draft } from '../types';

/**
 * Concatena as três seções com quebras duplas, sem cabeçalhos.
 * Cabeçalhos não são inseridos porque o usuário cola direto no PJe.
 */
export function concatDraft(draft: Draft): string {
  const parts = [
    draft.relatorio.text.trim(),
    draft.fundamentacao.text.trim(),
    draft.dispositivo.text.trim()
  ].filter(p => p.length > 0);
  return parts.join('\n\n');
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/utils/concat-draft.ts
git commit -m "feat(embargos): concat draft util"
```

---

## Phase 3 — Stores

### Task 3.1: `stores/useAIStore.ts` via factory

**Files:**
- Create: `src/apps/embargos/stores/useAIStore.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file useAIStore.ts
 * @description Store de IA do subapp Embargos. Delega para a factory compartilhada.
 */

import { createAIStore } from '../../../stores/shared/createAIStore';
import type { AISettings } from '../../../types/ai';

const store = createAIStore({
  persistName: 'embargos-ai-store',
  apiKeyStorageKey: 'embargos-api-keys',
  apiKeyFallbackKeys: ['sentencify-ai-settings']
});

export const useAIStore = store.useStore;

export const persistApiKeys = (apiKeys: AISettings['apiKeys']): void => {
  store.persistKeys(apiKeys);
};

export {
  selectProvider,
  selectCurrentModel,
  selectCurrentApiKey
} from '../../../stores/shared/createAIStore';

export default useAIStore;
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/stores/useAIStore.ts
git commit -m "feat(embargos): AI store via shared factory"
```

### Task 3.2: `stores/useDocumentStore.ts`

**Files:**
- Create: `src/apps/embargos/stores/useDocumentStore.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file useDocumentStore.ts
 * @description Store dos slots de PDF do subapp Embargos.
 */

import { create } from 'zustand';
import type { DocumentFile, DocumentSlot } from '../types';
import { REQUIRED_SLOTS } from '../types';

interface DocumentStoreState {
  decisaoEmbargada: DocumentFile | null;
  embargos: DocumentFile | null;
  contrarrazoes: DocumentFile | null;
  inicial: DocumentFile | null;
  contestacao: DocumentFile | null;

  setSlot: (slot: DocumentSlot, file: DocumentFile | null) => void;
  updateSlotStatus: (slot: DocumentSlot, status: DocumentFile['status'], errorMessage?: string) => void;
  reset: () => void;
  canAnalyze: () => boolean;
  getAllSlots: () => Record<DocumentSlot, DocumentFile | null>;
}

const INITIAL_STATE = {
  decisaoEmbargada: null,
  embargos: null,
  contrarrazoes: null,
  inicial: null,
  contestacao: null
} as const;

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  ...INITIAL_STATE,

  setSlot: (slot, file) => set({ [slot]: file } as Partial<DocumentStoreState>),

  updateSlotStatus: (slot, status, errorMessage) => {
    const current = get()[slot];
    if (!current) return;
    set({ [slot]: { ...current, status, errorMessage } } as Partial<DocumentStoreState>);
  },

  reset: () => set(INITIAL_STATE),

  canAnalyze: () => {
    const state = get();
    return REQUIRED_SLOTS.every(slot => state[slot]?.status === 'ready');
  },

  getAllSlots: () => {
    const s = get();
    return {
      decisaoEmbargada: s.decisaoEmbargada,
      embargos: s.embargos,
      contrarrazoes: s.contrarrazoes,
      inicial: s.inicial,
      contestacao: s.contestacao
    };
  }
}));

export default useDocumentStore;
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/stores/useDocumentStore.ts
git commit -m "feat(embargos): document store"
```

### Task 3.3: `stores/useSynthesisStore.ts`

**Files:**
- Create: `src/apps/embargos/stores/useSynthesisStore.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file useSynthesisStore.ts
 * @description Store da síntese estruturada (1ª chamada) com edições do usuário.
 */

import { create } from 'zustand';
import type {
  SynthesisResult,
  PontoSuscitado,
  Identificacao
} from '../types';

type ResumoKey = 'resumoSentenca' | 'resumoEmbargos' | 'resumoContrarrazoes';

interface SynthesisStoreState {
  synthesis: SynthesisResult | null;
  isAnalyzing: boolean;
  progress: { value: number; label: string };
  error: string | null;
  savedId: string | null;

  setSynthesis: (s: SynthesisResult) => void;
  updatePonto: (id: string, patch: Partial<PontoSuscitado>) => void;
  updateResumo: (key: ResumoKey, text: string) => void;
  updateIdentificacao: (patch: Partial<Identificacao>) => void;
  setDiretrizesGerais: (text: string) => void;
  setIsAnalyzing: (v: boolean) => void;
  setProgress: (value: number, label: string) => void;
  setError: (msg: string | null) => void;
  setSavedId: (id: string | null) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  synthesis: null,
  isAnalyzing: false,
  progress: { value: 0, label: '' },
  error: null,
  savedId: null
} as const;

export const useSynthesisStore = create<SynthesisStoreState>((set, get) => ({
  ...INITIAL_STATE,

  setSynthesis: (s) => set({ synthesis: s, error: null }),

  updatePonto: (id, patch) => {
    const current = get().synthesis;
    if (!current) return;
    const pontos = current.pontos.map(p => (p.id === id ? { ...p, ...patch } : p));
    set({ synthesis: { ...current, pontos } });
  },

  updateResumo: (key, text) => {
    const current = get().synthesis;
    if (!current) return;
    set({ synthesis: { ...current, [key]: text } });
  },

  updateIdentificacao: (patch) => {
    const current = get().synthesis;
    if (!current) return;
    set({ synthesis: { ...current, identificacao: { ...current.identificacao, ...patch } } });
  },

  setDiretrizesGerais: (text) => {
    const current = get().synthesis;
    if (!current) return;
    set({ synthesis: { ...current, diretrizesGeraisUsuario: text } });
  },

  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setProgress: (value, label) => set({ progress: { value, label } }),
  setError: (msg) => set({ error: msg }),
  setSavedId: (id) => set({ savedId: id }),

  reset: () => set(INITIAL_STATE)
}));

export default useSynthesisStore;
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/stores/useSynthesisStore.ts
git commit -m "feat(embargos): synthesis store"
```

### Task 3.4: `stores/useDraftStore.ts`

**Files:**
- Create: `src/apps/embargos/stores/useDraftStore.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file useDraftStore.ts
 * @description Store da minuta (3 seções) com refino por chat.
 */

import { create } from 'zustand';
import type { Draft, DraftSectionKey, ChatMessage } from '../types';

interface DraftStoreState {
  draft: Draft | null;
  isGenerating: boolean;
  refiningSection: DraftSectionKey | null;
  progress: { value: number; label: string };
  error: string | null;

  setDraft: (d: Draft) => void;
  updateSection: (key: DraftSectionKey, text: string) => void;
  appendChatMessage: (key: DraftSectionKey, msg: ChatMessage) => void;
  acceptRefineResult: (key: DraftSectionKey, newText: string) => void;
  setRefining: (section: DraftSectionKey | null) => void;
  setIsGenerating: (v: boolean) => void;
  setProgress: (value: number, label: string) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

const emptySection = (): DraftSection => ({ text: '', chatHistory: [] });

const INITIAL_STATE = {
  draft: null,
  isGenerating: false,
  refiningSection: null,
  progress: { value: 0, label: '' },
  error: null
} as const;

export const useDraftStore = create<DraftStoreState>((set, get) => ({
  ...INITIAL_STATE,

  setDraft: (d) => set({ draft: d, error: null }),

  updateSection: (key, text) => {
    const current = get().draft;
    if (!current) return;
    set({ draft: { ...current, [key]: { ...current[key], text } } });
  },

  appendChatMessage: (key, msg) => {
    const current = get().draft;
    if (!current) return;
    set({
      draft: {
        ...current,
        [key]: { ...current[key], chatHistory: [...current[key].chatHistory, msg] }
      }
    });
  },

  acceptRefineResult: (key, newText) => {
    const current = get().draft;
    if (!current) return;
    set({ draft: { ...current, [key]: { ...current[key], text: newText } } });
  },

  setRefining: (section) => set({ refiningSection: section }),

  setIsGenerating: (v) => set({ isGenerating: v }),
  setProgress: (value, label) => set({ progress: { value, label } }),
  setError: (msg) => set({ error: msg }),

  reset: () => set(INITIAL_STATE)
}));

export default useDraftStore;
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/stores/useDraftStore.ts
git commit -m "feat(embargos): draft store"
```

### Task 3.5: Barrel `stores/index.ts`

**Files:**
- Create: `src/apps/embargos/stores/index.ts`

- [ ] **Step 1: Escrever**

```typescript
export { useAIStore, persistApiKeys, selectProvider, selectCurrentModel, selectCurrentApiKey } from './useAIStore';
export { useDocumentStore } from './useDocumentStore';
export { useSynthesisStore } from './useSynthesisStore';
export { useDraftStore } from './useDraftStore';
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/stores/index.ts
git commit -m "feat(embargos): stores barrel"
```

---

## Phase 4 — Services

### Task 4.1: Copiar `pdfService.ts` do Analisador

**Files:**
- Create: `src/apps/embargos/services/pdfService.ts`

- [ ] **Step 1: Copiar**

```bash
cp src/apps/analisador/services/pdfService.ts src/apps/embargos/services/pdfService.ts
```

- [ ] **Step 2: Validar imports**

Ler arquivo; o único import externo é `import type { PdfjsLib } from '../../../types';` — deve continuar válido em embargos (mesma profundidade `src/apps/X/services/`). Se houver outros imports, mantê-los relativos a `../../../`.

- [ ] **Step 3: `npx tsc --noEmit`** — PASS.

- [ ] **Step 4: Commit**

```bash
git add src/apps/embargos/services/pdfService.ts
git commit -m "feat(embargos): copy pdfService from analisador"
```

### Task 4.2: `services/localHistoryService.ts`

**Files:**
- Create: `src/apps/embargos/services/localHistoryService.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file localHistoryService.ts
 * @description CRUD de minutas no IndexedDB local (sem libs externas).
 */

import type { SavedEmbargos } from '../types';

const DB_NAME = 'sentencify-embargos';
const STORE_NAME = 'minutas';
const VERSION = 1;

const openDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt', { unique: false });
      store.createIndex('titulo', 'titulo', { unique: false });
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('Falha ao abrir IndexedDB'));
});

const promisify = <T>(req: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('IDBRequest error'));
});

export async function listMinutas(): Promise<SavedEmbargos[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all = await promisify(store.getAll() as IDBRequest<SavedEmbargos[]>);
    db.close();
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.warn('[embargos] listMinutas falhou:', err);
    return [];
  }
}

export async function getMinuta(id: string): Promise<SavedEmbargos | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const item = await promisify(store.get(id) as IDBRequest<SavedEmbargos | undefined>);
    db.close();
    return item ?? null;
  } catch (err) {
    console.warn('[embargos] getMinuta falhou:', err);
    return null;
  }
}

export async function saveMinuta(record: SavedEmbargos): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await promisify(store.put(record) as IDBRequest);
  db.close();
}

export async function deleteMinuta(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await promisify(store.delete(id) as IDBRequest);
  db.close();
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/services/localHistoryService.ts
git commit -m "feat(embargos): IndexedDB history service"
```

---

## Phase 5 — Prompts e Schemas

### Task 5.1: `prompts/style-guide.ts`

**Files:**
- Create: `src/apps/embargos/prompts/style-guide.ts`

- [ ] **Step 1: Escrever** (texto literal do Anexo A do spec)

```typescript
/**
 * @file style-guide.ts
 * @description Diretrizes de estilo de redação. Injetadas nos prompts de
 *              minuta e refino. Texto literal — não reescrever.
 */

export const STYLE_GUIDE = `## Estilo de Comunicação

Use linguagem formal, mas acessível. Evite latinismos desnecessários e termos extremamente técnicos. Priorize clareza e objetividade. Mantenha tom sereno e imparcial. Sempre use primeira pessoa. Evite adjetivações.

## Exigências de Qualidade Textual

A redação deve ser de excelente qualidade, observando rigorosamente:

1. FLUIDEZ E COESÃO: use conectores de progressão textual entre parágrafos (ademais, além disso, nesse contexto, por outro lado, dessa forma, assim, portanto, nesse sentido, cumpre ressaltar, vale destacar, outrossim, de igual modo, com efeito, etc.). Garanta encadeamento lógico. Evite parágrafos soltos. Transições suaves entre argumentos.

2. RITMO E CONTINUIDADE: texto não truncado. Parágrafos bem desenvolvidos (evite parágrafos de uma ou duas linhas). Redação fluida e agradável. Progressão natural do raciocínio.

3. COERÊNCIA: sequência lógica de argumentação. Conclusões que decorrem das premissas. Unidade temática por parágrafo.

4. FORMATO NARRATIVO CONTÍNUO: evite enumerações excessivas (1., 2., 3... / a), b), c)... / I, II, III...). Evite títulos ou subtítulos internos desnecessários. Prefira PROSA CORRIDA. Use enumerações apenas quando estritamente necessário para listar pedidos, requisitos legais ou situações objetivas.

5. DIDÁTICA E CLAREZA: linguagem acessível mas técnica quando necessário. Tom professoral, não pedante.

6. NATURALIDADE E AUTENTICIDADE TEXTUAL: evite advérbios intensificadores genéricos (consideravelmente, significativamente, notavelmente, substancialmente, expressivamente, indubitavelmente). Prefira locuções forenses autênticas:
   - "enfraquece consideravelmente a alegação" → "milita em desfavor da tese"
   - "isso demonstra claramente que" → "daí se extrai que" / "tem-se que"
   - "é importante destacar que" → "registro que" / "anoto que"
   - "deve-se considerar que" → "não se pode ignorar que" / "cumpre observar que"
   Use orações intercaladas para criar ritmo. Seja assertivo sem ser enfático. Evite padrões repetitivos de estrutura frasal.

7. VARIAÇÃO E NATURALIDADE: alterne frases longas e curtas. Nem todo parágrafo precisa começar com conector. Permita marcas de oralidade forense ("Pois bem", "Ocorre que", "Veja-se", "É o caso dos autos"). Use eventual primeira pessoa ("Entendo que", "Não me convence", "Tenho por demonstrado"). Evite simetria excessiva entre parágrafos.

8. PONTUAÇÃO: evite travessões (—) para intercalar orações; prefira vírgulas ou parênteses. Evite dois pontos (:), salvo antes de citações legais diretas ou enumerações indispensáveis.

9. ESTRUTURA PARAGRAFAL: varie a extensão dos parágrafos conforme a complexidade. Centrais: 3-5 períodos. Transição/conclusão pontual: 2 períodos. Complexos: até 6. Evite mais de dois parágrafos sequenciais com extensão semelhante. Varie a posição das orações subordinadas: anteponha quando veicular concessão/contexto/premissa, posponha quando funcionar como justificativa/desdobramento.

10. SOBRIEDADE ASSERTIVA: evite construções "voz de narrador" que anunciam o valor de algo antes de demonstrá-lo:
   - "A cronologia dos fatos é reveladora" → "Cumpre reconstituir a cronologia dos fatos"
   - "O depoimento do preposto é eloquente" → "Do depoimento do preposto se extrai que"
   - "A contradição é flagrante" → "Ocorre que tais versões não se compatibilizam"
   - "O conjunto probatório é robusto" → "A prova produzida permite concluir que"
   Quando uma frase terminar com adjetivo valorativo isolado (é revelador, é eloquente, é cristalino, é inconteste, é paradigmático), reformule-a como abertura de análise.

11. PRECISÃO REFERENCIAL: ao redigir períodos com apostos, orações reduzidas de particípio ou locuções explicativas, assegure que o termo modificado seja inequivocamente identificável. Cautela especial com datas, prazos, marcos temporais e valores.

## Proibições inegociáveis

- Não alucine.
- Não invente fatos.
- Não crie provas inexistentes.
- Não cite jurisprudência fictícia.
- Não cite dispositivos normativos fictícios ou inexistentes.
- Não presuma informações ausentes.
- Indique expressamente quando houver insuficiência de elementos, possibilitando que o usuário supra com novas informações/diretrizes.
- Mantenha estrita fidelidade às informações fornecidas.`;
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/prompts/style-guide.ts
git commit -m "feat(embargos): style guide constant"
```

### Task 5.2: Schema Zod para síntese — `src/schemas/ai-responses/embargos.ts`

**Files:**
- Create: `src/schemas/ai-responses/embargos.ts`

- [ ] **Step 1: Inspecionar barrel atual**

Read `src/schemas/ai-responses/index.ts` (se existir) para entender padrão de export. Verificar se há export `parseAIResponse` e `extractJSON` (usados pelo Analisador).

- [ ] **Step 2: Escrever**

```typescript
/**
 * @file embargos.ts
 * @description Schemas Zod para respostas da IA no subapp Embargos.
 */

import { z } from 'zod';

const VicioTipoSchema = z.enum(['omissao', 'contradicao', 'obscuridade', 'erroMaterial']);
const ConclusaoTipoSchema = z.enum(['acolher', 'acolherParcial', 'rejeitar', 'sanarOficio']);

const PontoSchema = z.object({
  id: z.string().optional(),
  ordem: z.number(),
  trechoEmbargos: z.string(),
  vicioAlegadoPelaParte: z.array(VicioTipoSchema),
  vicioReconhecidoPelaIA: z.array(VicioTipoSchema),
  divergenciaVicio: z.string().nullable(),
  oQueSentencaDisse: z.string(),
  questaoSuscitadaNoProcesso: z.boolean().nullable(),
  conclusaoPreliminar: ConclusaoTipoSchema,
  justificativaPreliminar: z.string(),
  efeitosInfringentes: z.boolean(),
  outrosPedidos: z.array(z.string())
});

export const SynthesisResponseSchema = z.object({
  identificacao: z.object({
    numeroProcesso: z.string().nullable(),
    parteEmbargante: z.string(),
    parteEmbargada: z.string(),
    polo: z.enum(['reclamante', 'reclamada', 'ambas']),
    tempestividade: z.object({
      tempestivo: z.boolean().nullable(),
      observacao: z.string().nullable()
    })
  }),
  resumoSentenca: z.string(),
  resumoEmbargos: z.string(),
  resumoContrarrazoes: z.string().nullable(),
  intimacaoContrariaStatus: z.enum(['dispensada', 'manifestouSe', 'silente']).nullable(),
  pontos: z.array(PontoSchema)
});

export const DraftResponseSchema = z.object({
  relatorio: z.string(),
  fundamentacao: z.string(),
  dispositivo: z.string()
});

export const RefineResponseSchema = z.object({
  text: z.string()
});

export type SynthesisResponse = z.infer<typeof SynthesisResponseSchema>;
export type DraftResponse = z.infer<typeof DraftResponseSchema>;
export type RefineResponse = z.infer<typeof RefineResponseSchema>;
```

- [ ] **Step 3: Adicionar export em `src/schemas/ai-responses/index.ts`**

Se existir o barrel, anexar:

```typescript
export * from './embargos';
```

Caso não exista barrel, criá-lo. Use Read antes de Edit.

- [ ] **Step 4: `npx tsc --noEmit`** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/ai-responses/embargos.ts src/schemas/ai-responses/index.ts
git commit -m "feat(embargos): Zod schemas for AI responses"
```

### Task 5.3: `prompts/synthesis.ts`

**Files:**
- Create: `src/apps/embargos/prompts/synthesis.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file synthesis.ts
 * @description Prompt da 1ª chamada à IA (síntese estruturada).
 */

import type { DocumentSlot } from '../types';

export const SYNTHESIS_SYSTEM_PROMPT = `Você é um exímio juiz do trabalho brasileiro, especializado em analisar embargos de declaração contra sentenças trabalhistas. Sua tarefa NESTA ETAPA é apenas estruturar uma síntese analítica em JSON — não redigir a decisão.

Aplique rigorosamente os arts. 897-A da CLT e 1.022 do CPC: omissão, contradição, obscuridade e erro material são os únicos vícios embargáveis. Diferencie vícios genuínos de mero pedido de rejulgamento.

PROIBIÇÕES INEGOCIÁVEIS:
- Não invente fatos.
- Não cite jurisprudência fictícia.
- Não cite dispositivos inexistentes.
- Não presuma informações ausentes — se faltarem elementos, marque null e adicione observação.
- Mantenha imparcialidade. Você é juiz, não advogado da parte.

Devolva APENAS um JSON válido no shape solicitado, sem texto adicional antes ou depois.`;

interface SlotPayload {
  slot: DocumentSlot;
  name?: string;
  text?: string;
  binaryAttached?: boolean;
}

const SLOT_HEADERS: Record<DocumentSlot, string> = {
  decisaoEmbargada: '=== DECISÃO EMBARGADA (SENTENÇA) ===',
  embargos: '=== EMBARGOS DE DECLARAÇÃO ===',
  contrarrazoes: '=== CONTRARRAZÕES AOS EMBARGOS ===',
  inicial: '=== PETIÇÃO INICIAL ===',
  contestacao: '=== CONTESTAÇÃO ==='
};

export function buildSynthesisPrompt(slots: SlotPayload[]): string {
  const sections = slots.map(({ slot, name, text, binaryAttached }) => {
    const header = SLOT_HEADERS[slot];
    const meta = name ? `Arquivo: ${name}` : '';
    const body = binaryAttached
      ? '(PDF anexado nesta mensagem; analise o conteúdo do anexo)'
      : (text ?? '(não fornecido)');
    return [header, meta, body].filter(Boolean).join('\n');
  });

  return `Analise os documentos abaixo e devolva um JSON estruturado conforme o shape especificado.

DOCUMENTOS:

${sections.join('\n\n')}

Retorne APENAS um JSON válido neste shape (sem markdown, sem texto adicional):

{
  "identificacao": {
    "numeroProcesso": "string ou null",
    "parteEmbargante": "nome da parte que opôs os embargos",
    "parteEmbargada": "nome da parte contrária",
    "polo": "reclamante | reclamada | ambas (polo do embargante)",
    "tempestividade": {
      "tempestivo": "true | false | null se não puder aferir",
      "observacao": "string ou null"
    }
  },
  "resumoSentenca": "narrativa curta do que a sentença decidiu (3-5 frases)",
  "resumoEmbargos": "narrativa curta dos embargos (3-5 frases)",
  "resumoContrarrazoes": "narrativa curta ou null se não fornecidas",
  "intimacaoContrariaStatus": "dispensada | manifestouSe | silente | null",
  "pontos": [
    {
      "ordem": 1,
      "trechoEmbargos": "trecho/resumo curto do que a parte alegou neste ponto",
      "vicioAlegadoPelaParte": ["omissao | contradicao | obscuridade | erroMaterial"],
      "vicioReconhecidoPelaIA": ["array do(s) vício(s) que a IA efetivamente reconhece (pode divergir)"],
      "divergenciaVicio": "string explicando divergência ou null se não há",
      "oQueSentencaDisse": "o que a sentença efetivamente decidiu sobre esse ponto",
      "questaoSuscitadaNoProcesso": "true se a questão foi suscitada na inicial/contestação fornecida, false se não foi, null se inicial/contestação não foram fornecidas",
      "conclusaoPreliminar": "acolher | acolherParcial | rejeitar | sanarOficio",
      "justificativaPreliminar": "1-3 frases concisas (não a redação final)",
      "efeitosInfringentes": "true | false (se a parte pleiteia efeito modificativo)",
      "outrosPedidos": ["array com outros pedidos formulados, ex: 'prazo para recurso ordinário'"]
    }
  ]
}

INSTRUÇÕES IMPORTANTES:
- Se a parte alegou um vício mas a análise indica outro (ex: alegou contradição, mas é erro material), preencha vicioReconhecidoPelaIA com o correto e descreva em divergenciaVicio.
- Se a inicial/contestação não foram fornecidas, marque questaoSuscitadaNoProcesso como null e indique isso em justificativaPreliminar quando relevante.
- justificativaPreliminar deve ser curta (1-3 frases) — apenas suficiente para o juiz avaliar. A redação completa virá depois.
- Se não houver pontos suscitáveis (caso raro), devolva array vazio em "pontos".`;
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/prompts/synthesis.ts
git commit -m "feat(embargos): synthesis prompt"
```

### Task 5.4: `prompts/draft.ts`

**Files:**
- Create: `src/apps/embargos/prompts/draft.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file draft.ts
 * @description Prompt da 2ª chamada à IA (minuta em 3 seções).
 */

import type { SynthesisResult, VicioTipo, PontoSuscitado } from '../types';
import { STYLE_GUIDE } from './style-guide';

export const DRAFT_SYSTEM_PROMPT = `Você é um exímio juiz do trabalho brasileiro, redigindo a minuta de decisão de embargos de declaração. Estrutura obrigatória em três seções: Relatório, Fundamentação, Dispositivo. Devolva como JSON { "relatorio": "...", "fundamentacao": "...", "dispositivo": "..." }, SEM cabeçalhos dentro do texto de cada campo.

${STYLE_GUIDE}

PROIBIÇÕES INEGOCIÁVEIS (REFORÇO):
- Não invente fatos, jurisprudência ou dispositivos legais.
- Não presuma informações ausentes.
- Mantenha estrita fidelidade ao que o usuário forneceu.
- Se faltar elemento essencial, registre no campo correspondente uma marca [ATENÇÃO: ...] para o juiz revisor — não fabule.`;

const PARAGRAFO_OMISSAO = `A omissão passível de correção por embargos de declaração é aquela que recai sobre ponto relevante e essencial à solução da controvérsia, ou seja, matéria que efetivamente influencie o convencimento judicial e repercuta no dispositivo da sentença. Não se trata, portanto, de qualquer ausência de manifestação, mas da omissão qualificada, juridicamente relevante.`;

const PARAGRAFO_OBSCURIDADE = `A obscuridade caracteriza-se pela falta de clareza ou precisão na redação da decisão judicial, capaz de comprometer a compreensão de seu conteúdo e dificultar a identificação das razões de decidir. Nessa hipótese, não se trata de divergência interpretativa ou mero inconformismo da parte, mas de passagens cujo teor se mostra ambíguo, confuso ou de difícil assimilação, inviabilizando a exata compreensão da fundamentação ou do dispositivo.`;

const PARAGRAFO_CONTRADICAO = `A contradição não se confunde com mera discordância da parte quanto ao resultado do julgamento ou à valoração da prova. Trata-se de vício interno da decisão judicial, caracterizado por incompatibilidade lógica entre diferentes trechos do julgado, ou entre a fundamentação e o dispositivo. Em outras palavras, há contradição embargável quando o juiz afirma uma coisa ao fundamentar e decide o oposto ao concluir, ou ainda quando duas passagens da decisão são mutuamente excludentes ou logicamente inconciliáveis. Não configura contradição, portanto, o simples fato de a parte entender que as provas foram mal apreciadas ou que determinada conclusão foi equivocada — nesses casos, o meio adequado de impugnação é o recurso ordinário, e não os embargos de declaração.`;

const PARAGRAFO_ERRO_MATERIAL = `O erro material é um equívoco evidente, objetivo e formal presente na decisão judicial, que não decorre de uma análise jurídica equivocada, mas, sim, de uma falha de escrita, cálculo, digitação ou identificação. Trata-se, portanto, de um deslize objetivo, que não exige juízo valorativo ou reexame do mérito da causa para ser corrigido. Sua retificação pode ser feita de ofício pelo juiz ou a requerimento da parte, inclusive por meio de embargos de declaração (CPC, art. 494, I, e art. 1.022, parágrafo único, II).`;

const PARAGRAFOS_VICIO: Record<VicioTipo, string> = {
  omissao: PARAGRAFO_OMISSAO,
  obscuridade: PARAGRAFO_OBSCURIDADE,
  contradicao: PARAGRAFO_CONTRADICAO,
  erroMaterial: PARAGRAFO_ERRO_MATERIAL
};

function collectViciosEmAnalise(synthesis: SynthesisResult): VicioTipo[] {
  const set = new Set<VicioTipo>();
  for (const p of synthesis.pontos) {
    p.vicioAlegadoPelaParte.forEach(v => set.add(v));
    p.vicioReconhecidoPelaIA.forEach(v => set.add(v));
  }
  // ordem canônica
  return (['omissao', 'obscuridade', 'contradicao', 'erroMaterial'] as VicioTipo[]).filter(v => set.has(v));
}

function effectiveConclusao(p: PontoSuscitado) {
  return p.conclusaoUsuario ?? p.conclusaoPreliminar;
}

export function buildDraftPrompt(synthesis: SynthesisResult): string {
  const polo = synthesis.identificacao.polo === 'ambas' ? 'reclamante e reclamada' : synthesis.identificacao.polo;
  const viciosEmAnalise = collectViciosEmAnalise(synthesis);
  const todasRejeicoes = synthesis.pontos.length > 0 && synthesis.pontos.every(p => effectiveConclusao(p) === 'rejeitar');

  const intimacaoVariantes = {
    dispensada: 'Nos termos do art. 897-A, § 2º, da CLT, dispensou-se a intimação da parte contrária, pois ausente eventual efeito modificativo na decisão.',
    manifestouSe: 'Intimada, a parte embargada manifestou-se.',
    silente: 'Intimada, a parte embargada manteve-se silente.'
  } as const;

  const intimacaoTexto = synthesis.intimacaoContrariaStatus
    ? intimacaoVariantes[synthesis.intimacaoContrariaStatus]
    : '[ATENÇÃO: status de intimação da parte contrária não informado]';

  const pontosFmt = synthesis.pontos.map((p, idx) => {
    const conclusao = effectiveConclusao(p);
    const diretrizes = p.diretrizesUsuario?.trim() ? `\n   Diretrizes do usuário: ${p.diretrizesUsuario.trim()}` : '';
    return `Ponto ${idx + 1}:
   - Trecho dos embargos: ${p.trechoEmbargos}
   - Vício alegado pela parte: ${p.vicioAlegadoPelaParte.join(', ')}
   - Vício reconhecido na análise: ${p.vicioReconhecidoPelaIA.join(', ')}
   - Divergência: ${p.divergenciaVicio ?? '(nenhuma)'}
   - O que a sentença disse: ${p.oQueSentencaDisse}
   - Questão suscitada no processo? ${p.questaoSuscitadaNoProcesso === null ? 'não informado' : p.questaoSuscitadaNoProcesso ? 'sim' : 'não'}
   - Conclusão: ${conclusao}
   - Justificativa preliminar: ${p.justificativaPreliminar}
   - Efeitos infringentes pleiteados? ${p.efeitosInfringentes ? 'sim' : 'não'}
   - Outros pedidos: ${p.outrosPedidos.length ? p.outrosPedidos.join('; ') : '(nenhum)'}${diretrizes}`;
  }).join('\n\n');

  const diretrizesGerais = synthesis.diretrizesGeraisUsuario?.trim()
    ? `\n\nDIRETRIZES GERAIS DO USUÁRIO:\n${synthesis.diretrizesGeraisUsuario.trim()}`
    : '';

  const introducoesVicios = viciosEmAnalise.map(v => PARAGRAFOS_VICIO[v]).join('\n\n');

  const paragrafoRejeicaoFinal = todasRejeicoes
    ? `\n\nINSTRUÇÃO ADICIONAL: como todos os pontos foram rejeitados, inclua ao final da fundamentação, com adaptação ao caso, o seguinte parágrafo (parametrize o vício efetivamente alegado):\n"A parte embargante, ao alegar [vício(s) alegado(s)], na verdade expressa mero inconformismo com a valoração das provas e com o resultado do julgamento, pretendendo rediscutir o mérito da causa, o que escapa do escopo legal dos embargos de declaração, não havendo, na presente hipótese, nenhum vício a ser sanado por essa estreita via recursal."`
    : '';

  return `Com base na síntese e diretrizes abaixo, redija a minuta da decisão de embargos de declaração.

SÍNTESE CONSOLIDADA:

Identificação:
- Número do processo: ${synthesis.identificacao.numeroProcesso ?? '[NÃO INFORMADO]'}
- Parte embargante: ${synthesis.identificacao.parteEmbargante}
- Parte embargada: ${synthesis.identificacao.parteEmbargada}
- Polo do embargante: ${polo}
- Tempestividade: ${synthesis.identificacao.tempestividade.tempestivo === null ? 'não aferida' : synthesis.identificacao.tempestividade.tempestivo ? 'tempestivos' : 'intempestivos'}${synthesis.identificacao.tempestividade.observacao ? ` (${synthesis.identificacao.tempestividade.observacao})` : ''}

Resumo da sentença: ${synthesis.resumoSentenca}

Resumo dos embargos: ${synthesis.resumoEmbargos}

${synthesis.resumoContrarrazoes ? `Resumo das contrarrazões: ${synthesis.resumoContrarrazoes}\n` : 'Contrarrazões: não fornecidas.\n'}
Status da intimação da parte contrária: ${synthesis.intimacaoContrariaStatus ?? 'não informado'}

PONTOS SUSCITADOS:

${pontosFmt || '(nenhum)'}${diretrizesGerais}

ESTRUTURA OBRIGATÓRIA DA MINUTA (devolva como JSON { relatorio, fundamentacao, dispositivo }):

=== RELATÓRIO ===
Use a seguinte estrutura, adaptando ao caso:

"[Parte embargante] opôs embargos de declaração (art. 897-A da CLT c/c art. 1.022 do CPC), alegando, em síntese, a existência de [vício(s)] na sentença embargada devido a [síntese curta das alegações].

${intimacaoTexto}

É o relatório. Decido."

=== FUNDAMENTAÇÃO ===
Comece literalmente com estes dois parágrafos:

"Conheço dos embargos de declaração opostos pela parte ${synthesis.identificacao.polo === 'reclamante' ? 'reclamante' : synthesis.identificacao.polo === 'reclamada' ? 'reclamada' : 'embargante'}, pois tempestivos e subscritos por advogado(a) habilitado(a), motivo por que passo à apreciação do mérito recursal."

"Nos termos do art. 897-A da CLT, com remissão ao art. 1.022 do CPC, os embargos de declaração são cabíveis quando houver na decisão judicial omissão, obscuridade, contradição interna ou erro material."

Em seguida, inclua o(s) parágrafo(s) introdutório(s) literal(is) abaixo (apenas dos vícios em análise — ${viciosEmAnalise.join(', ') || 'nenhum'}), na ordem em que aparecem:

${introducoesVicios || '(sem vícios em análise; trate como rejeição genérica)'}

Depois, analise cada ponto suscitado individualmente, na ordem dada, justificando acolhimento/rejeição/saneamento com base na análise técnica e nas diretrizes do usuário. Cite obrigatoriamente todos os Ids de documentos, dispositivos normativos e argumentos fornecidos pelo usuário nas diretrizes. Você pode incrementar e enriquecer os argumentos do usuário, desde que jamais invente fatos ou fundamentos.${paragrafoRejeicaoFinal}

=== DISPOSITIVO ===
Conclua acolhendo, acolhendo parcialmente ou rejeitando os embargos, ponto a ponto conforme as conclusões. Quando houver acolhimento, indique o saneamento do vício (supressão de omissão, esclarecimento de obscuridade, sanação de contradição, correção de erro material). Quando houver efeitos infringentes pleiteados e cabíveis, decida sobre a modificação da sentença. Decida também sobre eventuais outros pedidos (ex: prazo recursal).

Devolva APENAS o JSON { "relatorio": "...", "fundamentacao": "...", "dispositivo": "..." }, sem markdown, sem cabeçalhos dentro dos textos.`;
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/prompts/draft.ts
git commit -m "feat(embargos): draft prompt"
```

### Task 5.5: `prompts/refine.ts`

**Files:**
- Create: `src/apps/embargos/prompts/refine.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file refine.ts
 * @description Prompt de refino de uma seção específica da minuta via chat.
 */

import type { Draft, DraftSectionKey, ChatMessage, SynthesisResult } from '../types';
import { SECTION_LABELS } from '../types';
import { STYLE_GUIDE } from './style-guide';

export const REFINE_SYSTEM_PROMPT = `Você é um exímio juiz do trabalho brasileiro, refinando uma seção específica de uma minuta de decisão de embargos de declaração já redigida.

${STYLE_GUIDE}

PROIBIÇÕES INEGOCIÁVEIS:
- Não invente fatos, jurisprudência ou dispositivos legais.
- Não presuma informações ausentes.
- Mantenha estrita fidelidade ao que foi fornecido.
- Devolva APENAS o JSON { "text": "..." } com a seção refinada, sem cabeçalhos, sem markdown.`;

export function buildRefinePrompt(
  section: DraftSectionKey,
  draft: Draft,
  synthesis: SynthesisResult,
  history: ChatMessage[],
  newInstruction: string
): string {
  const sectionLabel = SECTION_LABELS[section];
  const historicoChat = history.length
    ? history.map(m => `[${m.role === 'user' ? 'USUÁRIO' : 'IA'}] ${m.content}`).join('\n\n')
    : '(nenhum histórico anterior)';

  return `Refine apenas a seção [${sectionLabel}] da minuta abaixo, aplicando a instrução do usuário. Mantenha coerência com as outras seções (estão listadas como contexto, mas NÃO devem ser modificadas).

CONTEXTO — minuta atual completa:

=== RELATÓRIO ===
${draft.relatorio.text}

=== FUNDAMENTAÇÃO ===
${draft.fundamentacao.text}

=== DISPOSITIVO ===
${draft.dispositivo.text}

CONTEXTO — síntese consolidada (resumo):
Parte embargante: ${synthesis.identificacao.parteEmbargante}
Parte embargada: ${synthesis.identificacao.parteEmbargada}
Total de pontos: ${synthesis.pontos.length}

HISTÓRICO DO CHAT DESTA SEÇÃO:
${historicoChat}

NOVA INSTRUÇÃO DO USUÁRIO:
${newInstruction}

Devolva APENAS o JSON { "text": "texto integral da seção [${sectionLabel}] refinada" }, sem cabeçalhos no texto, sem markdown.`;
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/prompts/refine.ts
git commit -m "feat(embargos): refine prompt"
```

### Task 5.6: Barrel `prompts/index.ts`

**Files:**
- Create: `src/apps/embargos/prompts/index.ts`

- [ ] **Step 1: Escrever**

```typescript
export { STYLE_GUIDE } from './style-guide';
export { SYNTHESIS_SYSTEM_PROMPT, buildSynthesisPrompt } from './synthesis';
export { DRAFT_SYSTEM_PROMPT, buildDraftPrompt } from './draft';
export { REFINE_SYSTEM_PROMPT, buildRefinePrompt } from './refine';
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/prompts/index.ts
git commit -m "feat(embargos): prompts barrel"
```

---

## Phase 6 — Hooks core

### Task 6.1: Copiar `hooks/useAIIntegration.ts` do Analisador

**Files:**
- Create: `src/apps/embargos/hooks/useAIIntegration.ts`

- [ ] **Step 1: Copiar**

```bash
cp src/apps/analisador/hooks/useAIIntegration.ts src/apps/embargos/hooks/useAIIntegration.ts
```

- [ ] **Step 2: Ajustar imports**

O arquivo tem `import { useAIStore } from '../stores';` e `import { API_BASE } from '../constants';`. Como copiamos a estrutura inteira (stores e constants já criados), os imports continuam válidos. Validar:

```bash
grep -n "^import" src/apps/embargos/hooks/useAIIntegration.ts | head
```

Caso haja import de qualquer caminho `'../../analisador/'`, ajustar para `'../../embargos/'` ou `'../'`. Não deve haver — todas as referências são relativas.

- [ ] **Step 3: `npx tsc --noEmit`** — PASS.

- [ ] **Step 4: Commit**

```bash
git add src/apps/embargos/hooks/useAIIntegration.ts
git commit -m "feat(embargos): copy useAIIntegration from analisador"
```

### Task 6.2: `hooks/usePdfUpload.ts`

**Files:**
- Create: `src/apps/embargos/hooks/usePdfUpload.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file usePdfUpload.ts
 * @description Upload de PDF para um slot específico. Extrai texto + base64,
 *              decide useBinary com base no provider atual, atualiza store.
 */

import { useCallback } from 'react';
import { useDocumentStore, useAIStore } from '../stores';
import { providerSupportsPdfBinary } from '../constants';
import { extractPdfMetadata } from '../services/pdfService';
import type { DocumentFile, DocumentSlot } from '../types';

interface UsePdfUploadResult {
  uploadFile: (file: File) => Promise<void>;
  removeFile: () => void;
  slot: DocumentFile | null;
}

export function usePdfUpload(slot: DocumentSlot): UsePdfUploadResult {
  const setSlot = useDocumentStore(s => s.setSlot);
  const updateSlotStatus = useDocumentStore(s => s.updateSlotStatus);
  const slotData = useDocumentStore(s => s[slot]);
  const provider = useAIStore(s => s.aiSettings.provider);

  const uploadFile = useCallback(async (file: File) => {
    const id = crypto.randomUUID();
    setSlot(slot, {
      id,
      slot,
      name: file.name,
      size: file.size,
      text: '',
      base64: null,
      useBinary: false,
      status: 'parsing'
    });

    try {
      const meta = await extractPdfMetadata(file);
      const useBinary = providerSupportsPdfBinary(provider) && !meta.hasUsableText;
      setSlot(slot, {
        id,
        slot,
        name: file.name,
        size: file.size,
        text: meta.text,
        base64: meta.base64,
        useBinary,
        status: 'ready'
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar PDF';
      updateSlotStatus(slot, 'error', msg);
    }
  }, [setSlot, updateSlotStatus, slot, provider]);

  const removeFile = useCallback(() => {
    setSlot(slot, null);
  }, [setSlot, slot]);

  return { uploadFile, removeFile, slot: slotData };
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/hooks/usePdfUpload.ts
git commit -m "feat(embargos): PDF upload hook"
```

### Task 6.3: `hooks/useLocalHistory.ts`

**Files:**
- Create: `src/apps/embargos/hooks/useLocalHistory.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file useLocalHistory.ts
 * @description Wrapper React em torno do localHistoryService (IndexedDB).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  listMinutas,
  getMinuta,
  saveMinuta,
  deleteMinuta
} from '../services/localHistoryService';
import type { SavedEmbargos } from '../types';

export function useLocalHistory() {
  const [items, setItems] = useState<SavedEmbargos[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const list = await listMinutas();
    setItems(list);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (record: SavedEmbargos) => {
    await saveMinuta(record);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteMinuta(id);
    await refresh();
  }, [refresh]);

  const load = useCallback(async (id: string) => {
    return await getMinuta(id);
  }, []);

  return { items, isLoading, refresh, save, remove, load };
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/hooks/useLocalHistory.ts
git commit -m "feat(embargos): local history hook"
```

### Task 6.4: `hooks/useSynthesisAnalysis.ts`

**Files:**
- Create: `src/apps/embargos/hooks/useSynthesisAnalysis.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file useSynthesisAnalysis.ts
 * @description Orquestra a 1ª chamada à IA: monta payload, chama stream,
 *              valida JSON via Zod, hidrata useSynthesisStore.
 */

import { useCallback } from 'react';
import {
  useDocumentStore,
  useSynthesisStore,
  useAIStore
} from '../stores';
import { useAIIntegration } from './useAIIntegration';
import { SYNTHESIS_SYSTEM_PROMPT, buildSynthesisPrompt } from '../prompts';
import { providerSupportsPdfBinary } from '../constants';
import { SynthesisResponseSchema } from '../../../schemas/ai-responses/embargos';
import type {
  DocumentFile,
  DocumentSlot,
  SynthesisResult,
  AIMessage,
  AIMessageContent
} from '../types';

const MAX_PARSE_RETRIES = 2;

const buildDocumentBlock = (base64: string): AIMessageContent => ({
  type: 'document',
  source: { type: 'base64', media_type: 'application/pdf', data: base64 }
});

const isBinaryEffective = (doc: DocumentFile | null, providerCanBinary: boolean) =>
  !!doc && doc.status === 'ready' && doc.useBinary && providerCanBinary && !!doc.base64;

function extractJSON(response: string): string {
  const fence = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fence ? fence[1] : response;
  const objMatch = body.match(/\{[\s\S]*\}/);
  return objMatch ? objMatch[0] : body;
}

const SLOT_ORDER: DocumentSlot[] = ['decisaoEmbargada', 'embargos', 'contrarrazoes', 'inicial', 'contestacao'];

export function useSynthesisAnalysis() {
  const { callAIStream } = useAIIntegration();

  const analyze = useCallback(async (): Promise<SynthesisResult | null> => {
    const docs = useDocumentStore.getState();
    const synth = useSynthesisStore.getState();

    if (!docs.canAnalyze()) {
      synth.setError('Decisão embargada e embargos são obrigatórios.');
      return null;
    }

    synth.setError(null);
    synth.setIsAnalyzing(true);
    synth.setProgress(10, 'Preparando documentos…');

    try {
      const provider = useAIStore.getState().aiSettings.provider;
      const providerCanBinary = providerSupportsPdfBinary(provider);

      const slotsPayload = SLOT_ORDER
        .map(slot => docs[slot])
        .filter((d): d is DocumentFile => d !== null && d.status === 'ready')
        .map(d => ({
          slot: d.slot,
          name: d.name,
          text: isBinaryEffective(d, providerCanBinary) ? undefined : d.text,
          binaryAttached: isBinaryEffective(d, providerCanBinary)
        }));

      const userPrompt = buildSynthesisPrompt(slotsPayload);

      const documentBlocks: AIMessageContent[] = [];
      for (const slot of SLOT_ORDER) {
        const d = docs[slot];
        if (d && isBinaryEffective(d, providerCanBinary) && d.base64) {
          documentBlocks.push(buildDocumentBlock(d.base64));
        }
      }

      const content: string | AIMessageContent[] = documentBlocks.length > 0
        ? [...documentBlocks, { type: 'text', text: userPrompt }]
        : userPrompt;

      const messages: AIMessage[] = [{ role: 'user', content }];

      synth.setProgress(40, 'Analisando documentos…');

      for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
        try {
          const response = await callAIStream(messages, {
            maxTokens: 32000,
            systemPrompt: SYNTHESIS_SYSTEM_PROMPT
          });

          synth.setProgress(80, 'Estruturando síntese…');

          const json = JSON.parse(extractJSON(response));
          const parsed = SynthesisResponseSchema.parse(json);

          // Hidrata IDs estáveis nos pontos
          const pontos = parsed.pontos.map(p => ({
            ...p,
            id: p.id ?? crypto.randomUUID()
          }));

          const result: SynthesisResult = {
            identificacao: parsed.identificacao,
            resumoSentenca: parsed.resumoSentenca,
            resumoEmbargos: parsed.resumoEmbargos,
            resumoContrarrazoes: parsed.resumoContrarrazoes,
            intimacaoContrariaStatus: parsed.intimacaoContrariaStatus,
            pontos
          };

          synth.setSynthesis(result);
          synth.setProgress(100, 'Concluído.');
          synth.setIsAnalyzing(false);
          return result;
        } catch (err) {
          if (attempt < MAX_PARSE_RETRIES) {
            console.warn(`[embargos] Tentativa ${attempt + 1} falhou:`, err);
            continue;
          }
          throw err;
        }
      }
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao analisar embargos';
      synth.setError(msg);
      synth.setIsAnalyzing(false);
      return null;
    }
  }, [callAIStream]);

  return { analyze };
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/hooks/useSynthesisAnalysis.ts
git commit -m "feat(embargos): synthesis analysis hook"
```

### Task 6.5: `hooks/useDraftGeneration.ts`

**Files:**
- Create: `src/apps/embargos/hooks/useDraftGeneration.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file useDraftGeneration.ts
 * @description Orquestra a 2ª chamada: monta prompt com síntese consolidada,
 *              chama IA, valida JSON da minuta, hidrata useDraftStore.
 */

import { useCallback } from 'react';
import {
  useSynthesisStore,
  useDraftStore
} from '../stores';
import { useAIIntegration } from './useAIIntegration';
import { DRAFT_SYSTEM_PROMPT, buildDraftPrompt } from '../prompts';
import { DraftResponseSchema } from '../../../schemas/ai-responses/embargos';
import type { Draft, AIMessage } from '../types';

const MAX_PARSE_RETRIES = 2;

function extractJSON(response: string): string {
  const fence = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fence ? fence[1] : response;
  const objMatch = body.match(/\{[\s\S]*\}/);
  return objMatch ? objMatch[0] : body;
}

const emptySection = (): DraftSection => ({ text: '', chatHistory: [] });

export function useDraftGeneration() {
  const { callAIStream } = useAIIntegration();

  const generate = useCallback(async (): Promise<Draft | null> => {
    const synth = useSynthesisStore.getState();
    const draft = useDraftStore.getState();

    if (!synth.synthesis) {
      draft.setError('Síntese não disponível.');
      return null;
    }

    draft.setError(null);
    draft.setIsGenerating(true);
    draft.setProgress(10, 'Montando minuta…');

    try {
      const userPrompt = buildDraftPrompt(synth.synthesis);
      const messages: AIMessage[] = [{ role: 'user', content: userPrompt }];

      draft.setProgress(40, 'Redigindo…');

      for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
        try {
          const response = await callAIStream(messages, {
            maxTokens: 32000,
            systemPrompt: DRAFT_SYSTEM_PROMPT
          });

          draft.setProgress(80, 'Processando minuta…');

          const json = JSON.parse(extractJSON(response));
          const parsed = DraftResponseSchema.parse(json);

          const newDraft: Draft = {
            relatorio: { ...emptySection(), text: parsed.relatorio },
            fundamentacao: { ...emptySection(), text: parsed.fundamentacao },
            dispositivo: { ...emptySection(), text: parsed.dispositivo }
          };

          draft.setDraft(newDraft);
          draft.setProgress(100, 'Concluído.');
          draft.setIsGenerating(false);
          return newDraft;
        } catch (err) {
          if (attempt < MAX_PARSE_RETRIES) {
            console.warn(`[embargos] Geração tentativa ${attempt + 1} falhou:`, err);
            continue;
          }
          throw err;
        }
      }
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar minuta';
      draft.setError(msg);
      draft.setIsGenerating(false);
      return null;
    }
  }, [callAIStream]);

  return { generate };
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/hooks/useDraftGeneration.ts
git commit -m "feat(embargos): draft generation hook"
```

### Task 6.6: `hooks/useSectionRefine.ts`

**Files:**
- Create: `src/apps/embargos/hooks/useSectionRefine.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file useSectionRefine.ts
 * @description Gerencia chat de refino de uma seção específica da minuta.
 */

import { useCallback } from 'react';
import { useDraftStore, useSynthesisStore } from '../stores';
import { useAIIntegration } from './useAIIntegration';
import { REFINE_SYSTEM_PROMPT, buildRefinePrompt } from '../prompts';
import { RefineResponseSchema } from '../../../schemas/ai-responses/embargos';
import type { AIMessage, DraftSectionKey } from '../types';

function extractJSON(response: string): string {
  const fence = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fence ? fence[1] : response;
  const objMatch = body.match(/\{[\s\S]*\}/);
  return objMatch ? objMatch[0] : body;
}

export function useSectionRefine(section: DraftSectionKey) {
  const { callAIStream } = useAIIntegration();
  const draft = useDraftStore(s => s.draft);
  const appendChatMessage = useDraftStore(s => s.appendChatMessage);
  const acceptRefineResult = useDraftStore(s => s.acceptRefineResult);
  const setRefining = useDraftStore(s => s.setRefining);
  const synthesis = useSynthesisStore(s => s.synthesis);

  const sendMessage = useCallback(async (instruction: string): Promise<string | null> => {
    if (!draft || !synthesis) return null;
    if (!instruction.trim()) return null;

    appendChatMessage(section, { role: 'user', content: instruction, timestamp: Date.now() });
    setRefining(section);

    try {
      const userPrompt = buildRefinePrompt(
        section,
        draft,
        synthesis,
        draft[section].chatHistory,
        instruction
      );

      const messages: AIMessage[] = [{ role: 'user', content: userPrompt }];

      const response = await callAIStream(messages, {
        maxTokens: 16000,
        systemPrompt: REFINE_SYSTEM_PROMPT
      });

      const json = JSON.parse(extractJSON(response));
      const parsed = RefineResponseSchema.parse(json);

      appendChatMessage(section, { role: 'assistant', content: parsed.text, timestamp: Date.now() });
      setRefining(null);
      return parsed.text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro no refino';
      appendChatMessage(section, { role: 'assistant', content: `[Erro: ${msg}]`, timestamp: Date.now() });
      setRefining(null);
      return null;
    }
  }, [draft, synthesis, section, appendChatMessage, setRefining, callAIStream]);

  const acceptLastSuggestion = useCallback(() => {
    if (!draft) return;
    const last = draft[section].chatHistory.filter(m => m.role === 'assistant').pop();
    if (last && !last.content.startsWith('[Erro:')) {
      acceptRefineResult(section, last.content);
    }
  }, [draft, section, acceptRefineResult]);

  return { sendMessage, acceptLastSuggestion };
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/hooks/useSectionRefine.ts
git commit -m "feat(embargos): section refine hook"
```

### Task 6.7: `hooks/useAutoSave.ts`

**Files:**
- Create: `src/apps/embargos/hooks/useAutoSave.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file useAutoSave.ts
 * @description Auto-save no IndexedDB com debounce. Observa mudanças em
 *              useSynthesisStore e useDraftStore.
 */

import { useEffect, useRef } from 'react';
import {
  useSynthesisStore,
  useDocumentStore,
  useDraftStore
} from '../stores';
import { saveMinuta } from '../services/localHistoryService';
import type { SavedEmbargos, SavedDocumentMeta, DocumentSlot } from '../types';

const DEBOUNCE_MS = 1000;
const SLOT_ORDER: DocumentSlot[] = ['decisaoEmbargada', 'embargos', 'contrarrazoes', 'inicial', 'contestacao'];

function buildRecord(): SavedEmbargos | null {
  const synth = useSynthesisStore.getState();
  const docs = useDocumentStore.getState();
  const draft = useDraftStore.getState();

  if (!synth.synthesis) return null;

  const id = synth.savedId ?? crypto.randomUUID();
  const now = Date.now();

  const documents: SavedDocumentMeta[] = SLOT_ORDER
    .map(slot => docs[slot])
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map(d => ({ slot: d.slot, name: d.name, size: d.size }));

  const numero = synth.synthesis.identificacao.numeroProcesso;
  const titulo = numero ?? `Embargos sem número — ${new Date(now).toLocaleString('pt-BR')}`;

  return {
    id,
    createdAt: synth.savedId ? now : now, // refinado quando carregado de getMinuta
    updatedAt: now,
    titulo,
    documents,
    synthesis: synth.synthesis,
    draft: draft.draft
  };
}

export function useAutoSave() {
  const synthesis = useSynthesisStore(s => s.synthesis);
  const draft = useDraftStore(s => s.draft);
  const setSavedId = useSynthesisStore(s => s.setSavedId);
  const savedId = useSynthesisStore(s => s.savedId);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!synthesis) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      const record = buildRecord();
      if (!record) return;
      try {
        await saveMinuta(record);
        if (!savedId) setSavedId(record.id);
      } catch (err) {
        console.warn('[embargos] auto-save falhou:', err);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [synthesis, draft, savedId, setSavedId]);
}

/** Save imediato — usado ao aceitar refino. */
export async function saveNow(): Promise<void> {
  const record = buildRecord();
  if (!record) return;
  await saveMinuta(record);
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/hooks/useAutoSave.ts
git commit -m "feat(embargos): auto-save hook"
```

### Task 6.8: Barrel `hooks/index.ts`

**Files:**
- Create: `src/apps/embargos/hooks/index.ts`

- [ ] **Step 1: Escrever**

```typescript
export { useAIIntegration } from './useAIIntegration';
export { usePdfUpload } from './usePdfUpload';
export { useSynthesisAnalysis } from './useSynthesisAnalysis';
export { useDraftGeneration } from './useDraftGeneration';
export { useSectionRefine } from './useSectionRefine';
export { useAutoSave, saveNow } from './useAutoSave';
export { useLocalHistory } from './useLocalHistory';
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/hooks/index.ts
git commit -m "feat(embargos): hooks barrel"
```

**Marco M1 — Stores/Hooks/Services completos. Não há UI ainda; smoke test não aplicável.**

---

## Phase 7 — UI base (cópias)

### Task 7.1: Copiar UI primitives do Analisador

**Files:**
- Create: `src/apps/embargos/components/ui/Button.tsx`
- Create: `src/apps/embargos/components/ui/Toast.tsx`
- Create: `src/apps/embargos/components/ui/BaseModal.tsx`
- Create: `src/apps/embargos/components/ui/index.ts`

- [ ] **Step 1: Copiar**

```bash
cp src/apps/analisador/components/ui/Button.tsx src/apps/embargos/components/ui/Button.tsx
cp src/apps/analisador/components/ui/Toast.tsx src/apps/embargos/components/ui/Toast.tsx
cp src/apps/analisador/components/ui/BaseModal.tsx src/apps/embargos/components/ui/BaseModal.tsx
cp src/apps/analisador/components/ui/index.ts src/apps/embargos/components/ui/index.ts
```

- [ ] **Step 2: Validar imports**

Cada arquivo deve ter apenas imports de React, lucide-react, e relativos a `'./'` ou `'../'`. Se houver `'../../analisador/'`, ajustar para `'../../embargos/'`.

```bash
grep -n "analisador" src/apps/embargos/components/ui/*.tsx
```

Expected: sem matches.

- [ ] **Step 3: `npx tsc --noEmit`** — PASS.

- [ ] **Step 4: Commit**

```bash
git add src/apps/embargos/components/ui
git commit -m "feat(embargos): copy UI primitives from analisador"
```

### Task 7.2: Copiar `LoginGate.tsx`

**Files:**
- Create: `src/apps/embargos/components/auth/LoginGate.tsx`

- [ ] **Step 1: Copiar**

```bash
cp src/apps/analisador/components/auth/LoginGate.tsx src/apps/embargos/components/auth/LoginGate.tsx
```

- [ ] **Step 2: Ajustar branding**

Edit o arquivo: substituir o texto e ícone do Analisador por algo neutro do Embargos. Aproximadamente:

- Title "Analisador de Prepauta" → "Embargos de Declaração"
- Subtitle/copy análoga → algo como "Análise e redação assistida"
- Ícone `<FileSearch />` → `<Gavel />`
- Import correspondente: `import { Gavel } from 'lucide-react';` (substituir/incluir)

Use Read antes de Edit para localizar os trechos exatos.

- [ ] **Step 3: `npx tsc --noEmit`** — PASS.

- [ ] **Step 4: Commit**

```bash
git add src/apps/embargos/components/auth/LoginGate.tsx
git commit -m "feat(embargos): LoginGate adapted from analisador"
```

### Task 7.3: Copiar componentes de Settings

**Files:**
- Create: `src/apps/embargos/components/settings/AIProviderSelector.tsx`
- Create: `src/apps/embargos/components/settings/ModelSelector.tsx`
- Create: `src/apps/embargos/components/settings/APIKeyInput.tsx`
- Create: `src/apps/embargos/components/settings/SettingsModal.tsx`
- Create: `src/apps/embargos/components/settings/index.ts`

- [ ] **Step 1: Copiar**

```bash
cp src/apps/analisador/components/settings/AIProviderSelector.tsx src/apps/embargos/components/settings/AIProviderSelector.tsx
cp src/apps/analisador/components/settings/ModelSelector.tsx src/apps/embargos/components/settings/ModelSelector.tsx
cp src/apps/analisador/components/settings/APIKeyInput.tsx src/apps/embargos/components/settings/APIKeyInput.tsx
cp src/apps/analisador/components/settings/SettingsModal.tsx src/apps/embargos/components/settings/SettingsModal.tsx
cp src/apps/analisador/components/settings/index.ts src/apps/embargos/components/settings/index.ts
```

- [ ] **Step 2: Validar imports**

```bash
grep -n "analisador" src/apps/embargos/components/settings/*.tsx
```

Se algum apontar para `'../../analisador/'`, ajustar manualmente. Os imports de stores/ui devem ser relativos (`'../../stores'`, `'../ui'`).

- [ ] **Step 3: `npx tsc --noEmit`** — PASS.

- [ ] **Step 4: Commit**

```bash
git add src/apps/embargos/components/settings
git commit -m "feat(embargos): copy settings components from analisador"
```

---

## Phase 8 — Tela 1: Upload

### Task 8.1: `components/upload/PdfDropArea.tsx`

**Files:**
- Create: `src/apps/embargos/components/upload/PdfDropArea.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file PdfDropArea.tsx
 * @description Área drag&drop para um único arquivo PDF.
 */

import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface PdfDropAreaProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  helperText?: string;
}

export const PdfDropArea: React.FC<PdfDropAreaProps> = ({ onFile, disabled, helperText }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') onFile(file);
  }, [onFile, disabled]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }, [onFile]);

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`block border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-all
        ${disabled
          ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
          : isDragging
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500'}`}
    >
      <input
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleSelect}
        disabled={disabled}
      />
      <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {isDragging ? 'Solte o PDF aqui' : 'Clique ou arraste um PDF'}
      </p>
      {helperText && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" /> {helperText}
        </p>
      )}
    </label>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/upload/PdfDropArea.tsx
git commit -m "feat(embargos): PdfDropArea component"
```

### Task 8.2: `components/upload/PdfSlot.tsx`

**Files:**
- Create: `src/apps/embargos/components/upload/PdfSlot.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file PdfSlot.tsx
 * @description Slot fixo para um documento (mostra drop area se vazio, card se preenchido).
 */

import React from 'react';
import { FileText, X, AlertCircle, Loader2 } from 'lucide-react';
import { PdfDropArea } from './PdfDropArea';
import { usePdfUpload } from '../../hooks';
import { SLOT_LABELS, REQUIRED_SLOTS } from '../../types';
import type { DocumentSlot } from '../../types';

interface PdfSlotProps {
  slot: DocumentSlot;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const PdfSlot: React.FC<PdfSlotProps> = ({ slot }) => {
  const { uploadFile, removeFile, slot: file } = usePdfUpload(slot);
  const isRequired = REQUIRED_SLOTS.includes(slot);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {SLOT_LABELS[slot]}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </h3>
        {file && (
          <button
            onClick={removeFile}
            className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
            title="Remover"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!file && (
        <PdfDropArea
          onFile={uploadFile}
          helperText={isRequired ? 'Obrigatório' : 'Opcional'}
        />
      )}

      {file && file.status === 'parsing' && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Processando…
        </div>
      )}

      {file && file.status === 'ready' && (
        <div className="flex items-start gap-3 text-sm">
          <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-slate-700 dark:text-slate-200 font-medium">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatSize(file.size)}{file.useBinary ? ' · enviado como PDF' : ' · texto extraído'}
            </p>
          </div>
        </div>
      )}

      {file && file.status === 'error' && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{file.errorMessage ?? 'Falha ao processar PDF.'}</span>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/upload/PdfSlot.tsx
git commit -m "feat(embargos): PdfSlot component"
```

### Task 8.3: `components/upload/UploadView.tsx`

**Files:**
- Create: `src/apps/embargos/components/upload/UploadView.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file UploadView.tsx
 * @description Tela 1: grid de slots + botão Analisar.
 */

import React from 'react';
import { Loader2, Gavel } from 'lucide-react';
import { PdfSlot } from './PdfSlot';
import { Button } from '../ui';
import { useDocumentStore, useSynthesisStore, useAIStore } from '../../stores';
import { useSynthesisAnalysis } from '../../hooks';
import { selectCurrentApiKey } from '../../stores';
import type { DocumentSlot } from '../../types';

const SLOTS: DocumentSlot[] = ['decisaoEmbargada', 'embargos', 'contrarrazoes', 'inicial', 'contestacao'];

export const UploadView: React.FC = () => {
  const canAnalyze = useDocumentStore(s => s.canAnalyze());
  const isAnalyzing = useSynthesisStore(s => s.isAnalyzing);
  const progress = useSynthesisStore(s => s.progress);
  const error = useSynthesisStore(s => s.error);
  const apiKey = useAIStore(selectCurrentApiKey);

  const { analyze } = useSynthesisAnalysis();
  const noApiKey = !apiKey;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-amber-600 rounded-2xl mb-4 shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
          <Gavel className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Embargos de Declaração</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Envie os documentos do processo. Decisão embargada e embargos são obrigatórios.
        </p>
      </div>

      {noApiKey && (
        <div className="mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Configure o provider e a chave de API em <strong>Configurações</strong> antes de analisar.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {SLOTS.map(slot => (
          <PdfSlot key={slot} slot={slot} />
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button
          variant="primary"
          onClick={() => void analyze()}
          disabled={!canAnalyze || isAnalyzing || noApiKey}
          icon={isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
        >
          {isAnalyzing ? progress.label || 'Analisando…' : 'Analisar embargos'}
        </Button>
        {isAnalyzing && progress.value > 0 && (
          <div className="w-full max-w-md h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${progress.value}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/upload/UploadView.tsx
git commit -m "feat(embargos): UploadView (Tela 1)"
```

### Task 8.4: Barrel `components/upload/index.ts`

**Files:**
- Create: `src/apps/embargos/components/upload/index.ts`

- [ ] **Step 1: Escrever**

```typescript
export { PdfDropArea } from './PdfDropArea';
export { PdfSlot } from './PdfSlot';
export { UploadView } from './UploadView';
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/upload/index.ts
git commit -m "feat(embargos): upload barrel"
```

---

## Phase 9 — Tela 2: Síntese

### Task 9.1: `components/synthesis/IdentificacaoCard.tsx`

**Files:**
- Create: `src/apps/embargos/components/synthesis/IdentificacaoCard.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file IdentificacaoCard.tsx
 * @description Card editável de identificação do processo.
 */

import React from 'react';
import { useSynthesisStore } from '../../stores';

export const IdentificacaoCard: React.FC = () => {
  const identificacao = useSynthesisStore(s => s.synthesis?.identificacao);
  const updateIdentificacao = useSynthesisStore(s => s.updateIdentificacao);

  if (!identificacao) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Identificação</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Número do processo</span>
          <input
            type="text"
            value={identificacao.numeroProcesso ?? ''}
            onChange={(e) => updateIdentificacao({ numeroProcesso: e.target.value || null })}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Polo do embargante</span>
          <select
            value={identificacao.polo}
            onChange={(e) => updateIdentificacao({ polo: e.target.value as 'reclamante' | 'reclamada' | 'ambas' })}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          >
            <option value="reclamante">Reclamante</option>
            <option value="reclamada">Reclamada</option>
            <option value="ambas">Ambas</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Parte embargante</span>
          <input
            type="text"
            value={identificacao.parteEmbargante}
            onChange={(e) => updateIdentificacao({ parteEmbargante: e.target.value })}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Parte embargada</span>
          <input
            type="text"
            value={identificacao.parteEmbargada}
            onChange={(e) => updateIdentificacao({ parteEmbargada: e.target.value })}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 mt-3 text-sm">
        <input
          type="checkbox"
          checked={identificacao.tempestividade.tempestivo === true}
          onChange={(e) => updateIdentificacao({
            tempestividade: { ...identificacao.tempestividade, tempestivo: e.target.checked }
          })}
        />
        <span className="text-slate-700 dark:text-slate-200">Tempestivos</span>
        {identificacao.tempestividade.observacao && (
          <span className="text-xs text-slate-500 dark:text-slate-400">({identificacao.tempestividade.observacao})</span>
        )}
      </label>
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/synthesis/IdentificacaoCard.tsx
git commit -m "feat(embargos): IdentificacaoCard"
```

### Task 9.2: `components/synthesis/ResumosCard.tsx`

**Files:**
- Create: `src/apps/embargos/components/synthesis/ResumosCard.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file ResumosCard.tsx
 * @description Três textareas para resumos da sentença, embargos e contrarrazões.
 */

import React from 'react';
import { useSynthesisStore } from '../../stores';

export const ResumosCard: React.FC = () => {
  const synthesis = useSynthesisStore(s => s.synthesis);
  const updateResumo = useSynthesisStore(s => s.updateResumo);

  if (!synthesis) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Resumos</h3>
      <div className="flex flex-col gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Sentença embargada</span>
          <textarea
            value={synthesis.resumoSentenca}
            onChange={(e) => updateResumo('resumoSentenca', e.target.value)}
            rows={3}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Embargos</span>
          <textarea
            value={synthesis.resumoEmbargos}
            onChange={(e) => updateResumo('resumoEmbargos', e.target.value)}
            rows={3}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y"
          />
        </label>
        {synthesis.resumoContrarrazoes !== null && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Contrarrazões</span>
            <textarea
              value={synthesis.resumoContrarrazoes}
              onChange={(e) => updateResumo('resumoContrarrazoes', e.target.value)}
              rows={3}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y"
            />
          </label>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/synthesis/ResumosCard.tsx
git commit -m "feat(embargos): ResumosCard"
```

### Task 9.3: `components/synthesis/PontoCard.tsx`

**Files:**
- Create: `src/apps/embargos/components/synthesis/PontoCard.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file PontoCard.tsx
 * @description Card empilhado expansível com chevron, exibindo um ponto suscitado
 *              editável (conclusão, justificativa, diretrizes do usuário).
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useSynthesisStore } from '../../stores';
import {
  VICIO_LABELS,
  CONCLUSAO_LABELS
} from '../../types';
import type { PontoSuscitado, ConclusaoTipo } from '../../types';

interface PontoCardProps {
  ponto: PontoSuscitado;
}

export const PontoCard: React.FC<PontoCardProps> = ({ ponto }) => {
  const [expanded, setExpanded] = useState(true);
  const updatePonto = useSynthesisStore(s => s.updatePonto);

  const effectiveConclusao = ponto.conclusaoUsuario ?? ponto.conclusaoPreliminar;
  const hasDivergencia = !!ponto.divergenciaVicio;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mb-3 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
      >
        {expanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ponto {ponto.ordem}</span>
            {ponto.vicioAlegadoPelaParte.map(v => (
              <span key={v} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                {VICIO_LABELS[v]}
              </span>
            ))}
            {hasDivergencia && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Divergência
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ml-auto">
              {CONCLUSAO_LABELS[effectiveConclusao]}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{ponto.trechoEmbargos}</p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 text-sm flex flex-col gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Trecho dos embargos</p>
            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{ponto.trechoEmbargos}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">O que a sentença disse</p>
            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{ponto.oQueSentencaDisse}</p>
          </div>
          {hasDivergencia && (
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">Divergência</p>
              <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{ponto.divergenciaVicio}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Vício reconhecido pela análise: {ponto.vicioReconhecidoPelaIA.map(v => VICIO_LABELS[v]).join(', ')}
              </p>
            </div>
          )}
          {ponto.questaoSuscitadaNoProcesso !== null && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ponto.questaoSuscitadaNoProcesso}
                onChange={(e) => updatePonto(ponto.id, { questaoSuscitadaNoProcesso: e.target.checked })}
              />
              <span>Questão suscitada na inicial/contestação</span>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Conclusão</span>
            <select
              value={effectiveConclusao}
              onChange={(e) => updatePonto(ponto.id, { conclusaoUsuario: e.target.value as ConclusaoTipo })}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              {(Object.entries(CONCLUSAO_LABELS) as Array<[ConclusaoTipo, string]>).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Justificativa (preliminar — editável)</span>
            <textarea
              value={ponto.justificativaPreliminar}
              onChange={(e) => updatePonto(ponto.id, { justificativaPreliminar: e.target.value })}
              rows={3}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Diretrizes deste ponto (argumentos, Ids, dispositivos, jurisprudência)
            </span>
            <textarea
              value={ponto.diretrizesUsuario ?? ''}
              onChange={(e) => updatePonto(ponto.id, { diretrizesUsuario: e.target.value })}
              rows={3}
              placeholder="Ex.: cite Id 1a2b3c4; aplicar art. 832 da CLT; OJ 394 SDI-I…"
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y"
            />
          </label>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/synthesis/PontoCard.tsx
git commit -m "feat(embargos): PontoCard"
```

### Task 9.4: `components/synthesis/DiretrizesGeraisTextarea.tsx`

**Files:**
- Create: `src/apps/embargos/components/synthesis/DiretrizesGeraisTextarea.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file DiretrizesGeraisTextarea.tsx
 */

import React from 'react';
import { useSynthesisStore } from '../../stores';

export const DiretrizesGeraisTextarea: React.FC = () => {
  const value = useSynthesisStore(s => s.synthesis?.diretrizesGeraisUsuario ?? '');
  const setDiretrizesGerais = useSynthesisStore(s => s.setDiretrizesGerais);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Diretrizes gerais (opcional)</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Argumentos, dispositivos e jurisprudência que devem permear toda a fundamentação.
        </span>
        <textarea
          value={value}
          onChange={(e) => setDiretrizesGerais(e.target.value)}
          rows={4}
          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y text-sm"
          placeholder="Ex.: enfatizar que embargos não substituem recurso ordinário…"
        />
      </label>
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/synthesis/DiretrizesGeraisTextarea.tsx
git commit -m "feat(embargos): DiretrizesGeraisTextarea"
```

### Task 9.5: `components/synthesis/SynthesisReview.tsx`

**Files:**
- Create: `src/apps/embargos/components/synthesis/SynthesisReview.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file SynthesisReview.tsx
 * @description Tela 2: revisão da síntese com cards editáveis.
 */

import React from 'react';
import { ArrowLeft, RefreshCw, FileSignature, Loader2 } from 'lucide-react';
import { IdentificacaoCard } from './IdentificacaoCard';
import { ResumosCard } from './ResumosCard';
import { PontoCard } from './PontoCard';
import { DiretrizesGeraisTextarea } from './DiretrizesGeraisTextarea';
import { Button } from '../ui';
import {
  useSynthesisStore,
  useDocumentStore,
  useDraftStore
} from '../../stores';
import {
  useSynthesisAnalysis,
  useDraftGeneration
} from '../../hooks';

interface SynthesisReviewProps {
  onBackToUpload: () => void;
}

export const SynthesisReview: React.FC<SynthesisReviewProps> = ({ onBackToUpload }) => {
  const synthesis = useSynthesisStore(s => s.synthesis);
  const isGenerating = useDraftStore(s => s.isGenerating);
  const progressDraft = useDraftStore(s => s.progress);
  const draftError = useDraftStore(s => s.error);

  const { analyze } = useSynthesisAnalysis();
  const { generate } = useDraftGeneration();

  if (!synthesis) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="secondary" onClick={onBackToUpload} icon={<ArrowLeft className="w-4 h-4" />}>
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => void analyze()}
            icon={<RefreshCw className="w-4 h-4" />}
            title="Refazer análise (descarta a síntese atual)"
          >
            Refazer análise
          </Button>
        </div>
      </div>

      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Revisão da síntese</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Ajuste o que for necessário e adicione suas diretrizes antes de gerar a minuta.
      </p>

      <IdentificacaoCard />
      <ResumosCard />

      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-6 mb-2">
        Pontos suscitados ({synthesis.pontos.length})
      </h2>

      {synthesis.pontos.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4 text-sm text-slate-500 dark:text-slate-400">
          A análise não identificou pontos a apreciar. Verifique os embargos ou refaça a análise.
        </div>
      ) : (
        synthesis.pontos.map(p => <PontoCard key={p.id} ponto={p} />)
      )}

      <DiretrizesGeraisTextarea />

      {draftError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {draftError}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 mt-6">
        <Button
          variant="primary"
          onClick={() => void generate()}
          disabled={isGenerating || synthesis.pontos.length === 0}
          icon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
        >
          {isGenerating ? progressDraft.label || 'Gerando minuta…' : 'Gerar minuta'}
        </Button>
        {isGenerating && progressDraft.value > 0 && (
          <div className="w-full max-w-md h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${progressDraft.value}%` }} />
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/synthesis/SynthesisReview.tsx
git commit -m "feat(embargos): SynthesisReview (Tela 2)"
```

### Task 9.6: Barrel `components/synthesis/index.ts`

**Files:**
- Create: `src/apps/embargos/components/synthesis/index.ts`

- [ ] **Step 1: Escrever**

```typescript
export { SynthesisReview } from './SynthesisReview';
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/synthesis/index.ts
git commit -m "feat(embargos): synthesis barrel"
```

---

## Phase 10 — Tela 3: Minuta

### Task 10.1: `components/draft/RefinePanel.tsx`

**Files:**
- Create: `src/apps/embargos/components/draft/RefinePanel.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file RefinePanel.tsx
 * @description Drawer lateral direito para refinar uma seção via chat.
 */

import React, { useState } from 'react';
import { X, Send, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui';
import { useDraftStore } from '../../stores';
import { useSectionRefine, saveNow } from '../../hooks';
import { SECTION_LABELS } from '../../types';
import type { DraftSectionKey } from '../../types';

interface RefinePanelProps {
  section: DraftSectionKey;
  onClose: () => void;
}

export const RefinePanel: React.FC<RefinePanelProps> = ({ section, onClose }) => {
  const draft = useDraftStore(s => s.draft);
  const isRefining = useDraftStore(s => s.refiningSection === section);
  const { sendMessage, acceptLastSuggestion } = useSectionRefine(section);
  const [input, setInput] = useState('');

  if (!draft) return null;
  const history = draft[section].chatHistory;
  const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
  const canAccept = !!lastAssistant && !lastAssistant.content.startsWith('[Erro:');

  const handleSend = async () => {
    if (!input.trim() || isRefining) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleAccept = async () => {
    acceptLastSuggestion();
    await saveNow();
  };

  return (
    <aside className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl z-50 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Refinar — {SECTION_LABELS[section]}
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-red-500">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-3">
        {history.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Descreva o ajuste desejado (ex.: "reescreva incluindo o argumento de X", "reduza pela metade", "adicione citação ao art. 832 da CLT").
          </p>
        )}
        {history.map((m, i) => (
          <div
            key={i}
            className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-amber-50 dark:bg-amber-900/20 text-slate-800 dark:text-slate-100 self-end'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            {m.content}
          </div>
        ))}
        {isRefining && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Refinando…
          </div>
        )}
      </div>

      {canAccept && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          <Button
            variant="primary"
            onClick={() => void handleAccept()}
            icon={<Check className="w-4 h-4" />}
          >
            Aceitar e substituir
          </Button>
        </div>
      )}

      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void handleSend();
            }
          }}
          rows={2}
          placeholder="Ctrl+Enter para enviar"
          className="flex-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 resize-none"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!input.trim() || isRefining}
          className="px-3 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/draft/RefinePanel.tsx
git commit -m "feat(embargos): RefinePanel drawer"
```

### Task 10.2: `components/draft/SectionEditor.tsx`

**Files:**
- Create: `src/apps/embargos/components/draft/SectionEditor.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file SectionEditor.tsx
 * @description Card de uma seção: textarea editável + botão Refinar.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../ui';
import { useDraftStore } from '../../stores';
import { SECTION_LABELS } from '../../types';
import type { DraftSectionKey } from '../../types';

interface SectionEditorProps {
  section: DraftSectionKey;
  onOpenRefine: () => void;
}

export const SectionEditor: React.FC<SectionEditorProps> = ({ section, onOpenRefine }) => {
  const text = useDraftStore(s => s.draft?.[section].text ?? '');
  const updateSection = useDraftStore(s => s.updateSection);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {SECTION_LABELS[section]}
        </h3>
        <Button variant="secondary" onClick={onOpenRefine} icon={<Sparkles className="w-4 h-4" />}>
          Refinar
        </Button>
      </div>
      <textarea
        value={text}
        onChange={(e) => updateSection(section, e.target.value)}
        rows={Math.max(8, Math.min(40, text.split('\n').length + 2))}
        className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-serif leading-relaxed resize-y"
      />
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/draft/SectionEditor.tsx
git commit -m "feat(embargos): SectionEditor"
```

### Task 10.3: `components/draft/DraftActionBar.tsx`

**Files:**
- Create: `src/apps/embargos/components/draft/DraftActionBar.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file DraftActionBar.tsx
 * @description Barra de ações na Tela 3: voltar, copiar, novo.
 */

import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, FilePlus } from 'lucide-react';
import { Button } from '../ui';
import { useDraftStore } from '../../stores';
import { concatDraft } from '../../utils/concat-draft';

interface DraftActionBarProps {
  onBackToSynthesis: () => void;
  onNew: () => void;
}

export const DraftActionBar: React.FC<DraftActionBarProps> = ({ onBackToSynthesis, onNew }) => {
  const draft = useDraftStore(s => s.draft);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(concatDraft(draft));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('[embargos] copy falhou:', err);
    }
  };

  const handleNew = () => {
    if (confirm('Descartar a minuta atual e iniciar uma nova?')) onNew();
  };

  return (
    <div className="flex flex-wrap gap-2 items-center justify-between sticky bottom-4">
      <Button variant="secondary" onClick={onBackToSynthesis} icon={<ArrowLeft className="w-4 h-4" />}>
        Voltar para síntese
      </Button>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => void handleCopy()}
          icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        >
          {copied ? 'Copiado!' : 'Copiar minuta'}
        </Button>
        <Button variant="primary" onClick={handleNew} icon={<FilePlus className="w-4 h-4" />}>
          Novo
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/draft/DraftActionBar.tsx
git commit -m "feat(embargos): DraftActionBar"
```

### Task 10.4: `components/draft/DraftView.tsx`

**Files:**
- Create: `src/apps/embargos/components/draft/DraftView.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file DraftView.tsx
 * @description Tela 3: chips dos documentos + 3 SectionEditor + DraftActionBar + RefinePanel.
 */

import React, { useState } from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import { SectionEditor } from './SectionEditor';
import { RefinePanel } from './RefinePanel';
import { DraftActionBar } from './DraftActionBar';
import { useDocumentStore, useDraftStore } from '../../stores';
import { SLOT_LABELS } from '../../types';
import type { DocumentSlot, DraftSectionKey } from '../../types';

interface DraftViewProps {
  onBackToSynthesis: () => void;
  onNew: () => void;
}

const SLOTS: DocumentSlot[] = ['decisaoEmbargada', 'embargos', 'contrarrazoes', 'inicial', 'contestacao'];

export const DraftView: React.FC<DraftViewProps> = ({ onBackToSynthesis, onNew }) => {
  const draft = useDraftStore(s => s.draft);
  const docs = useDocumentStore.getState();
  const [refining, setRefining] = useState<DraftSectionKey | null>(null);

  if (!draft) return null;

  const hasAttention = ['relatorio', 'fundamentacao', 'dispositivo'].some(
    (k) => draft[k as DraftSectionKey].text.includes('[ATENÇÃO:')
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex flex-wrap gap-2 mb-4">
        {SLOTS.map(slot => {
          const d = docs[slot];
          if (!d) return null;
          return (
            <span
              key={slot}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
            >
              <FileText className="w-3 h-3" /> {SLOT_LABELS[slot]}: {d.name}
            </span>
          );
        })}
      </div>

      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Minuta</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Edite cada seção diretamente ou refine com auxílio da IA.
      </p>

      {hasAttention && (
        <div className="mb-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-sm text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Há marcações <strong>[ATENÇÃO: …]</strong> na minuta indicando elementos que a IA considerou insuficientes. Revise antes de copiar.
          </span>
        </div>
      )}

      <SectionEditor section="relatorio" onOpenRefine={() => setRefining('relatorio')} />
      <SectionEditor section="fundamentacao" onOpenRefine={() => setRefining('fundamentacao')} />
      <SectionEditor section="dispositivo" onOpenRefine={() => setRefining('dispositivo')} />

      <DraftActionBar onBackToSynthesis={onBackToSynthesis} onNew={onNew} />

      {refining && <RefinePanel section={refining} onClose={() => setRefining(null)} />}
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/draft/DraftView.tsx
git commit -m "feat(embargos): DraftView (Tela 3)"
```

### Task 10.5: Barrel `components/draft/index.ts`

**Files:**
- Create: `src/apps/embargos/components/draft/index.ts`

- [ ] **Step 1: Escrever**

```typescript
export { DraftView } from './DraftView';
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/draft/index.ts
git commit -m "feat(embargos): draft barrel"
```

---

## Phase 11 — Histórico

### Task 11.1: `components/history/HistoricoItem.tsx`

**Files:**
- Create: `src/apps/embargos/components/history/HistoricoItem.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file HistoricoItem.tsx
 */

import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { formatTimestampBR } from '../../utils/format-date';
import { SLOT_LABELS } from '../../types';
import type { SavedEmbargos } from '../../types';

interface HistoricoItemProps {
  item: SavedEmbargos;
  onSelect: () => void;
  onDelete: () => void;
}

export const HistoricoItem: React.FC<HistoricoItemProps> = ({ item, onSelect, onDelete }) => {
  const numDocs = item.documents.length;
  const hasDraft = !!item.draft;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-all">
      <FileText className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <button onClick={onSelect} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
          {item.titulo}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {formatTimestampBR(item.updatedAt)} · {numDocs} {numDocs === 1 ? 'documento' : 'documentos'} · {hasDraft ? 'Minuta gerada' : 'Síntese pendente'}
        </p>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); if (confirm('Excluir este item do histórico?')) onDelete(); }}
        className="text-slate-400 hover:text-red-500"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/history/HistoricoItem.tsx
git commit -m "feat(embargos): HistoricoItem"
```

### Task 11.2: `components/history/HistoricoModal.tsx`

**Files:**
- Create: `src/apps/embargos/components/history/HistoricoModal.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file HistoricoModal.tsx
 */

import React from 'react';
import { History } from 'lucide-react';
import { BaseModal } from '../ui';
import { HistoricoItem } from './HistoricoItem';
import { useLocalHistory } from '../../hooks';
import {
  useSynthesisStore,
  useDraftStore
} from '../../stores';
import type { SavedEmbargos } from '../../types';

interface HistoricoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAndOpen: (item: SavedEmbargos) => void;
}

export const HistoricoModal: React.FC<HistoricoModalProps> = ({ isOpen, onClose, onSelectAndOpen }) => {
  const { items, isLoading, remove } = useLocalHistory();
  const setSynthesis = useSynthesisStore(s => s.setSynthesis);
  const setSavedId = useSynthesisStore(s => s.setSavedId);
  const setDraft = useDraftStore(s => s.setDraft);

  const handleSelect = (item: SavedEmbargos) => {
    setSynthesis(item.synthesis);
    setSavedId(item.id);
    if (item.draft) setDraft(item.draft);
    onSelectAndOpen(item);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Histórico"
      icon={<History className="w-5 h-5" />}
      iconColor="text-amber-500"
      size="lg"
    >
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-auto">
        {isLoading && <p className="text-sm text-slate-500">Carregando…</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            Nenhuma minuta salva ainda.
          </p>
        )}
        {items.map(item => (
          <HistoricoItem
            key={item.id}
            item={item}
            onSelect={() => handleSelect(item)}
            onDelete={() => void remove(item.id)}
          />
        ))}
      </div>
    </BaseModal>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/history/HistoricoModal.tsx
git commit -m "feat(embargos): HistoricoModal"
```

### Task 11.3: Barrel `components/history/index.ts`

**Files:**
- Create: `src/apps/embargos/components/history/index.ts`

- [ ] **Step 1: Escrever**

```typescript
export { HistoricoModal } from './HistoricoModal';
export { HistoricoItem } from './HistoricoItem';
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/components/history/index.ts
git commit -m "feat(embargos): history barrel"
```

---

## Phase 12 — App raiz e integração

### Task 12.1: `EmbargosContent.tsx` (roteamento entre telas)

**Files:**
- Create: `src/apps/embargos/EmbargosContent.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file EmbargosContent.tsx
 * @description Roteamento entre Tela 1, Tela 2 e Tela 3 com base no estado dos stores.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  History,
  Settings,
  LogOut,
  Sun,
  Moon,
  LayoutGrid
} from 'lucide-react';
import { AppSwitcher } from '../../components/shared/AppSwitcher';
import { UploadView } from './components/upload';
import { SynthesisReview } from './components/synthesis';
import { DraftView } from './components/draft';
import { HistoricoModal } from './components/history';
import { SettingsModal } from './components/settings';
import { useLoginGate } from './components/auth/LoginGate';
import { useToast } from './components/ui';
import {
  useSynthesisStore,
  useDocumentStore,
  useDraftStore
} from './stores';
import { useAutoSave, useLocalHistory } from './hooks';
import { useThemeManagement } from '../../hooks';

export const EmbargosContent: React.FC = () => {
  const synthesis = useSynthesisStore(s => s.synthesis);
  const draft = useDraftStore(s => s.draft);
  const resetSynthesis = useSynthesisStore(s => s.reset);
  const resetDocuments = useDocumentStore(s => s.reset);
  const resetDraft = useDraftStore(s => s.reset);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);

  const { showToast } = useToast();
  const { logout } = useLoginGate();
  const { appTheme, toggleAppTheme } = useThemeManagement();
  const { items: historyItems } = useLocalHistory();

  useAutoSave();

  const handleLogout = useCallback(async () => {
    await logout();
    showToast('info', 'Sessão encerrada');
  }, [logout, showToast]);

  const handleNew = useCallback(() => {
    resetSynthesis();
    resetDocuments();
    resetDraft();
  }, [resetSynthesis, resetDocuments, resetDraft]);

  const handleBackToUpload = useCallback(() => {
    resetSynthesis();
    resetDraft();
  }, [resetSynthesis, resetDraft]);

  const handleBackToSynthesis = useCallback(() => {
    resetDraft();
  }, [resetDraft]);

  // Escolha de tela
  let screen: React.ReactNode;
  if (draft) {
    screen = <DraftView onBackToSynthesis={handleBackToSynthesis} onNew={handleNew} />;
  } else if (synthesis) {
    screen = <SynthesisReview onBackToUpload={handleBackToUpload} />;
  } else {
    screen = <UploadView />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-slate-900 dark:to-slate-800 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <AppSwitcher
          currentApp="embargos"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Apps</span>
        </AppSwitcher>
        <button
          onClick={() => setHistoricoOpen(true)}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm relative"
          title="Histórico"
        >
          <History className="w-4 h-4" />
          {historyItems.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 bg-amber-500 text-white text-xs font-semibold rounded-full inline-flex items-center justify-center">
              {historyItems.length}
            </span>
          )}
        </button>
        <button
          onClick={toggleAppTheme}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm"
          title={appTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          {appTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm"
          title="Configurações"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={() => void handleLogout()}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600 transition-all shadow-sm"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {screen}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoricoModal
        isOpen={historicoOpen}
        onClose={() => setHistoricoOpen(false)}
        onSelectAndOpen={() => setHistoricoOpen(false)}
      />
    </div>
  );
};
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/EmbargosContent.tsx
git commit -m "feat(embargos): EmbargosContent (routing entre telas)"
```

### Task 12.2: `EmbargosApp.tsx`

**Files:**
- Create: `src/apps/embargos/EmbargosApp.tsx`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file EmbargosApp.tsx
 * @description Componente raiz do subapp Embargos.
 */

import React from 'react';
import { LoginGate } from './components/auth/LoginGate';
import { ToastProvider } from './components/ui';
import { EmbargosContent } from './EmbargosContent';

const EmbargosApp: React.FC = () => {
  return (
    <ToastProvider>
      <LoginGate>
        <EmbargosContent />
      </LoginGate>
    </ToastProvider>
  );
};

export default EmbargosApp;
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/EmbargosApp.tsx
git commit -m "feat(embargos): EmbargosApp root"
```

### Task 12.3: Barrel `index.ts`

**Files:**
- Create: `src/apps/embargos/index.ts`

- [ ] **Step 1: Escrever**

```typescript
/**
 * @file index.ts
 * @description Exportação principal do subapp Embargos.
 */

export { default as EmbargosApp } from './EmbargosApp';
export * from './types';
export * from './stores';
export * from './hooks';
```

- [ ] **Step 2: `npx tsc --noEmit`** — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/embargos/index.ts
git commit -m "feat(embargos): main barrel"
```

### Task 12.4: Registrar no `AppSwitcher`

**Files:**
- Modify: `src/components/shared/AppSwitcher.tsx`

- [ ] **Step 1: Adicionar `'embargos'` ao type union `AppId`**

Read o arquivo. Localizar a linha `type AppId = 'sentencify' | 'analisador' | ...`. Editar:

```typescript
type AppId = 'sentencify' | 'analisador' | 'embargos' | 'prova-oral' | 'noticias' | 'seguro-desemprego' | 'financeiro';
```

- [ ] **Step 2: Adicionar entrada em `APPS` (após `analisador`)**

Edit; localizar o objeto do `analisador` em `APPS`. Após o `},` que fecha a entrada do analisador, inserir:

```typescript
  {
    id: 'embargos',
    label: 'Embargos',
    href: '/embargos',
    icon: <Gavel className="w-4 h-4" />,
    colors: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20 dark:border-amber-400/20',
      hoverBg: 'hover:bg-amber-500/20 dark:hover:bg-amber-500/25',
    },
  },
```

- [ ] **Step 3: Importar `Gavel` de lucide-react**

Edit a linha de import de `lucide-react` para incluir `Gavel`. Exemplo: `import { Scale, FileSearch, Mic, Newspaper, Calculator, Wallet, ChevronDown, Gavel } from 'lucide-react';`

- [ ] **Step 4: `npx tsc --noEmit`** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/AppSwitcher.tsx
git commit -m "feat(embargos): register subapp in AppSwitcher"
```

### Task 12.5: Registrar rota `/embargos` em `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Adicionar import**

Read o trecho do import do `AnalisadorApp` (linha ~59). Edit para adicionar abaixo:

```typescript
import { EmbargosApp } from './apps/embargos';
```

- [ ] **Step 2: Adicionar rota**

Read o trecho da linha ~3480 onde `return <AnalisadorApp />;` está. Localizar o teste de path correspondente (algo como `if (path.startsWith('/analise')) return <AnalisadorApp />;` ou bloco equivalente). Edit para inserir, antes ou depois:

```typescript
if (path.startsWith('/embargos')) {
  return <EmbargosApp />;
}
```

Verificar que o teste exato segue o padrão dos demais subapps no mesmo bloco.

- [ ] **Step 3: `npx tsc --noEmit`** — PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(embargos): register /embargos route"
```

**Marco M2 — Smoke test #1: app sobe**

- [ ] **Step 5: Smoke test manual**

```bash
npm run dev
```

Abrir `http://localhost:5173/embargos` (ajustar porta conforme dev server do projeto). Validar:
- Tela de login (magic link) carrega
- App switcher mostra "Embargos" como opção
- Após login (mock ou real), tela de upload aparece com 5 slots
- Banner "Configure provider…" aparece se API key não estiver configurada

Se falhar, diagnosticar e corrigir. Sem commit adicional se passar.

---

## Phase 13 — Versionamento

### Task 13.1: Bumpar versão para 1.44.0

**Files:**
- Modify: `CLAUDE.md` (linha 7)
- Modify: `src/App.tsx` (constante `APP_VERSION`)
- Modify: `src/constants/app-version.ts`
- Modify: `src/constants/changelog.js`
- Modify: `package.json`

- [ ] **Step 1: CLAUDE.md**

Edit linha 7 de `CLAUDE.md`:

De:
```
**Version**: 1.43.39 | **File**: `src/App.tsx` (~160 KB) | **Runtime**: Standalone + Render
```

Para:
```
**Version**: 1.44.0 | **File**: `src/App.tsx` (~160 KB) | **Runtime**: Standalone + Render
```

- [ ] **Step 2: `src/App.tsx`**

Read próximo à linha 209 a constante `APP_VERSION`. Edit para `1.44.0`.

- [ ] **Step 3: `src/constants/app-version.ts`**

Read e Edit. Mudar para `1.44.0` (formato exato depende do arquivo — preservar o pattern).

- [ ] **Step 4: `src/constants/changelog.js`**

Read; localizar onde estão as entradas de versões anteriores (geralmente um array `CHANGELOG`). Edit para adicionar entrada nova no topo:

```javascript
  {
    version: '1.44.0',
    date: '2026-05-22',
    notes: [
      'feat(embargos): novo subapp Embargos de Declaração',
      'Análise em duas etapas: síntese estruturada revisável → minuta em três seções (Relatório/Fundamentação/Dispositivo)',
      'Refino por chat em cada seção',
      'Histórico local (IndexedDB)',
      'Magic Link Sentencify compartilhado'
    ]
  },
```

(Adaptar o shape ao formato existente no arquivo. Use Read primeiro para confirmar.)

- [ ] **Step 5: `package.json`**

Edit `"version": "1.43.39"` → `"version": "1.44.0"`.

- [ ] **Step 6: `npx tsc --noEmit`** — PASS.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md src/App.tsx src/constants/app-version.ts src/constants/changelog.js package.json
git commit -m "chore(embargos): bump version to 1.44.0"
```

---

## Phase 14 — Smoke tests e ajustes finais

### Task 14.1: Smoke test end-to-end com PDFs reais

**Marco M3 — End-to-end manual**

- [ ] **Step 1: Iniciar dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navegar para `/embargos` e fazer login**

- [ ] **Step 3: Configurar provider em Settings**

Abrir engrenagem; selecionar Claude; colar API key válida.

- [ ] **Step 4: Subir PDFs**

Subir decisão embargada + embargos de declaração (mínimo). Opcionalmente, inicial e contestação. Validar que slots ficam em `ready`.

- [ ] **Step 5: Analisar embargos**

Clicar "Analisar embargos". Esperar progresso. Validar que tela 2 (síntese) carrega com cards expandidos por padrão.

- [ ] **Step 6: Revisar e editar**

Expandir/recolher cards via chevron. Editar uma justificativa, mudar uma conclusão, preencher diretrizes em um ponto. Editar diretrizes gerais.

- [ ] **Step 7: Gerar minuta**

Clicar "Gerar minuta". Esperar progresso. Validar que tela 3 carrega com 3 seções editáveis e chips dos PDFs no topo.

- [ ] **Step 8: Refinar uma seção**

Clicar "Refinar" na Fundamentação. Drawer abre à direita. Digitar instrução (ex: "reduza pela metade"). Ctrl+Enter para enviar. Validar que mensagem do usuário aparece, IA responde, botão "Aceitar e substituir" aparece. Aceitar; texto da seção é substituído.

- [ ] **Step 9: Copiar minuta**

Clicar "Copiar minuta". Toast/feedback de cópia. Colar em editor de texto e validar que as 3 seções estão concatenadas com quebras duplas.

- [ ] **Step 10: Histórico**

Abrir histórico (ícone no header). Item aparece. Recarregar página, abrir histórico, clicar no item — síntese e draft são restaurados.

- [ ] **Step 11: Testar tema escuro**

Toggle tema. Validar que TODA a UI mantém contraste e legibilidade em dark mode.

- [ ] **Step 12: Testar AppSwitcher**

Clicar no botão "Apps". Validar que "Embargos" aparece e que outros subapps ainda funcionam.

Se algum problema for encontrado, criar tarefa de fix correspondente e iterar.

### Task 14.2: Edge cases

- [ ] **Step 1: Provider sem PDF binário**

Trocar para OpenAI (ou outro provider sem suporte a PDF binário, conforme `providers.ts`). Subir PDFs. Validar que `useBinary: false` e texto é extraído. Análise funciona.

- [ ] **Step 2: PDF corrompido**

Renomear um TXT para .pdf e subir. Validar que slot vai para status `error` com mensagem.

- [ ] **Step 3: IndexedDB indisponível (opcional, manual)**

Em janela privada do Firefox ou Chrome com storage bloqueado, validar que análise/minuta funcionam mas histórico fica vazio sem crashar.

### Task 14.3: Commit final

- [ ] **Step 1: Validar git status limpo**

```bash
git status
```

Sem arquivos staged. Working tree clean.

- [ ] **Step 2: Verificar tsc**

```bash
npx tsc --noEmit
```

Expected: PASS sem erros.

- [ ] **Step 3: Verificar branch (opcional, se em feature branch)**

```bash
git log --oneline -30
```

Validar que a sequência de commits está coerente.

---

## Self-review do plano

**1. Spec coverage:** percorri cada seção do spec e mapeei tarefas.

| Spec section | Tarefa(s) |
|---|---|
| 2.1 Estrutura de pastas | 0.1 + criação de cada arquivo nas fases 1-12 |
| 2.2 Integração app raiz | 12.4, 12.5 |
| 2.3 Provider isolado | 3.1 (`useAIStore` via factory) |
| 2.4 Autenticação | 7.2 (LoginGate) |
| 3.1 `document.types` | 1.1 |
| 3.2 `synthesis.types` | 1.2 |
| 3.3 `draft.types` | 1.3 |
| 4. Fluxo UX (Tela 1) | 8.1-8.4 |
| 4. Fluxo UX (Tela 2) | 9.1-9.6 |
| 4. Fluxo UX (Tela 3) | 10.1-10.5 |
| 4.1 Header | 12.1 |
| 4.3 Carregar do histórico | 11.2 + 12.1 (rotas) |
| 5.1 `style-guide.ts` | 5.1 |
| 5.2 Synthesis prompt | 5.3 |
| 5.3 Draft prompt + textos literais | 5.4 |
| 5.4 Refine prompt | 5.5 |
| 5.5 Tokens | embutidos em 6.4, 6.5, 6.6 |
| 6.1 Stores | 3.1-3.5 |
| 6.2 Hooks | 6.1-6.8 |
| 7. IndexedDB | 4.2 + 6.7 |
| 8. Versionamento | 13.1 |
| 9. Error handling | embutido (banner sem API key em 8.3; erros nos hooks de análise 6.4-6.6; toast em IndexedDB 4.2; placeholders [ATENÇÃO:] em 10.4) |
| Anexo A | 5.1 (literal) |
| Anexo B (Modelo Relatório/Fundamentação) | embutido em 5.4 |

Sem gaps detectados.

**2. Placeholder scan:** sem TBD/TODO/FIXME no texto. Steps mostram código completo onde código é necessário; onde é cópia, especifico arquivo origem e patches.

**3. Type consistency:**
- `DocumentSlot` consistente entre 1.1, 3.2, 6.2, 6.4, 6.7.
- `ConclusaoTipo` / `VicioTipo` consistentes entre 1.2, 5.2 (Zod), 5.4, 9.3.
- `DraftSectionKey` consistente entre 1.3, 3.4, 6.6, 10.1-10.4.
- `useDocumentStore.canAnalyze()` chamado em 6.4 e 8.3 — assinatura igual (sem args, retorna boolean).
- `setSavedId` definido em 3.3 e usado em 6.4 (set null on reset) e 6.7 (set após primeiro save).
- `appendChatMessage` e `acceptRefineResult` (3.4) usados consistentemente em 6.6.

Nenhum mismatch detectado.

---

**Plano completo.**
