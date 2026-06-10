# Extração de tópicos por fonte correta + sinalização de divergências — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ancorar a extração de tópicos de mérito na petição inicial (pedidos do autor) e na contestação apenas quando há pedido contraposto/reconvenção; quando a defesa impugna parcela não postulada, não criar tópico e sinalizar como divergência no fluxo de curadoria.

**Architecture:** Espelha integralmente o padrão existente de `promptInjections` em cinco camadas — schema (`ai-responses.ts`) → prompt (`document-analysis-prompts.ts`) → hook (`useDocumentAnalysis.ts`) → store (`useTopicsStore.ts`) → banner no `TopicCurationModal.tsx`. Campo aditivo e opcional (`divergencias`), tom âmbar/atenção.

**Tech Stack:** React + TypeScript, Zustand (immer), Zod, Vitest, Tailwind (theme-aware via `dark:`), lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-04-extracao-topicos-fonte-correta-design.md`

---

## Arquivos tocados

- **Modify** `src/schemas/ai-responses.ts` — `DivergenciaPedidoSchema`, tipo `DivergenciaPedido`, campo `divergencias` em `TopicExtractionSchema`.
- **Modify** `src/schemas/ai-responses.test.ts` — testes do novo schema/campo.
- **Modify** `src/stores/useTopicsStore.ts` — estado `detectedDivergencias`, setter, persistência, `clearAll`.
- **Modify** `src/hooks/useDocumentAnalysis.ts` — prop `setDetectedDivergencias`, leitura de `parsed.divergencias`.
- **Modify** `src/App.tsx` — wiring do setter + bump `APP_VERSION`.
- **Modify** `src/prompts/document-analysis-prompts.ts` — regra de fonte por categoria + `divergencias` no formato JSON.
- **Modify** `src/prompts/document-analysis-prompts.test.ts` — testes do prompt.
- **Modify** `src/components/TopicCurationModal.tsx` — `DivergenciaBanner` + render.
- **Modify** `CLAUDE.md`, `package.json`, `src/constants/changelog.js` — versionamento.

---

## Task 1: Schema + tipo `DivergenciaPedido`

**Files:**
- Modify: `src/schemas/ai-responses.ts:95-110`
- Test: `src/schemas/ai-responses.test.ts:428-507`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar dentro do bloco `describe('TopicExtractionSchema', ...)`, logo após o `describe('promptInjections (v1.42.07)', ...)` (após a linha ~530 onde esse describe fecha), em `src/schemas/ai-responses.test.ts`:

```ts
    // v1.52.16: divergencias (parcela impugnada na defesa sem pedido na inicial)
    describe('divergencias (v1.52.16)', () => {
      it('default vazio quando ausente', () => {
        const result = TopicExtractionSchema.safeParse({ topics: [] });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.divergencias).toEqual([]);
      });

      it('aceita array vazio explícito', () => {
        const result = TopicExtractionSchema.safeParse({ topics: [], divergencias: [] });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.divergencias).toEqual([]);
      });

      it('aceita lista com divergências completas', () => {
        const data = {
          topics: [],
          divergencias: [
            {
              parcela: 'verbas rescisórias',
              documento: 'contestação 1',
              descricao: 'impugnada na defesa, sem pedido correspondente na inicial',
            },
            {
              parcela: 'intervalo térmico',
              documento: 'contestação 1',
              descricao: 'defesa sobre parcela não postulada pelo autor',
            },
          ],
        };
        const result = TopicExtractionSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.divergencias).toHaveLength(2);
          expect(result.data.divergencias![0].parcela).toBe('verbas rescisórias');
        }
      });

      it('normaliza campos nulos para string vazia', () => {
        const data = {
          topics: [],
          divergencias: [{ parcela: null, documento: null, descricao: null }],
        };
        const result = TopicExtractionSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.divergencias![0].parcela).toBe('');
          expect(result.data.divergencias![0].documento).toBe('');
          expect(result.data.divergencias![0].descricao).toBe('');
        }
      });
    });
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `npx vitest run src/schemas/ai-responses.test.ts -t "divergencias"`
Expected: FAIL — `divergencias` é `undefined` (campo ainda não existe no schema).

- [ ] **Step 3: Implementar o schema e o tipo**

Em `src/schemas/ai-responses.ts`, logo após o bloco `PromptInjectionDetectionSchema` (após a linha 100, antes de `TopicExtractionSchema`), inserir:

```ts
/**
 * v1.52.16: Divergência de pedido — a defesa impugna uma parcela de mérito que
 * não consta da petição inicial e não é pedido contraposto/reconvenção. Não gera
 * tópico; é sinalizada ao magistrado no fluxo de curadoria.
 */
export const DivergenciaPedidoSchema = z.object({
  parcela: z.string().nullable().default('').transform(v => v ?? ''),
  documento: z.string().nullable().default('').transform(v => v ?? ''),
  descricao: z.string().nullable().default('').transform(v => v ?? ''),
}).passthrough();
```

Dentro de `TopicExtractionSchema`, logo após a linha do `promptInjections` (linha 109), adicionar:

```ts
  /** v1.52.16: Parcelas impugnadas na defesa sem pedido correspondente na inicial. Default vazio. */
  divergencias: z.array(DivergenciaPedidoSchema).optional().default([]),
```

E após `export type PromptInjectionDetection = ...` (linha 112), adicionar:

```ts
export type DivergenciaPedido = z.infer<typeof DivergenciaPedidoSchema>;
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npx vitest run src/schemas/ai-responses.test.ts -t "divergencias"`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/schemas/ai-responses.ts src/schemas/ai-responses.test.ts
git commit -m "feat(schema): DivergenciaPedido + campo divergencias em TopicExtractionSchema"
```

---

## Task 2: Store — `detectedDivergencias`

**Files:**
- Modify: `src/stores/useTopicsStore.ts` (estado ~39, interface ~169, inicial ~207, setter ~410, serialize ~423, restore ~443, clearAll ~455)

- [ ] **Step 1: Importar o tipo**

Em `src/stores/useTopicsStore.ts:18`, a importação atual é:

```ts
import type { PromptInjectionDetection } from '../schemas/ai-responses';
```

Substituir por:

```ts
import type { PromptInjectionDetection, DivergenciaPedido } from '../schemas/ai-responses';
```

- [ ] **Step 2: Adicionar o estado na interface**

Logo após o bloco `detectedInjections: PromptInjectionDetection[];` (linha 39), inserir:

```ts

  /**
   * v1.52.16: Parcelas impugnadas na defesa sem pedido correspondente na
   * inicial. Vazio quando nenhuma divergência foi identificada.
   */
  detectedDivergencias: DivergenciaPedido[];
```

- [ ] **Step 3: Adicionar a assinatura do setter na interface**

Logo após `setDetectedInjections: (injections: PromptInjectionDetection[]) => void;` (linha 169), inserir:

```ts

  /** v1.52.16: Substitui lista de divergências de pedido detectadas */
  setDetectedDivergencias: (divergencias: DivergenciaPedido[]) => void;
```

- [ ] **Step 4: Incluir no tipo de retorno de `serializeForPersistence`**

Em `serializeForPersistence` da interface (linha ~181), após `detectedInjections: PromptInjectionDetection[];`, inserir:

```ts
    detectedDivergencias: DivergenciaPedido[];
```

- [ ] **Step 5: Adicionar o estado inicial**

Após `detectedInjections: [],` (linha 207), inserir:

```ts
      detectedDivergencias: [],
```

- [ ] **Step 6: Implementar o setter**

Após o bloco `setDetectedInjections` (linha 407-410), inserir:

```ts

      setDetectedDivergencias: (divergencias) =>
        set((state) => {
          state.detectedDivergencias = divergencias;
        }, false, 'setDetectedDivergencias'),
```

- [ ] **Step 7: Incluir em serialize/restore/clearAll**

Em `serializeForPersistence` (após linha 423, `detectedInjections: state.detectedInjections,`):

```ts
          detectedDivergencias: state.detectedDivergencias,
```

Em `restoreFromPersistence` (após o bloco de `detectedInjections`, linha 445):

```ts
          if (data.detectedDivergencias && Array.isArray(data.detectedDivergencias)) {
            state.detectedDivergencias = data.detectedDivergencias as DivergenciaPedido[];
          }
```

Em `clearAll` (após `state.detectedInjections = [];`, linha 455):

```ts
          state.detectedDivergencias = [];
```

- [ ] **Step 8: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add src/stores/useTopicsStore.ts
git commit -m "feat(store): estado detectedDivergencias em useTopicsStore"
```

---

## Task 3: Hook — ler `parsed.divergencias`

**Files:**
- Modify: `src/hooks/useDocumentAnalysis.ts` (import ~17, props interface ~136, destructuring ~201, leitura ~724)

- [ ] **Step 1: Importar o tipo**

Em `src/hooks/useDocumentAnalysis.ts:17`:

```ts
import type { PromptInjectionDetection } from '../schemas/ai-responses';
```

Substituir por:

```ts
import type { PromptInjectionDetection, DivergenciaPedido } from '../schemas/ai-responses';
```

- [ ] **Step 2: Adicionar a prop na interface**

Após `setDetectedInjections?: (injections: PromptInjectionDetection[]) => void;` (linha 136), inserir:

```ts
  /** v1.52.16: Persistir divergências de pedido detectadas pela IA */
  setDetectedDivergencias?: (divergencias: DivergenciaPedido[]) => void;
```

- [ ] **Step 3: Adicionar ao destructuring**

Após `setDetectedInjections,` (linha 201), inserir:

```ts
    setDetectedDivergencias,
```

- [ ] **Step 4: Ler `parsed.divergencias`**

Após o bloco `if (setDetectedInjections) { ... }` (fecha na linha 724), inserir:

```ts

      // v1.52.16: Armazenar divergências de pedido (parcela impugnada na defesa
      // sem pedido na inicial). Banner aparece no TopicCurationModal.
      if (setDetectedDivergencias) {
        const divergencias = (parsed.divergencias || []) as DivergenciaPedido[];
        setDetectedDivergencias(divergencias);
        if (divergencias.length > 0) {
          console.warn(
            `[Extração] IA sinalizou ${divergencias.length} parcela(s) impugnada(s) ` +
            `na defesa sem pedido correspondente na inicial. Detalhes na curadoria de tópicos.`,
            divergencias
          );
        }
      }
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useDocumentAnalysis.ts
git commit -m "feat(hook): useDocumentAnalysis lê e persiste divergencias"
```

---

## Task 4: Wiring no App.tsx

**Files:**
- Modify: `src/App.tsx:2098` (props de `useDocumentAnalysis`)

- [ ] **Step 1: Passar o setter**

Em `src/App.tsx`, a linha 2098 é:

```ts
    setDetectedInjections: useTopicsStore((s) => s.setDetectedInjections),
```

Inserir logo após:

```ts
    setDetectedDivergencias: useTopicsStore((s) => s.setDetectedDivergencias),
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): liga setDetectedDivergencias ao useDocumentAnalysis"
```

---

## Task 5: Prompt — regra de fonte por categoria + `divergencias`

**Files:**
- Modify: `src/prompts/document-analysis-prompts.ts` (regra ~33, formato JSON ~109)
- Test: `src/prompts/document-analysis-prompts.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Em `src/prompts/document-analysis-prompts.test.ts`, dentro do `describe` principal do prompt de análise, adicionar (ajustar o nome da função/builder ao que o arquivo já importa — o builder de análise inicial de documentos):

```ts
  describe('regra de fonte por categoria (v1.52.16)', () => {
    it('ancora pedidos de mérito na petição inicial', () => {
      const prompt = buildDocumentAnalysisPrompt(1, 0, { /* aiSettings mínimo */ } as never);
      expect(prompt).toMatch(/petição inicial/i);
      expect(prompt).toMatch(/pedido contraposto|reconvenção/i);
    });

    it('documenta o campo divergencias no formato de resposta', () => {
      const prompt = buildDocumentAnalysisPrompt(1, 0, { /* aiSettings mínimo */ } as never);
      expect(prompt).toMatch(/"divergencias"/);
    });
  });
```

> Nota para o executor: abrir o arquivo de teste e o de prompt primeiro para usar o nome real do builder exportado e a assinatura real de `aiSettings`. Importar do código de produção; não duplicar o prompt no teste.

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `npx vitest run src/prompts/document-analysis-prompts.test.ts -t "regra de fonte"`
Expected: FAIL — o prompt não contém ainda as marcas `pedido contraposto/reconvenção` nem `"divergencias"`.

- [ ] **Step 3: Inserir a regra de fonte no prompt**

Em `src/prompts/document-analysis-prompts.ts`, o trecho atual (linhas 28-35) é:

```
Extraia e classifique todos os tópicos/pedidos em:

1. QUESTÕES PROCESSUAIS (...)
2. PRELIMINARES (...)
3. PREJUDICIAIS (...)
4. MÉRITO (pedidos principais - verbas rescisórias, horas extras, danos morais, vínculo empregatício, grupo econômico, etc.)

Para cada tópico, crie um mini-relatório em formato NARRATIVO...
```

Inserir, entre a linha da categoria 4 (MÉRITO) e a linha `Para cada tópico...`, o bloco abaixo (apenas o texto entre as crases internas — manter a interpolação `${...}` literal no arquivo):

```
FONTE DE CADA TÓPICO (REGRA OBRIGATÓRIA):
- Os tópicos de MÉRITO correspondem aos PEDIDOS formulados pelo RECLAMANTE na PETIÇÃO INICIAL. Um tópico de mérito só existe se houver pedido correspondente na inicial.
- A CONTESTAÇÃO fornece a matéria de DEFESA contra esses pedidos. A contestação só origina um tópico de mérito próprio quando a ré formula PRETENSÃO PRÓPRIA: pedido contraposto ou reconvenção (a ré REQUER a condenação do autor a algo — devolução de valores, indenização, etc.).
- PRELIMINARES, PREJUDICIAIS e QUESTÕES PROCESSUAIS continuam sendo extraídas da contestação normalmente.
- DISTINÇÃO: a ré PEDIR algo (pretensão) gera tópico; a ré apenas IMPUGNAR/NEGAR uma parcela é defesa, e NÃO gera tópico de mérito novo.
- Se a defesa impugna uma parcela de mérito que NÃO consta da petição inicial e NÃO é pedido contraposto/reconvenção, NÃO crie tópico para ela. Em vez disso, registre uma entrada no campo "divergencias" (ver formato abaixo), para que o magistrado verifique se houve omissão da inicial ou erro da contestação.
```

- [ ] **Step 4: Documentar `divergencias` no formato JSON**

No bloco do formato de resposta (linhas 97-110), a linha 109 é:

```
  "promptInjections": []
```

Substituir por:

```
  "promptInjections": [],
  "divergencias": []
```

E logo após a linha 112 (`IMPORTANTE: Retorne APENAS título e categoria...`), inserir um parágrafo explicativo:

```
CAMPO "divergencias": liste aqui as parcelas de mérito que a contestação impugna mas que NÃO constam da petição inicial e NÃO são pedido contraposto/reconvenção. Cada entrada: { "parcela": "nome da parcela", "documento": "contestação N", "descricao": "motivo da divergência" }. Se não houver, retorne lista vazia. NÃO crie tópico para essas parcelas.
```

- [ ] **Step 5: Rodar o teste e verificar que passa**

Run: `npx vitest run src/prompts/document-analysis-prompts.test.ts -t "regra de fonte"`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add src/prompts/document-analysis-prompts.ts src/prompts/document-analysis-prompts.test.ts
git commit -m "feat(prompt): regra de fonte por categoria + campo divergencias"
```

---

## Task 6: UI — `DivergenciaBanner`

**Files:**
- Modify: `src/components/TopicCurationModal.tsx` (import ~28, novo componente após ~1029, render ~1358, leitura do store ~1061)

- [ ] **Step 1: Importar o ícone e o tipo**

Em `src/components/TopicCurationModal.tsx`, no import de `lucide-react` (linhas 20-28), adicionar `AlertTriangle` à lista:

```ts
  ShieldAlert,
  AlertTriangle,
  Copy
```

E na linha 30:

```ts
import type { PromptInjectionDetection } from '../schemas/ai-responses';
```

Substituir por:

```ts
import type { PromptInjectionDetection, DivergenciaPedido } from '../schemas/ai-responses';
```

- [ ] **Step 2: Criar o componente `DivergenciaBanner`**

Logo após o fim do `PromptInjectionBanner` (após a linha 1029), inserir:

```tsx
// ═══════════════════════════════════════════════════════════════════════════════
// v1.52.16: BANNER DE DIVERGÊNCIAS DE PEDIDO
// Parcela impugnada na defesa sem pedido correspondente na inicial.
// Tom âmbar/atenção (não é ameaça; é "confira"). Colapsado por default.
// ═══════════════════════════════════════════════════════════════════════════════

interface DivergenciaBannerProps {
  divergencias: DivergenciaPedido[];
  isDarkMode: boolean;
}

const DivergenciaBanner: React.FC<DivergenciaBannerProps> = ({ divergencias, isDarkMode }) => {
  const [expanded, setExpanded] = useState(false);

  if (divergencias.length === 0) return null;

  const n = divergencias.length;

  return (
    <div className={`border-b ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full px-4 py-2.5 flex items-center justify-between gap-2 text-sm transition-colors
          ${isDarkMode ? 'bg-amber-900/30 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'}
          hover:opacity-90`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">
            {n} {n === 1 ? 'parcela impugnada' : 'parcelas impugnadas'} na defesa sem pedido correspondente na inicial
          </span>
          <span className="text-xs opacity-75">— clique para {expanded ? 'recolher' : 'detalhes'}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className={`px-4 py-3 space-y-2 max-h-72 overflow-y-auto ${isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
          {divergencias.map((divergencia, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border ${isDarkMode ? 'bg-amber-900/30 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'}`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                <span>⚠️</span>
                <span className="uppercase">{divergencia.parcela || 'parcela não identificada'}</span>
                <span className="opacity-60">·</span>
                <span className="opacity-90">{divergencia.documento || 'documento desconhecido'}</span>
              </div>
              {divergencia.descricao && (
                <p className="text-xs mt-1 opacity-80">{divergencia.descricao}</p>
              )}
            </div>
          ))}
          <p className={`text-xs italic mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Essas parcelas NÃO viraram tópico, pois não constam da petição inicial nem são pedido
            contraposto/reconvenção. Verifique se houve omissão da inicial ou erro da contestação —
            julgar parcela não pedida configura sentença extra petita (CPC arts. 141 e 492).
          </p>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Ler o estado do store**

Em `src/components/TopicCurationModal.tsx`, após a linha 1061 (`const detectedInjections = useTopicsStore((s) => s.detectedInjections);`), inserir:

```tsx
  // v1.52.16: Divergências de pedido identificadas pela IA
  const detectedDivergencias = useTopicsStore((s) => s.detectedDivergencias);
```

- [ ] **Step 4: Renderizar o banner**

A linha 1358 é:

```tsx
        <PromptInjectionBanner injections={detectedInjections} isDarkMode={isDarkMode} />
```

Inserir logo após:

```tsx
        <DivergenciaBanner divergencias={detectedDivergencias} isDarkMode={isDarkMode} />
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/TopicCurationModal.tsx
git commit -m "feat(ui): DivergenciaBanner no TopicCurationModal"
```

---

## Task 7: Versionamento + verificação final

**Files:**
- Modify: `CLAUDE.md:7`, `package.json:3`, `src/App.tsx` (`APP_VERSION`), `src/constants/changelog.js`

- [ ] **Step 1: Bump em `package.json`**

Linha 3: `"version": "1.52.15",` → `"version": "1.52.16",`

- [ ] **Step 2: Bump em `CLAUDE.md`**

Linha 7: `**Version**: 1.52.15` → `**Version**: 1.52.16` (manter o resto da linha intacto).

- [ ] **Step 3: Bump em `src/App.tsx`**

Localizar `APP_VERSION` (≈ linha 209) e trocar `1.52.15` por `1.52.16`.

Run: `grep -n "1.52.15" src/App.tsx`
Expected: localiza a linha do `APP_VERSION` para edição.

- [ ] **Step 4: Entrada no changelog**

Em `src/constants/changelog.js`, inserir como primeiro item do array `CHANGELOG` (antes do bloco `version: '1.52.15'`, linha ~6):

```js
  {
    version: '1.52.16',
    date: '2026-06-04',
    feature: 'fix(extração): tópicos de mérito agora derivam dos pedidos da petição inicial; a contestação só origina tópico de mérito via pedido contraposto/reconvenção. Antes, defesa equivocada (ex.: contestação que impugna verbas rescisórias e intervalo térmico não postulados) induzia o sistema a criar tópicos fantasma — risco de sentença extra petita (CPC arts. 141/492). Agora, parcela impugnada na defesa sem pedido na inicial NÃO vira tópico: é sinalizada num banner âmbar de divergências no fluxo de curadoria (campo "divergencias", espelhando o padrão de promptInjections), para o magistrado verificar omissão da inicial ou erro da contestação. Campo aditivo e opcional, theme-aware.',
  },
```

- [ ] **Step 5: Verificar consistência de versão**

Run: `grep -rn "1.52.16" CLAUDE.md package.json src/constants/changelog.js src/App.tsx`
Expected: uma ocorrência em cada arquivo (App.tsx no `APP_VERSION`).

- [ ] **Step 6: Type-check + suíte completa**

Run: `npx tsc --noEmit && npx vitest run`
Expected: sem erros de tipo; toda a suíte passa (contagem ≥ baseline de 6336 + novos testes).

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md package.json src/App.tsx src/constants/changelog.js
git commit -m "chore: bump v1.52.16 — extração de tópicos por fonte correta + divergências"
```

---

## Self-review (preenchido pelo autor do plano)

- **Cobertura do spec:** prompt (Task 5), schema/tipo (Task 1), hook (Task 3), store (Task 2), UI banner (Task 6), versionamento (Task 7), testes (Tasks 1 e 5 + suíte em 7). Wiring App.tsx (Task 4) — necessário porque o hook recebe o setter por props. Todas as 5 camadas do spec cobertas.
- **Consistência de nomes:** `divergencias` (campo), `DivergenciaPedido` (tipo), `DivergenciaPedidoSchema` (schema), `detectedDivergencias` (estado), `setDetectedDivergencias` (setter), `DivergenciaBanner` (componente) — usados de forma idêntica em todas as tasks.
- **Sem placeholders de produção:** os únicos pontos marcados com nota ao executor são no teste do prompt (Task 5, Step 1), onde o nome real do builder e a assinatura de `aiSettings` devem ser lidos do arquivo — isso é deliberado para não duplicar o prompt no teste (regra do CLAUDE.md: testes importam código de produção).
- **Deploy:** nenhum `git push` neste plano — o push em `main` dispara deploy e exige autorização expressa do usuário, fora do escopo da implementação.
