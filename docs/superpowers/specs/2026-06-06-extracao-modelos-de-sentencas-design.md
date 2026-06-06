# Skill `extrair-modelos-de-sentencas` — Design

**Data**: 2026-06-06
**Status**: aprovado em brainstorming, aguardando plano de implementação

## Objetivo

Transformar uma pasta de sentenças finalizadas (Google Docs no Drive) em uma
base de **modelos importáveis** no Sentencify — fragmentos reutilizáveis por
tema, com placeholders, **sem repetidos** — empacotada como skill re-rodável.

Primeira execução: as últimas 100 sentenças do usuário em
`SENTENÇAS_NOHLACK_TRT8`. A skill deve servir para qualquer pasta/quantidade no
futuro.

## Decisões de design (fechadas no brainstorming)

1. **Granularidade**: fragmento por tema/capítulo (não a sentença inteira).
2. **Fonte**: Google Drive, pasta `SENTENÇAS_NOHLACK_TRT8`. Uma subpasta por
   processo (nome = nº do processo); cada subpasta tem 1 Google Doc que é a
   sentença (pode haver outros docs de prova oral/análise a ignorar).
3. **Conteúdo do modelo**: texto bruto do capítulo **com placeholders**
   (`[DATA]`, `[VALOR]`, `[ID]`, `[PROCESSO]`, `[FLS]`) — mantém o esqueleto de
   raciocínio inteiro e sinaliza o que preencher.
4. **Dedup**: agrupar por similaridade e **manter variantes legítimas**. Cluster
   quase-idêntico → 1 modelo canônico (o mais completo). Cluster com teses
   distintas → 1 modelo por variante, rotulado.
5. **Execução**: skill reutilizável, no padrão `analise-paralela-processos`.
6. **`category`** do modelo = **nome do tema** (ex.: "Danos morais",
   "Prescrição", "Honorários") — melhor para o filtro de modelos do app.
7. **Sem regra especial para boilerplate**: justiça gratuita, juros/correção e
   honorários passam pelo MESMO pipeline de variantes. A quantidade de modelos
   por tema emerge dos dados.

## Formato de saída (alvo)

Array JSON importável pela tela de modelos do Sentencify. Cada item:

```json
{
  "title": "Danos morais — procedente (concausa)",
  "content": "<texto do capítulo com placeholders>",
  "keywords": "dano moral, concausa, doença ocupacional, 223-G",
  "category": "Danos morais"
}
```

- **Sem** `id` e **sem** `embedding`: o app gera `id` e regenera `embedding` no
  import (`useExportImport.importModels`).
- `title` e `content` são obrigatórios; `keywords` e `category` opcionais.
- Como a saída já vem deduplicada, o dedup fraco do import (match exato de
  título+categoria ou conteúdo idêntico) não atrapalha.

## Pipeline (5 estágios)

```
Drive (pasta) → [1] Seleção → [2] Segmentação → [3] Placeholders → [4] Clustering → [5] JSON
```

### [1] Seleção dos documentos
- Lista a pasta-alvo paginando TODAS as subpastas.
- Em cada subpasta, identifica o doc-sentença e ignora docs de prova oral/análise.
  Heurística: o conteúdo começa com `SENTENÇA` **ou** contém os marcos
  `FUNDAMENTAÇÃO` + `DISPOSITIVO`.
- Ordena por `createdTime` do doc (desc) e pega as últimas N (default 100).
- Parâmetros: pasta-alvo, N.

### [2] Segmentação por cabeçalho (determinística, código)
- Recorta **apenas a faixa entre `FUNDAMENTAÇÃO` e `DISPOSITIVO`**.
  `RELATÓRIO` e `DISPOSITIVO` ficam de fora (puro caso concreto).
- Detecta cabeçalhos = linhas curtas em CAIXA ALTA.
  - `PRELIMINAR` / `PREJUDICIAL` / `MÉRITO` = marcadores estruturais
    (contexto), não viram modelo.
  - Cabeçalho do tema vira `title` provisório e `category` (= nome do tema).
- Resultado: lista de fragmentos `{categoria_estrutural, tema, corpo, processo}`.

### [3] Placeholders (regex primeiro; LLM só no resíduo)
- **Regex (cobre ~90%, sem custo)**:
  - `ID [0-9a-f]{6,}` → `[ID]`
  - `\d{2}/\d{2}/\d{4}` → `[DATA]`
  - `R\$\s?[\d.,]+` → `[VALOR]`
  - nº de processo (`\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}`) → `[PROCESSO]`
  - `fls?\.\s?\d+` → `[FLS]`
  - percentuais quando claramente do caso → `[PERCENTUAL]`
- **NÃO** vira placeholder: o **desfecho/tese** (`julgo procedente/improcedente`,
  `rejeito/acolho`, `concausa`/`nexo direto`/`sem nexo`) — é o sinal que separa
  variantes no estágio 4.
- Nomes próprios são raros na fundamentação (usa-se "o reclamante"/"a
  demandada"). Um passe leve de LLM limpa apenas o resíduo.

### [4] Clustering & variantes (TF-IDF em código — sem API)
- Agrupa por **tema normalizado** primeiro.
- Dentro do tema, deixa as variantes emergirem por **TF-IDF coseno** sobre o
  texto com placeholders, reforçado por **sinais de palavra-chave** que marcam
  variação legítima:
  - desfecho: `procedente`/`improcedente`, `rejeito`/`acolho`
  - tipo de parte: `massa falida`, `fazenda pública`, `pessoa jurídica`
  - resultado: `indeferid*`
  - nexo: `concausa`/`nexo direto`/`sem nexo`
- Cluster quase-idêntico (sim alta) → 1 canônico = representante mais completo
  (mais longo / mais citações).
- Clusters de teses distintas → 1 modelo por variante.
- LLM atua só aqui: escolher/mesclar o canônico, gerar o **rótulo** da variante
  (`Tema — desfecho (detalhe)`) e as **keywords**. São poucas dezenas de
  clusters → barato.
- Parâmetro: limiar de similaridade.

### [5] Saída JSON
- Emite o array `[{title, content, keywords, category}]` em arquivo local.
- Usuário importa pela tela de modelos do Sentencify.

## Empacotamento (skill)

- Estrutura no padrão `analise-paralela-processos`: `SKILL.md` + `scripts/`.
- `scripts/` guarda código reutilizável e determinístico: segmentação por
  cabeçalho, placeholders-regex e clustering TF-IDF.
- Parâmetros da skill: pasta-alvo, N (qtd de sentenças), limiar de similaridade,
  temas a incluir/excluir.

## Restrição de escala (resolver no plano)

- 100 docs ≈ 1,3M tokens — não cabe num único contexto.
- A skill processa **doc a doc via subagentes** (um subagente por doc): cada
  subagente busca o doc, roda o script de segmentação/placeholders e retorna os
  fragmentos estruturados — o texto bruto fica isolado no contexto do subagente
  e não polui o contexto principal. O orquestrador só agrega os fragmentos e, no
  fim, o LLM só vê os **representantes de cluster**.
- O clustering TF-IDF roda no orquestrador, sobre os fragmentos agregados.

## Fora de escopo

- Inserção automática dos modelos via API (a skill entrega o JSON; o import é
  manual pela tela). Pode ser uma evolução futura.
- Extração de `RELATÓRIO` e `DISPOSITIVO` como modelos.
