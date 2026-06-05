# Design: Navegação por sidebar no Modal de Configurações de IA

**Data:** 2026-06-05
**Versão alvo:** v1.52.22 (bump de patch)
**Arquivo afetado:** `src/components/modals/ConfigModal.tsx` (único)

## Problema

O modal "Configurações de IA" (`ConfigModal.tsx`, ~3.405 linhas) empilha **18 seções**
num único container de scroll (`p-6 space-y-6 max-h-[60vh] overflow-y-auto`). O usuário
precisa rolar uma lista longa e plana para achar qualquer opção — "um espaguete de opções".

## Objetivo

Reorganizar as 18 seções existentes em **7 categorias** navegáveis por uma **sidebar
lateral** (padrão de telas de "Configurações" modernas), sem alterar o comportamento,
a lógica ou o conteúdo de nenhuma seção. Mudança puramente de layout/navegação.

**Não-objetivos (YAGNI):**
- Não extrair seções em componentes separados (escopo "só reorganizar").
- Não fazer faxina de espaçamento/títulos das seções.
- Não persistir a aba ativa entre aberturas do modal.
- Não tocar em hooks, stores, handlers ou em qualquer prop.

## Contexto do código atual

Estrutura do `ConfigModal` (não usa `BaseModal`; é um container manual):

```
overlay (CSS.modalOverlay, linha 376)
└─ container (CSS.modalContainer ... max-w-2xl, linha 377)
   ├─ header (linhas 378-397)         ← permanece intacto
   ├─ content (linha 399)             ← ALVO DA MUDANÇA
   │    <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
   │      {/* SEÇÃO 0 */}  <div> ... </div>
   │      {/* SEÇÃO 1 */}  <div> ... </div>
   │      ... 18 seções como <div>s irmãs ...
   │    </div>
   └─ footer (linhas 3337-3399)       ← permanece intacto (global)
```

Cada seção começa com um comentário `═══ SEÇÃO N: ... ═══` seguido de um `<div>` de
abertura. As seções são `<div>`s irmãs espaçadas pelo `space-y-6` do container.

## Mapa categoria → seções

| id (`SectionId`) | Label na sidebar | Ícone (já importado) | Seções originais |
|---|---|---|---|
| `providers` | Provedores & Modelos | `Zap` | 1 (Provedor) · 2 (Chaves API) · 3 (Pensamento Prolongado) · 17 (Uso de Tokens) |
| `assist` | Assistência de IA | `Sparkles` | 4 (Double Check) · 4.5 (Melhoria de Voz) · 4.6 (Geração inline Ctrl+K) |
| `analysis` | Análise & Relatórios | `FileText` | 5 (Nível de Detalhe) · 6 (Tópicos/Requisição) · 7 (Requisições Paralelas) · 18 (Tópicos Complementares) |
| `docs` | Documentos | `ScrollText` | 8 (Modo de PDF) · 9 (Anonimização) |
| `data` | Busca & Dados | `BookOpen` | 10 (Base de Dados) · 11 (Busca Semântica) |
| `prompts` | Prompts & Modelos | `Wand2` | 12-15 (Modelos Customizados) · 16 (Prompts Rápidos) |
| `appearance` | Aparência | `Type` | 0 (Fonte da aplicação) |

Categoria inicial: `providers`.

## Arquitetura da mudança

Três alterações, todas em `ConfigModal.tsx`:

### A. Estado novo
```ts
type SectionId = 'providers' | 'assist' | 'analysis' | 'docs' | 'data' | 'prompts' | 'appearance';
const [activeSection, setActiveSection] = React.useState<SectionId>('providers');
```
E um array de configuração das categorias (id, label, ícone), declarado como `const ... as const`
fora do JSX, para gerar a sidebar via `.map()`.

### B. Layout em duas colunas
O container de content (linha 399) deixa de ser uma coluna única e passa a:
- aumentar a largura do modal: `max-w-2xl` → `max-w-4xl` (linha 377);
- envolver o conteúdo numa estrutura **flex** de duas colunas:
  - **Sidebar** (esquerda, `w-48` fixa, sem scroll): `.map()` das 7 categorias renderizando
    botões com ícone + label. Botão ativo em **azul** (`bg-blue-500/10 border-blue-500`,
    seguindo a convenção de cor do projeto — sem roxo). Demais botões neutros com hover.
  - **Painel** (direita, `flex-1`): recebe o `max-h-[60vh] overflow-y-auto` (o scroll migra
    do container único para cá) e contém as 18 seções.

### C. Visibilidade por seção (o ponto-chave do baixo risco)
**Nenhum bloco grande de JSX é movido.** Em cada uma das 18 seções, edita-se **apenas a
linha de abertura** do `<div>`, anexando uma classe condicional:

```tsx
// antes:
<div>
// depois (seção da categoria 'providers'):
<div className={activeSection === 'providers' ? 'mb-6' : 'hidden'}>
```

- O conteúdo interno de cada seção permanece **byte-a-byte idêntico**.
- Seções ocultas usam `hidden` (`display:none`) → não ocupam espaço; as visíveis de uma
  mesma categoria aparecem em sequência mesmo não estando fisicamente contíguas no código
  (ex.: seção 17 "Uso de Tokens" continua fisicamente no fim, mas renderiza logo após a
  seção 3 quando `providers` está ativo). Por isso **não é preciso reordenar** o código.
- Cada seção visível recebe `mb-6` (margin-bottom) no lugar do antigo `space-y-6` do
  container, evitando gap espúrio no topo quando o primeiro filho físico está oculto.
- Para seções cujo `<div>` de abertura **já tem** `className`, a classe condicional é
  **mesclada** (template string), não substituída.

Resultado: **~18 edições de uma linha** + o wrapper de layout (sidebar + painel) + o
container flex. Zero alteração em lógica, hooks, handlers ou props.

## Comportamento

- **Footer global:** Exportar/Importar/Modelo atual/Fechar permanecem fora do painel,
  inalterados (linhas 3337-3399).
- **Temas claro/escuro:** somente classes `theme-*` e `dark:` já existentes; o estado ativo
  da aba reusa o padrão de seleção já presente no modal.
- **Reset:** a aba ativa volta a `providers` a cada abertura (sem persistência).
- **Acessibilidade mínima:** botões da sidebar com `title` e estado visual claro de ativo.

## Riscos, mitigação e rollback

| Risco | Mitigação |
|---|---|
| Anexar `className` numa seção que já tinha um → quebrar estilo | Mesclar na classe existente, nunca substituir; revisar as 18 aberturas uma a uma |
| Tag JSX desbalanceada ao inserir wrapper de duas colunas | Wrapper adicionado só em volta do bloco já existente; validar com `npx tsc --noEmit` |
| Ícone inexistente | Todos os 7 ícones escolhidos já constam do import de `lucide-react` (linhas 27-32) |
| Gap de espaçamento por `space-y` + `hidden` | Trocar `space-y-6` do container por `mb-6` por seção |

**Rollback:** mudança isolada em 1 arquivo, sem migração de dados nem mudança de store →
`git revert` do commit resolve 100%.

## Verificação

1. `npx tsc --noEmit` sem erros novos.
2. Abrir o modal no app: as 7 categorias aparecem na sidebar; clicar cada uma mostra
   exatamente as seções mapeadas; nenhuma seção some ou duplica.
3. Conferir nos dois temas (claro/escuro).
4. Conferir que todos os controles continuam funcionais (toggles, dropdowns, inputs,
   botões de teste/download) — são os mesmos elementos de antes.

## Versionamento

Bump de patch em **4 arquivos**: `CLAUDE.md` (linha 7), `src/App.tsx` (`APP_VERSION`),
`src/constants/changelog.js`, `package.json` → **v1.52.22**.
