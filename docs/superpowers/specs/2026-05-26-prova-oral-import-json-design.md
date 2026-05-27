# Import de JSON no subapp Prova Oral + skill geradora

**Data:** 2026-05-26
**Versão alvo do app:** v1.47.0
**Status:** Design aprovado (aguardando review do spec)

## Objetivo

Reproduzir, para o subapp **Prova Oral**, o mesmo par que já existe no
**Analisador**:

1. Uma **UI de import de JSON** no subapp Prova Oral (hoje inexistente — o app
   só carrega análises salvas via API e importa *síntese* do Analisador).
2. Uma **skill no Claude Code** (`analise-prova-oral-json`) que executa a
   análise de prova oral e grava um `.json` pronto para ser importado nesse
   subapp.

Espelha o par já existente: `ImportAnalysisModal`/`ImportJsonPanel` +
`analise-paralela-processos` (Analisador).

## Decisões de produto (tomadas no brainstorming)

- **Escopo:** construir as duas pontas (UI de import + skill).
- **Comportamento do import:** ao importar, **cria nova análise salva** via API
  (`POST /api/prova-oral`), que aparece no histórico e carrega na tela — espelha
  o import do Analisador e mantém o auto-save de highlights funcionando
  (depende de `loadedAnalysisId`).
- **Skill:** **nova skill dedicada** `analise-prova-oral-json`, mantendo a
  `analise-prova-oral` (relatório markdown) intacta.
- **Cardinalidade:** **uma análise por arquivo** (uma audiência = um JSON).
- **Metodologia da skill:** **referenciar** a skill `analise-prova-oral` como
  fonte única das regras de valoração (sem duplicar as ~230 linhas de regras).

---

## Ponta A — UI de import no subapp Prova Oral

### A.1 Validador — `src/apps/prova-oral/utils/import-validation.ts` (NOVO)

Espelha `src/apps/analisador/utils/import-validation.ts`. Funções e tipos:

```ts
export interface ProvaOralValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  payload?: ProvaOralImportPayload;
}

export interface ProvaOralImportPayload {
  resultado: ProvaOralResult;
  transcricao: string;
  sinteseProcesso: string;
}

export function validateProvaOralImport(raw: unknown): ProvaOralValidationResult;
```

**Detecção de formato:** se `raw.resultado` é objeto → *wrapped*
(`SavedProvaOralAnalysis`); senão → `ProvaOralResult` cru.

**Regras de validação** (estrito só no que o renderizador usa; tolerante onde o
app é tolerante — arrays ausentes viram `[]` com warning):

- `processo`: objeto opcional. Campos `numero`/`numeroProcesso`, `reclamante`,
  `reclamada`, `vara` (todos string opcional). Se ausente → `{}` + warning.
- `depoentes[]`: cada item exige `id` (string), `nome` (string),
  `qualificacao` ∈ `{autor, preposto, testemunha-autor, testemunha-re}`. Item
  inválido → erro (é a espinha dorsal dos vínculos).
- `sinteses[]`: cada item exige `deponenteId` (string) e `conteudo[]` de
  `{texto: string, timestamp: string}`. **Validar que todo `deponenteId`
  existe em `depoentes[].id`** → senão warning (não bloqueia, mas sinaliza).
- `analises[]`: cada item exige `titulo` (string), `conclusao` (string),
  `status` ∈ `{favoravel-autor, favoravel-re, parcial, inconclusivo}`.
  `provaOral[]` opcional (`{deponente, textoCorrente}`).
- `contradicoes[]`: cada item exige `tipo` ∈ `{interna, externa}`,
  `relevancia` ∈ `{alta, media, baixa}`, `depoente` (string), `descricao`
  (string).
- `confissoes[]`: cada item exige `tipo` ∈ `{autor, preposto}`, `tema`
  (string), `trecho` (string).
- `credibilidade[]`: cada item exige `deponenteId` (string). `criterios`
  opcional com enums (`contemporaneidade` Relevancia, `coerenciaInterna` ∈
  `{alta, media, comprometida}`, `interesseLitigio` ∈ `{baixo, alerta, alto}`,
  `conhecimentoDireto` boolean). `pontuacao` 1–5 opcional.
- `sintesesCondensadas[]`, `sintesesPorTema[]`, `highlights[]`: opcionais.
- **Garantia final:** os 6 arrays nucleares
  (`depoentes/sinteses/analises/contradicoes/confissoes/credibilidade`) sempre
  presentes no payload (default `[]`) para nenhuma aba quebrar ao iterar.

**Payload:** `transcricao`/`sinteseProcesso` vêm dos campos top-level do
*wrapped*; se cru ou ausentes → `''` + warning ("transcrição ausente no JSON").

> Sem necessidade de `validateImportFile` (lote) — uma análise por arquivo. O
> modal trata cardinalidade: array de 1 ok, 0 ou >1 → erro.

### A.2 Modal — `src/apps/prova-oral/components/input/ImportJsonModal.tsx` (NOVO)

Mesma estrutura visual da `ImportJsonPanel`/`AnalysisSelectorModal`
(drop-zone + preview de validação + botão de ação), usando o shell de modal já
adotado no subapp e respeitando temas claro/escuro (`dark:`).

- Estado: `parsed: { filename, result?, error? } | null`, `isImporting`,
  `isDragOver`.
- Parse: lê arquivo `.json`; se array, exige length 1 (erros para 0 / >1);
  chama `validateProvaOralImport`.
- Preview (sucesso): nº processo, `reclamante × reclamada`, contagem de
  depoentes e temas, lista de warnings (até ~4). Erros: lista (até ~6).
- Ação "Importar análise" (habilitada só com `result.valid`):
  1. `const id = await createAnalysis({ resultado, transcricao, sinteseProcesso })`
     (de `useProvaOralAPI`).
  2. Se `id`: `loadAnalysis(id, transcricao, sinteseProcesso, resultado)`
     (de `useProvaOralStore`) → seta `loadedAnalysisId`, popula result/inputs,
     `activeTab='depoentes'`.
  3. `onSuccess?.()` → fecha modal e comuta para resultados.
  4. Toast: sucesso "Análise importada do JSON" / erro.

### A.3 Botão de abertura — `InputForm.tsx` (EDIT)

Adicionar botão "Importar JSON" (ícone `FileJson`) no header do card de
**Transcrição da Audiência** (o import traz a análise completa, incluindo a
transcrição) — espelhando o padrão do botão "Importar do Analisador" no card
de Síntese. Estado local
`showImportJsonModal`. Montar `<ImportJsonModal onSuccess={() => { setShowImportJsonModal(false); onAnalysisComplete?.(); }} />`.
`onAnalysisComplete` já comuta para a tela de resultados em `ProvaOralApp`.

### A.4 Barrel exports (EDIT)

Exportar `ImportJsonModal` em `components/input/index.ts` (e
`components/index.ts` se necessário), seguindo o padrão existente.

### A.5 Versionamento (EDIT — guideline #8)

Bump **v1.46.0 → v1.47.0** em: `CLAUDE.md` (linha 7), `src/App.tsx`
(`APP_VERSION`), `src/constants/changelog.js` (nova entrada), `package.json`.

### A.6 TypeScript

Rodar `npx tsc --noEmit` ao final. Tipos no validador importados de
`../types`.

---

## Ponta B — Skill `analise-prova-oral-json`

Diretório: `~/.claude/skills/analise-prova-oral-json/`

### B.1 `SKILL.md`

Skill de análise de **uma** audiência que emite JSON (não orquestra
subagentes). Frontmatter `name` + `description` com gatilhos (ex.: "analise
esta prova oral e gere JSON para importar no sentencify", "transcrição de
audiência → JSON").

Fluxo:
1. **Entrada:** transcrição(ões) com timestamps + (opcional) síntese da inicial
   e da contestação. Se faltar transcrição, pedir. Nunca inventar.
2. **Metodologia:** aplicar **a skill `analise-prova-oral`** (fonte única das
   regras: formato ata, contradições internas/externas, confissões, valoração
   confissão × prova dividida, art. 829 CLT, credibilidade, checklist de
   autocontrole). A nova skill **não duplica** essas regras — só as referencia.
3. **Mapeamento → `SavedProvaOralAnalysis`:**
   - `transcricao`: texto bruto fornecido.
   - `sinteseProcesso`: texto da síntese inicial/contestação (ou `""`).
   - `resultado.processo`: `{ numero, reclamante, reclamada, vara }` se houver.
   - `resultado.depoentes[]`: `id` **estável** (`dep-1`, `dep-2`, …), `nome`,
     `qualificacao` (enum), `funcao`/`periodo` se houver.
   - `resultado.sinteses[]`: `deponenteId` (casando com `depoentes[].id`),
     `conteudo[]` de `{texto, timestamp}` com timestamp `Xm YYs`.
   - `resultado.sintesesCondensadas[]`, `sintesesPorTema[]`: texto corrido.
   - `resultado.analises[]`: `titulo`, `alegacaoAutor`, `defesaRe`,
     `provaOral[]` (`{deponente, textoCorrente}` com timestamps inline),
     `conclusao`, `status` (enum).
   - `resultado.contradicoes[]`, `confissoes[]`, `credibilidade[]`
     (com `deponenteId` casando, `criterios`/enums).
   - `id`/`createdAt`/`updatedAt`: placeholders (a API regenera; o import só lê
     `resultado`/`transcricao`/`sinteseProcesso`).
4. **Validação:** snippet Node que espelha `validateProvaOralImport`
   (enums + arrays nucleares + vínculo `deponenteId`↔`id`). Não gravar final
   enquanto houver erro.
5. **Saída:** gravar `{numero_ou_nome}.json` (ao lado dos arquivos de entrada
   ou em pasta indicada) e instruir: abrir Prova Oral → "Importar JSON" →
   arrastar → revisar preview → "Importar análise".

### B.2 `references/json-schema.md`

Cópia anotada de `src/apps/prova-oral/types/prova-oral.types.ts` com:
obrigatório/opcional por campo, valores de enum, convenção de `id`/`deponenteId`,
formato de timestamp, e exemplo mínimo de JSON válido.

---

## Componentes e fronteiras

| Unidade | Responsabilidade | Depende de |
|---------|------------------|------------|
| `import-validation.ts` (prova-oral) | Validar/normalizar JSON → payload | tipos de `../types` |
| `ImportJsonModal.tsx` | UI de upload + preview + disparo do import | validador, `useProvaOralAPI`, `useProvaOralStore`, toast |
| `InputForm.tsx` (edit) | Botão que abre o modal | `ImportJsonModal` |
| Skill `analise-prova-oral-json` | Gerar JSON conforme schema | skill `analise-prova-oral`, `references/json-schema.md` |

**Contrato compartilhado entre as pontas:** o schema `ProvaOralResult` /
`SavedProvaOralAnalysis`. O validador da Ponta A é a especificação executável
que a skill da Ponta B deve satisfazer.

## Tratamento de erros

- JSON malformado / não-`.json` / array ≠ 1 → erro no modal, sem chamar API.
- Erros de validação → lista no preview; botão desabilitado.
- Falha de `createAnalysis` (rede/auth) → toast de erro, modal permanece aberto.
- Warnings (transcrição ausente, `deponenteId` órfão) → exibidos, não bloqueiam.

## Testes / verificação

- `npx tsc --noEmit` limpo.
- Teste manual: gerar JSON pela skill a partir de uma transcrição real →
  importar no subapp → conferir que todas as abas (depoentes, sínteses,
  contradições, confissões, credibilidade, análises) renderizam e que a análise
  aparece no histórico.
- Caso de borda: JSON cru (sem wrapper) → import funciona, `transcricao`/
  `sinteseProcesso` vazias com warning.

## Fora de escopo (YAGNI)

- Import em lote (array de várias análises) — uma por arquivo.
- Orquestração de subagentes na skill — uma audiência por execução.
- Alterar a skill `analise-prova-oral` existente.
- Backend/API novo — `POST /api/prova-oral` já existe e é suficiente.
