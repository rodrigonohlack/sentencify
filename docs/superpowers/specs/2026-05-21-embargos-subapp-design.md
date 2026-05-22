# Subapp Embargos de Declaração — Design

**Data:** 2026-05-21
**Versão de lançamento alvo:** v1.44.0
**Status:** Spec aprovada, aguardando plano de implementação

---

## 1. Visão geral

Novo subapp em `src/apps/embargos/` para auxiliar juízes do trabalho a redigir minutas de decisão de embargos de declaração. O fluxo tem duas etapas obrigatórias:

1. **Síntese estruturada (1ª chamada à IA):** o usuário sobe PDFs (decisão embargada e embargos obrigatórios; contrarrazões, inicial e contestação opcionais) e a IA devolve um JSON com identificação do processo, resumos, e cards por ponto suscitado nos embargos. O usuário revisa, ajusta conclusões e fornece diretrizes (argumentos, Ids, dispositivos, jurisprudência).

2. **Minuta (2ª chamada à IA):** com a síntese consolidada (incluindo edições e diretrizes), a IA redige a minuta em três seções (Relatório, Fundamentação, Dispositivo). Cada seção é editável manualmente e refinável via chat dedicado.

Princípios:
- Imparcialidade (o usuário é juiz, não parte).
- Proibição inegociável de alucinação (não inventar fatos, jurisprudência, dispositivos).
- Estilo de redação fluido, formal mas acessível, sobriedade assertiva (ver Anexo A).
- Persistência local apenas (IndexedDB); sem sincronização com Render.

---

## 2. Arquitetura

### 2.1 Estrutura de pastas

```
src/apps/embargos/
├── EmbargosApp.tsx                  # Root: ToastProvider → LoginGate → EmbargosContent
├── index.ts                         # Barrel export
├── components/
│   ├── ui/                          # Button, Toast, BaseModal locais (cópia mínima)
│   ├── auth/
│   │   └── LoginGate.tsx            # Magic Link Sentencify (espelha Analisador)
│   ├── upload/
│   │   ├── PdfDropArea.tsx
│   │   └── PdfSlot.tsx
│   ├── synthesis/
│   │   ├── SynthesisReview.tsx
│   │   ├── IdentificacaoCard.tsx
│   │   ├── ResumosCard.tsx
│   │   ├── PontoCard.tsx
│   │   └── DiretrizesGeraisTextarea.tsx
│   ├── draft/
│   │   ├── DraftView.tsx
│   │   ├── SectionEditor.tsx
│   │   ├── RefinePanel.tsx          # drawer lateral à direita
│   │   └── DraftActionBar.tsx
│   ├── history/
│   │   ├── HistoricoModal.tsx
│   │   └── HistoricoItem.tsx
│   └── settings/
│       ├── SettingsModal.tsx
│       ├── AIProviderSelector.tsx
│       ├── ModelSelector.tsx
│       └── APIKeyInput.tsx
├── hooks/
│   ├── index.ts
│   ├── useAIIntegration.ts
│   ├── usePdfUpload.ts
│   ├── useSynthesisAnalysis.ts
│   ├── useDraftGeneration.ts
│   ├── useSectionRefine.ts
│   ├── useAutoSave.ts
│   └── useLocalHistory.ts
├── stores/
│   ├── index.ts
│   ├── useAIStore.ts                # createAIStore com persistName 'embargos-ai-store'
│   ├── useDocumentStore.ts
│   ├── useSynthesisStore.ts
│   └── useDraftStore.ts
├── prompts/
│   ├── index.ts
│   ├── style-guide.ts               # constante única reusada por draft e refine
│   ├── synthesis.ts
│   ├── draft.ts
│   └── refine.ts
├── services/
│   └── localHistoryService.ts       # IndexedDB nativo (sem libs)
├── types/
│   ├── index.ts
│   ├── document.types.ts
│   ├── synthesis.types.ts
│   └── draft.types.ts
└── utils/
    ├── pdf-to-base64.ts
    └── format-date.ts
```

### 2.2 Integração com app raiz

- `src/App.tsx`: roteamento por path adiciona `if (path.startsWith('/embargos')) return <EmbargosApp />;` no mesmo bloco que monta `<AnalisadorApp />`.
- `src/components/shared/AppSwitcher.tsx`: adiciona `'embargos'` ao type union `AppId` e nova entrada em `APPS` com ícone `Gavel` (lucide-react) e paleta âmbar.
- `EmbargosApp.tsx` renderiza `AppSwitcher` com `currentApp="embargos"`.

### 2.3 Provider e modelo de IA

- `src/apps/embargos/stores/useAIStore.ts` instancia a factory compartilhada `src/stores/shared/createAIStore` com:
  - `persistName: 'embargos-ai-store'`
  - `apiKeyStorageKey: 'embargos-api-keys'`
- Provider/modelo/API key isolados do Sentencify principal e do Analisador. Configurados via `SettingsModal` interno do subapp.
- Padrão de provider: Anthropic; modelo: `claude-sonnet-4-20250514` (mesmo do app raiz).

### 2.4 Autenticação

- `LoginGate.tsx` espelha o do Analisador, consumindo o hook compartilhado `useAuthMagicLink` de `src/hooks/`.
- Sessão é compartilhada entre subapps. Usuário já autenticado em qualquer subapp não precisa relogar.
- Botão "Sair" no header do `EmbargosApp` (consistente com o Analisador).

---

## 3. Modelo de dados

### 3.1 `document.types.ts`

```typescript
export type DocumentSlot =
  | 'decisaoEmbargada'
  | 'embargos'
  | 'contrarrazoes'
  | 'inicial'
  | 'contestacao';

export interface DocumentFile {
  id: string;                       // uuid
  slot: DocumentSlot;
  name: string;
  size: number;
  text: string;                     // extraído via pdfjs-dist
  base64: string | null;            // null se provider não suporta binário
  useBinary: boolean;
  status: 'pending' | 'parsing' | 'ready' | 'error';
  errorMessage?: string;
}
```

Slots obrigatórios: `decisaoEmbargada`, `embargos`. Demais opcionais.

### 3.2 `synthesis.types.ts`

```typescript
export type VicioTipo = 'omissao' | 'contradicao' | 'obscuridade' | 'erroMaterial';
export type ConclusaoTipo = 'acolher' | 'acolherParcial' | 'rejeitar' | 'sanarOficio';

export interface PontoSuscitado {
  id: string;                       // uuid local, estável para edição
  ordem: number;
  trechoEmbargos: string;
  vicioAlegadoPelaParte: VicioTipo[];
  vicioReconhecidoPelaIA: VicioTipo[];
  divergenciaVicio: string | null;
  oQueSentencaDisse: string;
  questaoSuscitadaNoProcesso: boolean | null;  // null se inicial/contestação não foram fornecidas
  conclusaoPreliminar: ConclusaoTipo;
  justificativaPreliminar: string;             // 1-3 frases, não a redação final
  efeitosInfringentes: boolean;
  outrosPedidos: string[];
  // Preenchidos pelo usuário na Tela 2:
  conclusaoUsuario?: ConclusaoTipo;
  diretrizesUsuario?: string;
}

export interface SynthesisResult {
  identificacao: {
    numeroProcesso: string | null;
    parteEmbargante: string;
    parteEmbargada: string;
    polo: 'reclamante' | 'reclamada' | 'ambas';
    tempestividade: { tempestivo: boolean | null; observacao: string | null };
  };
  resumoSentenca: string;
  resumoEmbargos: string;
  resumoContrarrazoes: string | null;
  intimacaoContrariaStatus: 'dispensada' | 'manifestouSe' | 'silente' | null;
  pontos: PontoSuscitado[];
  diretrizesGeraisUsuario?: string;
}
```

### 3.3 `draft.types.ts`

```typescript
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface DraftSection {
  text: string;
  chatHistory: ChatMessage[];
  isRefining: boolean;
}

export interface Draft {
  relatorio: DraftSection;
  fundamentacao: DraftSection;
  dispositivo: DraftSection;
}

export interface SavedEmbargos {
  id: string;
  createdAt: number;
  updatedAt: number;
  titulo: string;                   // numeroProcesso ?? "Embargos sem número — DD/MM/YYYY"
  documents: { slot: DocumentSlot; name: string; size: number }[]; // metadata apenas
  synthesis: SynthesisResult;
  draft: Draft | null;
}
```

---

## 4. Fluxo de UX

```
[Tela 1: Upload]
    │  5 slots em grid: Decisão Embargada* | Embargos* | Contrarrazões | Inicial | Contestação
    │  AnalyzeButton (habilitado quando os 2 obrigatórios estão "ready" e provider está configurado)
    ▼
[1ª chamada IA: análise + síntese]
    │  Progress textual: "Preparando documentos → Enviando → Analisando → Estruturando"
    ▼
[Tela 2: Revisão da Síntese]
    │  ┌─ Cabeçalho: identificação, polo, tempestividade (editáveis)
    │  ├─ Resumos editáveis (sentença, embargos, contrarrazões)
    │  ├─ Lista de PontoCard (cards empilhados expansíveis com chevron):
    │  │     - trecho dos embargos + vício alegado pela parte
    │  │     - o que a sentença disse + vício reconhecido pela IA
    │  │     - badge "Divergência" quando IA reconhece vício diferente do alegado
    │  │     - toggle "questão suscitada no processo?" (quando aplicável)
    │  │     - select de conclusão (acolher / acolher parcial / rejeitar / sanar de ofício)
    │  │     - justificativa preliminar (editável)
    │  │     - textarea "diretrizes deste ponto"
    │  └─ DiretrizesGeraisTextarea (opcional)
    │  ActionBar: Voltar | Refazer Análise | Gerar Minuta
    ▼
[2ª chamada IA: minuta]
    │  Progress similar
    ▼
[Tela 3: Minuta]
    │  Chips readonly com nomes dos PDFs no topo
    │  3 cards empilhados: Relatório | Fundamentação | Dispositivo
    │  Cada SectionEditor:
    │     - EditableTextArea com auto-resize
    │     - Botão "Refinar" abre RefinePanel (drawer lateral direito)
    │     - Drawer mantém visível o texto da seção sendo refinada
    │     - Chat: histórico + input → IA reescreve só essa seção
    │     - Botões "Aceitar" (substitui texto) / "Descartar" (mantém)
    │  DraftActionBar:
    │     - Voltar para Síntese (preserva edições)
    │     - Copiar Minuta Completa (concatena 3 seções como texto puro)
    │     - Novo (confirma descarte e reseta stores)
```

### 4.1 Header (sempre presente)

`AppSwitcher | Histórico (badge com contagem) | Tema claro/escuro | Settings | Sair`

### 4.2 Estado entre telas

- "Voltar" entre telas não apaga estado anterior. Usuário pode ir e voltar livremente.
- Stores (`useDocumentStore`, `useSynthesisStore`, `useDraftStore`) ficam em memória.
- Auto-save no IndexedDB cobre persistência (Seção 7).

### 4.3 Carregar do histórico

Clicar em item do `HistoricoModal` hidrata `useSynthesisStore` e `useDraftStore` e abre direto na última tela editada (Tela 3 se há draft, senão Tela 2). PDFs originais não são restaurados; metadata aparece como chip readonly no topo.

---

## 5. Prompts

### 5.1 `style-guide.ts`

Constante única exportada contendo literalmente o bloco "Estilo de Comunicação" + "EXIGÊNCIAS DE QUALIDADE TEXTUAL" (Anexo A deste spec). Reusada por `draft.ts` e `refine.ts`. Não injetada em `synthesis.ts` (essa etapa é estruturação, não redação).

### 5.2 `synthesis.ts` — 1ª chamada

**System prompt:**

> Você é um exímio juiz do trabalho brasileiro, especializado em analisar embargos de declaração contra sentenças trabalhistas. Sua tarefa nesta etapa é apenas estruturar uma síntese analítica em JSON — não redigir a decisão. Aplique rigorosamente os arts. 897-A da CLT e 1.022 do CPC: omissão, contradição, obscuridade e erro material são os únicos vícios embargáveis. Diferencie vícios genuínos de mero pedido de rejulgamento.
>
> Proibições inegociáveis: não invente fatos, não cite jurisprudência fictícia, não cite dispositivos inexistentes, não presuma informações ausentes. Se faltarem elementos, marque o campo correspondente como null e adicione observação. Mantenha imparcialidade — você é um juiz, não advogado da parte.

**User prompt builder:**

- Anexa textos/binários dos slots fornecidos (omitindo os vazios).
- Pede JSON estrito no shape de `SynthesisResult`.
- Para cada ponto: identificar vício alegado, vício reconhecido (pode divergir), o que a sentença disse, se a questão foi suscitada no processo (consultando inicial/contestação quando disponíveis), `conclusaoPreliminar` e `justificativaPreliminar` (1-3 frases).
- Schema Zod em `src/schemas/ai-responses/` (novo: `SynthesisResponseSchema`) valida a resposta; até 2 retries em caso de falha de parse.

### 5.3 `draft.ts` — 2ª chamada

**System prompt:**

> Você é um exímio juiz do trabalho brasileiro, redigindo a minuta de decisão de embargos de declaração. Estrutura obrigatória em três seções: Relatório, Fundamentação, Dispositivo. Devolva como JSON `{ relatorio, fundamentacao, dispositivo }`, sem cabeçalhos dentro do texto de cada campo.
>
> [STYLE_GUIDE literal aqui]
>
> Proibições inegociáveis: não invente fatos, jurisprudência, dispositivos legais; não presuma informações ausentes; mantenha estrita fidelidade ao que o usuário forneceu. Se faltar elemento essencial, registre no campo correspondente uma marca `[ATENÇÃO: ...]` para o juiz revisor — não fabule.

**User prompt builder entrega à IA:**

1. `SynthesisResult` consolidado (com edições do usuário: `conclusaoUsuario` substitui `conclusaoPreliminar` quando preenchido).
2. `diretrizesGeraisUsuario`.
3. Diretrizes por ponto (`PontoSuscitado.diretrizesUsuario`).
4. Documentos como contexto (texto/binário, igual à 1ª chamada).
5. **Modelo de Relatório literal** (parametrizado), incluindo o parágrafo de intimação da parte contrária na variante correspondente (dispensada / manifestouSe / silente).
6. **Modelo de Fundamentação:**
   - 1º parágrafo literal: "Conheço dos embargos de declaração opostos pela parte [reclamante/reclamada]..."
   - 2º parágrafo literal: "Nos termos do art. 897-A da CLT, com remissão ao art. 1.022 do CPC..."
   - 3º+ parágrafos: introdutórios literais dos vícios em análise (omissão / contradição / obscuridade / erro material), selecionados conforme `vicioAlegadoPelaParte ∪ vicioReconhecidoPelaIA` agregados de todos os pontos.
   - Em seguida, análise ponto a ponto na ordem de `PontoSuscitado.ordem`.
   - Quando decisão final for rejeição e for pertinente, parágrafo literal "A [PARTE EMBARGANTE], ao alegar omissão/contradição/obscuridade/erro material, na verdade expressa mero inconformismo..."
7. **Modelo de Dispositivo:** instrução para concluir acolhendo/rejeitando/sanando os vícios apontados, mencionando efeitos infringentes e outros pedidos quando houver.
8. Instrução explícita: "Cite obrigatoriamente todos os Ids de documentos, dispositivos normativos e argumentos fornecidos nas diretrizes do usuário. Você pode incrementar e enriquecer os argumentos, desde que jamais invente fatos ou fundamentos."

### 5.4 `refine.ts` — refino por seção

**System prompt:** versão curta de `draft.ts` (mesmas proibições + STYLE_GUIDE).

**User prompt builder:**
- Contexto: `SynthesisResult` consolidado + diretrizes + conteúdo das três seções atuais (para coerência).
- Instrução: "Você está refinando apenas a seção `[Relatório/Fundamentação/Dispositivo]`. Mantenha as outras duas inalteradas. Aplique a instrução do usuário a seguir e devolva apenas o texto da seção refinada, sem cabeçalho."
- Histórico do chat dessa seção.
- Última instrução do usuário.

### 5.5 Tokens

- 1ª chamada (síntese): `maxTokens: 32000`.
- 2ª chamada (minuta): `maxTokens: 32000`.
- Refino: `maxTokens: 16000`.

Uso de `callAIStream` da infra existente (igual Analisador). Streaming visual; processamento de JSON ocorre só ao fim.

---

## 6. Stores e hooks

### 6.1 Stores (Zustand)

**`useDocumentStore`:**
- Estado: `decisaoEmbargada`, `embargos`, `contrarrazoes`, `inicial`, `contestacao` (todos `DocumentFile | null`).
- Ações: `setSlot`, `updateSlotStatus`, `reset`.
- Selectors: `canAnalyze()` (verifica obrigatórios em status `ready`), `getAllText()`.

**`useSynthesisStore`:**
- Estado: `synthesis: SynthesisResult | null`, `isAnalyzing`, `progress`, `error`, `savedId`.
- Ações: `setSynthesis`, `updatePonto(id, patch)`, `updateResumo(key, text)`, `updateIdentificacao(patch)`, `setDiretrizesGerais`, `setProgress`, `setError`, `setSavedId`, `reset`.

**`useDraftStore`:**
- Estado: `draft: Draft | null`, `isGenerating`, `refiningSection`, `progress`, `error`.
- Ações: `setDraft`, `updateSection(key, text)`, `appendChatMessage(key, msg)`, `acceptRefineResult(key, newText)`, `setRefining(section | null)`, `setProgress`, `reset`.

Stores não persistem automaticamente. Persistência via `useLocalHistory` (Seção 7).

### 6.2 Hooks

- **`usePdfUpload(slot)`:** recebe `File`, extrai texto com `pdfjs-dist`, gera base64 condicional, atualiza `useDocumentStore`.
- **`useAIIntegration`:** wrapper sobre `buildApiRequest` do app raiz + `useAIStore` local. Expõe `callAIStream(messages, opts)`. Trata SSE/streaming uniformemente entre providers.
- **`useSynthesisAnalysis`:** orquestra a 1ª chamada. Valida `canAnalyze()`, monta payload, chama IA, parseia via Zod (2 retries), hidrata `useSynthesisStore`. Retorna `{ analyze, isAnalyzing, error }`.
- **`useDraftGeneration`:** orquestra a 2ª chamada. Pega `useSynthesisStore.synthesis` com edições, monta prompt, parseia `{ relatorio, fundamentacao, dispositivo }`, hidrata `useDraftStore`, dispara auto-save.
- **`useSectionRefine(section)`:** gerencia chat de refino. `sendMessage(text)` adiciona msg do usuário, chama IA, adiciona resposta. `acceptLastSuggestion()` substitui texto da seção. `discardLastSuggestion()` apenas marca como descartada.
- **`useAutoSave`:** observa mudanças nos stores (síntese e draft) e dispara `saveMinuta` com debounce 1s. Save imediato (sem debounce) ao aceitar refino.
- **`useLocalHistory`:** CRUD wrapper de `localHistoryService`. Expõe `list`, `save`, `remove`, `load(id)`.

---

## 7. Persistência (IndexedDB)

### 7.1 Schema

```typescript
const DB_NAME = 'sentencify-embargos';   // segue convenção 'sentencify-*'
const STORE_NAME = 'minutas';
const VERSION = 1;
// objectStore com keyPath: 'id'
// índice: 'updatedAt' (ordenação da lista)
// índice: 'titulo' (busca futura)
```

Record: `SavedEmbargos` (ver seção 3.3). Sem PDFs originais; só metadata `{ slot, name, size }`.

### 7.2 Auto-save lifecycle

1. **Pós-1ª chamada:** cria record novo via `put` com `id` recém-gerado; armazena `savedId` em `useSynthesisStore`.
2. **Pós-2ª chamada:** `put` atualiza o mesmo record adicionando `draft` e bumpando `updatedAt`.
3. **Edições subsequentes:** `useAutoSave` ouve mudanças nos stores; debounce 1s.
4. **Refino aceito:** save imediato (sem debounce).

### 7.3 Operações expostas

```typescript
listMinutas(): Promise<SavedEmbargos[]>          // ordenado por updatedAt desc
getMinuta(id: string): Promise<SavedEmbargos | null>
saveMinuta(record: SavedEmbargos): Promise<void>  // upsert
deleteMinuta(id: string): Promise<void>
```

### 7.4 Falhas

- Falha de `indexedDB.open` (modo privado / storage cheio): toast "Histórico indisponível neste dispositivo. Minutas atuais funcionam mas não serão salvas." Operação em memória continua normalmente.
- Falha de `put` individual: toast com botão retry. Não bloqueia o fluxo de geração.

---

## 8. Versionamento

Lançamento como **v1.44.0** (minor bump por feature nova). Cinco arquivos atualizados conforme CLAUDE.md regra 8:

1. `CLAUDE.md` linha 7 → `**Version**: 1.44.0`
2. `src/App.tsx` constante `APP_VERSION` (~linha 209) → `1.44.0`
3. `src/constants/changelog.js` → entrada nova
4. `src/constants/app-version.ts` → `1.44.0`
5. `package.json` → `"version": "1.44.0"`

Entry no changelog:

> **v1.44.0** — Novo subapp **Embargos de Declaração**: análise estruturada em duas etapas (síntese revisável → minuta em Relatório/Fundamentação/Dispositivo com refino por chat). Histórico local (IndexedDB). Magic Link Sentencify compartilhado.

---

## 9. Error handling e edge cases

### 9.1 Erros de IA

| Caso | Tratamento |
|---|---|
| Provider/key não configurado | Tela 1 mostra banner "Configure provider e API key em Configurações antes de analisar". AnalyzeButton disabled. |
| Falha de rede (1ª chamada) | Erro inline na Tela 1, botão "Tentar novamente" mantendo PDFs. |
| JSON inválido na síntese | Até 2 retries automáticos. Se persistir, erro inline com mensagem "A IA não devolveu resposta estruturada. Tente novamente ou troque de modelo." |
| Minuta sem alguma das 3 chaves | Seção faltante recebe placeholder `[ATENÇÃO: seção não gerada — refazer]` e toast é exibido. Outras seções ficam disponíveis. |
| Falha no refino | Mensagem de erro inline no chat dessa seção. Texto da seção permanece inalterado. |

### 9.2 Edge cases de documentos

| Caso | Tratamento |
|---|---|
| PDF inválido/corrompido | `pdfjs` falha → slot status `error` + mensagem. Usuário troca arquivo. |
| PDF > 50MB | Aviso visual antes de processar; segue processamento. Provider sem suporte a binário usa só texto. |
| Apenas obrigatórios fornecidos (sem inicial/contestação) | Análise prossegue. Prompt instrui IA a marcar `questaoSuscitadaNoProcesso: null` por ausência de inicial/contestação. |
| Troca de PDF depois da síntese | Síntese existente fica obsoleta. Botão "Refazer Análise" reaparece. Troca não dispara reanálise automática (evita perder edições). |

### 9.3 Edge cases dos pontos

| Caso | Tratamento |
|---|---|
| IA retorna 0 pontos | Síntese válida; UI mostra estado vazio com botão "Adicionar ponto manual" que cria card vazio editável. |
| IA reconhece vício diferente do alegado | `divergenciaVicio` é preenchido pela IA; badge "Divergência" no card. Prompt de minuta cita ambos parágrafos introdutórios. |
| `conclusaoUsuario` diverge de `conclusaoPreliminar` | 2ª chamada usa decisão do usuário. `diretrizesUsuario` substitui/complementa a justificativa. |

### 9.4 Edge cases de histórico

| Caso | Tratamento |
|---|---|
| Edição após abrir item antigo | Auto-save com debounce captura. |
| "Novo" com edições não salvas | Confirmação "Descartar alterações?" antes de resetar. |
| IndexedDB indisponível | Operação em memória; toast informa. Histórico desabilitado. |
| Mesmo item aberto em duas abas | Sem sync entre abas na v1 (last-write-wins). Adição futura com `BroadcastChannel`. |

### 9.5 Imparcialidade

System prompts de síntese e minuta reforçam "você é juiz, não advogado da parte". Linguagem na UI usa termos neutros ("acolher/rejeitar" sem qualificadores valorativos).

---

## 10. Decisões fora de escopo desta v1

- Export DOCX/PDF/Markdown (apenas copy para clipboard na v1).
- Sincronização entre abas (sem `BroadcastChannel`).
- Sincronização com Render (apenas IndexedDB local).
- Suite de testes específica (segue padrão dos outros subapps, sem testes obrigatórios). Validação via `npx tsc --noEmit`.
- Importação de análise já existente do Analisador (não há integração cruzada na v1).
- Compartilhamento ou colaboração multi-usuário.

---

## Anexo A — Guia de estilo de redação (literal)

Este texto deve ser exportado verbatim em `prompts/style-guide.ts` e injetado nos prompts de `draft.ts` e `refine.ts`.

### Estilo de Comunicação

Use linguagem formal, mas acessível. Evite latinismos desnecessários e termos extremamente técnicos. Priorize clareza e objetividade. Mantenha tom sereno e imparcial. Sempre use primeira pessoa. Evite adjetivações.

### Exigências de Qualidade Textual

A redação de todos os textos gerados deve ser de excelente qualidade, seguindo rigorosamente:

**1. Fluidez e coesão:** use conectores de progressão textual entre parágrafos (ademais, além disso, nesse contexto, por outro lado, dessa forma, assim, portanto, nesse sentido, cumpre ressaltar, vale destacar, outrossim, de igual modo, com efeito, etc.). Garanta encadeamento lógico entre as ideias. Evite parágrafos soltos ou desconectados. Transições suaves e naturais entre argumentos.

**2. Ritmo e continuidade:** texto não truncado ou entrecortado. Parágrafos bem desenvolvidos (evite parágrafos de apenas uma ou duas linhas). Redação fluida e agradável de ler. Progressão natural do raciocínio.

**3. Coerência:** sequência lógica de argumentação. Progressão natural do raciocínio jurídico. Conclusões que decorrem naturalmente das premissas. Unidade temática em cada parágrafo.

**4. Formato narrativo contínuo:** evite enumerações excessivas (1., 2., 3... / a), b), c)... / I, II, III...). Evite títulos ou subtítulos internos desnecessários. Prefira redação em prosa corrida, como um texto dissertativo-argumentativo. Parágrafos sequenciais bem articulados. Use enumerações apenas quando estritamente necessário para listar pedidos, requisitos legais ou situações objetivas.

**5. Didática e clareza:** linguagem acessível, mas técnica quando necessário. Explicações claras dos institutos jurídicos. Leitura agradável e envolvente. Tom professoral, mas não pedante.

**6. Naturalidade e autenticidade textual:** evite advérbios intensificadores genéricos como "consideravelmente", "significativamente", "notavelmente", "substancialmente", "expressivamente", "indubitavelmente". Prefira construções diretas ou expressões do vocabulário forense como "de forma inequívoca", "com suficiente clareza", "de modo satisfatório". Prefira locuções forenses autênticas a construções explicativas:
- "enfraquece consideravelmente a alegação" → "milita em desfavor da tese"
- "isso demonstra claramente que" → "daí se extrai que" ou "tem-se que"
- "é importante destacar que" → "registro que" ou "anoto que"
- "deve-se considerar que" → "não se pode ignorar que" ou "cumpre observar que"

Use orações intercaladas (entre vírgulas ou parênteses) para criar ritmo. Seja assertivo sem ser enfático demais. Evite padrões repetitivos de estrutura frasal.

**7. Variação e naturalidade estilística:** alterne entre frases longas e curtas. Nem todo parágrafo precisa começar com conector. Permita pequenas marcas de oralidade forense ("Pois bem", "Ocorre que", "Veja-se", "É o caso dos autos"). Use eventual primeira pessoa para marcar posicionamento ("Entendo que", "Não me convence", "Tenho por demonstrado"). Evite simetria excessiva entre parágrafos. A naturalidade não dispensa conectores — apenas evita uso mecânico.

**8. Pontuação e naturalidade:** evite travessões (—) para intercalar orações; prefira vírgulas ou parênteses. Evite dois pontos (:), salvo antes de citações legais diretas ou enumerações indispensáveis.

**9. Estrutura paragrafal e variação sintática:** varie a extensão dos parágrafos conforme a complexidade do argumento. Parágrafos argumentativos centrais: 3-5 períodos. Parágrafos de transição ou conclusão pontual: 2 períodos. Raciocínios complexos: até 6 períodos. Evite sequências de mais de dois parágrafos com extensão semelhante. Varie a posição das orações subordinadas: anteponha quando veicular concessão/contexto/premissa, posponha quando funcionar como justificativa/desdobramento.

**10. Sobriedade assertiva (evitar "voz de narrador"):** evite construções em que o texto anuncia ao leitor o valor ou peso de algo antes de demonstrá-lo:
- "A cronologia dos fatos é reveladora" → "Cumpre reconstituir a cronologia dos fatos"
- "O depoimento do preposto é eloquente" → "Do depoimento do preposto se extrai que"
- "A contradição é flagrante" → "Ocorre que tais versões não se compatibilizam"
- "O conjunto probatório é robusto" → "A prova produzida permite concluir que"

Sempre que uma frase terminar com adjetivo valorativo isolado ("é revelador", "é eloquente", "é cristalino", "é inconteste", "é paradigmático"), reformule-a como abertura de análise ou como afirmação funcional.

**11. Precisão referencial:** ao redigir períodos com apostos, orações reduzidas de particípio ou locuções explicativas, assegure que o termo modificado seja inequivocamente identificável. Se um particípio ou aposto puder, pela proximidade sintática, referir-se a mais de um substantivo, reformule a construção. Cautela especial com datas, prazos, marcos temporais e valores.

### Proibições inegociáveis

- Não alucine.
- Não invente fatos.
- Não crie provas inexistentes.
- Não cite jurisprudência fictícia.
- Não cite dispositivos normativos fictícios, inexistentes ou não relacionados ao caso ou ao fundamento jurídico invocado.
- Não presuma informações ausentes.
- Indique expressamente quando houver insuficiência de elementos, possibilitando que o usuário supra com novas informações/diretrizes.
- Mantenha estrita fidelidade às informações fornecidas.

---

## Anexo B — Textos literais a embutir no prompt de minuta

**Modelo de Relatório** (parametrizado; trechos entre colchetes substituídos):

> [PARTE EMBARGANTE] opôs embargos de declaração (art. 897-A da CLT c/c art. 1.022 do CPC), alegando, em síntese, a existência de [omissão/contradição/obscuridade/erro material] na sentença embargada devido [a/ao ALEGAÇÕES DA PARTE EMBARGANTE].
>
> [variante conforme `intimacaoContrariaStatus`]
> - **dispensada:** "Nos termos do art. 897-A, § 2º, da CLT, dispensou-se a intimação da parte contrária, pois ausente eventual efeito modificativo na decisão."
> - **manifestouSe:** "Intimada, a parte embargada manifestou-se sob o Id [XXX]."
> - **silente:** "Intimada, a parte embargada manteve-se silente."
>
> É o relatório. Decido.

**Parágrafos obrigatórios da Fundamentação:**

1º (literal): "Conheço dos embargos de declaração opostos pela parte [reclamante/reclamada], pois tempestivos e subscritos por advogado(a) habilitado(a), motivo por que passo à apreciação do mérito recursal."

2º (literal): "Nos termos do art. 897-A da CLT, com remissão ao art. 1.022 do CPC, os embargos de declaração são cabíveis quando houver na decisão judicial omissão, obscuridade, contradição interna ou erro material."

3º+ (introdutórios dos vícios em análise; selecionados conforme `vicioAlegadoPelaParte ∪ vicioReconhecidoPelaIA` agregados de todos os pontos):

- **Omissão:** "A omissão passível de correção por embargos de declaração é aquela que recai sobre ponto relevante e essencial à solução da controvérsia, ou seja, matéria que efetivamente influencie o convencimento judicial e repercuta no dispositivo da sentença. Não se trata, portanto, de qualquer ausência de manifestação, mas da omissão qualificada, juridicamente relevante."

- **Obscuridade:** "A obscuridade caracteriza-se pela falta de clareza ou precisão na redação da decisão judicial, capaz de comprometer a compreensão de seu conteúdo e dificultar a identificação das razões de decidir. Nessa hipótese, não se trata de divergência interpretativa ou mero inconformismo da parte, mas de passagens cujo teor se mostra ambíguo, confuso ou de difícil assimilação, inviabilizando a exata compreensão da fundamentação ou do dispositivo."

- **Contradição:** "A contradição não se confunde com mera discordância da parte quanto ao resultado do julgamento ou à valoração da prova. Trata-se de vício interno da decisão judicial, caracterizado por incompatibilidade lógica entre diferentes trechos do julgado, ou entre a fundamentação e o dispositivo. Em outras palavras, há contradição embargável quando o juiz afirma uma coisa ao fundamentar e decide o oposto ao concluir, ou ainda quando duas passagens da decisão são mutuamente excludentes ou logicamente inconciliáveis. Não configura contradição, portanto, o simples fato de a parte entender que as provas foram mal apreciadas ou que determinada conclusão foi equivocada — nesses casos, o meio adequado de impugnação é o recurso ordinário, e não os embargos de declaração."

- **Erro material:** "O erro material é um equívoco evidente, objetivo e formal presente na decisão judicial, que não decorre de uma análise jurídica equivocada, mas, sim, de uma falha de escrita, cálculo, digitação ou identificação. Trata-se, portanto, de um deslize objetivo, que não exige juízo valorativo ou reexame do mérito da causa para ser corrigido. Sua retificação pode ser feita de ofício pelo juiz ou a requerimento da parte, inclusive por meio de embargos de declaração (CPC, art. 494, I, e art. 1.022, parágrafo único, II)."

**Parágrafo de rejeição (literal, condicional):** quando a decisão for pela rejeição e for pertinente:

> A [PARTE EMBARGANTE], ao alegar [omissão/contradição/obscuridade/erro material], na verdade expressa mero inconformismo com a valoração das provas e com o resultado do julgamento, pretendendo rediscutir o mérito da causa, o que escapa do escopo legal dos embargos de declaração, não havendo, na presente hipótese, nenhum vício a ser sanado por essa estreita via recursal.
