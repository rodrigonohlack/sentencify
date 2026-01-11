# CLAUDE.md

## Project Overview

**SentencifyAI** - React-based legal decision tool for Brazilian labor court judges.

**Version**: 1.36.76 | **File**: `src/App.tsx` (~1.3 MB) | **Runtime**: Standalone + Render

## Architecture

**Hooks**: `useModalManager`, `useAIIntegration`, `useLocalStorage`, `useModelLibrary`, `useProofManager`, `useDocumentManager`, `useTopicManager`, `usePrimaryTabLock`, `useGlobalEditor`, `useChatAssistant`, `useFieldVersioning`, `useCloudSync`, `useGoogleDrive`, `useFactsComparisonCache`, `useSentenceReviewCache`, `useFullscreen`, `useSpacingControl`, `useFontSizeControl`, `useFeatureFlags`, `useThrottledBroadcast`, `useAPICache`, `useIndexedDB`, `useLegislacao`

**Components**: `TopicCard`, `ModelCard`, `SuggestionCard`, `ProofCard`, `GlobalEditorModal`, `LockedTabOverlay`, `VersionSelect`, `LoginMagicModal`, `SyncStatusIndicator`, `ShareLibraryModal`, `AcceptSharePage`, `TopicCurationModal`, `GoogleDriveButton`, `ModelGeneratorModal`, `FactsComparisonModal`

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
5. **NUNCA usar PowerShell para editar conteúdo de arquivos**: Corrompe encoding UTF-8 (acentuação quebrada). Use `sed`, `Edit` tool, ou `Write` tool.
6. **Novos Modais**: SEMPRE usar `BaseModal` (App.tsx ~linha 10545). Nunca reimplementar ESC handler, scroll lock ou estrutura modal manualmente. Props: `isOpen`, `onClose`, `title`, `subtitle`, `icon`, `iconColor` (blue/red/green/yellow/purple/orange), `size` (sm/md/lg/xl/2xl), `children`, `footer`, `preventClose`.
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


**Last Updated**: 2026-01-08
- sempre atualize a versão nas alterações realizadas