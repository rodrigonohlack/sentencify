# Refinamento Visual do Main App — Paleta, Tipografia e Ícones

**Data:** 2026-05-30
**Versão base:** 1.50.17
**Escopo:** Main app (`src/`, exceto `src/apps/*` e `AdminPanel`)

## Objetivo

Elevar a percepção de profissionalismo da UI do main app do SentencifyAI
(ferramenta para juízes do trabalho do TRT8) sem reconstruir a arquitetura de
estilo existente. O app já tem boa infraestrutura (CSS variables tematizadas em
`ThemeStyles.tsx`, classes centralizadas em `styles.ts`, `BaseModal`
padronizado, `lucide-react`). O problema é **inconsistência de uso** e uma
camada de acento que destoa do contexto institucional (roxo→rosa "de app de IA
genérico").

Três frentes, escolhidas por melhor relação impacto/risco:

1. **Paleta sóbria** — desaturar gradientes e cores decorativas para azul.
2. **Hierarquia tipográfica** — criar distinção real entre títulos e corpo.
3. **Emoji → ícone** — substituir emojis de UI por ícones `lucide-react`.

## Decisões de design (travadas com o usuário)

| Eixo | Decisão | Justificativa |
|---|---|---|
| Cor de marca | Azul institucional `blue-600` / `#2563eb` | Já é a cor dominante (menos arquivos mudam); verde/vermelho/amber já têm significado semântico (PROCEDENTE/IMPROCEDENTE/aviso) e não podem ser a marca; azul = confiança institucional. |
| Gradientes | Monocromático sutil (mesma família azul), nunca tri-cor | Mantém leve profundidade sem o efeito "arco-íris" que data o app. |
| Tipografia | Híbrida | Sobe só os títulos de seção/modal um degrau; corpo permanece denso (a densidade `text-xs`/`text-sm` é intencional — juiz quer muita informação por tela). Hierarquia extra via peso + cor + tracking. |
| Emoji | → ícone lucide, apenas UI-facing | Emoji renderiza diferente por SO/browser e parece informal; `lucide-react` já está em uso (168+ imports). |
| Escopo | Só main app | `src/apps/*` (subapps) e `AdminPanel` ficam para rodada futura. |
| Roxo categórico | Preservar | Onde o roxo distingue uma categoria (não é marca), mantê-lo evita azul-sobre-azul e perda de leitura. |
| Entrega | Commit por fase, cada um com bump de patch; ConfigModal (Fase 3) é sub-commit próprio | Rollback granular; ConfigModal isolado por ser grande/sensível (~35 emojis). |
| Verificação | `npx tsc --noEmit` + screenshots Playwright antes/depois nos 2 temas | |

## Princípio de execução: centralizado primeiro

Atacar as alavancas (1 edição → N telas) antes dos pontos inline, para
minimizar superfície de erro:

- `src/constants/styles.ts:41` `btnPrimary` → recolore todos os botões primários.
- `src/components/modals/BaseModal.tsx:105` title → eleva o título de ~18 modais.
- `src/styles/ThemeStyles.tsx:43` `--modal-glow` + `src/index.css` spinner → glow e loader.
- `src/styles/GlobalHoverStyles.tsx` defs `hover-gradient-purple-*` → recolore botões que usam a classe sem tocar nos componentes (o *nome* da classe permanece "purple" — dívida cosmética aceita).
- 3 novas constantes em `styles.ts` (`sectionTitle`, `cardHeading`) para os headings.

## Fase 1 — Paleta (#1)

Resultado esperado: nenhum roxo/rosa/indigo **decorativo** no main app; logo e
botões em azul; glow/spinner azuis.

**1a. Tokens centrais**
- `styles.ts:41` `btnPrimary`: `from-purple-600 to-blue-600 ... shadow-purple-500/25` → azul mono (`from-blue-600 to-blue-700 ... shadow-blue-500/25`).
- `styles.ts:23,24,25` focus-rings: `focus:ring-purple-500` → `focus:ring-blue-500`.
- `ChatInput.tsx:53` `focus:border-purple-500 focus:ring-purple-500` → azul.
- `ThemeStyles.tsx:43` `--modal-glow`: remover componente violet (`rgba(139,92,246...)`), deixar glow azul sutil.
- `index.css:39,51,56,88,92-94` spinner: violet (`139,92,246` / `#8b5cf6`) → azul.
- `GlobalHoverStyles.tsx` defs `hover-gradient-purple-blue`, `hover-gradient-purple-pink`, `hover-purple-700`, `hover-pink-700` e variantes `-darker`: redefinir gradiente/cor para azul mono.

**1b. Logo**
- `AppHeader.tsx:72` e `App.tsx:2833`: `from-blue-400 via-purple-500 to-pink-500` → gradiente mono azul (`from-blue-500 to-blue-700`) ou texto sólido `theme-text-primary`. Decidir no plano qual fica melhor nos 2 temas (preferência inicial: gradiente mono sutil).

**1c. Botões/painéis inline restantes (~10)**
- `AdvancedModals.tsx:798,1159`; `ModelExtractionModals.tsx:105`; `StreamingModal.tsx:148`; `MiscModals.tsx:76`; `ChatInput.tsx:70`; `DecisionEditorContainer.tsx:331`; `UploadTab.tsx:697`; `AIAssistantComponents.tsx:199,203,271`; `BaseModal.tsx:85` (ícone `purple: from-purple-500 to-blue-500` → azul mono).

**1d. NÃO tocar (roxo categórico)**
- `FactsComparisonModal.tsx` ("Fatos Novos"), `SuggestionCard.tsx`, `ProofCard.tsx` badges, `--accent-purple`/`--accent-purple-bg`, `.theme-bg-purple-accent`, `.theme-text-purple`, `.theme-badge-purple`.

## Fase 2 — Tipografia (#4)

Resultado esperado: títulos de seção/modal um degrau acima do corpo; labels
padronizadas; corpo denso preservado.

**2a. Centralizado**
- `BaseModal.tsx:105` title: adicionar `text-base` (hoje herda ~16px sem classe) → `text-base font-semibold theme-text-primary`. Propaga p/ ~18 modais.
- `styles.ts`: criar constantes
  - `sectionTitle: "text-lg font-semibold theme-text-primary"`
  - `cardHeading: "text-base font-semibold theme-text-primary"`
  - (manter `label` existente: `block text-sm font-medium theme-text-tertiary mb-2`)

**2b. Headings inline (~35 no main app)**
- `text-lg font-semibold/bold` → `text-xl` (subir um degrau) ou trocar por `CSS.sectionTitle`. Arquivos: `ModelExtractionModals` (44,147,278), `GlobalEditorModal` (1022,1304), `MiscModals` (51,265), `ConfigModal` (363), `TextPreviewModal` (48), `AdvancedModals` (674,1029,1181), `ProofsTab` (53,112), `UploadTab` (482), `ModelForms` (242), `AIAssistantComponents` (407), `LoginScreen` (195).
- `text-sm font-semibold` (subcabeçalhos) → `text-base` onde for cabeçalho estrutural: `FactsComparisonModal` (58,80,326,336), `FullscreenModelPanel` (178), `ModelSearchPanel` (42), `GlobalEditorModal` (1152), `ChangelogModal` (43).

**2c. Labels**
- Consolidar os ~30 labels inline (`block text-sm font-medium/semibold`) em `CSS.label` onde semanticamente equivalente.

## Fase 3 — Emoji → ícone (#2)

~140 ocorrências em ~25 arquivos do main app. **Três sub-casos**, tratados
distintamente:

**3a. Emoji como JSX visível (maioria)** → `<Icon className="w-4 h-4 ..."/>` lucide.
- Mapa de equivalência: ✅→`CheckCircle2`, ❌→`XCircle`, ⚠️→`AlertTriangle`, ℹ️→`Info`, 👤→`User`, 🤖→`Bot`, 📋→`FileText`/`ListChecks`, 📝→`Pencil`/`FileText`, 🔍→`Search`, ⚡→`Zap`, 💡→`Lightbulb`, 📊→`BarChart3`, 🗑️→`Trash2`, 💾→`Save`, 🔗→`Link2`, 📧→`Mail`, ⏳→`Clock`, ✨→`Sparkles`, 🔄→`RotateCw`, ✓/✔️→`Check`, ★/⭐→`Star` (fill), ☆→`Star`, 📁→`FolderOpen`, ⚖️→`Scale`.
- Arquivos principais: `Toast.tsx`, `ChatBubble.tsx`, `ChatHistoryArea.tsx`, `ChatGroundingFooter.tsx`, `SuggestionCard.tsx`, `ModelCard.tsx`, `JurisprudenciaCard.tsx`, `SessionModals.tsx`, `BulkModals.tsx`, `ModelModals.tsx`, `ModelExtractionModals.tsx`, `AdvancedModals.tsx`, `MiscModals.tsx`, `QuillEditors.tsx`, `FieldEditor.tsx`, `AIAssistantComponents.tsx`, `AppHeader.tsx`, `EditorTabContent.tsx`, `ModelsTab.tsx`, `ConfigModal.tsx` (~35 emojis aqui).

**3b. Emoji em `<option>` (armadilha técnica)** → **remover o emoji** do label.
- `<option>` não renderiza SVG; um `<Icon/>` dentro quebra. Casos: `TopicsTab.tsx:326-329` (Preliminar/Prejudicial/Processual). Remover o emoji do texto da option (alternativa de maior esforço — trocar `<select>` por dropdown custom — fica fora desta rodada).

**3c. Emoji em strings de toast** → **remover o emoji** da string.
- `Toast.tsx` já injeta ícone por `type` (success/error/info/warning). Logo, emojis em `showToast('✅ ...')` são redundantes. Casos: `PreviewModals.tsx:97,100`, `AdvancedModals.tsx:1228-1231`, e demais strings passadas a `showToast`/template literals. Remover o emoji, manter o texto.

**Preservar (não tocar):** emojis em `changelog.js`, em prompts enviados a LLM,
em dados/exemplos, em comentários, em `*.test.*`.

## Riscos, mitigação e rollback

| Risco | Mitigação |
|---|---|
| Quebra em um dos temas (claro/escuro) | Verificar AMBOS após cada fase (CLAUDE.md §9); risco maior na Fase 1. |
| Regressão semântica de cor | Preservar verde/vermelho/amber/roxo-categórico; só decorativo muda. |
| `<option>` + SVG quebrando layout | Tratado em 3b (remover emoji, não converter). |
| Toast com ícone duplicado | Tratado em 3c (remover emoji da string). |
| Volume (~50-60 arquivos) | Fases isoladas; `npx tsc --noEmit` ao fim de cada fase; commit atômico por fase. |
| Encoding UTF-8 | Apenas `Edit`/`Write` (CLAUDE.md §5); nunca sed/awk/echo. |

**Rollback:** cada fase é um commit → `git revert` granular.

## Versionamento

Bump de patch por commit (CLAUDE.md §8, 4 arquivos): 1.50.17 → **1.50.18** (Fase 1,
paleta) → **1.50.19** (Fase 2, tipografia) → **1.50.20** (Fase 3a, emoji geral) →
**1.50.21** (Fase 3b, ConfigModal). Cada commit atualiza CLAUDE.md (linha 7),
`src/App.tsx` (APP_VERSION), `src/constants/changelog.js`, `package.json`.

## Verificação

- `npx tsc --noEmit` ao fim de cada fase (zero erros novos).
- Screenshots Playwright antes/depois nos 2 temas (telas-chave: header/logo, um
  modal via `BaseModal`, um toast, a aba de modelos, o editor). Requer dev server
  rodando.

## Fora de escopo (rodadas futuras)

- `src/apps/*` (Financeiro, Analisador, Prova Oral, Embargos) e `AdminPanel`.
- Sombras tematizadas (#6) e convenção de border-radius (#3) do diagnóstico original.
- Componentes base `<Button>`/`<Input>` (#7) — investimento estrutural separado.
