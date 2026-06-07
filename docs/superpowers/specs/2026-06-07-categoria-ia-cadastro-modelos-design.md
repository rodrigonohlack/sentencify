# Geração de categoria via IA no cadastro de modelos

**Data**: 2026-06-07
**Status**: aprovado (design)

## Problema

No cadastro de modelos, o botão "Gerar com IA" hoje gera **título** e **palavras-chave**
(em chamadas separadas), mas **não** a **categoria**. A categoria é um campo livre com
`datalist` alimentado pelas categorias dos modelos existentes (`ModelForms.tsx`), 100%
manual. Isso produz duplicatas "quase iguais" (ex: "Horas Extras" vs "Horas extras" vs
"Sobrejornada"), que poluem o filtro por categoria e o agrupamento de modelos.

## Objetivo

Gerar a categoria via IA junto com o título, **reutilizando** categorias já existentes
quando houver equivalência semântica (inclusive sinônimos), para evitar proliferação de
categorias duplicadas.

## Decisões de design (confirmadas com o usuário)

1. **Granularidade**: categoria = **TEMA** do modelo (assunto principal, sem subtema nem
   resultado). Ex: título `HORAS EXTRAS - SOBREJORNADA HABITUAL - PROCEDENTE` → categoria
   `Horas Extras`.
2. **Acionamento UI**: o botão "Gerar com IA" do **campo Título** passa a gerar
   **título + categoria** numa **única chamada** LLM. Palavras-chave seguem com botão
   próprio, inalteradas.
3. **Estratégia anti-duplicata**: **LLM reusa da lista** — passo as categorias existentes
   dentro do prompt e instruo a LLM a reutilizar uma delas quando o tema for equivalente
   (mesmo com sinônimos), só criando categoria nova quando nenhuma servir.
4. **Edição manual preservada**: o campo Categoria mantém o `datalist` atual; o usuário
   pode ajustar o valor gerado livremente.

## Arquitetura da mudança

### Fluxo

1. Usuário preenche o conteúdo no editor Quill e clica "Gerar com IA" no campo Título.
2. `generateTitleWithAI` (em `useModelGeneration.ts`) monta o prompt com:
   - o conteúdo do editor (lido de `modelEditorRef.current.root.innerHTML`, como hoje);
   - a **lista de categorias existentes**, derivada de `modelLibrary.models` (mesma fonte
     que `ModelForms.tsx:210` usa).
3. A LLM responde em **JSON estrito**: `{"title": "...", "category": "..."}`.
4. Parse defensivo (ver abaixo) + **canonicalização léxica** (rede de segurança).
5. `setNewModel(prev => ({ ...prev, title, category }))` grava ambos os campos.
6. `ModelFormModal` sincroniza `category` no buffer `localModel` (hoje já sincroniza
   title/keywords em `ModelForms.tsx:190-207`).

### Prompt (substitui o atual em `useModelGeneration.ts:152-178`)

System prompt segue `AI_PROMPTS.roles.classificacao` (inalterado).

```
${AI_PROMPTS.roles.classificacao}

CONTEÚDO DO MODELO:
${editorContent}

CATEGORIAS JÁ EXISTENTES (reutilize uma destas quando o tema for equivalente,
mesmo que o nome use sinônimos; só crie nova se nenhuma servir):
${categoriasExistentes.join('\n') || '(nenhuma ainda)'}

TAREFA:
1. Gere um TÍTULO no formato: TEMA - SUBTEMA - RESULTADO (PROCEDENTE/IMPROCEDENTE)
   (mesmas regras/exemplos do prompt atual: MAIÚSCULAS, separador " - ", etc.)
2. Defina a CATEGORIA = apenas o TEMA do modelo (assunto principal, sem subtema nem
   resultado). Se uma categoria existente for equivalente, repita-a EXATAMENTE como
   está na lista. Caso contrário, crie uma nova em Title Case.

Responda APENAS com JSON válido, sem explicações:
{"title": "...", "category": "..."}
```

Parâmetros da chamada permanecem como hoje (`temperature: 0.1`, `topP: 0.9`, `topK: 40`,
`useInstructions: false`). `maxTokens` sobe de 100 para ~200 (acomoda o JSON com dois
campos).

### Parse defensivo + fallback

O app fala com vários providers (Claude, OpenAI, Gemini, CLIs locais), então o parsing
precisa ser tolerante:

1. Extrair o primeiro bloco `{...}` da resposta, tolerando cercas ```` ```json ````.
2. `JSON.parse` desse bloco; ler `title` e `category`.
3. **Fallback** se o parse falhar ou faltar `title`: tratar a resposta inteira como o
   título antigo (texto plano) e derivar a categoria pegando o TEMA antes do primeiro
   ` - ` do título. Assim a feature nunca quebra, mesmo com modelo fraco.

### Canonicalização léxica (rede de segurança)

Função pura `canonicalizeCategory(generated, existing)`:

- Normaliza para comparação: caixa baixa, sem acentos, espaços colapsados/trim.
- Se a categoria gerada bater (na forma normalizada) com uma existente, retorna a
  **grafia exata da existente** (fecha o caso de a LLM devolver "Horas extras" quando já
  existe "Horas Extras").
- Se não houver match, retorna a gerada em **Title Case**.

Pura e testável; teste importa o código real (CLAUDE.md regra 10).

## Arquivos afetados

- `src/hooks/useModelGeneration.ts` — `generateTitleWithAI`: deriva lista de categorias de
  `modelLibrary.models`, monta novo prompt, parse JSON + fallback, canonicaliza, grava
  `title` e `category` em `setNewModel`. Sobe `maxTokens` para ~200.
- `src/components/forms/ModelForms.tsx` — sincroniza `category` no buffer `localModel`
  (junto de title/keywords, `:190-207`); ajusta o texto/aria do botão de título (ex:
  "Gerar título + categoria").
- Função `canonicalizeCategory` — em util compartilhado ou no próprio hook (a definir no
  plano), com teste.
- Versão: bump nos 4 arquivos (CLAUDE.md linha 7, `src/App.tsx` APP_VERSION,
  `src/constants/changelog.js`, `package.json`).

## Fora de escopo / sem mudança

- `type Model` — campo `category?: string` já existe (`src/types/index.ts:148-175`).
- IndexedDB — já persiste e indexa `category` (`useIndexedDB.ts:111,227`).
- Geração de palavras-chave — inalterada.
- Sem match semântico via embeddings E5 (descartado em favor da dedup via prompt).

## Critérios de sucesso

- Clicar "Gerar com IA" no título preenche título **e** categoria.
- Quando o tema equivale a uma categoria existente (incl. sinônimo), a categoria gerada
  **reutiliza a grafia exata** da existente.
- Categoria nova vem em Title Case.
- Resposta sem JSON válido não quebra: cai no fallback (título plano + TEMA derivado).
- Funciona em tema claro e escuro (sem regressão de UI).
