# Fix do Analisador — pedidos na inicial + divergência via alerta — Plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ancorar os `pedidos` do Analisador na petição inicial; impugnação a parcela não postulada vira `alerta` de divergência (tipo dedicado, severidade média/âmbar), não pedido-fantasma.

**Architecture:** Reusa o mecanismo `alertas[]` já existente (sem mudança de schema/store/UI). A mudança é no prompt `analysis.ts` + teste novo + bump de versão.

**Tech Stack:** TypeScript, Vitest. Prompt é uma constante string (`ANALYSIS_USER_PROMPT`) consumida pelo builder `buildAnalysisPrompt`.

**Spec:** `docs/superpowers/specs/2026-06-04-analisador-fonte-correta-design.md`

---

## Arquivos tocados

- **Modify** `src/apps/analisador/prompts/analysis.ts` — regra de fonte nos pedidos + instrução #14 de divergência + tipo no exemplo de alertas.
- **Create** `src/apps/analisador/prompts/analysis.test.ts` — testes que travam a regra.
- **Modify** `CLAUDE.md`, `package.json`, `src/constants/app-version.ts`, `src/constants/changelog.js` — v1.52.18.

---

## Task 1: Regra de fonte no prompt + testes (TDD)

**Files:**
- Modify: `src/apps/analisador/prompts/analysis.ts`
- Create: `src/apps/analisador/prompts/analysis.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/apps/analisador/prompts/analysis.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAnalysisPrompt } from './analysis';

describe('buildAnalysisPrompt — regra de fonte (v1.52.18)', () => {
  const prompt = buildAnalysisPrompt('petição inicial de teste', [], ['contestação de teste']);

  it('ancora os pedidos na petição inicial', () => {
    expect(prompt).toMatch(/pedidos?[\s\S]{0,120}petição inicial/i);
  });

  it('instrui a não criar pedido para parcela impugnada não postulada', () => {
    expect(prompt).toContain('NÃO crie um pedido');
  });

  it('documenta o tipo de alerta de divergência', () => {
    expect(prompt).toContain('DIVERGÊNCIA - PARCELA NÃO POSTULADA');
  });

  it('preserva o tratamento de reconvenção como pretensão própria da ré', () => {
    expect(prompt).toMatch(/reconvenç/i);
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npx vitest run src/apps/analisador/prompts/analysis.test.ts`
Expected: FAIL nos testes 2 e 3 (texto ainda não existe no prompt).

- [ ] **Step 3: Implementar a regra no prompt**

Em `src/apps/analisador/prompts/analysis.ts`:

(A) Ancorar os pedidos. A linha 100 hoje é:
```
      "descricao": "string DETALHADA do pedido conforme petição",
```
Trocar para:
```
      "descricao": "string DETALHADA do pedido conforme a PETIÇÃO INICIAL (e emendas). Os pedidos correspondem às pretensões formuladas pelo RECLAMANTE na inicial; a contestação alimenta 'defesaReclamada', não cria pedido (salvo reconvenção, ver instrução 12).",
```

(B) Acrescentar o tipo de divergência ao exemplo de `alertas`. A linha 163 hoje é:
```
      "tipo": "string (ex: PRAZO, NULIDADE, DOCUMENTO)",
```
Trocar para:
```
      "tipo": "string (ex: PRAZO, NULIDADE, DOCUMENTO, DIVERGÊNCIA - PARCELA NÃO POSTULADA)",
```

(C) Adicionar a instrução #14 ao final do bloco de INSTRUÇÕES ADICIONAIS (após a instrução 13 que termina na linha 226, antes da crase de fechamento do template literal). Inserir:
```
14. FONTE DOS PEDIDOS (REGRA OBRIGATÓRIA): os 'pedidos' correspondem às pretensões do RECLAMANTE na PETIÇÃO INICIAL (e emendas). A contestação preenche 'defesaReclamada' dos pedidos existentes; ela só introduz pretensão própria via reconvenção (campo 'reconvencao', instrução 12). Se a contestação impugna ou defende uma parcela que NÃO consta da petição inicial e NÃO é reconvenção, NÃO crie um pedido para ela — isso induziria análise de pedido inexistente. Em vez disso, registre um item em 'alertas' com "tipo": "DIVERGÊNCIA - PARCELA NÃO POSTULADA", "severidade": "media", "descricao" indicando a parcela, qual contestação a trouxe e por que diverge, e "recomendacao" para verificar se houve omissão na transcrição da inicial ou erro/excesso da contestação.
```

ATENÇÃO: o prompt é uma template string com placeholders `{PETICAO}`, `{CONTESTACOES}`, etc. Preserve a sintaxe — as inserções são texto literal dentro da string; não introduza crases nem `${}`.

- [ ] **Step 4: Rodar e verificar que passa**

Run: `npx vitest run src/apps/analisador/prompts/analysis.test.ts`
Expected: PASS (4 testes). Confirme também que os testes falhariam se a regra fosse removida.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/apps/analisador/prompts/analysis.ts src/apps/analisador/prompts/analysis.test.ts
git commit -m "fix(analisador): pedidos ancorados na inicial; divergência vira alerta"
```

---

## Task 2: Versionamento v1.52.18 + suíte

**Files:** `CLAUDE.md`, `package.json`, `src/constants/app-version.ts`, `src/constants/changelog.js`

- [ ] **Step 1: Bump nos 4 arquivos**

- `package.json`: `"version": "1.52.17"` → `"1.52.18"`
- `CLAUDE.md` linha 7: `1.52.17` → `1.52.18`
- `src/constants/app-version.ts`: `APP_VERSION = '1.52.17'` → `'1.52.18'`
- `src/constants/changelog.js`: inserir como primeiro item do array:

```js
  {
    version: '1.52.18',
    date: '2026-06-04',
    feature: 'fix(analisador): pedidos ancorados na petição inicial. Mesma classe de problema do app principal, agora no subapp Analisador: contestação equivocada (que impugna parcelas não postuladas pelo autor) conduzia a LLM a tratar essas parcelas como pedidos inexistentes. Agora os pedidos derivam da inicial; a contestação alimenta a defesa dos pedidos existentes e só introduz pretensão própria via reconvenção; e impugnação a parcela não postulada vira um alerta "DIVERGÊNCIA - PARCELA NÃO POSTULADA" (severidade média/âmbar na AlertasSection), não um pedido. Reusa o mecanismo de alertas existente — sem mudança de schema ou UI. Correção só no prompt analysis.ts.',
  },
```

- [ ] **Step 2: Verificar versões + tsc + suíte completa**

Run: `grep -rn "1.52.18" CLAUDE.md package.json src/constants/app-version.ts src/constants/changelog.js`
Expected: uma ocorrência em cada.

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc exit 0; suíte verde (baseline + 4 novos testes do prompt).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md package.json src/constants/app-version.ts src/constants/changelog.js
git commit -m "chore: bump v1.52.18 — fix de fonte dos pedidos no Analisador"
```

---

## Self-review

- **Cobertura do spec:** regra de fonte (Task 1A/C), severidade média/âmbar (Task 1C), tipo documentado (Task 1B), teste travando a regra (Task 1 Step 1), sem mudança de schema/UI (confirmado — só prompt), versionamento (Task 2). Tudo coberto.
- **Sem placeholders:** edições com texto literal exato.
- **Consistência:** o tipo `DIVERGÊNCIA - PARCELA NÃO POSTULADA` aparece idêntico no exemplo (1B), na instrução (1C) e no teste (Step 1) e no changelog.
- **Deploy:** push autorizado pelo usuário ("até o push").
