# Design — Skill `analise-inicial-contestacao-multiagente`

**Data:** 2026-06-05 (revisado no mesmo dia — saída passou a ser JSON do Analisador)
**Autor:** Rodrigo Nohlack (juiz, TRT8) + Claude
**Status:** Aprovado para implementação

## Problema

A skill atual `analise-inicial-contestacao` faz a análise cruzada de inicial e
contestação num **único contexto**. O risco central dela é a **confabulação de
pedidos**: inventar um pedido do autor a partir do que a defesa discute, o que
conduz a sentença extra petita (CPC arts. 141 e 492). Hoje essa garantia é
puramente textual (disciplina do modelo). A dor relatada é exatamente essa: a
análise às vezes inventa ou erra pedidos.

## Objetivo

Criar uma **nova** skill, ao lado da atual (que permanece intacta), que:
1. Torna a regra de fonte uma **garantia arquitetural** via isolamento de
   contexto (um subagente lê só a inicial, outro só a contestação).
2. **Verifica** o lastro com um passo adversarial (auditor).
3. **Entrega, ao final, o JSON importável no app Analisador** do sentencify
   (`AnalysisResult`/`SavedAnalysis`), com opção de inserção direta na produção.

A skill combina o melhor de duas que já existem: a **blindagem** que só a
arquitetura multiagente dá, e a **importabilidade** que hoje só a
`analise-paralela-processos` tem.

Não-objetivos:
- Não substituir nem alterar a skill atual.
- Não gerar painel visual nem análise textual em prosa (saída é só o JSON).
- Não processar lote de múltiplos processos (isso é da `analise-paralela-processos`).

## Premissas

- **Entrada:** os PDFs da inicial e da contestação estão numa **pasta no disco**,
  com caminhos. Cada subagente abre o seu PDF sozinho (Read lê PDF; peças longas
  exigem leitura por faixas de página).
- **Acionamento:** explícito, pela expressão **"analise com multiagentes"** e
  variações (*multiagentes / multi-agentes / multagentes*). Não dispara por
  trigger automático, para não colidir com a skill atual.
- **Saída:** um arquivo `{numero}.json` no schema do app, validado, mais a oferta
  de inserir direto via API autenticada.

## Arquitetura

```
ORQUESTRADOR (agente principal; NUNCA lê os PDFs)
  │
  ├─1─→ [Subagente INICIAL]      lê SÓ a inicial   → fragmento do AnalysisResult
  ├─2─→ [Subagente CONTESTAÇÃO]  lê SÓ a defesa    → fragmento do AnalysisResult
  │     (1 e 2 em paralelo, isolados — um não vê o documento do outro)
  │
  ├─3─→ CRUZAMENTO (orquestrador): casa cada pedido com a impugnação por tema
  │       → seta `controversia` (bool) e `defesaReclamada`
  │       → parcela enfrentada SEM pedido → alerta "DIVERGÊNCIA - PARCELA NÃO POSTULADA"
  │
  ├─4─→ [Subagente AUDITOR] confere o lastro de cada pedido na inicial →
  │       sem lastro = alerta severidade "alta"; valor corpo×planilha divergente
  │       = alerta severidade "media"
  │
  ├─5─→ MONTAGEM (orquestrador): merge dos fragmentos + alertas no AnalysisResult,
  │       embrulha em SavedAnalysis, grava {numero}.json
  │
  └─6─→ NORMALIZAR + VALIDAR + (opcional) INSERIR — reusa a infra da
          analise-paralela-processos
```

**Por que ataca a dor:** o Subagente INICIAL monta `pedidos[]` sem nunca ver a
contestação — é fisicamente incapaz de inventar pedido a partir da defesa. O
isolamento **é** a regra de fonte. O Auditor acrescenta verificação sobre
prevenção. Os achados (parcela não postulada, divergência de valor) caem
naturalmente em `alertas[]`, que o app exibe ao juiz.

## Contratos — fragmentos do AnalysisResult

Cada subagente retorna SOMENTE um bloco JSON com os campos que lhe cabem. O
schema-mestre é `analise-paralela-processos/references/json-schema.md` (fonte
única; os subagentes o leem). Convenção: `controversia: true` ⇔ defesa impugnou
especificamente.

### Fragmento do subagente INICIAL
```json
{
  "identificacao": { "numeroProcesso": "...", "reclamantes": [], "reclamadas": [], "rito": "ordinario|sumarissimo|sumario", "vara": "...", "dataAjuizamento": "YYYY-MM-DD" },
  "contrato": { "dadosInicial": { "dataAdmissao": "YYYY-MM-DD", "dataDemissao": "YYYY-MM-DD", "funcao": "...", "ultimoSalario": 0.0, "tipoContrato": "...", "motivoRescisao": "...", "jornadaAlegada": "..." }, "controversias": [] },
  "pedidos": [ { "numero": 1, "tema": "...", "descricao": "...", "periodo": "...", "valor": 0.0, "fatosReclamante": "...", "controversia": false, "pontosEsclarecer": [], "tipoPedido": "principal" } ],
  "valorCausa": { "valorTotal": 0.0, "somaPedidos": 0.0, "inconsistencia": false, "detalhes": "..." },
  "provas": { "reclamante": { "testemunhal": false, "documental": false, "pericial": false, "depoimentoPessoal": false } }
}
```
`controversia` sai `false` provisório (o extrator não viu a defesa); o cruzamento
ajusta. Os 7 nomes canônicos de `dadosInicial` são obrigatórios — qualquer outra
chave é silenciosamente ignorada pelo app.

### Fragmento do subagente CONTESTAÇÃO
```json
{
  "preliminares": [ { "tipo": "...", "descricao": "...", "alegadaPor": "reclamada", "fundamentacao": "..." } ],
  "prejudiciais": { "prescricao": { "tipo": "quinquenal|bienal|parcial", "fundamentacao": "..." } },
  "defesasAutonomas": [ { "tipo": "compensação|...", "descricao": "...", "fundamentacao": "..." } ],
  "impugnacoesPorTema": [ { "tema": "horas extras", "tipoImpugnacao": "especifica|generica", "defesaReclamada": "síntese da tese da defesa" } ],
  "dadosContestacao": { "dataAdmissao": "...", "funcao": "...", "ultimoSalario": 0.0 },
  "provas": { "reclamada": { "testemunhal": false, "documental": false, "pericial": false, "depoimentoPessoal": false } },
  "impugnacoesDocumentos": [ { "documento": "...", "motivo": "..." } ],
  "reconvencao": { "existe": false }
}
```
O extrator de contestação NÃO lista pedidos do autor (não viu a inicial); só
descreve os temas que a defesa enfrenta, em `impugnacoesPorTema`.

### Saída do subagente AUDITOR
```json
{
  "alertas": [
    { "tipo": "PEDIDO SEM LASTRO", "descricao": "...", "severidade": "alta", "recomendacao": "..." },
    { "tipo": "DIVERGÊNCIA DE VALOR (corpo×planilha)", "descricao": "pedido X: corpo R$ A, planilha R$ B", "severidade": "media", "recomendacao": "..." }
  ]
}
```

## Cruzamento (orquestrador, determinístico)
Para cada `pedido`, procurar `impugnacoesPorTema` com tema correspondente:
- match + `especifica` → `controversia = true`, `defesaReclamada` = síntese.
- match + `generica` → `controversia = false` + alerta "media" (impugnação genérica frágil).
- sem match → `controversia = false`, `defesaReclamada` ausente (silente).
- `impugnacoesPorTema` sem pedido correspondente → alerta "DIVERGÊNCIA - PARCELA
  NÃO POSTULADA" (media). **Nunca** criar pedido.

## Montagem final (orquestrador)
- Merge dos fragmentos no `AnalysisResult`; `impugnacoes = { documentos: [...],
  documentosNaoImpugnados: [] }`; `alertas` = cruzamento + auditor.
- `tabelaSintetica` derivada dos `pedidos` (ou deixada para a normalização derivar).
- Embrulhar em `SavedAnalysis`: `{ nomeArquivoPeticao, nomesArquivosContestacoes,
  resultado }`. Gravar em `{INPUT_DIR}/analises_json/{numero}.json`.

## Reaproveitamento da infra da `analise-paralela-processos` (DRY)
A multiagente **não duplica** schema, validação nem inserção. Reusa:
- **Schema:** `references/json-schema.md` (lido pelos subagentes e pela montagem).
- **Normalização + validação:** os scripts node das Etapas 7a/7b do `SKILL.md`
  da paralela (reconstroem `tabelaSintetica`, completam `preliminares`,
  canonizam `dadosInicial`/`dadosContestacao`; depois validam espelhando
  `import-validation.ts`).
- **Inserção direta:** `insert-analises.mjs` (modo `--replace` para um processo),
  via API autenticada (`~/.config/sentencify/auth.json`).

A diferença para a paralela: a paralela usa um subagente por processo que lê as
duas peças juntas; a multiagente isola cada peça em um subagente e audita o
lastro (mais lenta, mais blindada, um processo por vez).

## Tratamento de erros
- **Documento ausente** (só inicial / só contestação): segue o "Caso: inicial sem
  contestação" do schema (controversia false, alerta "Sem contestação" alta) ou
  sinaliza falta da inicial.
- **Subagente falha/vazio:** orquestrador reporta, não inventa.
- **Validação falha:** normaliza e revalida (scripts da paralela); não gera/insere
  enquanto houver erro.
- **PDF longo (>10 pág.):** subagente lê por faixas até cobrir o documento inteiro.

## Estrutura de arquivos
```
~/.claude/skills/analise-inicial-contestacao-multiagente/
  SKILL.md                              # orquestração (inventário → dispatch → cruzamento → auditor → montagem → validar → inserir)
  references/
    regras-extracao-inicial.md          # doutrina + mapeamento p/ identificacao/contrato/pedidos/valorCausa/provas.reclamante
    regras-extracao-contestacao.md      # doutrina + mapeamento p/ preliminares/prejudiciais/defesasAutonomas/impugnacoesPorTema/dadosContestacao/provas.reclamada
    prompt-subagente-inicial.md         # prompt do extrator da inicial (isolado)
    prompt-subagente-contestacao.md     # prompt do extrator da contestação (isolado)
    prompt-subagente-auditor.md         # prompt do auditor (saída = alertas)
    montagem-e-saida.md                 # como mergear fragmentos + cruzamento + chamar normalização/validação/insert da paralela
```
Removidos do design anterior: `contrato-saidas.md` (substituído pelo schema da
paralela) e `visual-template.md` (sem painel).

## Critérios de sucesso
1. Acionada por "analise com multiagentes" (e variações), sem colidir com a atual.
2. Subagente INICIAL nunca recebe o documento da contestação (isolamento real).
3. Toda parcela que a defesa enfrenta sem pedido do autor vira `alerta`, nunca pedido.
4. Auditor produz `alertas` de lastro/divergência; nada é apagado em silêncio.
5. O `{numero}.json` final passa no validador (`validateAnalysisImport`) e importa
   no app sem erro; opção de inserção direta funciona.
