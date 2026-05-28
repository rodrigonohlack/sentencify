# Design — Rename inline de número do processo no Histórico de Prova Oral

**Data:** 2026-05-28
**Subapp:** Prova Oral
**Tipo:** Feature de UI + correção latente no backend

## Contexto

No painel **Histórico de Análises** do subapp Prova Oral (`HistoricoModal.tsx`), cada card exibe o número do processo extraído da análise. Hoje esse valor é somente leitura. Quando a IA extrai um número errado ou ausente, o usuário não tem como corrigir — fica preso com o rótulo errado.

A solução é permitir **edição inline** do número, com persistência no backend e propagação automática para os outros pontos do subapp que leem esse campo.

## Decisões de produto

- **Semântica de "renomear":** sobrescrever o campo `numeroProcesso` (texto livre, não há validação de formato CNJ).
- **Escopo do rename:** somente análises próprias (`isOwn !== false`). Análises compartilhadas por outros usuários não exibem o controle, espelhando a regra do botão de excluir.
- **Vazio é permitido:** apagar tudo e confirmar grava `null` e o card volta a "Processo não identificado". Reversível pelo mesmo controle.

## UX

### Estado padrão (modo display)

```
┌─ Card ListItem ───────────────────┐
│ 0001234-56.2024.5.08.0001 ✏️       │
│ Reclamante  vs  Reclamada         │
│ 3 depoentes  2 temas              │
└───────────────────────────────────┘
```

Botão lápis fica ao lado do número. Visível só em análises próprias. Em compartilhadas, o número continua exibido sem o lápis.

### Estado de edição

```
┌─ Card em edição ─────────────────┐
│ [0001234-56.2024.5.08.0001|]     │
│  Enter salva · Esc cancela       │
└──────────────────────────────────┘
```

- Click no lápis abre o input, com `autoFocus` e seleção total do texto.
- **Enter** ou **blur** → salva (se valor mudou).
- **Escape** → descarta a edição e volta ao modo display.
- Durante o save, lápis vira spinner pequeno; input fica desabilitado.

### Propagação automática

Após salvar, o novo número aparece em todos os lugares que leem `analysis.numeroProcesso` ou `analysis.resultado.processo.numeroProcesso` do store singleton `useAnalysesStore`:

- Lista do `HistoricoModal` (filtro de busca passa a casar pelo novo número).
- `AnalysisSelectorModal` (input do subapp).
- `ComparativoTab` (resultado renderizado).
- `useAnalisadorIntegration` (sincronização entre subapps).

## Arquitetura

### Backend

**Arquivo:** `server/routes/prova-oral.js`, handler `router.put('/:id', ...)`.

**Problema atual:** o PUT só atualiza a coluna `resultado` (JSON). As colunas desnormalizadas `numero_processo`, `reclamante`, `reclamada`, `vara` ficam estagnadas com o valor do INSERT inicial. Isso é um bug latente — qualquer edição que toque o processo via JSON fica invisível na listagem (que lê das colunas desnormalizadas).

**Mudança:** re-extrair os quatro campos do `resultado.processo` e gravá-los no UPDATE junto com o JSON:

```js
const numeroProcesso = resultado.processo?.numeroProcesso || null;
const reclamante = resultado.processo?.reclamante || null;
const reclamada = resultado.processo?.reclamada || null;
const vara = resultado.processo?.vara || null;

db.prepare(`
  UPDATE prova_oral_analyses
  SET resultado = ?, numero_processo = ?, reclamante = ?, reclamada = ?, vara = ?, updated_at = ?
  WHERE id = ? AND deleted_at IS NULL
`).run(JSON.stringify(resultado), numeroProcesso, reclamante, reclamada, vara, now, id);
```

**Efeito colateral intencional:** salvamentos atuais que usam esse PUT (ex: highlights da `ComparativoTab`) passam a manter as colunas desnormalizadas em sincronia. Correção, não regressão — os valores extraídos eram justamente os mesmos que já estavam no JSON.

### API client

**Arquivo:** `src/apps/prova-oral/hooks/useProvaOralAPI.ts`.

**Sem mudança.** O método `updateAnalysis({ id, resultado })` já existe. O front modifica `resultado.processo.numeroProcesso` e chama esse método.

### Store

**Arquivo:** `src/apps/prova-oral/stores/useAnalysesStore.ts`.

**Sem mudança.** `updateAnalysis(id, updates: Partial<SavedProvaOralAnalysis>)` já aceita updates parciais. O componente passa `{ numeroProcesso, resultado }` com ambos sincronizados em uma única chamada.

### UI

**Arquivo:** `src/apps/prova-oral/components/history/HistoricoModal.tsx`.

Novo subcomponente local `EditableProcessNumber` substituindo o bloco "Número do processo" (linhas 211-217 do arquivo atual).

**Props:**

```ts
interface EditableProcessNumberProps {
  value: string | null;
  canEdit: boolean;          // analysis.isOwn !== false
  isSelected: boolean;       // para herdar a classe de cor
  onSave: (newValue: string | null) => Promise<void>;
}
```

**Estado interno:**

- `isEditing: boolean`
- `localValue: string`
- `isSaving: boolean`

**Handlers:**

- `handleStartEdit()` — `setIsEditing(true)`, `setLocalValue(value ?? '')`.
- `handleSave()` — se `localValue.trim()` difere de `value`, chama `onSave(localValue.trim() || null)`; `setIsSaving(true)` durante; ao fim, `setIsEditing(false)`. Idempotente em re-entradas.
- `handleCancel()` — `setIsEditing(false)`, sem chamar `onSave`.
- `onKeyDown` — Enter → `handleSave()`; Escape → `handleCancel()`.
- Todos os handlers ligados ao botão lápis e ao input chamam `e.stopPropagation()` para não disparar o `onClick` do card externo (que seleciona a análise).

**Handler no `HistoricoModal`** (passado como `onSave`):

```ts
const handleRenameProcesso = useCallback(
  async (id: string, newNumero: string | null) => {
    const analysis = analyses.find(a => a.id === id);
    if (!analysis) return;

    const snapshot = {
      numeroProcesso: analysis.numeroProcesso,
      resultado: analysis.resultado,
    };

    const novoResultado = {
      ...analysis.resultado,
      processo: {
        ...analysis.resultado.processo,
        numeroProcesso: newNumero,
      },
    };

    // Optimistic update
    updateAnalysisInStore(id, {
      numeroProcesso: newNumero,
      resultado: novoResultado,
    });

    const ok = await updateAnalysis({ id, resultado: novoResultado });
    if (!ok) {
      // Revert
      updateAnalysisInStore(id, snapshot);
      showToast('error', 'Não foi possível renomear o processo.');
    }
  },
  [analyses, updateAnalysisInStore, updateAnalysis]
);
```

`updateAnalysisInStore` vem de `useAnalysesStore().updateAnalysis` (já existe). `showToast` vem do `useToast()` exportado em `src/apps/prova-oral/components/ui/Toast.tsx` — padrão já usado em outros pontos do subapp.

**Por que otimista:** rename é interação rápida; bloquear UI por ~500ms de round-trip degrada UX. Snapshot + revert no catch dá segurança sem latência.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| PUT atualizar colunas desnormalizadas quebra fluxo de highlights em análises compartilhadas | Destinatário sempre envia o `resultado` íntegro (que já carregava os mesmos campos do `processo`); a re-extração não altera valores, só sincroniza. Sem regressão semântica. |
| `stopPropagation` esquecido faz o card "selecionar análise" ao clicar no lápis ou digitar no input | Coberto explicitamente em `onClick` do botão lápis e nos eventos do input. Teste manual durante implementação. |
| Otimismo + falha de rede deixa store local divergente do servidor | Snapshot do estado anterior antes da chamada; revert no catch; toast de erro informa o usuário. |
| Usuário renomeia para string vazia sem querer | Aceito como `null` com placeholder "Processo não identificado". Totalmente reversível pelo mesmo controle. |
| Race condition se usuário editar e fechar modal antes do save terminar | `isSaving` permanece até a promise resolver. O modal fecha mas a chamada termina em background; store é atualizado no resolve. |

## Rollback

- **Backend:** reverter a query do `PUT /api/prova-oral/:id` para a versão anterior. Sem migração de schema; rollback puro de código.
- **Frontend:** substituir `<EditableProcessNumber>` pelo `<p>` simples original. Um único commit.

## Testes

- **`useProvaOralAPI.test.ts`** (existente): adicionar caso cobrindo `updateAnalysis` com `resultado.processo.numeroProcesso` alterado — mock retorna ok; assert que store local reflete novo `numeroProcesso` plano e novo `resultado.processo.numeroProcesso`.
- **`EditableProcessNumber`** (novo): teste leve — render display com lápis para `canEdit=true`; sem lápis para `canEdit=false`; click no lápis abre input; Enter chama `onSave` com valor trimmado; Escape NÃO chama `onSave`; vazio chama `onSave(null)`.
- **Backend:** sem suite de testes JS no `server/`; smoke-test manual via curl/script após deploy local.

## Fora de escopo (YAGNI)

- Edição de reclamante / reclamada / vara — possível como extensão futura usando a mesma infraestrutura, mas não pedido.
- Validação de formato CNJ — usuário pode usar texto livre (ex.: cadastrar apelido temporário sem número).
- Histórico de renames — não há requisito de auditoria; o `updated_at` muda e basta.
- Renomear em lote — fluxo de seleção múltipla não existe no `HistoricoModal` da prova oral (existe no analisador, mas é outro subapp).
