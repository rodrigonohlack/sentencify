# Navegação por Sidebar no Modal de Configurações de IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar as 18 seções do `ConfigModal` (hoje empilhadas num único scroll) em 7 categorias navegáveis por uma sidebar lateral, sem alterar comportamento, lógica ou conteúdo de nenhuma seção.

**Architecture:** Um `const` de configuração (`SETTINGS_CATEGORIES`) no nível de módulo + um `useState` (`activeSection`) no componente. O container de conteúdo vira um flex de duas colunas: `<nav>` à esquerda (botões de categoria) + painel à direita. Cada seção recebe uma classe condicional `mb-6` (visível) / `hidden` (oculta) na sua linha de abertura — nenhum bloco de JSX é movido.

**Tech Stack:** React 18 + TypeScript, Tailwind v3.4.17, Zustand, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-06-05-config-modal-sidebar-design.md`

**Arquivo único de código:** `src/components/modals/ConfigModal.tsx` (+ teste e os 4 arquivos de versão).

---

## Mapa de seções → categorias (referência)

| Seção | Linha header `SEÇÃO N:` | Abertura | Categoria | Tratamento |
|---|---|---|---|---|
| 0 — Aparência (fonte) | 401 | `<div>` | `appearance` | classe simples |
| 1 — Provedor de IA | 441 | `<div>` | `providers` | classe simples |
| 2 — Chaves API | 645 | `<div>` | `providers` | classe simples |
| 3 — Pensamento Prolongado | 874 | `<div>` | `providers` | classe simples |
| 4 — Double Check | 1249 | `<div>` | `assist` | classe simples |
| 4.5 — Melhoria de Voz | 1796 | `<div>` | `assist` | classe simples |
| 4.6 — Geração inline (Ctrl+K) | 1902 | `<div>` | `assist` | classe simples |
| 5 — Nível de Detalhe | 1971 | `<div>` | `analysis` | classe simples |
| 6 — Tópicos por Requisição | 2012 | `<div>` | `analysis` | classe simples |
| 7 — Requisições Paralelas | 2040 | `<div>` | `analysis` | classe simples |
| 8 — Modo de PDF | 2105 | `<div>` | `docs` | classe simples |
| 9 — Anonimização | 2319 | `<div>` | `docs` | classe simples |
| 10 — Base de Dados | 2510 | `<div className="theme-bg-secondary-50 rounded-lg p-4 border theme-border-input">` | `data` | **merge** |
| 11 — Busca Semântica | 2540 | `<div className="space-y-4">` | `data` | **merge** |
| 12-15 — Modelos Customizados | 2739 | comentário + 4 divs | `prompts` | **wrapper** |
| 16 — Prompts Rápidos | 2914 | `<div className="mt-6">` | `prompts` | **merge** |
| 17 — Uso de Tokens | 3006 | `{(() => {` (IIFE) | `providers` | **wrapper** |
| 18 — Tópicos Complementares | 3201 | `<div>` | `analysis` | classe simples |

**Linha divisória (idêntica nas 18 seções, copiar verbatim nos `old_string`):**
```
              ═══════════════════════════════════════════════════════════════════════════════ */}
```

---

### Task 1: Testes de navegação por sidebar (falhando)

**Files:**
- Test: `src/components/modals/ConfigModal.test.tsx` (append novo `describe`)

- [ ] **Step 1: Adicionar o bloco de testes**

Inserir, dentro do `describe('ConfigModal', ...)` (antes do `});` final da linha 487), o bloco abaixo. Ele importa o componente de produção real (já importado no topo do arquivo) — não duplica nada.

```tsx
  // ═══════════════════════════════════════════════════════════════════════════
  // SIDEBAR NAVIGATION (v1.52.22)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Sidebar Navigation', () => {
    const CATEGORY_LABELS = [
      'Provedores & Modelos',
      'Assistência de IA',
      'Análise & Relatórios',
      'Documentos',
      'Busca & Dados',
      'Prompts & Modelos',
      'Aparência',
    ];

    it('renders all 7 category buttons in the sidebar', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      CATEGORY_LABELS.forEach((label) => {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
      });
    });

    it('starts on Provedores: provider section visible, docs section hidden', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      // Chaves API (categoria providers) NÃO está dentro de wrapper .hidden
      expect(screen.getByText(/Chaves API/i).closest('.hidden')).toBeNull();
      // Anonimização (categoria docs) ESTÁ dentro de wrapper .hidden
      expect(screen.getByText('Anonimização de Documentos').closest('.hidden')).not.toBeNull();
    });

    it('clicking Documentos reveals docs sections and hides provider sections', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Documentos' }));
      expect(screen.getByText('Anonimização de Documentos').closest('.hidden')).toBeNull();
      expect(screen.getByText(/Chaves API/i).closest('.hidden')).not.toBeNull();
    });

    it('clicking Aparência reveals the font section', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Aparência' }));
      expect(screen.getByText(/Aparência · Fonte da aplicação/).closest('.hidden')).toBeNull();
    });
  });
```

- [ ] **Step 2: Rodar os novos testes e confirmar que FALHAM**

Run: `npx vitest run src/components/modals/ConfigModal.test.tsx -t "Sidebar Navigation"`
Expected: FAIL — não existem botões de categoria nem wrappers `.hidden` ainda (ex.: `Unable to find role="button" and name "Documentos"`).

- [ ] **Step 3: Commit dos testes**

```bash
git add src/components/modals/ConfigModal.test.tsx
git commit -m "test(config): testes da navegação por sidebar (falhando)"
```

---

### Task 2: Config de categorias + estado

**Files:**
- Modify: `src/components/modals/ConfigModal.tsx` (nível de módulo ~linha 103-105; estado ~linha 369)

- [ ] **Step 1: Adicionar `SETTINGS_CATEGORIES` e o tipo `SectionId` no nível de módulo**

Edit — old_string:
```tsx
  return models[modelId] || modelId;
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════
```
new_string:
```tsx
  return models[modelId] || modelId;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIAS DA SIDEBAR DE CONFIGURAÇÕES (v1.52.22)
// ═══════════════════════════════════════════════════════════════════════════════

const SETTINGS_CATEGORIES = [
  { id: 'providers',  label: 'Provedores & Modelos', icon: Zap },
  { id: 'assist',     label: 'Assistência de IA',    icon: Sparkles },
  { id: 'analysis',   label: 'Análise & Relatórios', icon: FileText },
  { id: 'docs',       label: 'Documentos',           icon: ScrollText },
  { id: 'data',       label: 'Busca & Dados',        icon: BookOpen },
  { id: 'prompts',    label: 'Prompts & Modelos',    icon: Wand2 },
  { id: 'appearance', label: 'Aparência',            icon: Type },
] as const;

type SectionId = typeof SETTINGS_CATEGORIES[number]['id'];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════
```

(Todos os ícones — `Zap, Sparkles, FileText, ScrollText, BookOpen, Wand2, Type` — já estão importados de `lucide-react` nas linhas 27-32. Nenhum import novo.)

- [ ] **Step 2: Adicionar o estado `activeSection` no componente**

Edit — old_string:
```tsx
  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;
```
new_string:
```tsx
  // ─────────────────────────────────────────────────────────────────────────────
  // NAVEGAÇÃO POR SEÇÃO (sidebar) — v1.52.22
  // ─────────────────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = React.useState<SectionId>('providers');

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;
```

- [ ] **Step 3: Validar TypeScript**

Run: `npx tsc --noEmit`
Expected: sem erros novos. (`activeSection`/`setActiveSection` ainda não usados gera, no máximo, aviso de lint — não erro de tsc. Serão usados na Task 3/4.)

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/ConfigModal.tsx
git commit -m "feat(config): config de categorias + estado activeSection"
```

---

### Task 3: Reestruturar o conteúdo em flex (sidebar + painel)

**Files:**
- Modify: `src/components/modals/ConfigModal.tsx` (abertura ~linha 399; fechamento ~linha 3333-3337)

- [ ] **Step 1: Abrir o flex + nav + painel**

Edit — old_string:
```tsx
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 0: Aparência — fonte da aplicação (v1.50.46)
```
new_string:
```tsx
        <div className="flex max-h-[60vh]">
          {/* Sidebar de categorias */}
          <nav className="w-48 shrink-0 overflow-y-auto border-r theme-border-secondary p-3 space-y-1">
            {SETTINGS_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = activeSection === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveSection(cat.id)}
                  title={cat.label}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-500/10 border border-blue-500 text-blue-500 dark:text-blue-400'
                      : 'theme-text-tertiary theme-hover-bg border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Painel de conteúdo da categoria ativa */}
          <div className="flex-1 p-6 overflow-y-auto">
          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 0: Aparência — fonte da aplicação (v1.50.46)
```

(Nota: o painel **não** leva `space-y-6` — o espaçamento entre seções vem do `mb-6` aplicado por seção na Task 4. As seções permanecem na indentação original; isso é JSX válido e mantém o diff mínimo.)

- [ ] **Step 2: Fechar o painel antes de fechar o flex**

Edit — old_string:
```tsx
          </div>

        </div>

        {/* Footer fixo com botões */}
```
new_string:
```tsx
          </div>
          </div>

        </div>

        {/* Footer fixo com botões */}
```

(O `</div>` adicionado fecha o painel; o `</div>` de 8 espaços que já existia passa a fechar o flex container.)

- [ ] **Step 3: Validar TypeScript**

Run: `npx tsc --noEmit`
Expected: sem erros (tags balanceadas; `activeSection`/`setActiveSection` agora usados).

- [ ] **Step 4: Rodar a suíte do modal — testes existentes verdes, "renders all 7 category buttons" passa**

Run: `npx vitest run src/components/modals/ConfigModal.test.tsx`
Expected: todos os testes pré-existentes PASS; `renders all 7 category buttons` PASS. Os 3 testes de visibilidade ainda FALHAM (nenhuma seção tem `.hidden` ainda) — será resolvido na Task 4.

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/ConfigModal.tsx
git commit -m "feat(config): shell flex com sidebar de categorias"
```

---

### Task 4: Visibilidade condicional nas 18 seções

**Files:**
- Modify: `src/components/modals/ConfigModal.tsx`

Cada edição abaixo é independente e única (a linha `SEÇÃO N:` garante unicidade). A linha divisória `═══ */}` deve ser copiada verbatim do arquivo (idêntica em todas). **Não altere nada além da linha de abertura indicada.**

- [ ] **Step 1: Seções de classe simples (categoria → `mb-6`/`hidden`)**

Para cada seção abaixo, o `old_string` é a linha `SEÇÃO N:` + a linha divisória + `          <div>`, e o `new_string` troca **apenas** `          <div>` por `          <div className={activeSection === '<CAT>' ? 'mb-6' : 'hidden'}>`.

Exemplo completo (Seção 1 → `providers`):

old_string:
```tsx
              SEÇÃO 1: Provedor de IA
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
```
new_string:
```tsx
              SEÇÃO 1: Provedor de IA
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className={activeSection === 'providers' ? 'mb-6' : 'hidden'}>
```

Aplicar o mesmo padrão para as demais (a string da `SEÇÃO N:` é exatamente a tabela abaixo; `<CAT>` é a categoria):

| Linha `SEÇÃO N:` (verbatim) | `<CAT>` |
|---|---|
| `              SEÇÃO 0: Aparência — fonte da aplicação (v1.50.46)` | `appearance` |
| `              SEÇÃO 1: Provedor de IA` | `providers` |
| `              SEÇÃO 2: Chaves API` | `providers` |
| `              SEÇÃO 3: Pensamento Prolongado` | `providers` |
| `              SEÇÃO 4: Double Check de Respostas` | `assist` |
| `              SEÇÃO 4.5: Melhoria de Voz por IA (v1.37.88)` | `assist` |
| `              SEÇÃO 4.6: Geração inline com IA — Ctrl+K (v1.51.0)` | `assist` |
| `              SEÇÃO 5: Nível de Detalhe nos Mini-Relatórios` | `analysis` |
| `              SEÇÃO 6: Tópicos por Requisição` | `analysis` |
| `              SEÇÃO 7: Requisições Paralelas` | `analysis` |
| `              SEÇÃO 8: Modo de Processamento de PDF` | `docs` |
| `              SEÇÃO 9: Anonimização de Documentos` | `docs` |

(São 12 edições idênticas em forma — só mudam a linha `SEÇÃO N:` e `<CAT>`.)

- [ ] **Step 2: Seção 10 — Base de Dados (merge, `data`)**

old_string:
```tsx
              SEÇÃO 10: Base de Dados
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="theme-bg-secondary-50 rounded-lg p-4 border theme-border-input">
```
new_string:
```tsx
              SEÇÃO 10: Base de Dados
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className={`theme-bg-secondary-50 rounded-lg p-4 border theme-border-input ${activeSection === 'data' ? 'mb-6' : 'hidden'}`}>
```

- [ ] **Step 3: Seção 11 — Busca Semântica (merge, `data`)**

old_string:
```tsx
              SEÇÃO 11: Busca Semântica (E5-base)
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
```
new_string:
```tsx
              SEÇÃO 11: Busca Semântica (E5-base)
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className={`space-y-4 ${activeSection === 'data' ? 'mb-6' : 'hidden'}`}>
```

- [ ] **Step 4: Seção 12-15 — abrir wrapper (`prompts`)**

old_string:
```tsx
              SEÇÃO 12-15: Modelos customizados
              ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* Modelo de Mini-Relatório */}
```
new_string:
```tsx
              SEÇÃO 12-15: Modelos customizados
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className={activeSection === 'prompts' ? 'space-y-6 mb-6' : 'hidden'}>
          {/* Modelo de Mini-Relatório */}
```

(O `space-y-6` no wrapper preserva o espaçamento entre os 4 sub-modelos, que antes vinha do `space-y-6` do container.)

- [ ] **Step 5: Seção 12-15 — fechar wrapper + Seção 16 merge (`prompts`)**

old_string:
```tsx
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 16: Prompts Rápidos
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="mt-6">
```
new_string:
```tsx
            </div>
          </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 16: Prompts Rápidos
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className={activeSection === 'prompts' ? 'mb-6' : 'hidden'}>
```

(O `</div>` extra fecha o wrapper aberto no Step 4; `mt-6` da Seção 16 é substituído por `mb-6`/`hidden`.)

- [ ] **Step 6: Seção 17 — abrir wrapper (`providers`)**

old_string:
```tsx
              SEÇÃO 17: Uso de Tokens
              ═══════════════════════════════════════════════════════════════════════════════ */}
          {(() => {
```
new_string:
```tsx
              SEÇÃO 17: Uso de Tokens
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className={activeSection === 'providers' ? 'mb-6' : 'hidden'}>
          {(() => {
```

- [ ] **Step 7: Seção 17 — fechar wrapper + Seção 18 classe (`analysis`)**

old_string:
```tsx
          })()}

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 18: Tópicos Complementares Automáticos
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div>
```
new_string:
```tsx
          })()}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
              SEÇÃO 18: Tópicos Complementares Automáticos
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className={activeSection === 'analysis' ? 'mb-6' : 'hidden'}>
```

(O `</div>` fecha o wrapper da IIFE aberto no Step 6.)

- [ ] **Step 8: Validar TypeScript**

Run: `npx tsc --noEmit`
Expected: sem erros (todas as tags balanceadas: +1 div do painel já fechado na Task 3, +1 wrapper Seção 12-15 aberto/fechado, +1 wrapper Seção 17 aberto/fechado).

- [ ] **Step 9: Rodar a suíte completa do modal — tudo verde**

Run: `npx vitest run src/components/modals/ConfigModal.test.tsx`
Expected: PASS em todos, incluindo os 4 de `Sidebar Navigation`.

- [ ] **Step 10: Commit**

```bash
git add src/components/modals/ConfigModal.tsx
git commit -m "feat(config): visibilidade condicional por categoria nas 18 seções"
```

---

### Task 5: Verificação visual no app (ambos os temas)

**Files:** nenhum (verificação manual/Playwright)

- [ ] **Step 1: Subir o app e abrir o modal**

Usar a skill `run` (ou `npm run dev`) e abrir Configurações de IA. Conferir:
- A sidebar mostra as 7 categorias; "Provedores & Modelos" inicia ativa (azul).
- Clicar cada categoria mostra exatamente as seções mapeadas na tabela; nenhuma seção some ou aparece em duas categorias.
- O footer (Exportar/Importar/Modelo atual/Fechar) permanece fixo e funcional.
- Conferir nos temas **claro e escuro** (toggle de tema).

- [ ] **Step 2: Conferir que controles seguem funcionais**

Em "Provedores & Modelos": selecionar um provider, digitar uma chave API. Em "Documentos": alternar um toggle de anonimização. Confirmar que respondem normalmente (mesmos elementos de antes).

---

### Task 6: Bump de versão (4 arquivos) + changelog

**Files:**
- Modify: `CLAUDE.md:7`
- Modify: `src/constants/app-version.ts`
- Modify: `package.json:3`
- Modify: `src/constants/changelog.js`

- [ ] **Step 1: `CLAUDE.md` linha 7**

Edit — old_string:
```
**Version**: 1.52.21 | **File**: `src/App.tsx` (~160 KB) | **Runtime**: Standalone + Render
```
new_string:
```
**Version**: 1.52.22 | **File**: `src/App.tsx` (~160 KB) | **Runtime**: Standalone + Render
```

- [ ] **Step 2: `src/constants/app-version.ts`**

Edit — old_string:
```ts
export const APP_VERSION = '1.52.21';
```
new_string:
```ts
export const APP_VERSION = '1.52.22';
```

- [ ] **Step 3: `package.json` linha 3**

Edit — old_string:
```json
  "version": "1.52.21",
```
new_string:
```json
  "version": "1.52.22",
```

- [ ] **Step 4: `src/constants/changelog.js` — nova entrada no topo**

Edit — old_string:
```js
export const CHANGELOG = [
  {
    version: '1.52.21',
```
new_string:
```js
export const CHANGELOG = [
  {
    version: '1.52.22',
    date: '2026-06-05',
    feature: 'refactor(config): modal de Configurações de IA reorganizado em navegação por sidebar lateral. As 18 seções, antes empilhadas num único scroll, foram agrupadas em 7 categorias (Provedores & Modelos, Assistência de IA, Análise & Relatórios, Documentos, Busca & Dados, Prompts & Modelos, Aparência). Mudança puramente de layout: nenhuma lógica, hook ou conteúdo de seção foi alterado — cada seção recebeu apenas uma classe de visibilidade condicional (mb-6/hidden) e o container virou um flex de duas colunas (nav + painel). Categoria inicial: Provedores & Modelos.',
  },
  {
    version: '1.52.21',
```

- [ ] **Step 5: Validar TypeScript e rodar a suíte do modal de novo**

Run: `npx tsc --noEmit && npx vitest run src/components/modals/ConfigModal.test.tsx`
Expected: sem erros; todos os testes PASS.

- [ ] **Step 6: Commit do bump**

```bash
git add CLAUDE.md src/constants/app-version.ts package.json src/constants/changelog.js
git commit -m "chore: bump v1.52.22 — sidebar no modal de Configurações de IA"
```

---

## Notas de verificação e rollback

- **Tailwind v3.4.17:** o utilitário `space-y-*` usa o seletor de atributo `:not([hidden])`, que NÃO reconhece a classe `.hidden`. Por isso o plano usa `mb-6` por seção (em vez de manter `space-y-6` no painel), evitando gap espúrio no topo.
- **jsdom não aplica CSS do Tailwind:** seções com classe `hidden` continuam no DOM nos testes, por isso os testes pré-existentes de "Sections Visibility" (que usam `getByText`) seguem verdes sem alteração. Os novos testes verificam a navegação via presença/ausência da classe `.hidden` (`closest('.hidden')`), não via `toBeVisible()`.
- **Rollback:** mudança isolada (1 arquivo de código + teste + 4 de versão), sem migração de dados nem store. `git revert` dos commits resolve 100%.
- **Deploy:** o push para `main` dispara deploy no Render — **só fazer push após OK explícito do usuário**.
