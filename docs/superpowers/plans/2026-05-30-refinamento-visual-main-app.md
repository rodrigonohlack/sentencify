# Refinamento Visual do Main App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a UI do main app mais profissional desaturando a paleta para azul institucional, criando hierarquia tipográfica e trocando emojis de UI por ícones lucide — sem reconstruir a arquitetura de estilo.

**Architecture:** Três fases sequenciais, cada uma um commit com bump de patch (ConfigModal é sub-commit próprio na Fase 3). Estratégia "centralizado primeiro": editar tokens/alavancas (1 edição → N telas) antes dos pontos inline. Verificação por fase: `npx tsc --noEmit` + screenshots Playwright antes/depois nos 2 temas.

**Tech Stack:** React 19, Tailwind 3.4 (`darkMode: 'class'` + CSS variables em `ThemeStyles.tsx`), lucide-react, Vite. Spec: `docs/superpowers/specs/2026-05-30-refinamento-visual-main-app-design.md`.

**Escopo:** Apenas `src/` exceto `src/apps/*` (subapps) e `AdminPanel.tsx`. Preservar verde/vermelho/amber (semântica de resultado) e roxo **categórico** (badges que distinguem categorias).

---

## Convenções deste plano

**Mapa de cores roxo→azul** (usado em todas as substituições de Fase 1):

| Origem (roxo/rosa/violet) | Destino (azul) |
|---|---|
| `purple-600` / `#9333ea` / `rgba(147,51,234,*)` | `blue-600` / `#2563eb` / `rgba(37,99,235,*)` |
| `purple-700` / `#7e22ce` | `blue-700` / `#1d4ed8` |
| `purple-500` / `#a855f7` / `rgba(168,85,247,*)` | `blue-500` / `#3b82f6` / `rgba(59,130,246,*)` |
| `purple-400` / `#c084fc` | `blue-400` / `#60a5fa` |
| `violet-*` / `#8b5cf6` / `rgba(139,92,246,*)` | azul equivalente (`blue-500`/`#3b82f6`/`rgba(59,130,246,*)`) |
| `pink-500/600` / `#db2777` | `blue-600` / `#2563eb` |
| `pink-700` / `#be185d` | `blue-700` / `#1d4ed8` |

**Mapa emoji→lucide** (usado em toda a Fase 3):

| Emoji | Ícone lucide | Emoji | Ícone lucide |
|---|---|---|---|
| ✅ ✓ ✔️ | `CheckCircle2` (✅) / `Check` (✓✔️) | 💾 | `Save` |
| ❌ ✗ | `XCircle` (❌) / `X` (✗) | 🔗 | `Link2` |
| ⚠️ | `AlertTriangle` | 📧 | `Mail` |
| ℹ️ | `Info` | ⏳ | `Clock` |
| 👤 | `User` | ✨ | `Sparkles` |
| 🤖 | `Bot` | 🔄 | `RotateCw` |
| 📋 | `FileText` | ★ ⭐ | `Star` (com `fill="currentColor"`) |
| 📝 | `Pencil` | ☆ | `Star` (sem fill) |
| 🔍 | `Search` | 📁 | `FolderOpen` |
| ⚡ | `Zap` | ⚖️ | `Scale` |
| 💡 | `Lightbulb` | 📦 | `Package` |
| 📊 | `BarChart3` | 🗑️ | `Trash2` |

Tamanho padrão do ícone substituto: `className="w-4 h-4"` (ou `w-3.5 h-3.5` em chips/badges densos). Manter a cor existente do contexto (ex: `text-amber-500`) aplicando-a ao ícone.

**Versionamento (4 arquivos, por commit):**
1. `CLAUDE.md:7` — `**Version**: 1.XX.YY`
2. `src/constants/app-version.ts:6` — `export const APP_VERSION = '1.XX.YY';`
3. `package.json:3` — `"version": "1.XX.YY",`
4. `src/constants/changelog.js` — nova entrada no TOPO do array `CHANGELOG` (logo após `export const CHANGELOG = [`), formato `{ version, date: '2026-05-30', feature: '...' }`.

**Regra de edição:** apenas `Edit`/`Write` (CLAUDE.md §5 — nunca sed/awk/echo, corrompe UTF-8).

---

## Task 0: Baseline de screenshots (pré-requisito)

**Files:** nenhum (captura de referência).

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev` (em background). Anotar a URL/porta que o Vite imprime (ex: `http://localhost:5173`).
Expected: servidor sobe sem erro.

- [ ] **Step 2: Capturar baseline nos 2 temas**

Com o Playwright MCP, para cada tema (escuro = default; claro = togar pelo botão Sun/Moon no header):
1. `browser_navigate` para a URL.
2. `browser_take_screenshot` das telas-chave: (a) header/logo, (b) um modal aberto via `BaseModal` (ex: Configurações), (c) um toast visível (disparar uma ação que gere toast), (d) a aba de Modelos, (e) o editor.
Salvar como `baseline-<tela>-<tema>.png`.
Expected: ~10 screenshots de referência.

- [ ] **Step 3: Confirmar baseline**

Verificar que as imagens mostram o estado atual (logo arco-íris, botões roxo→azul, emojis). Guardar para comparação pós-fases.

---

## FASE 1 — Paleta (commit → v1.50.18)

### Task 1.1: Tokens centrais de cor

**Files:**
- Modify: `src/constants/styles.ts:23,24,25,41`
- Modify: `src/styles/ThemeStyles.tsx:43`
- Modify: `src/index.css:39,51,56,88,92-94`
- Modify: `src/styles/GlobalHoverStyles.tsx` (defs de gradiente/cor roxo)

- [ ] **Step 1: `styles.ts` — btnPrimary e focus-rings**

Em `src/constants/styles.ts`:
- Linha 41 `btnPrimary`, trocar
  `bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25`
  por
  `bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/25`
- Linhas 23, 24, 25: trocar `focus:ring-purple-500` por `focus:ring-blue-500` (3 ocorrências).

- [ ] **Step 2: `ThemeStyles.tsx` — modal-glow**

Linha 43, trocar
`--modal-glow: 0 0 40px rgba(139, 92, 246, 0.15), 0 0 80px rgba(59, 130, 246, 0.1);`
por
`--modal-glow: 0 0 40px rgba(59, 130, 246, 0.15), 0 0 80px rgba(59, 130, 246, 0.1);`
(remove o componente violet; glow vira azul puro).

- [ ] **Step 3: `index.css` — spinner neon**

- Linha 39: `border: 3px solid rgba(139, 92, 246, 0.6);` → `rgba(59, 130, 246, 0.6);`
- Linha 51: `box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);` → `rgba(59, 130, 246, 0.5);`
- Linha 56: `box-shadow: 0 0 20px rgba(139, 92, 246, 0);` → `rgba(59, 130, 246, 0);`
- Linha 88: `border-bottom-color: #8b5cf6;` → `border-bottom-color: #60a5fa;`
- Linhas 92-94 (glow do `.inner`): trocar as 3 `rgba(139, 92, 246, *)` por `rgba(59, 130, 246, *)` (mantém o efeito dual-ring, agora em dois tons de azul).

- [ ] **Step 4: `GlobalHoverStyles.tsx` — defs de hover roxo→azul**

Ler o arquivo. Em CADA definição de classe que contenha cor roxa/rosa (linhas ~54, 104, 138-139, 149, 152, 157-162, 171-172, 190-195, 212-223, 240-242, 310-312, 357-362, 527-542), aplicar o **Mapa de cores roxo→azul**. Os gradientes `linear-gradient(to right, #7e22ce, #db2777)` e `(#7e22ce, #1d4ed8)` viram `linear-gradient(to right, #1d4ed8, #2563eb)`. Os nomes das classes (`hover-gradient-purple-blue` etc.) **permanecem** — só os valores mudam.

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: zero erros novos.

### Task 1.2: Logo

**Files:**
- Modify: `src/components/layout/AppHeader.tsx:72`
- Modify: `src/App.tsx:2833`

- [ ] **Step 1: Trocar o gradiente tri-cor do logo (header)**

`AppHeader.tsx:72`, trocar
`bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent`
por
`bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent`

- [ ] **Step 2: Trocar a ocorrência duplicada em App.tsx**

`App.tsx:2833` (mesma string do logo): aplicar a MESMA troca do Step 1.

- [ ] **Step 3: Validar logo nos 2 temas via screenshot**

Com Playwright, capturar o header em tema escuro e claro. Confirmar legibilidade do gradiente azul sobre os dois fundos. Se em tema claro o `blue-700→blue-500` ficar pouco contrastado, registrar e considerar texto sólido `theme-text-primary` (decisão deixada aberta no spec).

### Task 1.3: Botões/painéis inline e ícone de modal

**Files (cada um, na linha indicada — aplicar Mapa de cores):**
- `src/components/modals/AdvancedModals.tsx:798,1159`
- `src/components/modals/ModelExtractionModals.tsx:105`
- `src/components/modals/StreamingModal.tsx:148`
- `src/components/modals/MiscModals.tsx:76`
- `src/components/chat/ChatInput.tsx:53,70`
- `src/components/editors/DecisionEditorContainer.tsx:331`
- `src/components/tabs/UploadTab.tsx:697`
- `src/components/ai/AIAssistantComponents.tsx:199,203,271`
- `src/components/modals/BaseModal.tsx:85`
- `src/components/chat/ChatBubble.tsx:39`

- [ ] **Step 1: Botões com gradiente roxo→azul**

Para cada linha de botão/painel/progress acima, trocar o gradiente multicolor por azul mono. Padrão:
- `from-purple-600 to-blue-600` / `from-blue-600 to-purple-600` / `from-purple-600 to-pink-500` / `from-purple-600 to-indigo-600` → `from-blue-600 to-blue-700`
- `from-blue-500 via-purple-500 to-blue-500` (progress, MiscModals:76) → `from-blue-500 to-blue-600`
- hover `hover:from-purple-500 hover:to-blue-500` → `hover:from-blue-500 hover:to-blue-600`
- `from-purple-400 to-blue-400` (AIAssistant:203 texto) → `from-blue-400 to-blue-600`
- shadow `shadow-purple-500/*` → `shadow-blue-500/*`

- [ ] **Step 2: `ChatInput.tsx:53` — focus do textarea**

Trocar `focus:border-purple-500 focus:ring-1 focus:ring-purple-500` por `focus:border-blue-500 focus:ring-1 focus:ring-blue-500`.

- [ ] **Step 3: `BaseModal.tsx:85` — gradiente do ícone `purple`**

Trocar `purple: 'from-purple-500 to-blue-500 shadow-purple-500/30',` por `purple: 'from-blue-500 to-blue-600 shadow-blue-500/30',`.
(Os outros iconGradients — red/green/yellow/orange/blue — ficam: são semânticos.)

- [ ] **Step 4: `ChatBubble.tsx:39` — bolha do usuário (decorativo)**

Trocar `bg-purple-600/20 border border-purple-500/30` por `bg-blue-600/20 border border-blue-500/30`. (Distingue user vs assistente; azul = "você/ação". Não é categórico.)

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: zero erros.

### Task 1.4: Verificação visual, bump e commit da Fase 1

- [ ] **Step 1: Screenshots pós-Fase 1 nos 2 temas**

Recapturar as telas-chave (Task 0 Step 2) e comparar com baseline: logo azul, botões azuis, glow/spinner azuis, **roxo categórico preservado** (badges de modelo/sugestão, "Fatos Novos", bolhas de chat agora azuis). Confirmar que nada quebrou no tema claro.

- [ ] **Step 2: Bump de versão para 1.50.18**

Atualizar os 4 arquivos (ver "Versionamento"). Entrada no changelog:
```
{
  version: '1.50.18',
  date: '2026-05-30',
  feature: 'style(ui): paleta do main app desaturada para azul institucional. Logo tri-cor (azul→roxo→rosa) → gradiente mono azul; btnPrimary, focus-rings, modal-glow, spinner neon e ~10 botões/painéis inline migrados de roxo/rosa/indigo para blue-600 mono. Roxo CATEGÓRICO preservado (badges de categoria, "Fatos Novos", token --accent-purple). Subapps e AdminPanel fora de escopo. Verificado nos 2 temas. Spec: docs/superpowers/specs/2026-05-30-refinamento-visual-main-app-design.md.',
},
```

- [ ] **Step 3: Verificar tipos final**

Run: `npx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "style(ui): paleta do main app para azul institucional (v1.50.18)"
```
(NÃO fazer push — exige OK explícito do usuário, dispara deploy.)

---

## FASE 2 — Tipografia (commit → v1.50.19)

### Task 2.1: Constantes de heading + título do BaseModal

**Files:**
- Modify: `src/constants/styles.ts` (adicionar constantes)
- Modify: `src/components/modals/BaseModal.tsx:105`

- [ ] **Step 1: Adicionar constantes de heading em `styles.ts`**

No objeto `CSS` (após a linha 30 `label`), adicionar:
```typescript
  sectionTitle: "text-lg font-semibold theme-text-primary",
  cardHeading: "text-base font-semibold theme-text-primary",
```

- [ ] **Step 2: Elevar o título do BaseModal**

`BaseModal.tsx:105`, trocar
`<h2 className="font-semibold theme-text-primary">{title}</h2>`
por
`<h2 className="text-base font-semibold theme-text-primary">{title}</h2>`
(propaga para ~18 modais; subtitle na linha 106 já é `text-xs`, mantém).

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: zero erros.

### Task 2.2: Headings inline (subir um degrau)

**Files (subir o size; usar `CSS.sectionTitle` onde for cabeçalho de seção):**

- [ ] **Step 1: `text-lg` → `text-xl` nos títulos estruturais**

Para cada alvo abaixo, subir `text-lg` → `text-xl` (mantendo `font-semibold`/`font-bold` e cor existentes):
- `ModelExtractionModals.tsx:44,147,278`
- `GlobalEditorModal.tsx:1022,1304`
- `MiscModals.tsx:51,265`
- `ConfigModal.tsx:363`
- `TextPreviewModal.tsx:48`
- `AdvancedModals.tsx:674,1029,1181`
- `ProofsTab.tsx:53,112`
- `UploadTab.tsx:482`
- `ModelForms.tsx:242`
- `AIAssistantComponents.tsx:407`
- `LoginScreen.tsx:195`

- [ ] **Step 2: `text-sm font-semibold` → `text-base` nos subcabeçalhos estruturais**

Para cada alvo, subir `text-sm` → `text-base` (mantendo `font-semibold` e cor):
- `FactsComparisonModal.tsx:58,80,326,336`
- `FullscreenModelPanel.tsx:178`
- `ModelSearchPanel.tsx:42`
- `GlobalEditorModal.tsx:1152`
- `ChangelogModal.tsx:43`

(NÃO subir labels de formulário nem hints/metadados — apenas cabeçalhos.)

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: zero erros.

### Task 2.3: Consolidar labels inline

**Files:** vários (labels que repetem `block text-sm font-medium`).

- [ ] **Step 1: Trocar labels inline equivalentes por `CSS.label`**

Onde houver `className="block text-sm font-medium theme-text-tertiary mb-2"` (ou variação `font-semibold` com mesma intenção de label de campo) escrito inline, e o arquivo já importar `CSS` de `constants/styles`, trocar por `className={CSS.label}`. Não forçar troca onde a cor/spacing diverge propositalmente. Conferir via:
Run: `grep -rn "block text-sm font-medium" src/components --include=*.tsx | grep -v "src/apps"`

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: zero erros.

### Task 2.4: Verificação, bump e commit da Fase 2

- [ ] **Step 1: Screenshots pós-Fase 2 nos 2 temas**

Recapturar modais e abas. Confirmar: títulos de modal/seção visivelmente maiores que o corpo; corpo denso preservado; nenhum overflow/quebra de layout por título maior.

- [ ] **Step 2: Bump para 1.50.19**

4 arquivos. Changelog:
```
{
  version: '1.50.19',
  date: '2026-05-30',
  feature: 'style(ui): hierarquia tipográfica híbrida no main app. Título do BaseModal elevado a text-base (≈18 modais); ~20 títulos de seção/modal text-lg→text-xl e ~9 subcabeçalhos text-sm→text-base; novas constantes CSS.sectionTitle/cardHeading; labels inline consolidados em CSS.label. Corpo (text-xs/text-sm) mantido denso de propósito. Verificado nos 2 temas.',
},
```

- [ ] **Step 3: Commit**

Run: `npx tsc --noEmit` (zero erros), então:
```bash
git add -A
git commit -m "style(ui): hierarquia tipográfica híbrida no main app (v1.50.19)"
```

---

## FASE 3a — Emoji → ícone, geral (commit → v1.50.20)

> ConfigModal NÃO entra aqui (Fase 3b).

### Task 3.1: Toast — ícone por tipo

**Files:** Modify `src/components/ui/Toast.tsx:10-11,34-39`

- [ ] **Step 1: Importar ícones lucide**

Após a linha 11 (`import { useModalManager }`), adicionar:
```typescript
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
```

- [ ] **Step 2: Trocar os emojis por ícones (linhas 34-39)**

Trocar o bloco
```tsx
          <div className="flex-shrink-0 text-2xl">
            {toast.type === 'success' && '✅'}
            {toast.type === 'error' && '❌'}
            {toast.type === 'info' && 'ℹ️'}
            {toast.type === 'warning' && '⚠️'}
          </div>
```
por
```tsx
          <div className="flex-shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-6 h-6 theme-text-green" />}
            {toast.type === 'error' && <XCircle className="w-6 h-6 theme-text-red" />}
            {toast.type === 'info' && <Info className="w-6 h-6 theme-text-blue" />}
            {toast.type === 'warning' && <AlertTriangle className="w-6 h-6 theme-text-amber" />}
          </div>
```

### Task 3.2: Emojis JSX nos demais arquivos

**Files (substituir emoji JSX visível por `<Icon className="w-4 h-4 [cor existente]"/>`, importando o ícone no topo de cada arquivo):**
- `ChatBubble.tsx:35,56` — `👤`→`<User>`, `🤖`→`<Bot>` (inline com o texto "Você"/"Assistente"); `⚠️`→`<AlertTriangle>` no erro.
- `ChatHistoryArea.tsx:49` — `🤖`→`<Bot>`
- `ChatGroundingFooter.tsx:52` — `🔗`→`<Link2>`
- `SuggestionCard.tsx:60,84` — `⭐`/`★`→`<Star fill="currentColor">`
- `ModelCard.tsx:47,129,162,227` — `★/☆`→`<Star>` (fill condicional), `📋`→`<FileText>`
- `JurisprudenciaCard.tsx:53` — `✓/✗`→`<Check>`/`<X>`
- `SessionModals.tsx:22,26,39,46,58` — `✅`→`<CheckCircle2>`, `🗑️`→`<Trash2>`, `💡`→`<Lightbulb>`, `⚠️`→`<AlertTriangle>`, `💾`→`<Save>`
- `BulkModals.tsx:35` — `ℹ️`→`<Info>`
- `ModelModals.tsx:28,44,49,59,74,79,84` — `⭐`→`<Star fill>`, `🗑️`→`<Trash2>`, `⚠️`→`<AlertTriangle>`, `❌`→`<XCircle>`
- `ModelExtractionModals.tsx:75,101,107,230` — `⚠️`→`<AlertTriangle>`, `❌`→`<XCircle>`, `✨`→`<Sparkles>`
- `AdvancedModals.tsx:693,701-705,762,774,793,802,852,891,921,934,1063,1080,1113` — conforme mapa (`⚠️`,`✓`,`📋`,`💡`,`✅`,`📁`,`⚡`)
- `MiscModals.tsx:116,159,233` — `💡`→`<Lightbulb>`, `📋`→`<FileText>`
- `QuillEditors.tsx:333,343,578,840,1163` — `⏳`→`<Clock>`, `❌`→`<XCircle>`, `✨`→`<Sparkles>`, `📝`→`<Pencil>`, `💡`→`<Lightbulb>`
- `FieldEditor.tsx:223,234` — `⏳`→`<Clock>`, `❌`→`<XCircle>`
- `AIAssistantComponents.tsx:95,223,263,290,325,426,460,499,512` — conforme mapa (`⚠️`,`💡`,`✓`,`📋`,`⚡`)
- `AppHeader.tsx:183` — `⚠️`→`<AlertTriangle className="w-4 h-4 theme-text-amber" />`
- `EditorTabContent.tsx:380,385` — `💡`→`<Lightbulb>`, `🔍`→`<Search>`
- `ModelsTab.tsx:333,404` — `⭐/☆`→`<Star>`, `📋`→`<FileText>`

- [ ] **Step 1: Aplicar substituições arquivo por arquivo**

Para cada arquivo: (1) adicionar/expandir o import de `lucide-react` com os ícones usados; (2) trocar cada emoji pelo `<Icon>` correspondente, preservando a cor do contexto (se o emoji estava em `<span className="text-amber-500">⚠️</span>`, o ícone fica `<AlertTriangle className="w-4 h-4 text-amber-500" />` e o span pode ser removido). Manter alinhamento com `flex items-center gap-*` onde o emoji ficava ao lado de texto.

- [ ] **Step 2: Verificar tipos a cada poucos arquivos**

Run: `npx tsc --noEmit`
Expected: zero erros (atenção a imports não usados — remover ícones que sobrarem).

### Task 3.3: Emojis em `<option>` — remover

**Files:** `src/components/tabs/TopicsTab.tsx:326,327,329`

- [ ] **Step 1: Remover o emoji do texto das options**

`<option>` não renderiza SVG. Trocar:
- `📋 Preliminar` → `Preliminar`
- `⚠️ Prejudicial` → `Prejudicial`
- `📝 Processual` → `Processual`
(Remover só o emoji + espaço; manter o `value`.)

### Task 3.4: Emojis em strings de toast — remover

**Files:** `src/components/modals/PreviewModals.tsx:97,100`; `src/components/modals/AdvancedModals.tsx:1228-1231` e demais `showToast('<emoji> ...')`.

- [ ] **Step 1: Localizar strings de toast com emoji**

Run: `grep -rn "showToast" src/components --include=*.tsx | grep -E "✅|❌|⚠️|ℹ️|🔄|⏳|✨|📊" | grep -v "src/apps"`

- [ ] **Step 2: Remover o emoji da string**

Em cada `showToast('✅ Modelo copiado...', 'success')`, remover o emoji + espaço inicial → `showToast('Modelo copiado...', 'success')`. O `Toast.tsx` (Task 3.1) já injeta o ícone pelo `type`. NÃO remover emojis de strings que não vão para toast (ex: template de export, prompt).

### Task 3.5: Verificação, bump e commit da Fase 3a

- [ ] **Step 1: Screenshots pós-Fase 3a nos 2 temas**

Disparar um toast de cada tipo (success/error/info/warning) e capturar: ícone lucide colorido, sem emoji. Conferir ChatBubble (User/Bot), aba de Modelos (estrela), cards. Confirmar alinhamento vertical dos ícones com o texto.

- [ ] **Step 2: Bump para 1.50.20**

4 arquivos. Changelog:
```
{
  version: '1.50.20',
  date: '2026-05-30',
  feature: 'style(ui): emojis de UI do main app (exceto ConfigModal) trocados por ícones lucide-react. Toast usa ícone por tipo; ~24 arquivos (chat, cards, modais, editores, tabs, header) migrados. <option> (TopicsTab) teve emoji removido (SVG não renderiza em option); strings de showToast tiveram emoji removido (Toast já põe ícone por tipo). Emojis em prompts/changelog/dados preservados. Verificado nos 2 temas.',
},
```

- [ ] **Step 3: Commit**

Run: `npx tsc --noEmit` (zero erros), então:
```bash
git add -A
git commit -m "style(ui): emoji→ícone lucide no main app exceto ConfigModal (v1.50.20)"
```

---

## FASE 3b — ConfigModal (commit → v1.50.21)

### Task 3.6: Emojis do ConfigModal

**Files:** Modify `src/components/modals/ConfigModal.tsx` (~35 emojis nas linhas listadas no inventário: 882,936,958,997,1028,1062,1127,1183,1366,1404,1436,1445,1468,1708,1819,1835,1913,2051,2152,2179,2207,2234,2624,2639,2668,2862,2880,2936,2994,3022,3062,3146,3152).

- [ ] **Step 1: Expandir import de lucide no topo do arquivo**

Adicionar ao import existente de `lucide-react` os ícones necessários: `AlertTriangle, Lightbulb, Zap, RotateCw, Sparkles, BarChart3, Save, FileText, Bot, Package`.

- [ ] **Step 2: Substituir emoji por ícone, caso a caso**

Aplicar o **Mapa emoji→lucide**. Atenção a 3 sub-casos dentro do ConfigModal:
- **Emoji em `<span className="text-amber-400">⚠️</span>`** (linhas 936,997,1028,1062,1708,1819,1913): trocar por `<AlertTriangle className="w-4 h-4 text-amber-400" />` (ou cor do contexto) e remover o span redundante.
- **Emoji inline em texto de dica** (ex: linha 882 `⚠️ Respostas podem demorar...`, 958/1127/1404 `💡 ...`): envolver em `flex items-center gap-1.5` ou `inline-flex` para o ícone alinhar com o texto.
- **Emoji em `placeholder="📝"` (linha 2880) e `icon: '📝'` (2936)**: são VALORES de string (placeholder/dado de prompt rápido), NÃO JSX. **Remover o emoji** do placeholder (deixar vazio ou texto). Para `icon: '📝'` — investigar como `icon` é renderizado: se renderiza como texto/emoji em JSX, trocar a renderização por ícone; se é dado salvo pelo usuário, **preservar** (é conteúdo, não UI). Decidir lendo o uso de `qp.icon` (já aparece em AIAssistantComponents:499).
- **Linhas multi-emoji** (2152,2179,2207,2234 — ex: `✅ Rápido | ⚠️ Não funciona...`): trocar cada emoji pelo ícone inline correspondente mantendo os separadores `|`.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: zero erros (remover imports de ícone não usados).

### Task 3.7: Verificação, bump e commit da Fase 3b

- [ ] **Step 1: Screenshot do ConfigModal nos 2 temas**

Abrir Configurações, percorrer as seções (IA, OCR, tokens, prompts rápidos, tópicos). Confirmar ícones no lugar dos emojis, alinhamento, e que placeholders/dados de prompt não quebraram.

- [ ] **Step 2: Bump para 1.50.21**

4 arquivos. Changelog:
```
{
  version: '1.50.21',
  date: '2026-05-30',
  feature: 'style(ui): emojis do ConfigModal trocados por ícones lucide-react (~35 ocorrências). Sub-commit isolado por ser arquivo grande/sensível. placeholder/icon que eram VALORES de string tratados à parte (removidos/preservados conforme sejam UI ou dado). Verificado nos 2 temas. Conclui o refinamento visual do main app (paleta+tipografia+ícones).',
},
```

- [ ] **Step 3: Commit**

Run: `npx tsc --noEmit` (zero erros), então:
```bash
git add -A
git commit -m "style(ui): emoji→ícone lucide no ConfigModal (v1.50.21)"
```

---

## Verificação final (após as 4 commits)

- [ ] Comparar screenshots baseline vs final nos 2 temas — confirmar: logo/botões/glow azuis, hierarquia de títulos visível, zero emoji de UI no main app, roxo categórico e cores semânticas (verde/vermelho/amber) intactos.
- [ ] `npx tsc --noEmit` limpo.
- [ ] `git log --oneline -4` mostra os 4 commits (v1.50.18→21).
- [ ] **Push só com OK explícito do usuário** (dispara deploy).

---

## Self-review (preenchido pelo autor do plano)

- **Cobertura do spec:** Fase 1 cobre #1 (1a/1b/1c + preservação 1d); Fase 2 cobre #4 (2a/2b/2c); Fases 3a/3b cobrem #2 (sub-casos a/b/c + ConfigModal isolado). Versionamento e screenshots cobertos por fase. ✔
- **Placeholders:** o único ponto deliberadamente condicional é `ConfigModal` `icon: '📝'` (Task 3.6 Step 2) — instruído a decidir lendo o uso real de `qp.icon`, com critério explícito (UI→trocar, dado→preservar). Logo do header (Task 1.2 Step 3) tem critério de fallback explícito. Não são placeholders vagos. ✔
- **Consistência de nomes:** `CSS.sectionTitle`/`CSS.cardHeading` definidos na Task 2.1 e referenciados em 2.2/2.3; mapa de cores e mapa emoji→lucide centralizados no topo e referenciados por todas as fases. ✔
