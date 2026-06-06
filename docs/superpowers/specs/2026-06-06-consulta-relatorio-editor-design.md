# Design: consulta rápida a Mini-relatório e Relatório no editor de decisão

**Data:** 2026-06-06
**Versão alvo:** v1.52.31
**Autor:** Rodrigo Nohlack (com Claude)

## Problema

Ao redigir a **decisão** de um tópico no editor individual (`QuillDecisionEditor`),
o juiz perde acesso visual ao **mini-relatório** do tópico e ao **RELATÓRIO
processual** geral — especialmente em tela cheia (fullscreen), onde só a decisão
fica visível. Mesmo no modo normal, o RELATÓRIO geral não é exibido junto.

O usuário quer, logo abaixo da barra de botões (Salvar/Voz/etc.), dois gatilhos
de consulta rápida que abram um painel flutuante com o texto, para leitura sem
sair da edição.

## Decisões confirmadas (brainstorming)

- **Conteúdo dos dois gatilhos:**
  - `Mini-relatório` → resumo de fatos **do tópico atual** (`topicRelatorio`,
    já disponível como prop do editor).
  - `Relatório` → texto do **tópico RELATÓRIO** geral do processo
    (`editedRelatorio || relatorio` do tópico localizado por `isRelatorio`).
- **Interação:** *hover abre, clique fixa*. Passar o mouse abre o card; tirar o
  mouse fecha — exceto se estiver fixado por clique. Fixado fica rolável até
  clicar fora ou no ✕.
- **Onde aparece:** **ambos os modos** — normal e fullscreen. (O usuário pediu
  inicialmente só fullscreen e depois ampliou para os dois.)
- **Prefixo "Consultar:"** antes dos chips: mantido.

## Solução

### Layout

Uma nova linha logo abaixo da barra de botões existente, dentro do
`QuillDecisionEditor`, antes do wrapper do Quill:

```
┌──────────────────────────────────────────────────────────┐
│ [Salvar] [🎤 Voz] [Assistente IA] [Jurisprudência] ...    │  ← toolbar existente
│ Consultar:  [📄 Mini-relatório]  [📄 Relatório]           │  ← NOVA linha (normal + fullscreen)
├──────────────────────────────────────────────────────────┤
│   ┌─ card flutuante (hover / fixado) ─────────┐           │
│   │ Mini-relatório            [✕ quando fixo] │           │
│   │ ─────────────────────────────────         │           │
│   │ texto rolável, serif, claro/escuro        │           │
│   └───────────────────────────────────────────┘           │
│  (editor Quill abaixo)                                     │
└──────────────────────────────────────────────────────────┘
```

- Chips no mesmo estilo dos botões secundários da toolbar
  (`theme-bg-secondary theme-hover-bg border theme-border-input
  theme-text-primary`, `text-xs`), com ícone lucide `FileText`.
- Prefixo `Consultar:` em `text-xs` esmaecido (`CSS.textMuted` ou
  `theme-text-secondary`).

### Comportamento do painel

- **Hover** no chip → abre o card flutuante (posicionado abaixo do chip,
  `absolute`).
- **Mouse leave** (do chip + card) → fecha, **a menos que** fixado.
- **Clique** no chip → alterna o estado *fixado*. Fixado: card permanece aberto
  e rolável (`max-height ~60vh`, `overflow-auto`); fecha ao clicar fora ou no ✕.
- Conteúdo é o HTML do Quill renderizado **read-only**, sanitizado via
  `sanitizeHTML` (já é prop do editor), com a classe `.sentence-serif` para
  leitura jurídica, respeitando tema claro/escuro.
- Chip **desabilitado** (sem hover/clique, opacidade reduzida) quando o texto
  correspondente está vazio.
- Ao editar o **próprio tópico RELATÓRIO**, o chip "Relatório" é **ocultado**
  (seria redundante com o que se edita).

### Componentes (isolados e testáveis)

1. **Novo** `RelatorioConsultaPanel` — `src/components/editors/RelatorioConsultaPanel.tsx`
   - Chip único que gerencia hover / fixado / clique-fora e renderiza o card.
   - Props:
     - `label: string`
     - `html: string` (conteúdo a exibir)
     - `sanitizeHTML?: (html: string) => string`
     - `disabled?: boolean`
   - Responsabilidade única: exibir um texto sob demanda a partir de um gatilho.
     Não conhece tópicos nem stores — recebe texto pronto.

2. **Nova linha** dentro de `QuillDecisionEditor` (`QuillEditors.tsx`)
   - Renderiza o prefixo "Consultar:" + dois `RelatorioConsultaPanel`
     (Mini-relatório e Relatório), em **ambos os modos**.
   - Oculta o chip "Relatório" quando o tópico atual é o RELATÓRIO
     (`topicTitle.toUpperCase() === 'RELATÓRIO'` — mesmo critério já usado no
     componente para `isDispositivo`).

### Dados (threading mínimo)

- **Mini-relatório:** já existe — prop `topicRelatorio` do `QuillDecisionEditor`.
- **Relatório geral:** nova prop opcional `processoRelatorio?: string` em
  `QuillDecisionEditorProps` (`src/types/index.ts`), preenchida no
  `DecisionEditorContainer` a partir de `useTopicsStore`:
  `selectedTopics.find(isRelatorio)` → `editedRelatorio || relatorio || ''`.
  - `isRelatorio` já é usado na base de código (App.tsx); reutilizar o helper
    existente (confirmar caminho de import no plano).

### z-index

- O card flutua acima do editor Quill. Usar `z-[60]` (base do projeto é `z-50`;
  fullscreen é sua própria camada). Validar no modo normal que o card não fica
  atrás de elementos vizinhos; subir o nível se necessário.

## Fora de escopo (YAGNI)

- Edição do texto a partir do painel (é só consulta read-only).
- Sincronização/observador de mudanças ao vivo além do que o re-render já provê.
- Qualquer alteração no `GlobalEditorSection` (editor de todos os tópicos).

## Qualidade

- **Teste** de `RelatorioConsultaPanel` importando o código de produção
  (CLAUDE.md §10): hover abre o card; clique fixa e clique-fora fecha; texto
  vazio desabilita; `sanitizeHTML` é aplicado ao conteúdo.
- `npx tsc --noEmit` sem erros.
- **Temas**: validar em claro e escuro (CLAUDE.md §9).
- **Bump de versão** nos 4 arquivos (CLAUDE.md §8): `CLAUDE.md` (linha 7),
  `src/App.tsx` (APP_VERSION), `src/constants/changelog.js`, `package.json` →
  **v1.52.31**.

## Riscos / mitigações

- **Redundância no modo normal:** o mini-relatório já tem editor visível acima
  no `DecisionEditorContainer`. Decisão do usuário: exibir os chips mesmo assim,
  por consistência entre os modos. Mitigação: nenhum — comportamento desejado.
- **Posicionamento do card no modo normal** (sem camada própria de fullscreen):
  garantir `position: relative` no contêiner do chip e `z-[60]`; testar que não
  é cortado por `overflow` de ancestrais.
- **Texto longo:** `max-height` + `overflow-auto` no card quando fixado.
