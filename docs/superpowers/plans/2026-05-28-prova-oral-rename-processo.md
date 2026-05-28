# Rename Inline de Número do Processo no Histórico de Prova Oral — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar edição inline (lápis ✏️ → input → Enter/Esc) do `numeroProcesso` em cada card do `HistoricoModal` do subapp Prova Oral, persistindo a mudança no backend e propagando para todos os pontos que leem esse campo.

**Architecture:** Sincronizar as colunas desnormalizadas (`numero_processo`, `reclamante`, `reclamada`, `vara`) com o JSON `resultado` no handler `PUT /api/prova-oral/:id` — corrige bug latente e viabiliza o rename. No front, novo subcomponente local `EditableProcessNumber` no arquivo do `HistoricoModal`, com salvamento otimista via `updateAnalysis({ id, resultado })` existente; revert + toast em caso de falha. Apenas análises próprias (`isOwn !== false`) exibem o controle.

**Tech Stack:** React + TypeScript + Zustand + Vitest + @testing-library/react no front; Express + better-sqlite3 no backend. Toast já existente via `useToast()` de `src/apps/prova-oral/components/ui/Toast.tsx`.

**Spec:** `docs/superpowers/specs/2026-05-28-prova-oral-rename-processo-design.md`.

---

## Mapa de arquivos

**Criar:**
- `src/apps/prova-oral/components/history/EditableProcessNumber.tsx` — subcomponente isolado para reuso e teste.
- `src/apps/prova-oral/components/history/EditableProcessNumber.test.tsx` — testes do subcomponente.

**Modificar:**
- `server/routes/prova-oral.js` (handler PUT `:id`, ~linhas 281-317) — sincronizar colunas desnormalizadas.
- `src/apps/prova-oral/components/history/HistoricoModal.tsx` — importar `EditableProcessNumber`, criar handler `handleRenameProcesso`, substituir o `<p>` do número (linhas 211-217 atuais), expor toast.
- `src/apps/prova-oral/components/history/index.ts` — exportar `EditableProcessNumber`.
- `src/apps/prova-oral/hooks/useProvaOralAPI.test.ts` — adicionar caso para `updateAnalysis` com rename.
- `CLAUDE.md` (linha 7) — bump de versão.
- `src/constants/app-version.ts` (linha 6) — bump de versão.
- `src/constants/changelog.js` — novo entry no topo do array.
- `package.json` (linha 3) — bump de versão.

---

## Task 1: Backend sincroniza colunas desnormalizadas no PUT

Corrige a inconsistência: o PUT atual atualiza o JSON `resultado` mas deixa as colunas indexadas (`numero_processo`, `reclamante`, `reclamada`, `vara`) com o valor antigo do INSERT. Isso é pré-requisito para que o rename apareça na listagem.

**Files:**
- Modify: `server/routes/prova-oral.js:281-317`

- [ ] **Step 1.1: Editar o handler PUT**

Substituir o bloco do UPDATE no `router.put('/:id', ...)`:

Antes (linhas 307-310):

```js
    const result = db.prepare(`
      UPDATE prova_oral_analyses SET resultado = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `).run(JSON.stringify(resultado), now, id);
```

Depois:

```js
    // Re-extrair colunas desnormalizadas para manter em sincronia com o JSON.
    // Sem isso, edições no resultado.processo (ex: rename do número) ficam
    // invisíveis na listagem, que lê das colunas indexadas.
    const numeroProcesso = resultado.processo?.numeroProcesso || null;
    const reclamante = resultado.processo?.reclamante || null;
    const reclamada = resultado.processo?.reclamada || null;
    const vara = resultado.processo?.vara || null;

    const result = db.prepare(`
      UPDATE prova_oral_analyses
      SET resultado = ?, numero_processo = ?, reclamante = ?, reclamada = ?, vara = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `).run(
      JSON.stringify(resultado),
      numeroProcesso,
      reclamante,
      reclamada,
      vara,
      now,
      id
    );
```

- [ ] **Step 1.2: Smoke-test manual do PUT**

Rodar o servidor local (em outro terminal):

```bash
npm run server
```

Em outro terminal, com um token JWT válido (do magic link), enviar um PUT modificando só `resultado.processo.numeroProcesso`:

```bash
# Substituir <TOKEN> e <ID> por valores reais
curl -X PUT http://localhost:3000/api/prova-oral/<ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"resultado":{"processo":{"numeroProcesso":"TESTE-001","reclamante":"X","reclamada":"Y","vara":"V"},"depoentes":[],"sinteses":[],"analises":[],"contradicoes":[],"confissoes":[],"credibilidade":[]}}'
```

Expected output: `{"id":"<ID>","message":"Análise atualizada com sucesso"}`

Conferir no banco que a coluna desnormalizada mudou:

```bash
sqlite3 server/db/sentencify.db "SELECT numero_processo FROM prova_oral_analyses WHERE id='<ID>';"
```

Expected: `TESTE-001`

Se ambiente local não estiver disponível, pular o smoke-test e validar via front no fim do Task 3.

- [ ] **Step 1.3: Commit**

```bash
git add server/routes/prova-oral.js
git commit -m "fix(prova-oral-backend): sincronizar colunas desnormalizadas no PUT

PUT /api/prova-oral/:id só atualizava o JSON resultado; as colunas
numero_processo/reclamante/reclamada/vara ficavam estagnadas com o valor
do INSERT inicial. Qualquer edição via JSON (ex.: rename de número, fix
de highlights que toque o processo) ficava invisível na listagem, que lê
das colunas indexadas. Agora o UPDATE re-extrai os quatro campos do
resultado.processo e grava junto com o JSON.

Pré-requisito para feature de rename inline no histórico."
```

---

## Task 2: Componente `EditableProcessNumber`

Subcomponente isolado, testável, sem conhecimento de store ou API — recebe `value`, `canEdit` e `onSave`. Permite teste unitário simples.

**Files:**
- Create: `src/apps/prova-oral/components/history/EditableProcessNumber.tsx`
- Create: `src/apps/prova-oral/components/history/EditableProcessNumber.test.tsx`

- [ ] **Step 2.1: Escrever os testes (falham primeiro)**

Criar `src/apps/prova-oral/components/history/EditableProcessNumber.test.tsx`:

```tsx
/**
 * @file EditableProcessNumber.test.tsx
 * @description Testes do subcomponente de rename inline.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditableProcessNumber } from './EditableProcessNumber';

describe('EditableProcessNumber', () => {
  it('shows the number with a pencil button when canEdit=true', () => {
    render(
      <EditableProcessNumber
        value="0001234-56.2024.5.08.0001"
        canEdit={true}
        isSelected={false}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('0001234-56.2024.5.08.0001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /renomear/i })).toBeInTheDocument();
  });

  it('hides the pencil button when canEdit=false', () => {
    render(
      <EditableProcessNumber
        value="0001234-56.2024.5.08.0001"
        canEdit={false}
        isSelected={false}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /renomear/i })).not.toBeInTheDocument();
  });

  it('shows fallback when value is null', () => {
    render(
      <EditableProcessNumber
        value={null}
        canEdit={true}
        isSelected={false}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('Processo não identificado')).toBeInTheDocument();
  });

  it('enters edit mode on pencil click and focuses input', () => {
    render(
      <EditableProcessNumber
        value="ABC-1"
        canEdit={true}
        isSelected={false}
        onSave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('ABC-1');
    expect(document.activeElement).toBe(input);
  });

  it('calls onSave with trimmed value when Enter is pressed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditableProcessNumber
        value="ABC-1"
        canEdit={true}
        isSelected={false}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  NEW-2  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('NEW-2');
    });
  });

  it('calls onSave(null) when input is emptied and Enter pressed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditableProcessNumber
        value="ABC-1"
        canEdit={true}
        isSelected={false}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(null);
    });
  });

  it('does NOT call onSave when Escape is pressed', () => {
    const onSave = vi.fn();
    render(
      <EditableProcessNumber
        value="ABC-1"
        canEdit={true}
        isSelected={false}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'NEW' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('ABC-1')).toBeInTheDocument();
  });

  it('does NOT call onSave when value is unchanged', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditableProcessNumber
        value="ABC-1"
        canEdit={true}
        isSelected={false}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });

    // microtask flush
    await Promise.resolve();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('stops propagation of pencil click', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <EditableProcessNumber
          value="ABC-1"
          canEdit={true}
          isSelected={false}
          onSave={vi.fn()}
        />
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2.2: Rodar testes — devem falhar**

```bash
npx vitest run src/apps/prova-oral/components/history/EditableProcessNumber.test.tsx
```

Expected: FAIL com erro de import `Cannot find module './EditableProcessNumber'`.

- [ ] **Step 2.3: Implementar o componente**

Criar `src/apps/prova-oral/components/history/EditableProcessNumber.tsx`:

```tsx
/**
 * @file EditableProcessNumber.tsx
 * @description Subcomponente para edição inline do número do processo
 *              em cards do histórico. Sem conhecimento de store ou API —
 *              recebe `value`, `canEdit`, `onSave` e gerencia somente o
 *              modo de edição local. O caller é responsável por persistir.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';

interface EditableProcessNumberProps {
  /** Número atual (null = não identificado). */
  value: string | null;
  /** Mostra o lápis somente quando true (regra: análise própria). */
  canEdit: boolean;
  /** Herda a cor do texto do estado de seleção do card. */
  isSelected: boolean;
  /**
   * Callback chamado ao confirmar a edição (Enter ou blur).
   * Recebe o novo valor trimmado, ou null se foi esvaziado.
   * Não é chamado se o valor não mudou ou se o usuário cancelou (Esc).
   */
  onSave: (newValue: string | null) => Promise<void>;
}

const FALLBACK_LABEL = 'Processo não identificado';

export const EditableProcessNumber: React.FC<EditableProcessNumberProps> = ({
  value,
  canEdit,
  isSelected,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focar e selecionar todo o texto ao entrar em edição.
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setLocalValue(value ?? '');
      setIsEditing(true);
    },
    [value]
  );

  const handleSave = useCallback(async () => {
    const trimmed = localValue.trim();
    const normalized = trimmed === '' ? null : trimmed;

    // Sem mudança → só sai do modo edição sem chamar onSave.
    if (normalized === (value ?? null) || (normalized === null && value === null)) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(normalized);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }, [localValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const textColor = isSelected
    ? 'text-indigo-700 dark:text-indigo-300'
    : 'text-slate-800 dark:text-slate-100';

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => void handleSave()}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={isSaving}
          className={`
            font-medium px-2 py-0.5 rounded-md border border-indigo-300 dark:border-indigo-600
            bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            disabled:opacity-60
            min-w-0 flex-1
          `}
          placeholder="Número do processo"
        />
        {isSaving && (
          <Loader2 className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <p className={`font-medium truncate ${textColor}`}>
        {value || FALLBACK_LABEL}
      </p>
      {canEdit && (
        <button
          type="button"
          onClick={handleStartEdit}
          onMouseDown={(e) => e.stopPropagation()}
          className="
            flex-shrink-0 p-1 rounded-md text-slate-400 dark:text-slate-500
            hover:text-indigo-600 dark:hover:text-indigo-400
            hover:bg-indigo-50 dark:hover:bg-indigo-900/30
            transition-colors
          "
          title="Renomear processo"
          aria-label="Renomear processo"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default EditableProcessNumber;
```

- [ ] **Step 2.4: Rodar testes — devem passar**

```bash
npx vitest run src/apps/prova-oral/components/history/EditableProcessNumber.test.tsx
```

Expected: PASS (9 testes).

Se algum falhar, ler o erro e ajustar o componente ANTES de prosseguir.

- [ ] **Step 2.5: Exportar via index.ts**

Editar `src/apps/prova-oral/components/history/index.ts`. Ler o arquivo primeiro para preservar exports existentes; em seguida adicionar a linha:

```ts
export { EditableProcessNumber } from './EditableProcessNumber';
```

- [ ] **Step 2.6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero erros novos.

- [ ] **Step 2.7: Commit**

```bash
git add src/apps/prova-oral/components/history/EditableProcessNumber.tsx \
        src/apps/prova-oral/components/history/EditableProcessNumber.test.tsx \
        src/apps/prova-oral/components/history/index.ts
git commit -m "feat(prova-oral): componente EditableProcessNumber

Subcomponente isolado para edição inline do número do processo.
Lápis ✏️ ao lado do número quando canEdit=true; clique abre input com
autofocus e seleção total. Enter/blur salvam, Escape cancela. Valor vazio
salva como null e mostra placeholder 'Processo não identificado'.
stopPropagation em todos os handlers para não disparar onClick do card pai.
Sem conhecimento de store ou API — caller fornece onSave."
```

---

## Task 3: Wire-up no `HistoricoModal`

Conectar o `EditableProcessNumber` ao store + API com salvamento otimista e revert em erro.

**Files:**
- Modify: `src/apps/prova-oral/components/history/HistoricoModal.tsx`

- [ ] **Step 3.1: Ler o arquivo atual**

Reler o `HistoricoModal.tsx` para fixar o contexto (você precisará achar a linha 211 — bloco do número do processo).

```bash
# (ferramenta Read na conversa)
```

- [ ] **Step 3.2: Adicionar imports**

No topo do arquivo, juntar aos imports existentes:

```tsx
import { Modal, Button, Card, CardContent, useToast } from '../ui';
import { useAnalysesStore, useProvaOralStore } from '../../stores';
import { useProvaOralAPI } from '../../hooks';
import { EditableProcessNumber } from './EditableProcessNumber';
import type { SavedProvaOralAnalysis, ProvaOralResult } from '../../types';
```

Notas:
- `useToast` é adicionado ao import do `'../ui'`.
- `EditableProcessNumber` é o novo subcomponente.
- `ProvaOralResult` é o tipo do `resultado` (já está exportado em `../../types`).

- [ ] **Step 3.3: Adicionar destructure do store e hooks**

Logo abaixo do destructure existente de `useAnalysesStore`, expor `updateAnalysis` do store local. Antes:

```tsx
  const { analyses, isLoading, error, filters, setFilters, getFilteredAnalyses } = useAnalysesStore();
  const { loadAnalysis, setLoadedAnalysisId } = useProvaOralStore();
  const { fetchAnalyses, deleteAnalysis } = useProvaOralAPI();
```

Depois:

```tsx
  const {
    analyses,
    isLoading,
    error,
    filters,
    setFilters,
    getFilteredAnalyses,
    updateAnalysis: updateAnalysisInStore,
  } = useAnalysesStore();
  const { loadAnalysis, setLoadedAnalysisId } = useProvaOralStore();
  const { fetchAnalyses, deleteAnalysis, updateAnalysis } = useProvaOralAPI();
  const { showToast } = useToast();
```

- [ ] **Step 3.4: Adicionar handler `handleRenameProcesso`**

Logo antes do `formatDate` (ou em qualquer lugar acima do JSX), adicionar:

```tsx
  const handleRenameProcesso = useCallback(
    async (analysisId: string, newNumero: string | null): Promise<void> => {
      const analysis = analyses.find((a) => a.id === analysisId);
      if (!analysis) return;

      // Snapshot para revert em caso de falha.
      const snapshot = {
        numeroProcesso: analysis.numeroProcesso,
        resultado: analysis.resultado,
      };

      // Construir o novo resultado mantendo todos os outros campos.
      // Apenas processo.numeroProcesso é atualizado; processo.numero (legado
      // gerado pela IA) é deixado intocado para preservar o original.
      const novoResultado: ProvaOralResult = {
        ...analysis.resultado,
        processo: {
          ...analysis.resultado.processo,
          numeroProcesso: newNumero ?? undefined,
        },
      };

      // Optimistic update — UI reflete imediatamente.
      updateAnalysisInStore(analysisId, {
        numeroProcesso: newNumero,
        resultado: novoResultado,
      });

      const ok = await updateAnalysis({ id: analysisId, resultado: novoResultado });
      if (!ok) {
        // Revert + toast.
        updateAnalysisInStore(analysisId, snapshot);
        showToast('error', 'Não foi possível renomear o processo.');
      }
    },
    [analyses, updateAnalysisInStore, updateAnalysis, showToast]
  );
```

Importar `useCallback` se ainda não estiver importado no arquivo (checar a linha de import do React). O arquivo já usa hooks, então `useCallback` provavelmente já está importado; se não, adicionar:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
```

- [ ] **Step 3.5: Substituir o `<p>` do número do processo**

Antes (linhas ~210-217 do arquivo atual):

```tsx
                  {/* Número do processo */}
                  <p className={`font-medium truncate ${
                    selectedId === analysis.id
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}>
                    {analysis.numeroProcesso || 'Processo não identificado'}
                  </p>
```

Depois:

```tsx
                  {/* Número do processo — editável apenas em análises próprias */}
                  <EditableProcessNumber
                    value={analysis.numeroProcesso}
                    canEdit={analysis.isOwn !== false}
                    isSelected={selectedId === analysis.id}
                    onSave={(newValue) => handleRenameProcesso(analysis.id, newValue)}
                  />
```

- [ ] **Step 3.6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero erros novos. Se `ProvaOralResult.processo.numeroProcesso` esperar string e não `string | undefined`, ajustar a chamada para `numeroProcesso: newNumero ?? ''` em vez de `undefined` (depende do tipo exato — checar `src/apps/prova-oral/types/prova-oral.types.ts`).

- [ ] **Step 3.7: Smoke-test manual no front**

Rodar o dev server:

```bash
npm run dev
```

No browser:
1. Logar no subapp Prova Oral.
2. Abrir o Histórico.
3. Clicar no lápis ao lado do número de uma análise própria.
4. Editar para um valor de teste e pressionar Enter.
5. Conferir que o card mostra o novo valor.
6. Fechar e reabrir o histórico → valor persiste (vem do backend).
7. Pressionar lápis, Escape → reverte sem chamar API.
8. Esvaziar input + Enter → mostra "Processo não identificado".
9. Conferir que análises compartilhadas (com badge "Compartilhada por") NÃO mostram o lápis.
10. (Se possível) simular falha de rede no DevTools (Offline) e tentar renomear: deve reverter e mostrar toast.

- [ ] **Step 3.8: Commit**

```bash
git add src/apps/prova-oral/components/history/HistoricoModal.tsx
git commit -m "feat(prova-oral): rename inline de processo no histórico

Wire-up do EditableProcessNumber no HistoricoModal. handleRenameProcesso
faz update otimista no store, chama useProvaOralAPI.updateAnalysis com
resultado.processo.numeroProcesso modificado, e em caso de falha reverte
o store e mostra toast de erro. Mostra lápis apenas em análises próprias
(isOwn !== false), espelhando a regra do botão de excluir."
```

---

## Task 4: Teste do `updateAnalysis` cobrindo rename

Adicionar caso ao `useProvaOralAPI.test.ts` confirmando que o PUT é chamado com o `resultado` modificado.

**Files:**
- Modify: `src/apps/prova-oral/hooks/useProvaOralAPI.test.ts`

- [ ] **Step 4.1: Ler o arquivo atual**

Reler `useProvaOralAPI.test.ts` (em particular a estrutura dos mocks e do `describe('updateAnalysis', ...)` se já existir; se não existir, será criado).

- [ ] **Step 4.2: Adicionar caso de teste**

Localizar o `describe('useProvaOralAPI', ...)` e adicionar (dentro dele, perto dos outros `describe` de método):

```ts
  describe('updateAnalysis (rename de processo)', () => {
    it('PUT com resultado contendo numeroProcesso modificado', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'analysis-1', message: 'ok' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      const novoResultado = {
        ...mockAnalysis.resultado,
        processo: {
          ...mockAnalysis.resultado.processo,
          numeroProcesso: 'NOVO-001',
        },
      };

      let ok = false;
      await act(async () => {
        ok = await result.current.updateAnalysis({
          id: 'analysis-1',
          resultado: novoResultado,
        });
      });

      expect(ok).toBe(true);
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/prova-oral/analysis-1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resultado: novoResultado }),
        })
      );
    });

    it('retorna false e seta error quando PUT falha', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Erro de teste' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let ok = true;
      await act(async () => {
        ok = await result.current.updateAnalysis({
          id: 'analysis-1',
          resultado: mockAnalysis.resultado,
        });
      });

      expect(ok).toBe(false);
      expect(mockSetError).toHaveBeenCalledWith('Erro de teste');
    });
  });
```

Se o mock do store no topo do arquivo NÃO expõe `updateAnalysis` (verificar nas linhas 31-41), o `updateAnalysis` do hook só usa `addAnalysis` e `removeAnalysis` (verificado no source) — sem mudança no mock necessária.

- [ ] **Step 4.3: Rodar os testes do hook**

```bash
npx vitest run src/apps/prova-oral/hooks/useProvaOralAPI.test.ts
```

Expected: PASS (testes existentes + 2 novos).

- [ ] **Step 4.4: Commit**

```bash
git add src/apps/prova-oral/hooks/useProvaOralAPI.test.ts
git commit -m "test(prova-oral): cobertura de updateAnalysis para rename de processo

Valida que PUT é chamado com /api/prova-oral/:id e body contendo o
resultado modificado, e que erro do servidor é propagado via setError
+ retorno false."
```

---

## Task 5: Bump de versão + entry no changelog

Versão atual `1.47.0` → `1.48.0` (feature nova).

**Files:**
- Modify: `CLAUDE.md:7`
- Modify: `src/constants/app-version.ts:6`
- Modify: `src/constants/changelog.js` (topo do array `CHANGELOG`)
- Modify: `package.json:3`

- [ ] **Step 5.1: Atualizar `src/constants/app-version.ts`**

```ts
export const APP_VERSION = '1.48.0';
```

- [ ] **Step 5.2: Atualizar `package.json`**

Trocar `"version": "1.47.0"` por `"version": "1.48.0"`.

- [ ] **Step 5.3: Atualizar `CLAUDE.md` (linha 7)**

Trocar `**Version**: 1.47.0` por `**Version**: 1.48.0`.

- [ ] **Step 5.4: Inserir entry no `src/constants/changelog.js`**

Logo após `export const CHANGELOG = [` (linha 4-5), inserir como primeiro elemento:

```js
  {
    version: '1.48.0',
    feature: 'feat(prova-oral): rename inline do número do processo no histórico de análises. Cada card do HistoricoModal do subapp Prova Oral ganha um ícone de lápis ao lado do número — clicar transforma em input com autofocus e seleção total; Enter ou blur salvam, Escape cancela. Valor vazio é aceito e mostra placeholder "Processo não identificado", totalmente reversível pelo mesmo controle. Apenas análises próprias (isOwn !== false) exibem o lápis; análises compartilhadas por outros usuários continuam somente leitura, espelhando a regra do botão de excluir. Salvamento otimista: store local atualiza imediatamente, chamada API (PUT /api/prova-oral/:id com resultado.processo.numeroProcesso modificado) corre em background; em caso de falha, snapshot é restaurado e toast de erro é exibido via useToast já existente. Mudança colateral no backend (server/routes/prova-oral.js): o PUT agora re-extrai numero_processo / reclamante / reclamada / vara do resultado.processo e grava nas colunas desnormalizadas indexadas — antes só atualizava a coluna resultado (JSON), deixando as colunas estagnadas com o valor do INSERT inicial. Sem isso, edições via JSON ficavam invisíveis na listagem (que lê das colunas), bug latente que afetava também o salvamento de highlights na ComparativoTab. Por usar o store singleton useAnalysesStore, o novo número se propaga automaticamente para AnalysisSelectorModal (input do subapp), ComparativoTab e useAnalisadorIntegration. Novo arquivo: src/apps/prova-oral/components/history/EditableProcessNumber.tsx (subcomponente isolado e testado em EditableProcessNumber.test.tsx — 9 casos cobrindo display, edição, Enter/Esc/blur, vazio→null, stopPropagation). Arquivos editados: server/routes/prova-oral.js (handler PUT), HistoricoModal.tsx (handler handleRenameProcesso + wire-up), history/index.ts (export), useProvaOralAPI.test.ts (+2 casos cobrindo rename). Sem migração de schema. Verificação: tsc --noEmit limpo.',
  },
```

(O array tem trailing comma no item anterior — não precisa modificar nada além de inserir.)

- [ ] **Step 5.5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 5.6: Rodar todos os testes do subapp**

```bash
npx vitest run src/apps/prova-oral/
```

Expected: todos passam.

- [ ] **Step 5.7: Commit**

```bash
git add CLAUDE.md src/constants/app-version.ts src/constants/changelog.js package.json
git commit -m "chore(release): v1.48.0 — rename inline de processo no histórico (prova oral)"
```

---

## Self-Review (pós-escrita do plano)

### Cobertura do spec

- ✅ "Editar `numeroProcesso` (texto livre)" → Task 2 + Task 3 (componente trata trim e null; backend aceita string opcional).
- ✅ "Apenas próprias podem renomear" → Task 3 step 3.5 (`canEdit={analysis.isOwn !== false}`).
- ✅ "Edição inline com lápis ✏️, Enter salva, Esc cancela" → Task 2.3 implementa exatamente isso.
- ✅ "Backend sincroniza colunas desnormalizadas" → Task 1.
- ✅ "Otimismo + revert + toast" → Task 3.4 handler.
- ✅ "Propagação automática via store singleton" → Implícita: store local é o singleton; `AnalysisSelectorModal` lê do mesmo store.
- ✅ Riscos do spec → mitigações cobertas (stopPropagation em 2.3; snapshot em 3.4; canEdit gate em 3.5).
- ✅ Testes → `useProvaOralAPI.test.ts` (Task 4) + `EditableProcessNumber.test.tsx` (Task 2).
- ✅ Rollback → puro código, sem migração; cada commit é isolado.

### Placeholder scan

Nenhum "TBD" / "TODO" / "implement later" no plano. Cada step que muda código mostra o código.

### Consistência de tipos e nomes

- `EditableProcessNumber` props: `value`, `canEdit`, `isSelected`, `onSave` — usados consistentemente em Task 2.3, 2.1 (testes), e 3.5 (wire-up).
- `handleRenameProcesso(analysisId, newNumero)` assinatura igual em Task 3.4 e 3.5.
- `updateAnalysisInStore` (alias do `updateAnalysis` do store) vs `updateAnalysis` (do hook API) — distinção explícita em 3.3 e 3.4.
- Nome da entrada no changelog usa o mesmo prefixo `feat(prova-oral)` dos commits de feature do front.
- Versão `1.48.0` consistente nos 4 arquivos do Task 5.

---

## Execução

Plan complete and saved to `docs/superpowers/plans/2026-05-28-prova-oral-rename-processo.md`. Two execution options:

**1. Subagent-Driven (recommended)** — eu disparo um subagente fresh por task, reviso entre tasks, iteração rápida.

**2. Inline Execution** — eu executo as tasks nesta sessão usando `executing-plans`, com checkpoints para revisão.

Qual abordagem?
