# PDF Puro no Codex Local via páginas rasterizadas

**Data:** 2026-06-01
**Versão alvo:** v1.50.47

## Problema

O provider **Codex Local (CLI)** não aceita PDF (binário ou Files API), então o
modo "PDF Puro" fica bloqueado para ele (badge "⚠ TXT" / "PDF Binário (Codex CLI)"),
caindo no texto extraído. O usuário verificou que o `codex exec` **aceita imagens**
encadeando `-i <arquivo>`. Logo, é possível habilitar PDF Puro no Codex rasterizando
cada página do PDF em imagem e enviando uma `-i` por página.

## Decisões

| Tema | Decisão |
|------|---------|
| **Escopo** | Os 3 apps com PDF Puro: principal, Analisador, Embargos. |
| **Onde rasterizar** | **Frontend**, reusando o render pdf.js já existente. Bridge fica fino (grava temporários + passa flags). |
| **Limite de páginas** | **Sem teto** — converte tudo, sem bloqueio nem confirmação. Erros de context window do Codex são propagados de forma legível. |
| **Resolução** | `scale=1.5`, JPEG `quality=0.85` — mesma do pipeline de visão (`useDocumentServices`). |

### Sobre custo de tokens

Rasterizar **não** economiza: o custo por página é da mesma ordem do PDF nativo do
Claude (~1–2k tokens/página). O driver de custo é o número de páginas. Como os CLIs
são por assinatura ($0), o que pesa é a **janela de quota** e o **context window** —
por isso a decisão "sem teto" assume o risco conscientemente.

## Arquitetura

Mecanismo central: blocos `document` (PDF) já trafegam no formato Anthropic e são
traduzidos por provider. No caminho do Codex, **antes** da conversão, transformamos
cada `{type:'document', source:{pdf}}` em N blocos `{type:'image', source:{jpeg}}`.
A conversão para o formato do bridge (`image_url` data URI) já existe para blocos
`image`, então o resto flui. O bridge decodifica as imagens, grava em temporários e
passa `-i` por página.

### Artefatos

1. **`src/utils/pdfRasterize.ts`** (novo)
   - `rasterizePdfToImages(base64Pdf, { scale=1.5, quality=0.85 }): Promise<string[]>`
     — render pdf.js → array de JPEG base64 (sem prefixo `data:`).
   - `rasterizePdfDocumentBlocks(messages, opts): Promise<AIMessage[]>` — varre as
     messages e substitui cada bloco `document` PDF por N blocos `image` JPEG;
     blocos não-PDF e conteúdo string passam intactos. Imutável.

2. **`llm-bridge/translate.codex.js`**
   - `extractCodexImages(body): Array<{ ext, buffer }>` — varre `messages[].content`
     por blocos `{type:'image_url', image_url:{url:'data:image/...;base64,...'}}`,
     decodifica. `buildStdin` segue montando só o texto.
   - `buildCodexArgs(body, imagePaths = [])` — acrescenta `-i <path>` por imagem,
     no bloco de flags do `exec` (antes do `-` de stdin).

3. **`llm-bridge/server.js`** (handler `/api/codex-cli/messages`)
   - Antes do spawn: extrai imagens, grava em `os.tmpdir()/sentencify-codex-img-<id>/`
     (`page-N.jpg`), monta args com os paths.
   - `cleanup()` remove o dir; chamado em `child.on('close')`, `child.on('error')` e
     `req.on('close')` (idempotente, `rmSync recursive/force` dentro de try/catch).

4. **Frontend — caminho codex (3 apps)**
   - `src/hooks/useAIIntegration.ts` (principal): em `callOpenAIAPI`, quando
     `localBridge`, `messages = await rasterizePdfDocumentBlocks(messages)` antes de
     `convertToOpenAIFormat` (que já emite `image_url` para blocos `image`).
   - `src/apps/analisador/hooks/useAIIntegration.ts` e
     `src/apps/embargos/hooks/useAIIntegration.ts`: em `callOpenAIAPI` (usado só pelo
     codex), idem + a conversão inline passa a tratar `image` → `image_url`.

5. **Capability/UI**
   - `src/apps/{analisador,embargos}/constants/providers.ts`: adicionar `'codex-cli'`
     a `PROVIDERS_WITH_PDF_BINARY` (doc: Codex usa imagens, não binário).
   - `src/components/tabs/UploadTab.tsx` (principal): remover `|| provider === 'codex-cli'`
     do cálculo de `binaryPdfBlocked` (3 ocorrências); ajustar `blockReason`.
   - Labels/tooltips: para codex, indicar "páginas enviadas como imagens".

6. **Testes + versão**
   - `llm-bridge/translate.codex.test.js`: `extractCodexImages` + `buildCodexArgs` com `-i`.
   - `src/utils/pdfRasterize.test.ts`: `rasterizePdfDocumentBlocks` com render injetável/mockado.
   - Bump v1.50.47 (CLAUDE.md, package.json, app-version.ts, changelog.js).

## Compatibilidade / riscos

- **Sem regressão** para Claude/Gemini (binário nativo intacto) nem para OpenAI cloud
  (continua recebendo `document`→`file`; a rasterização é guardada por `localBridge`).
- **Anonimização**: quando ativa, o pipeline já cai para texto extraído (não gera
  bloco `document`), então nada a rasterizar — preservado.
- **`ARG_MAX`**: os `-i` recebem paths curtos, não base64 — sem risco mesmo com muitas páginas.
- **Context window do Codex**: PDF gigante pode estourar; o erro do CLI é propagado
  (decisão "sem teto").

## Fora de escopo

- Teto/aviso de páginas (decidido: sem limite).
- Rasterizar para outros providers (Grok/DeepSeek seguem text-only).
- prova-oral/notícias (não têm PDF Puro).
