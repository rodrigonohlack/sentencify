# CLAUDE.md

## Project Overview

**SentencifyAI** - React-based legal decision tool for Brazilian labor court judges.

**Version**: 1.40.08 | **File**: `src/App.tsx` (~0.44 MB) | **Runtime**: Standalone + Render

## Architecture

**Hooks**: `src/hooks/` (barrel export via `index.ts`)
**Components**: `src/components/` (cards, modals, panels, editors, ai, chat, ui)
**Stores**: `src/stores/` (Zustand: useUIStore, useAIStore, useModelsStore, useTopicsStore, useProofsStore)

**Storage**:
- `SQLite` (Render) → modelos sincronizados na nuvem
- `SentencifyAI` (IndexedDB) → modelos locais
- `sentencify-*` (IndexedDB) → PDFs, versions, legislação, jurisprudência, embeddings, caches
- `sentencifySession` (localStorage) → metadados + textos

## Critical Guidelines

1. **Modals com Scroll**: Use `overflow-auto` no overlay + `my-auto` no container
2. **File Rename (Windows)**: Use `powershell -Command "Rename-Item..."` (APENAS para renomear)
3. **API**: Use `buildApiRequest()` helper. Model: `claude-sonnet-4-20250514`
4. **z-index**: Base `z-50`, nested `+10` por nível
5. **NUNCA usar Bash/PowerShell para editar conteúdo de arquivos**: Comandos como `sed`, `awk`, `cat`, `echo >`, heredocs CORROMPEM encoding UTF-8. **SEMPRE usar APENAS `Edit` tool ou `Write` tool**.
6. **Novos Modais**: SEMPRE usar `BaseModal` (src/components/modals/BaseModal.tsx). Props: `isOpen`, `onClose`, `title`, `subtitle`, `icon`, `iconColor`, `size`, `children`, `footer`, `preventClose`.
7. **Hooks em `src/hooks/` são código de PRODUÇÃO**: Hooks extraídos são o código REAL usado pelo App.tsx via barrel export.
8. **Versionamento (5 arquivos)**: Ao incrementar versão, atualizar TODOS: `CLAUDE.md` (linha 7), `src/App.tsx` (APP_VERSION ~linha 209), `src/constants/changelog.js`, `package.json`. Formato: `v1.XX.YY`.
9. **Temas Claro/Escuro**: TODA mudança de UI deve funcionar em AMBOS os temas. Usar `dark:` do Tailwind.
10. **Testes DEVEM importar código de produção**: Todo teste deve importar e executar o código real, NUNCA definir constantes/funções duplicadas.
11. **Caminhos relativos para arquivos (Windows)**: SEMPRE usar caminhos relativos (`src/App.tsx`) ao invés de absolutos.

> **Nota**: Este projeto roda como aplicação standalone. Não há limite de tamanho de arquivo.

## Development Standards

### Filosofia
> **QUALIDADE > VELOCIDADE**: JAMAIS priorizar desenvolvimento rápido à custa de qualidade.

### TypeScript
- **SEMPRE verificar erros após edições**: Rodar `npx tsc --noEmit`
- Tipos em `src/types/index.ts` (não inline no App.tsx)
- Tipos explícitos em parâmetros e retornos
- `as const` para objetos de configuração imutáveis

### Código Otimizado para LLM
- Comentários de seção com bordas `═══`
- JSDoc em funções públicas
- Nomes autoexplicativos: `finalSystemPrompt` não `fsp`
- Constantes nomeadas: `OPENAI_CONFIG.RETRY_DELAY_MS` não `5000`

### Performance
- `React.useCallback` em funções passadas como props
- `React.useMemo` para cálculos pesados
- Dependências mínimas nos arrays de deps

### Segurança
- API keys sempre via headers (nunca no body ou URL)
- `apiKeys` excluídas de exports de projeto

## Deploy (Render)

**URL Produção**: https://sentencify.ia.br
**Repositório**: https://github.com/rodrigonohlack/sentencify
**Auto-deploy**: Push para `main` dispara deploy (~2-3 min)

**Arquivos estáticos**: Colocar na pasta `public/`

**Embeddings via CDN** (GitHub Releases: `embeddings-v1`):
- `EmbeddingsCDNService` gerencia download com retry e progresso

## Changelog

Ver histórico completo em `src/constants/changelog.js`

**Last Updated**: 2026-01-20
