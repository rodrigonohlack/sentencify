# CLAUDE.md

## Project Overview

**SentencifyAI** - React-based legal decision tool for Brazilian labor court judges.

**Version**: 1.38.15 | **File**: `src/App.tsx` (~0.44 MB) | **Runtime**: Standalone + Render

## Architecture

**Hooks**: `useModalManager`, `useAIIntegration`, `useLocalStorage`, `useModelLibrary`, `useProofManager`, `useDocumentManager`, `useTopicManager`, `usePrimaryTabLock`, `useGlobalEditor`, `useChatAssistant`, `useFieldVersioning`, `useCloudSync`, `useGoogleDrive`, `useFactsComparisonCache`, `useSentenceReviewCache`, `useFullscreen`, `useSpacingControl`, `useFontSizeControl`, `useFeatureFlags`, `useThrottledBroadcast`, `useAPICache`, `useIndexedDB`, `useLegislacao`, `useModelSave`, `useDispositivoGeneration`, `useDecisionTextGeneration`, `useFactsComparison`, `useModelExtraction`, `useDetectEntities`, `useExportImport`, `useDecisionExport`, `useSlashMenu`, `useFileHandling`, `useNERManagement`, `useChangeDetectionHashes`, `useSemanticSearchManagement`, `useQuillInitialization`, `useTopicValidation`, `useKeyboardShortcuts`, `useEditorHandlers`, `useReviewSentence`, `useSemanticSearchHandlers`, `useModelSuggestions`, `useMultiTabSync`, `useTopicModalHandlers`, `useModelModalHandlers`, `useProofModalHandlers`

**Components**: `TopicCard`, `ModelCard`, `SuggestionCard`, `ProofCard`, `GlobalEditorModal`, `LockedTabOverlay`, `VersionSelect`, `LoginMagicModal`, `SyncStatusIndicator`, `ShareLibraryModal`, `AcceptSharePage`, `TopicCurationModal`, `GoogleDriveButton`, `ModelGeneratorModal`, `FactsComparisonModal`, `ConfigModal`, `AIAssistantBaseLegacy`, `AIAssistantBase`, `AIAssistantModal`, `AIAssistantGlobalModal`, `AIAssistantModelModal`, `ModalRoot`

**Storage**:
- `SQLite` (Render Persistent Disk) → modelos sincronizados na nuvem (v1.34.0)
- `SentencifyAI` (IndexedDB) → modelos locais (fallback)
- `sentencify-pdfs` (IndexedDB) → PDFs
- `sentencify-versions` (IndexedDB) → versionamento do campo fundamentação
- `sentencify-legislacao` (IndexedDB) → artigos de legislação (CLT, CPC, CF88...) - auto-download via CDN
- `sentencify-jurisprudencia` (IndexedDB) → precedentes (súmulas, OJs, IRDRs...) - auto-download via CDN
- `sentencify-legislacao-embeddings` (IndexedDB) → embeddings pré-computados da legislação
- `sentencify-juris-embeddings` (IndexedDB) → embeddings pré-computados da jurisprudência
- `sentencifySession` (localStorage) → metadados + textos
- `sentencify-facts-comparison` (IndexedDB) → cache de confronto de fatos
- `sentencify-sentence-review` (IndexedDB) → cache de revisão de sentença (v1.36.57)
- Modelos NER/E5 (cache browser) → baixados automaticamente do HuggingFace CDN

## Critical Guidelines

1. **Modals com Scroll**: Use `overflow-auto` no overlay + `my-auto` no container (ver DispositivoModal)
2. **File Rename (Windows)**: Use `powershell -Command "Rename-Item..."` (APENAS para renomear)
3. **API**: Use `buildApiRequest()` helper. Model: `claude-sonnet-4-20250514`
4. **z-index**: Base `z-50`, nested `+10` por nível
5. **NUNCA usar Bash/PowerShell para editar conteúdo de arquivos**: Comandos como `sed`, `awk`, `cat`, `echo >`, heredocs (`<<EOF`), e qualquer redirecionamento de shell CORROMPEM encoding UTF-8 (acentuação quebrada: "Posição" → "Posicao", "RELATÓRIO" → "RELATORIO"). **SEMPRE usar APENAS `Edit` tool ou `Write` tool** para criar/modificar arquivos. Bash é permitido APENAS para comandos de sistema (git, npm, tsc, etc.), NUNCA para manipular conteúdo de arquivos.
6. **Novos Modais**: SEMPRE usar `BaseModal` (src/components/modals/BaseModal.tsx). Nunca reimplementar ESC handler, scroll lock ou estrutura modal manualmente. Props: `isOpen`, `onClose`, `title`, `subtitle`, `icon`, `iconColor` (blue/red/green/yellow/purple/orange), `size` (sm/md/lg/xl/2xl), `children`, `footer`, `preventClose`.
7. **Hooks em `src/hooks/` são código de PRODUÇÃO** (v1.36.70+): Os hooks extraídos em `src/hooks/` (useFullscreen, useIndexedDB, etc.) são o código REAL usado pelo App.tsx via barrel export (`./hooks/index.ts`). Hooks ainda não extraídos permanecem definidos dentro do App.tsx.
8. **Versionamento (5 arquivos)**: Ao incrementar versão, atualizar TODOS: `CLAUDE.md` (linha 7 + Recent Changes), `src/App.tsx` (APP_VERSION ~linha 209), `src/constants/changelog.js`, `package.json`. **APP_VERSION no App.tsx é frequentemente esquecido após compactação de contexto!**
9. **Temas Claro/Escuro**: TODA mudança de UI deve funcionar em AMBOS os temas. Usar classes `theme-*` ou variantes `dark:` do Tailwind. Testar visualmente nos dois temas antes de commitar.
10. **Testes DEVEM importar código de produção**: Todo teste deve importar e executar o código real, NUNCA definir constantes/funções duplicadas internamente. Teste que não importa do código de produção é **inútil**. Exemplo correto: `import { useIndexedDB } from './useIndexedDB';`. Exemplo ERRADO: definir `const DB_NAME = 'SentencifyAI'` dentro do teste ao invés de importar do hook real.
11. **Caminhos relativos para arquivos (Windows)**: SEMPRE usar caminhos relativos (`src/App.tsx`) ao invés de absolutos (`C:\Users\...\src\App.tsx`). Caminhos absolutos causam erro "File has been unexpectedly modified" no Edit tool do Claude Code no Windows.

> **Nota**: Este projeto agora roda como aplicação standalone (fora do sandbox Claude.ai). Não há mais limite de tamanho de arquivo nem necessidade de minificação.

## Development Standards

### Filosofia
> **QUALIDADE > VELOCIDADE**: JAMAIS priorizar desenvolvimento rápido à custa de qualidade.
> Código mal escrito custa mais tempo para corrigir do que fazer certo da primeira vez.

### Versionamento Obrigatório

**A cada incremento de versão, atualizar TODOS os arquivos abaixo:**

| Arquivo | Local | Exemplo |
|---------|-------|---------|
| `CLAUDE.md` | Linha 7 (Version) | `**Version**: 1.36.2` |
| `CLAUDE.md` | Seção `Recent Changes` | Nova linha no topo da tabela |
| `src/App.tsx` | `APP_VERSION` (~linha 204) | `const APP_VERSION = '1.36.2';` |
| `src/constants/changelog.js` | Array `CHANGELOG` | Nova entrada no topo |
| `package.json` | Campo `version` | `"version": "1.36.2"` |

- Formato: `v1.XX.YY` onde YY incrementa a cada alteração
- Descrição clara e concisa da mudança em cada changelog

### TypeScript
- **SEMPRE verificar erros após edições**: Rodar `npx tsc --noEmit` após modificar código
- Todos os tipos devem ir para `src/types/index.ts` (não inline no App.tsx)
- Tipos explícitos em parâmetros e retornos de função (não depender de inferência)
- Interfaces para objetos complexos (`OpenAIMessage`, não `Record<string, unknown>`)
- `as const` para objetos de configuração imutáveis
- Type assertions (`as Type`) apenas quando necessário
- Usar `\u` para escapes Unicode em strings (não `\x` octal que causa erro TS1487)

### Código Otimizado para Manutenção por LLM
- **Comentários de seção**: Usar bordas `═══` para delimitar seções grandes
- **JSDoc**: Documentar funções públicas com `@param`, `@returns`, `@example`
- **Nomes autoexplicativos**: `finalSystemPrompt` não `fsp`, `reasoningLevel` não `rl`
- **Constantes nomeadas**: `OPENAI_CONFIG.RETRY_DELAY_MS` não `5000`
- **Padrões consistentes**: Novas funções devem seguir padrão das existentes

### Performance
- `React.useCallback` em todas as funções passadas como props ou em deps
- `React.useMemo` para cálculos pesados
- Dependências mínimas nos arrays de deps dos hooks
- Evitar re-renders: estado local para inputs (buffer antes de propagar)

### Segurança
- API keys sempre via headers (nunca no body ou URL)
- Proxy pelo backend (chaves não expostas no frontend)
- Validar/sanitizar inputs do usuário
- `apiKeys` excluídas de exports de projeto

## Deploy (Render)

**URL Produção**: https://sentencify.ia.br
**URL Render**: https://sentencify.onrender.com (domínio interno)
**URL Backup**: https://sentencifyai.vercel.app (Vercel ainda funciona como fallback)
**Repositório**: https://github.com/rodrigonohlack/sentencify

**Auto-deploy**: Push para `main` dispara deploy automático (~2-3 min no Render).

**Vantagens do Render vs Vercel**:
- Sem limite de payload (100MB configurado vs 4.5MB no Vercel)
- Timeout de 100 minutos (vs 1 minuto no Vercel)
- WebSockets suportados
- Servidor persistente (não serverless)
- Plano pago: servidor sempre ativo (sem sleep)

**Arquivos estáticos**: Colocar na pasta `public/` (ex: `MANUAL_USUARIO_AVANCADO.html`)

**Arquivos grandes ignorados** (não vão para o GitHub):
- `LEGIS/embeddings.json` (211 MB)
- `JURIS/juris-embeddings.json`
- `sentencify-modelos-com-embeddings.json`

**Embeddings via CDN** (v1.33.0):
- Hospedados no GitHub Releases: `embeddings-v1`
- URLs: `https://github.com/rodrigonohlack/sentencify/releases/download/embeddings-v1/legis-embeddings.json` e `juris-embeddings.json`
- Download automático na primeira execução via modal
- `EmbeddingsCDNService` gerencia download com retry e progresso

## Recent Changes

| Version | Feature |
|---------|---------|
| v1.38.15 | Prompt especializado para análise de prova oral trabalhista: instruções de valoração correta de depoimentos pessoais (só confissão) vs testemunhais (prova a favor), síntese adaptada aos tópicos |
| v1.38.14 | Fix migração quickPrompts: sessões pré-v1.38.12 recebem proofFilter:oral via onRehydrateStorage |
| v1.38.13 | VirtualList no ChangelogModal: renderiza só ~15-20 items visíveis (antes: 430+ DOM nodes) - performance |
| v1.38.12 | Controle granular de contexto no Assistente IA: escopo de tópicos + toggle petições/contestações + proofFilter oral |
| v1.38.11 | Fix crítico: chat do Assistente IA agora recebe petição inicial completa (antes: type mismatch peticao/peticoes em prepareDocumentsContext causava petição ser ignorada) |
| v1.38.9 | Expandir área útil: layout usa 95% da tela (antes: 1280px fixo), padding reduzido de 24px para 16px |
| v1.38.8 | Anexos em provas: permite adicionar documentos relacionados (impugnações, esclarecimentos) a uma prova, análise com delimitadores XML para IA distinguir prova principal de anexos |
| v1.38.7 | Reload automático no Assumir Controle: não precisa mais pressionar F5 (standalone não tem restrição do sandbox) |
| v1.38.6 | Fix race condition no tab lock: mover leitura de sessionStorage para useEffect (evita StrictMode limpar TAKEOVER_KEY antes do claim) |
| v1.38.5 | Fix melhoria com IA no ditado: improveWithAI em todos os VoiceButtons (Sua Decisão, Regenerar com IA, Assistente IA, Chat, Preview Modal) |
| v1.38.3 | CSP (Content Security Policy) headers: proteção contra XSS com whitelist de CDNs, APIs IA, Google, HuggingFace, GitHub e Sentry |
| v1.38.2 | Fix ícone Grok invisível no tema escuro: usar text-gray-400 (cor única para ambos os temas) |
| v1.38.1 | Fix bulk upload rate limiting: bulkStaggerDelay padrão 0ms→500ms para espaçar requisições e evitar erro 429 |
| v1.38.0 | Limpeza de código órfão: remover 4 funções não utilizadas do App.tsx (~40 linhas de código morto) |
| v1.37.99 | Fix exclusão de tópicos não selecionados: useTopicModalHandlers.confirmDeleteTopic agora remove de todas as listas |
| v1.37.98 | Fix erro 403 ao atualizar arquivo existente no Drive: remover campo parents do metadata no PATCH |
| v1.37.97 | Toast de feedback ao salvar projeto no Google Drive: usar showToast (antes: setError não aparecia) |
| v1.37.96 | Modal de confirmação ao excluir do Google Drive: substituir window.confirm por BaseModal estilizado |
| v1.37.95 | Fix sincronização chat entre editores: isOpen força reload do cache ao abrir modal (antes: clear em um editor não refletia no outro) |
| v1.37.94 | Fix cache chat Editor Individual: App.tsx agora usa useChatHistoryCache (antes: só GlobalEditorModal tinha cache), remoção de logs debug |
| v1.37.93 | Fix persistência chat: salvar histórico do tópico anterior antes de limpar ao fechar modal |
| v1.37.92 | Persistência do histórico de chat do Assistente IA por tópico: persiste em F5, incluído em export/import de projeto, botão Limpar Chat |
| v1.37.91 | Contagem de tokens por modelo: breakdown por modelo usado no painel Uso de Tokens, custo real calculado por provider |
| v1.37.90 | Refatorar melhoria de voz: reutilizar callAI do useAIIntegration com provider override - tracking automático de tokens |
| v1.37.89 | Fix endpoints API melhoria de voz: corrigir 404 (claude/messages, gemini/generate, openai/chat, grok/chat) |
| v1.37.88 | Melhoria automática de texto ditado por voz com IA: toggle em Config IA + dropdown de modelos rápidos (Haiku/Flash/GPT-4o Mini/Grok Instant) |
| v1.37.87 | Ditado por voz no campo "Minhas Conclusões" na aba Provas: VoiceButton integrado ao ProofCard |
| v1.37.86 | Fix Double Check: preservar campos item/suggestion da IA + UX binária para texto livre (aceita tudo ou rejeita tudo) |
| v1.37.85 | Fix cores ícones provedores IA: Claude roxo→laranja (branding oficial), Grok visível em tema claro |
| v1.37.84 | DriveFilesModal seguir padrão BaseModal: ESC handler hierárquico (sub-modais primeiro) + scroll lock |
| v1.37.83 | Fix ícone Claude incorreto: substituir SVG inventado pelo logo oficial starburst do Bootstrap Icons |
| v1.37.82 | Fix Quill tema claro: restaurar estilos .quill-light-theme deletados em v1.37.80 - editor agora muda corretamente entre temas |
| v1.37.81 | Sistema color-free completo: stripInlineColors() sanitiza cores em 10 pontos de entrada (paste, IA, import projeto/modelos), clipboard matcher remove color/background preservando bold/italic, CSS fallback color:inherit !important |
| v1.37.80 | Fix tema claro/escuro: sistema color-free no Quill editor - textos herdam cor do tema via CSS vars, injectQuillLightStyles() removida |
| v1.37.79 | Remover truncações: fundamentação completa no dispositivo (antes: 200 chars), análise de prova 50k→200k chars |
| v1.37.78 | Fix race condition sync inicial: modelsLoaded prop impede sync antes de IndexedDB carregar (antes: local=0 causava full sync em todo F5) + logs diagnóstico trackChange |
| v1.37.77 | Fix trackChange para deletes via modal: useModelModalHandlers agora chama trackChange antes de remover modelo, permitindo sync correto (antes: pendingDeletes=0) |
| v1.37.76 | Fix completo sync modelos ressuscitando: pendingChangesRef evita stale closure, comparação considera pending deletes (455 >= 456-1), logs detalhados de push |
| v1.37.75 | Fix bug sync modelos ressuscitando: usar useModelsStore.getState() como fonte de verdade para contagem local (antes: localStorage desatualizado causava full sync que baixava modelos deletados) |
| v1.37.74 | ModalRoot expandido: modais de tópicos (RenameTopicModal, MergeTopicsModal, SplitTopicModal, NewTopicModal) movidos do App.tsx (~37 linhas removidas), handlers passados como props para AI regeneration |
| v1.37.73 | ModalRoot com Zustand: 7 modais extraídos para componente centralizado (DeleteTopic, DeleteModel, DeleteAllModels, Export, SimilarityWarning, ExtractedModelPreview, BulkDiscardConfirm), 3 hooks criados (useTopicModalHandlers, useModelModalHandlers, useProofModalHandlers), useReviewStore adicionado |
| v1.37.72 | Estender fix Double Check para dispositivo e sentenceReview: instrução explícita para incorporar correções no verifiedResult |
| v1.37.71 | Logos dos provedores de IA: ícones SVG oficiais (Claude, Gemini, OpenAI, Grok) substituem bolinhas coloridas no seletor de provedores |
| v1.37.70 | Fix Double Check correções não aplicadas ao texto final: instrução explícita para IA incorporar correções no verifiedResult (proofAnalysis e quickPrompt) |
| v1.37.69 | Fix Double Check respondendo em inglês: instrução explícita de idioma (português brasileiro) adicionada a todos os prompts |
| v1.37.68 | Double Check multimodal: suporte a PDF binário (Claude/Gemini/OpenAI), contexto completo sem truncação, fallback texto para Grok |
| v1.37.67 | Análise de provas: remover fundamentação já escrita do contexto - análise baseada apenas em documentos originais/mini-relatórios |
| v1.37.66 | Fix modal Double Check: descrições de correções agora mostram item/suggestion legíveis ao invés de apenas "improve" |
| v1.37.65 | Double Check para Análise de Provas e Quick Prompts: verificação secundária com modal de revisão de correções |
| v1.37.64 | Fix Double Check factsComparison: campo "observacoes" → "observacao" (singular) alinhado com tipo TypeScript |
| v1.37.63 | Estilo de redação: preferir "dispensa/dispensado" em vez de "demissão/demitido" |
| v1.37.62 | Fix Double Check factsComparison: usar dados reais da IA nas correções (código sobrescrevia tema/field/newValue com valores fixos) |
| v1.37.61 | Double Check factsComparison: regras fix_row movidas para início do prompt com exemplos ✅/❌ - IA agora gera tema real, field válido e newValue preenchido |
| v1.37.60 | Fix API keys perdidas ao recarregar: setApiKey agora persiste em sentencify-ai-settings (antes só gravava em memória Zustand, usuários novos perdiam keys ao recarregar) |
| v1.37.59 | DoubleCheckReviewModal: Modal obrigatório para revisão de correções do Double Check - usuário aceita/rejeita correções individualmente antes de aplicá-las (topicExtraction, dispositivo, sentenceReview, factsComparison) |
| v1.37.57 | Fix bug "cannot add property embedding, object is not extensible" - gerar embeddings para modelos existentes falhava por mutação direta de objetos frozen do Zustand/Immer |
| v1.37.51 | Extração de modais: Toast, AutoSaveIndicator, ChangelogModal, SentenceReviewModals, DownloadModals extraídos do App.tsx (~400 linhas) - 7 novos componentes |
| v1.37.50 | Fix bug categoria de tópicos: MERITO → MÉRITO (typo sem acento) em TopicCard.tsx e FullscreenModelPanel.tsx - tópicos agora preservam categoria correta após curadoria |
| v1.37.49 | Zustand Migration: 18 useState migrados para stores (useUIStore, useAIStore, useModelsStore) - driveFiles, modelGenerator, apiTestStatuses, etc. |
| v1.37.48 | Fix encoding UTF-8: "Minhas Conclusões" na aba Provas (ProofCard.tsx) |
| v1.37.47 | Fix Vite warning: imports dinâmicos removidos em QuillEditors.tsx (FullscreenModelPanel, VersionSelect) - já estavam no bundle via barrel export |
| v1.37.46 | FASE 51: useMultiTabSync extraído para src/hooks/ (~52 linhas removidas) - sincronização multi-tab simplificada com Zustand getState() eliminando refs |
| v1.37.45 | FASE 47: useModelSuggestions extraído para src/hooks/ (~216 linhas removidas) - findSuggestions, refineWithAI, scoreModel com estratégia Zustand (useModelsStore.getState()) |
| v1.37.44 | FASE 52: useSemanticSearchHandlers extraído para src/hooks/ (~35 linhas removidas) - performModelSemanticSearch, performManualSemanticSearch com estratégia Zustand |
| v1.37.43 | FASE 44: useReviewSentence extraído para src/hooks/ (~82 linhas removidas) - estados e função de revisão crítica de sentença com cache e double check |
| v1.37.42 | FASE 43+48-50: useQuillInitialization, useTopicValidation, useKeyboardShortcuts, useEditorHandlers extraídos (~380 linhas removidas) - App.tsx 6400→6020 |
| v1.37.41 | FASE 40-42: useNERManagement, useChangeDetectionHashes, useSemanticSearchManagement extraídos (~160 linhas removidas) |
| v1.37.40 | Fix encoding UTF-8 em GlobalEditorModal, useDocumentAnalysis, ModelsTab, FullscreenModelPanel - ~40 strings/comentários com acentos perdidos (Sugestões, Tópicos, Decisão, Visualização, etc.) |
| v1.37.39 | Fix encoding UTF-8 em ProofCard.tsx - ~25 strings com acentos perdidos (Tópicos, Análise, extração, binário, anonimização, etc.) |
| v1.37.38 | FASE 29: Toast system migrado para useUIStore - toast, showToast, clearToast centralizados no Zustand (~12 linhas removidas) |
| v1.37.37 | FASE 35+32: useThemeManagement e useTabbedInterface extraídos para src/hooks/ (~40 linhas removidas) |
| v1.37.36 | Fix RELATÓRIO duplicado: buildAnalysisPrompt extraído para src/prompts/ com acentos corretos (~95 linhas removidas) |
| v1.37.35 | Fix RELATÓRIO não reconhecido como tópico especial: título/categoria sem acento não batiam com SPECIAL_TOPICS |
| v1.37.34 | Fix bug RELATÓRIO duplicado: acento perdido no filtro causava comparação "RELATÓRIO" !== "RELATORIO" sempre true |
| v1.37.33 | HOTFIX: Corrigir encoding UTF-8 em ~30 arquivos - acentos perdidos durante extrações bash (Posição Fixa, Gerando relatório, sinônimos jurídicos, mensagens de progresso) |
| v1.37.32 | FASE 28: UploadTab extraído para src/components/tabs/UploadTab.tsx (~630 linhas) - aba Upload com 3 seções (Petição, Contestação, Complementares) + paste text + ProcessingModeSelector |
| v1.37.31 | FASE 27: ModelsTab extraído para src/components/tabs/ModelsTab.tsx (~512 linhas) - aba Banco de Modelos com 8 seções (banner, header, ModelFormModal, filtros, semântica, grid/lista, paginação, empty states) |
| v1.37.30 | FASE 26: ConfigModal extraído para src/components/modals/ConfigModal.tsx (~2.154 linhas removidas) - 18 seções (providers, API keys, thinking, double check, PDF, NER, embeddings, prompts customizados) |
| v1.37.29 | Fix z-index SimilarityWarningModal (60→100) + mover bulk-prompts.ts para src/prompts/ (organização correta) |
| v1.37.28 | FASE 20: useFileHandling extraído para src/hooks/ (~594 linhas removidas) - getBulkPendingFilesCount, handleConfirmBulkCancel, generateModelsFromFileContent, processBulkFiles, handleBulkFileUpload, saveBulkModels, removeBulkReviewModel, toggleFavorite + bulk-prompts.ts |
| v1.37.27 | FASE 25: useSlashMenu extraído para src/hooks/ (~99 linhas removidas) - openSlashMenu, closeSlashMenu, navigateSlashMenu, selectModelFromSlash, updateSlashSearchTerm |
| v1.37.26 | FASE 21: useDecisionExport extraído para src/hooks/ (~152 linhas removidas) - exportDecision para exportação da sentença com clipboard e HTML |
| v1.37.25 | FASE 18: useExportImport extraído para src/hooks/ (~204 linhas removidas) - exportAiSettings, importAiSettings, exportModels, importModels, checkDuplicate |
| v1.37.24 | FASE 17: useDetectEntities extraído para src/hooks/ (~243 linhas removidas) - detectarNomesAutomaticamente, constantes NER |
| v1.37.23 | FASE 19: html-conversion.ts extraído para src/utils/ (~228 linhas removidas) - htmlToPlainText, htmlToFormattedText, plainTextToHtml, cleanHtmlForExport |
| v1.37.22 | FASE 16: useModelExtraction extraído (~340 linhas) - extractModelFromDecisionText, saveExtractedModel, cancelExtractedModel |
| v1.37.21 | FASE 15: useFactsComparison extraído (~210 linhas) - handleOpen/handleGenerate + estados e cache |
| v1.37.20 | FASE 14: injectQuillStyles + injectQuillLightStyles extraídos para src/utils/quill-styles-injector.ts (~390 linhas) |
| v1.37.19 | Índice desatualizado removido (~95 linhas) - header simples aponta para estrutura modular |
| v1.37.18 | FASE 12-13: useDecisionTextGeneration + promptBuilders extraídos (~680 linhas removidas) |
| v1.37.16 | FASE 11: useDispositivoGeneration extraído (~425 linhas removidas) - generateDispositivo, regenerateDispositivoWithInstruction |
| v1.37.15 | Fix "Gerar com IA" (título/keywords): useModelGeneration agora lê conteúdo diretamente do Quill editor via modelEditorRef (antes usava state não sincronizado) |
| v1.37.14 | FASE 10: useModelSave extraído (~380 linhas removidas) - saveModel, saveModelWithoutClosing, executeSaveModel, executeSaveAsNew, executeExtractedModelSave, processBulkSaveNext, handlers de similaridade |
| v1.37.13 | Remove cache de "Gerar com IA" (título/keywords) - cada clique gera nova resposta |
| v1.37.12 | (revertido em v1.37.13) Fix cache hit com clear→set |
| v1.37.11 | Fix "Gerar com IA" sync: ModelFormModal agora sincroniza localModel quando Zustand newModel.title/keywords mudam |
| v1.37.10 | Fix parcial useModelGeneration: stale closure em setNewModel - usar functional updater (prev => ...) |
| v1.37.9 | FASE 8: useEmbeddingsManagement extraído (~400 linhas removidas) |
| v1.37.8 | FASE 7: useModelGeneration extraído (~100 linhas removidas) |
| v1.37.7 | FASE 6: useTopicOperations extraído (~170 linhas removidas) |
| v1.37.6 | FASE 5: useDragDropTopics extraído (~150 linhas removidas) |
| v1.37.5 | FASE 4: useTopicOrdering extraído (~250 linhas removidas) |
| v1.37.4 | FASE 3: useProofAnalysis extraído (~400 linhas removidas) |
| v1.37.3 | FASE 2: useReportGeneration extraído (~300 linhas removidas) |
| v1.37.2 | FASE 1: useDocumentAnalysis extraído (~400 linhas removidas) |
| v1.37.1 | FASE 0: Planejamento refatoração LegalDecisionEditor (plano em ~/.claude/plans/) |
| v1.37.0 | FASE 6 refatoração final: src/styles/ criado com GlobalHoverStyles e ThemeStyles (~1316 linhas removidas) |
| v1.36.99 | FASE 5 refatoração final: GlobalEditorModal extraído para src/components/modals/ (~1572 linhas removidas) |
| v1.36.98 | FASE 4 refatoração final: LockedTabOverlay extraído para src/components/ui/ (~261 linhas removidas) |
| v1.36.97 | FASE 3 refatoração final: GlobalEditorSection e DecisionEditorContainer extraídos para src/components/editors/ (~370 linhas removidas) |
| v1.36.96 | FASE 2 refatoração final: prepareDocumentsContext, prepareProofsContext, prepareOralProofsContext, fastHashUtil extraídos para src/utils/context-helpers.ts (~260 linhas removidas) |
| v1.36.95 | FASE 1 refatoração final: CSS, RESULTADO_STYLES extraídos para src/constants/styles.ts + INSTRUCAO_NAO_PRESUMIR extraído para src/prompts/instrucoes.ts (~90 linhas removidas) |
| v1.36.94 | Quill Editors + TIER 3 pendências extraídos para src/components/editors/: QuillEditorBase, QuillModelEditor, QuillDecisionEditor, QuillMiniRelatorioEditor, AIRegenerationSection, FieldEditor, InlineFormattingToolbar + ModelFormModal, ModelPreviewModal (~1787 linhas removidas) |
| v1.36.93 | TIER 3 componentes extraídos: ModelFormFields (forms/), SlashCommandMenu (ui/), JurisprudenciaModal (modals/) (~616 linhas removidas) |
| v1.36.92 | TIER 2 modais extraídos para AdvancedModals.tsx: ShareLibraryModal, AcceptSharePage, DispositivoModal, BulkReviewModal, BulkUploadModal (~1215 linhas removidas) |
| v1.36.91 | TIER 1 modais extraídos para MiscModals.tsx: AnalysisModal, ExportModal, AnonymizationNamesModal, LinkedProofsModal (~288 linhas removidas) |
| v1.36.90 | AI Assistant components extraídos para src/components/ai/: AIAssistantBaseLegacy, AIAssistantBase, AIAssistantModal, AIAssistantGlobalModal, AIAssistantModelModal + helpers (~685 linhas removidas) |
| v1.36.89 | Proof modals extraídos: ProofAnalysisModal, LinkProofModal (~230 linhas removidas) |
| v1.36.88 | Model extraction modals extraídos: ExtractModelConfirmModal, ExtractedModelPreviewModal, SimilarityWarningModal (~290 linhas removidas) |
| v1.36.87 | Panel components extraídos para src/components/panels/: FullscreenModelPanel, ModelSearchPanel, JurisprudenciaTab, LegislacaoTab (~1160 linhas removidas) |
| v1.36.86 | Card components extraidos para src/components/cards/: TopicCard, SortableTopicCard, ModelCard, ProofCard, VirtualList (~1140 linhas removidas) |
| v1.36.85 | Modais simples extraídos para src/components/modals/: BaseModal, ModalFooter, ModalWarningBox, ModalInfoBox, ModalAmberBox, ModalContentPreview + TopicModals, ModelModals, ProofModals, SessionModals, BulkModals, TextPreviewModal (~580 linhas removidas) |
| v1.36.84 | Chat components extraídos: ChatBubble, ChatHistoryArea, ChatInput, InsertDropdown para src/components/chat/ (~185 linhas removidas) |
| v1.36.83 | Mais UI components extraídos: VersionCompareModal, VersionSelect para src/components/version/ + JurisprudenciaCard, ArtigoCard para src/components/cards/ (~460 linhas removidas) |
| v1.36.82 | UI components extraídos: SuggestionCard, SplitDivider para src/components/cards/ + SpacingDropdown, FontSizeDropdown, ProcessingModeSelector para src/components/ui/ (~147 linhas removidas) |
| v1.36.81 | Serviços e utilitários extraídos: EmbeddingsServices.ts, jurisprudencia.ts, text.ts, models.ts (~1200 linhas removidas) - App.tsx ~28,900 linhas |
| v1.36.80 | useAIIntegration extraído para src/hooks/ (~1310 linhas removidas) + API_BASE extraído para src/constants/api.ts |
| v1.36.79 | useQuillEditor e useDocumentServices extraídos para src/hooks/ (~30KB removidos) + sanitizeQuillHTML |
| v1.36.78 | useModalManager e useModelLibrary extraídos para src/hooks/ (~14KB removidos) + searchModelsInLibrary, removeAccents, SEARCH_STOPWORDS, SINONIMOS_JURIDICOS |
| v1.36.77 | useTopicManager extraído para src/hooks/ (~4 linhas removidas, wrapper sobre Zustand) |
| v1.36.76 | useProofManager e useDocumentManager extraídos para src/hooks/ (~486 linhas removidas) |
| v1.36.75 | useLocalStorage extraído para src/hooks/ (~1070 linhas removidas) + PDF IndexedDB helpers + APP_VERSION centralizado em src/constants/app-version.ts |
| v1.36.74 | useModelPreview extraído para src/hooks/ (~107 linhas removidas) |
| v1.36.73 | useChatAssistant extraído para src/hooks/ (~115 linhas removidas) + MAX_CHAT_HISTORY_MESSAGES |
| v1.36.72 | useJurisprudencia extraído para src/hooks/ (~210 linhas removidas) + helpers (IRR_TYPES, isIRRType, JURIS_TIPOS_DISPONIVEIS, JURIS_TRIBUNAIS_DISPONIVEIS, IndexedDB) |
| v1.36.71 | useLegislacao extraído para src/hooks/ (~180 linhas removidas) + helpers (LEIS_METADATA, getLeiFromId, sortArtigosNatural, IndexedDB helpers) |
| v1.36.70 | Testes REAIS para 9 hooks extraídos (411 testes passando), regra #10 CLAUDE.md (testes devem importar código de produção), deletados 6 testes inefetivos |
| v1.36.69 | useIndexedDB extraído (TIER 1) + validateModel, sanitizeModel exportados |
| v1.36.68 | FASE 3 TIER 0 completo: useAPICache, usePrimaryTabLock, useFieldVersioning extraídos (~340 linhas removidas) |
| v1.36.67 | FASE 3: useThrottledBroadcast extraído para src/hooks/ (~50 linhas removidas) |
| v1.36.66 | FASE 3 Hooks TIER 0: useFullscreen, useSpacingControl, useFontSizeControl, useFeatureFlags extraídos para src/hooks/ (~245 linhas removidas) |
| v1.36.65 | Zustand Migration Wave 3: useProofManager migrado para useProofsStore.ts (~290 linhas removidas do App.tsx) |
| v1.36.64 | Zustand Migration Wave 3: useTopicManager migrado para useTopicsStore.ts (~180 linhas removidas do App.tsx) |
| v1.36.63 | Zustand Migration Wave 3: useModelLibrary migrado para useModelsStore.ts (core data, busca, filtros, formulário) |
| v1.36.62 | Zustand Migration Wave 2: useAIIntegration config/tokenMetrics migrado para useAIStore.ts (~80 linhas removidas do App.tsx) |
| v1.36.61 | Zustand Migration: useModalManager migrado para store global (src/stores/useUIStore.ts), devtools habilitado para debug |
| v1.36.60 | Fix Double Check factsComparison: aplica correções automaticamente |
| v1.36.59 | Indicação "Modelo atual" para OpenAI/Grok no ConfigModal |
| v1.36.58 | Double Check para Confronto de Fatos: verifica completude, classificação e correção das alegações na tabela comparativa |
| v1.36.57 | Cache infinito para Revisar Sentença: persiste entre sessões (IndexedDB) e em export/import de projeto, badge de cache, botão regenerar |
| v1.36.56 | Double Check: novas operações Dispositivo e Revisar Sentença + Config Thinking por modelo (Claude Sonnet/Opus, Gemini Flash/Pro, OpenAI, Grok) |
| v1.36.51 | Fix contraste Double Check no tema claro: badges "(em breve)" e aviso de custo legíveis em ambos os temas |
| v1.36.50 | Double Check de respostas da IA: verificação secundária para extração de tópicos, detecta falsos positivos/omissões/categorização incorreta, provider/modelo configurável |
| v1.36.49 | Toggle "Log thinking" desabilitado para modelos sem reasoning (Grok e GPT-5.2 Instant) |
| v1.36.48 | Fix layout AIAssistantBase: aviso CNJ e seletor de escopo agora dentro da área de scroll (antes ocupavam metade do modal) |
| v1.36.47 | Fix "Invalid Date" no modal compartilhar biblioteca: API retornava created_at (snake_case), frontend esperava createdAt |
| v1.36.46 | Fix ESC no ConfigModal: não fecha se ModelGeneratorModal (Gerar a partir de exemplos) aberto, evita perda de scroll |
| v1.36.45 | Fix ESC no GlobalEditorModal: fecha sub-modais (Jurisprudência/Assistente IA/Confronto) primeiro, reseta estados ao abrir |
| v1.36.44 | Deletar 16 arquivos de testes/hooks duplicados: 222 testes inúteis removidos (testavam código que não roda em produção) |
| v1.36.43 | Fix test failure: guard scrollIntoView em TopicCurationModal (JSDOM não implementa) |
| v1.36.42 | Build inclui tsc --noEmit: verificação de tipos antes do deploy |
| v1.36.41 | Fix ReferenceError: usar documentServices.extractTextFromPDFWithMode (prefixo faltando) |
| v1.36.40 | Fix NER provas: usar extractTextFromPDFWithMode com modo selecionado (Tesseract funciona) |
| v1.36.39 | Fix NER em provas: "Detectar Nomes" extrai texto da PROVA (não da petição) - removido fallback incorreto |
| v1.36.38 | Aviso visual Grok na aba Provas: alerta laranja "Grok não suporta PDF binário" (similar ao aviso roxo de anonimização) |
| v1.36.37 | Fix bloqueio PDF com Grok: botão "Usar PDF" desabilitado no ProofCard, fallback para PDF bloqueado quando extração falha, mensagem "extração obrigatória" em vermelho |
| v1.36.36 | Bloquear PDF Puro quando Grok selecionado: opção desabilitada nos seletores (Uploads e Provas), Claude Vision liberado |
| v1.36.35 | Fix estimativa de custo: mostrar modelo correto para OpenAI/Grok no TopicCurationModal (antes mostrava Claude) |
| v1.36.34 | Tesseract OCR: mais logs de diagnóstico (canvas render, OCR batch, cada página) para identificar gargalo |
| v1.36.33 | Tesseract OCR fix: primeiro worker baixa modelo sozinho (cacheia), depois cria demais em paralelo + logs de diagnóstico |
| v1.36.32 | Fix exclusão de prova: usar handleDeleteProof do hook (tipagem correta) |
| v1.36.31 | Fix exclusão de prova: String() na comparação de IDs (type mismatch number/string) |
| v1.36.30 | Fix botão excluir prova: race condition isOpen && proofToDelete no DeleteProofModal |
| v1.36.29 | Suporte PDF para OpenAI (type: file) + aviso Grok não suporta PDF binário (abas Upload e Provas) |
| v1.36.28 | Fix análise de provas: isPdf não setado na criação + verificação robusta com type === 'pdf' |
| v1.36.27 | Fix background transparente no AIAssistantBase: adicionado overflow-y-auto flex-1 min-h-0 ao content |
| v1.36.26 | Fix stale cache Confronto ao trocar tópico: useEffect limpa resultado quando editingTopic muda |
| v1.36.25 | Fix contraste badges Confronto de Fatos no tema claro: cores -600/-400 com dark: variant |
| v1.36.24 | Fix cache Confronto de Fatos no editor individual: handleOpenFactsComparisonIndividual recupera cache antes de abrir modal |
| v1.36.23 | Fix scroll BaseModal: min-h-0 no content div permite flexbox shrink e scroll interno funcionar |
| v1.36.22 | Fix Confronto de Fatos: fallback para PDF binário quando texto não extraído + scroll no BaseModal (max-h-[90vh] flex flex-col) |
| v1.36.21 | Refatorar FactsComparisonModal para BaseModal + Botão Confronto no editor individual + diretriz #6 CLAUDE.md (sempre usar BaseModal) |
| v1.36.20 | Confronto de Fatos: botão na toolbar do editor abre modal para comparar alegações Petição vs Contestação vs Impugnação por tópico, tabela com fatos controversos/incontroversos, cache IndexedDB (TTL infinito), export/import no projeto |
| v1.36.11 | UX: Indicador visual claro de thinking no Grok - badges "Thinking Embutido" (roxo) e "Sem Thinking" (âmbar) na seção Pensamento Prolongado |
| v1.36.10 | feat(multi-provider): Integração OpenAI GPT-5.2 + xAI Grok 4.1 - 4 providers (Claude, Gemini, OpenAI, Grok), reasoning configurável, Grok 96% mais barato que Claude |
| v1.36.9 | Fix bullet list no Quill: override `::before` para `data-list="bullet"` (CSS do CDN não tem regra para bullets em `<ol>`) |
| v1.36.8 | Fix listas no Quill: `list-style-type: none` para evitar duplicação (Quill usa `::before` para marcadores) |
| v1.36.7 | Fix lista bolinha: CSS respeita `data-list`, export converte `<ol>` bullet para `<ul>`, blockquote sem `border-left` |
| v1.36.6 | Fix exportação: listas bullet (`data-list`), indent (`ql-indent-*`), blockquote - DOMPurify agora permite atributos necessários |
| v1.36.5 | Fix exportação minuta: converter classes `ql-align-*` do Quill para inline styles (Google Docs ignora classes CSS) |
| v1.36.4 | Fix exportação minuta: preserva alinhamento do usuário (center, right) - remove `align` deprecated, corrige bug que sobrescrevia `text-align` |
| v1.36.3 | Fix exportação minuta: atributo `align="center/justify"` para Google Docs (style inline não era suficiente) |
| v1.36.2 | Fix exportação minuta: estilos inline para Google Docs (alinhamento centralizado/justificado preservado) - `EXPORT_STYLES` em `src/constants/export-styles.ts` |
| v1.36.1 | Fix race condition ao salvar modelo: dados passados diretamente para saveModel/saveModelWithoutClosing (evita erro "Título e conteúdo são obrigatórios") |
| v1.36.0 | 🎉 **TypeScript strict mode COMPLETO** - Zero errors (`tsc --noEmit` passa), migração de ~930 erros concluída, tipos alinhados, null safety |
| v1.35.96 | docs(CLAUDE.md): Seção "Development Standards" - padrões obrigatórios de qualidade, TypeScript, manutenção por LLM, performance e segurança |
| v1.35.95 | TypeScript: GlobalEditorModal, AnalysisModal, DispositivoModal, BulkReviewModal, BulkUploadModal, SlashCommandMenu, LinkedProofsModal + GeminiRequest/GeminiGenerationConfig (1217→1164 erros) |
| v1.35.93 | TypeScript: FieldEditorProps/Ref, QuillInstance refs tipados, ModelFormModalProps, ModelPreviewModalProps (1421→1323 erros) |
| v1.35.92 | TypeScript: searchTerm em JurisFiltros, isPlaceholder em ProofFile/ProofText, tipos IDBVersionChangeEvent e FileReader |
| v1.35.91 | TypeScript ETAPA 0.1: +4 interfaces movidas (BaseModalProps, AnonymizationNamesModalProps, ErrorBoundaryProps/State) |
| v1.35.90 | TypeScript ETAPA 0: Reorganização - 62 interfaces movidas de App.tsx para types/index.ts (Modal Props, Component Props, AI Assistant Props, Session/Project Types) |
| v1.35.87 | TypeScript Migration FASE 8.7 (parcial): Tipagem completa de AIModelService, EmbeddingsService, JurisEmbeddingsService, EmbeddingsCDNService + callbacks do useAIIntegration (930→775 erros TS7006) |
| v1.35.86 | TypeScript Migration FASE 8.6: useRef<T> tipados (84 instâncias) - timers, DOM refs, Quill instances, callbacks, caches |
| v1.35.85 | TypeScript Migration FASE 8.1-8.5: +20 tipos em src/types/index.ts (TextPreviewState, ToastState, SlashMenuState, ProgressState, etc.) + useState com objetos/arrays/null tipados |
| v1.35.79 | TypeScript Migration FASE 5: App.jsx → App.tsx (~35000 linhas) - build OK, 503 testes passando, 3563 type warnings para refinamento futuro |
| v1.35.78 | TypeScript Migration: 11 hooks migrados (useModalManager, useFieldVersioning, useLocalStorage, useModelPreview, useTopicManager, useModelLibrary, useAIIntegration, useProofManager, useAuthMagicLink, useSyncManager, useCloudSync) + src/types/index.ts com tipos core |
| v1.35.77 | Gerar Estilo de Redação a partir de exemplos: botão no campo customPrompt, buildStyleMetaPrompt extrai TOM/VOCABULÁRIO/RITMO |
| v1.35.76 | Estilo Personalizado Substitutivo: AI_INSTRUCTIONS refatorado em CORE/STYLE/SAFETY - customPrompt do juiz substitui (não complementa) o estilo default |
| v1.35.75 | UX: Feedback inline no botão Testar API Key (✓ verde / ✗ vermelho ao invés de toast popup) |
| v1.35.74 | Config IA Local exportada no projeto + apiKeys excluída do export (segurança) |
| v1.35.73 | Fix header opaco no ModelGeneratorModal (conteúdo não vaza ao scroll) |
| v1.35.72 | ModelGeneratorModal segue padrão BaseModal (ESC handler + scroll lock) |
| v1.35.71 | Fix z-index ModelGeneratorModal (z-100 > CSS.modalOverlay z-90) |
| v1.35.70 | (tentativa anterior z-70 insuficiente) |
| v1.35.69 | Gerador Automático de Prompts: juiz cola exemplos → IA gera prompt profissional (meta-prompts.ts, ModelGeneratorModal.tsx) |
| v1.35.66 | UX: Modal "Excluir Toda Legislação" migrado para BaseModal (ESC, X, scroll lock, glassmorphism) |
| v1.35.65 | UX: VoiceButton movido para linha dos botões Jurisprudência/Assistente IA no editor global |
| v1.35.64 | UX: JurisprudenciaModal, AIAssistantBaseLegacy e ConfigModal seguem padrão BaseModal (ESC, X, scroll lock, glassmorphism) |
| v1.35.63 | UX: BaseModal bloqueia scroll do body quando aberto |
| v1.35.57 | UX: botão Sair na mesma linha do Projeto (layout compacto) |
| v1.35.56 | Fix: botão Sair volta para o header (logout geral do sistema) |
| v1.35.55 | Bloco de sync (indicador + email) movido para aba Modelos |
| v1.35.54 | Foto do perfil Google no status de conexão Drive |
| v1.35.53 | UX: ícone Cloud preenchido quando conectado ao Drive |
| v1.35.52 | UI consolidada: botão "Limpar Projeto" incorporado ao dropdown (único botão "Projeto" no header) |
| v1.35.51 | UI consolidada: botões Salvar/Carregar Projeto movidos para dropdown "Projeto" |
| v1.35.50 | Google Drive migrado para TypeScript: useGoogleDrive.ts e GoogleDriveButton.tsx |
| v1.35.49 | UX Polish: compartilhamento Drive sempre cópia, texto sync mais claro, fix contraste tags |


**Last Updated**: 2026-01-13
- sempre atualize a versão nas alterações realizadas