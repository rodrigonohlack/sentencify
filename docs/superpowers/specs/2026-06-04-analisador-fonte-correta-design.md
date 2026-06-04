# Analisador: pedidos ancorados na inicial + divergência via alerta

**Data:** 2026-06-04
**Versão alvo:** v1.52.18
**Escopo:** Subapp Analisador — apenas a análise por IA dentro do app (prompt `analysis.ts`). As skills geradoras de JSON (`analise-inicial-contestacao`, `analise-paralela-processos`) ficam para um passo separado.

## Problema

O mesmo problema do app principal ocorre no Analisador: quando a CONTESTAÇÃO, por erro (defesa genérica ou peça de outro processo), impugna parcelas que o autor NÃO postulou na inicial, a LLM é conduzida a erro e trata essas parcelas como se fossem pedidos do autor — gerando análise de pedidos inexistentes. Isso induz, adiante, sentença extra petita (CPC arts. 141/492).

O prompt do Analisador (`src/apps/analisador/prompts/analysis.ts`) instrui a extrair os `pedidos` (linhas 96-112) sem ancorar explicitamente na petição inicial, e não tem instrução sobre o que fazer quando a defesa impugna parcela não postulada.

## Diferença estrutural em relação ao app principal

O Analisador já possui a infraestrutura necessária — não precisa de campo novo nem UI nova:

- **Pretensão própria da ré já tem casa:** o schema tem `reconvencao` (instrução #12 do prompt) e `defesasAutonomas`.
- **Sinalização já existe:** o schema tem `alertas[]` (`AnalysisAlertaSchema`: `tipo`/`descricao`/`severidade`/`recomendacao`), renderizado pela `AlertasSection` com cores por severidade (`alta`=vermelho, `media`=âmbar, `baixa`=azul).

Decisão de design (escolhida pelo usuário): **reusar `alertas[]`** em vez de criar um campo `divergencias[]` dedicado. É idiomático ao subapp (memória: subapps são autônomos, resolver no próprio idioma), não exige mudança de schema/UI, e o import de JSON já aceita `alertas`.

## Regra de extração (núcleo)

- Os `pedidos` correspondem às pretensões formuladas pelo RECLAMANTE na PETIÇÃO INICIAL (e emendas).
- A CONTESTAÇÃO preenche `defesaReclamada` dos pedidos existentes; ela não cria pedido novo, salvo pretensão própria da ré, que vai em `reconvencao` (já previsto).
- Se a defesa impugna/defende uma parcela que NÃO consta da inicial e NÃO é reconvenção, NÃO criar pedido para ela. Em vez disso, registrar um `alerta` de divergência.

## Mudanças

### 1. Prompt — `src/apps/analisador/prompts/analysis.ts`

Redação **positiva** (sem nomear parcelas concretas a evitar — lição do app principal sobre negative prompts).

- **Ancoragem dos pedidos:** ajustar a descrição da seção `"pedidos"` (linha ~100) e/ou as INSTRUÇÕES ADICIONAIS para deixar explícito que os pedidos derivam da petição inicial (e emendas), e que a contestação alimenta `defesaReclamada`, não cria pedido.
- **Nova instrução (#14):** "Se a contestação impugna/defende uma parcela que NÃO consta da petição inicial e NÃO é reconvenção, NÃO crie um pedido para ela. Em vez disso, registre um `alerta` com `tipo: \"DIVERGÊNCIA - PARCELA NÃO POSTULADA\"`, `severidade: \"media\"`, descrevendo qual parcela, qual contestação a trouxe e o motivo, e `recomendacao` para verificar omissão na transcrição da inicial ou erro da contestação. NÃO trate a parcela como pedido do autor."
- **Documentação do tipo:** acrescentar o tipo `DIVERGÊNCIA - PARCELA NÃO POSTULADA` ao exemplo de `alertas` (linha ~163) e citá-lo na instrução #5.

### 2. Severidade / tom

`severidade: "media"` → renderiza **âmbar** na `AlertasSection`, consistente com o tom "confira" (não "erro definitivo") do banner âmbar do app principal. Knob tunável para `alta` (vermelho) se desejado maior destaque.

### 3. Schema / Store / UI

**Nenhuma mudança.** `alertas[]` já existe no `AnalysisResponseSchema` e é renderizado pela `AlertasSection`. O `tipo` "DIVERGÊNCIA - PARCELA NÃO POSTULADA" torna o alerta autoexplicativo.

### 4. Teste — `src/apps/analisador/prompts/analysis.test.ts` (novo)

Importar o builder de produção `buildAnalysisPrompt` e travar:
- a ancoragem dos pedidos na petição inicial;
- a regra de não-criar-pedido + emitir alerta de divergência;
- a presença do tipo `DIVERGÊNCIA - PARCELA NÃO POSTULADA` no prompt.

Os testes devem falhar se a regra for removida (não apenas casar substrings já presentes).

### 5. Versionamento

Bump para **v1.52.18** nos 4 arquivos: `CLAUDE.md`, `package.json`, `src/constants/app-version.ts`, `src/constants/changelog.js`.

## Riscos e mitigações

- **Falso-negativo (pedido existia na inicial, modelo não captou):** mitigado por sinalizar (alerta) em vez de descartar em silêncio — o alerta leva o magistrado a conferir a inicial.
- **Falso-positivo (reconvenção legítima classificada como divergência):** a regra explicita que pretensão própria da ré vai para `reconvencao`, não vira alerta; instrução #12 permanece.
- **Diluição dos alertas:** o `tipo` distinto e a `severidade` âmbar mantêm o alerta de divergência reconhecível entre os demais (prazos, nulidades).

## Rollback

Mudança isolada ao texto do prompt + um arquivo de teste novo. Reverter o commit restaura o comportamento anterior; sem migração de dados (nenhuma mudança de schema).

## Fora de escopo

- Skills geradoras de JSON (`analise-inicial-contestacao`, `analise-paralela-processos`).
- Outros prompts do Analisador (`refine-pedido.ts`, `synthesis.ts`).
- Campo `divergencias[]` dedicado (descartado em favor de reusar `alertas[]`).
