# Skill `analise-inicial-contestacao-multiagente` — Implementation Plan (rev. saída JSON)

> **For agentic workers:** plano executado em sessão. Steps com checkbox para tracking.

**Goal:** Skill multiagente que isola inicial e contestação em subagentes independentes, audita o lastro dos pedidos e entrega ao final o JSON importável no app Analisador (`SavedAnalysis`), com opção de inserção direta.

**Architecture:** Orquestradora (agente pai não lê PDFs). 2 extratores isolados produzem fragmentos do `AnalysisResult`; o pai faz o cruzamento (controversia + divergências→alertas); o auditor vira alertas de lastro; a montagem mergeia tudo, grava `{numero}.json`, normaliza/valida/insere reusando a infra da `analise-paralela-processos`.

**Tech Stack:** Markdown + `references/`; Agent (subagentes `general-purpose`); Read (PDF); scripts node da paralela (normalização/validação); `insert-analises.mjs` (inserção). Sem git (skills em `~/.claude/skills/`, não versionado).

**Fonte do schema:** `~/.claude/skills/analise-paralela-processos/references/json-schema.md` + validador `src/apps/analisador/utils/import-validation.ts`. NÃO duplicar.

---

## Mudança em relação à revisão anterior
- **Removidos:** `references/contrato-saidas.md` e `references/visual-template.md`.
- **Reescritos:** `regras-extracao-inicial.md`, `regras-extracao-contestacao.md`, os 3 prompts e o `SKILL.md` — agora mapeiam para o schema do app.
- **Novo:** `references/montagem-e-saida.md` (merge + cruzamento + chamada da infra da paralela).

## Tasks

### Task A — Limpar arquivos obsoletos
- [ ] `rm` de `references/contrato-saidas.md` e `references/visual-template.md`.
- Verificar: `ls references/` não os lista mais.

### Task B — `references/regras-extracao-inicial.md`
- [ ] Doutrina (planilha>rol, principal+reflexos, trava anti-confabulação, PDF longo) + **mapeamento para o schema**: como preencher `identificacao` (reclamantes/reclamadas/numeroProcesso/rito), `contrato.dadosInicial` (7 nomes canônicos, `ultimoSalario` number), `pedidos[]` (numero, tema, descricao 5-12 frases, fatosReclamante, periodo, valor number, pontosEsclarecer, tipoPedido), `valorCausa`, `provas.reclamante`. `controversia` sempre `false` (não viu a defesa).
- Verificar: cita "7 nomes canônicos", "controversia" e "pontosEsclarecer".

### Task C — `references/regras-extracao-contestacao.md`
- [ ] Doutrina (papel: descreve a defesa, não lista pedidos do autor; PDF longo; múltiplas contestações) + **mapeamento**: `preliminares[]` (tipo/descricao/alegadaPor="reclamada"/fundamentacao), `prejudiciais` (prescricao.tipo enum), `defesasAutonomas[]`, `impugnacoesPorTema[]` (tema, tipoImpugnacao, defesaReclamada-síntese), `dadosContestacao` (7 nomes, só quando alega versão própria), `provas.reclamada`, `impugnacoesDocumentos[]`, `reconvencao`.
- Verificar: cita "impugnacoesPorTema", "alegadaPor" e "reconvencao".

### Task D — `references/montagem-e-saida.md`
- [ ] Algoritmo de cruzamento (match pedido×tema → controversia/defesaReclamada; sem match → silente; impugnação sem pedido → alerta DIVERGÊNCIA). Merge dos fragmentos + alertas (cruzamento + auditor) no `AnalysisResult`. Embrulho `SavedAnalysis` (nomeArquivoPeticao, nomesArquivosContestacoes, resultado). Gravar `{INPUT_DIR}/analises_json/{numero}.json`. Depois: rodar normalização (Etapa 7a da paralela), validação (Etapa 7b), e inserção opcional (`insert-analises.mjs --replace`) — apontando para os arquivos da paralela, sem duplicar os scripts.
- Verificar: cita "DIVERGÊNCIA", "insert-analises.mjs" e "analises_json".

### Task E — Reescrever os 3 prompts
- [ ] `prompt-subagente-inicial.md`: lê só a inicial, segue `regras-extracao-inicial.md` + schema da paralela, retorna o fragmento INICIAL (JSON puro).
- [ ] `prompt-subagente-contestacao.md`: lê só a contestação, segue `regras-extracao-contestacao.md` + schema, retorna o fragmento CONTESTAÇÃO (JSON puro).
- [ ] `prompt-subagente-auditor.md`: recebe `pedidos` + caminho da inicial, confere lastro, retorna `{ "alertas": [...] }` (severidade alta=sem lastro, media=divergência de valor).
- Verificar: os 3 exigem "SOMENTE o bloco JSON".

### Task F — Reescrever `SKILL.md`
- [ ] Frontmatter mantém o acionamento "multiagente(s)" + atualiza a `description` (saída = JSON do Analisador). Corpo: Etapas 1 inventário → 2 tasks → 3 dispatch paralelo (2 extratores) → 4 cruzamento → 5 auditor → 6 montagem/gravação → 7 normalizar+validar → 8 inserção opcional. Red flags + quick reference.
- Verificar: cita "Analisador", "controversia", "insert-analises.mjs"; sem menção a "Visualizer"/"painel".

### Task G — Verificação end-to-end
- [ ] Reusar os dados já extraídos do processo `0001164-28.2025.5.08.0114` (inicial+contestação+auditor desta sessão), montar o `AnalysisResult`, gravar o `.json`, rodar a validação (espelho do `import-validation.ts`) e confirmar `valid: true`. Sem inserir na produção sem OK do usuário.
- Critérios: JSON válido; pedidos com controversia correta; divergências de valor do auditor presentes em `alertas`; nenhuma parcela da defesa virou pedido.
