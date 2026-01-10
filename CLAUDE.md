# CLAUDE.md

## Project Overview

**SentencifyAI** - React-based legal decision tool for Brazilian labor court judges.

**Version**: 1.36.25 | **File**: `src/App.tsx` (~1.3 MB) | **Runtime**: Standalone + Render

## Architecture

**Hooks**: `useModalManager`, `useAIIntegration`, `useLocalStorage`, `useModelLibrary`, `useProofManager`, `useDocumentManager`, `useTopicManager`, `usePrimaryTabLock`, `useGlobalEditor`, `useChatAssistant`, `useFieldVersioning`, `useCloudSync`, `useGoogleDrive`, `useFactsComparisonCache`

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
- Modelos NER/E5 (cache browser) → baixados automaticamente do HuggingFace CDN

## Critical Guidelines

1. **Modals com Scroll**: Use `overflow-auto` no overlay + `my-auto` no container (ver DispositivoModal)
2. **File Rename (Windows)**: Use `powershell -Command "Rename-Item..."` (APENAS para renomear)
3. **API**: Use `buildApiRequest()` helper. Model: `claude-sonnet-4-20250514`
4. **z-index**: Base `z-50`, nested `+10` por nível
5. **NUNCA usar PowerShell para editar conteúdo de arquivos**: Corrompe encoding UTF-8 (acentuação quebrada). Use `sed`, `Edit` tool, ou `Write` tool.
6. **Novos Modais**: SEMPRE usar `BaseModal` (App.tsx ~linha 10545). Nunca reimplementar ESC handler, scroll lock ou estrutura modal manualmente. Props: `isOpen`, `onClose`, `title`, `subtitle`, `icon`, `iconColor` (blue/red/green/yellow/purple/orange), `size` (sm/md/lg/xl/2xl), `children`, `footer`, `preventClose`.

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
| v1.35.48 | Google Drive: fix compartilhamento (sharedWithMe), botão remover acesso |
| v1.35.47 | Google Drive: arquivos salvos na pasta "Sentencify" |
| v1.35.46 | Google Drive: filtrar por appProperties (apenas arquivos do Sentencify) |
| v1.35.45 | Google Drive: compartilhamento corrigido, badges "De: fulano", modal permissões |
| v1.35.44 | Header COOP no servidor: elimina warning OAuth popup |
| v1.35.43 | Compartilhar arquivos do Google Drive por email |
| v1.35.42 | Fix erro React #31: notificações Drive suportam {type, message} |
| v1.35.41 | Refatoração: buildProjectJson/importProjectFromJson (elimina ~200 linhas) |
| v1.35.40 | Google Drive: salvar e carregar projetos na nuvem pessoal (OAuth2) |
| v1.35.39 | Calibra estimativa de custo com dados reais |
| v1.35.38 | Fix lag drag: DragOverlay via createPortal, CSS.Translate |
| v1.35.37 | Estimativa de custo: thinking tokens, batch size, tooltip detalhado |
| v1.35.36 | Fix drag lag: remover willChange dinâmico |
| v1.35.35 | Otimização drag FPS: React.memo, callbacks funcionais |
| v1.35.30 | Modal de Curadoria de Tópicos pré-geração |
| v1.35.26 | Prompts de IA movidos para src/prompts/ (~900 linhas extraídas) |
| v1.35.21 | Fix modelos compartilhados sumiam após sync incremental: preservar locais quando servidor não retorna compartilhados |
| v1.35.20 | Fix progresso de download: usa tamanhos estimados como fallback quando Content-Length não disponível (streaming proxy não repassa header) |
| v1.35.19 | Fix modelos compartilhados não apareciam após aceitar: comparar accepted_at com lastSyncAt para detectar shares recém-aceitos |
| v1.35.18 | Log de diagnóstico para rate limiting: IP, email e User-Agent em cada request de magic link |
| v1.35.17 | Fix rate limiter: trust proxy para Cloudflare/Render (antes todos IPs eram iguais) |
| v1.35.16 | Email com domínio verificado: sentencify.ia.br em vez de resend.dev |
| v1.35.15 | Fix E2E tests: remover setupAuth órfão (fixture já faz autenticação) |
| v1.35.14 | Labels explícitos para PDFs binários: antes de cada PDF, adiciona texto identificador ("PETIÇÃO INICIAL (documento PDF a seguir):") para IA saber qual documento é qual |
| v1.35.13 | Rate limiting: proteção contra abuso (auth 10/15min, IA 30/min, geral 100/min) |
| v1.35.12 | Sentry error tracking: captura erros em produção (frontend + backend), alertas por email, stack traces completos |
| v1.35.11 | Sync fixes: (1) Pull-then-push order (reduz conflitos), (2) Retry limit para conflitos de versão (MAX_RETRIES=3), (3) Shared models filtrados por lastSyncAt (evita sobrescrita), (4) Validação de email no accept share (segurança) |
| v1.35.10 | Fix lag real: Estado Local Bufferizado - ModelFormModal e AIRegenerationSection usam estado local durante digitação, só propagam para pai no save/blur (evita re-render do LegalDecisionEditor ~15000 linhas) |
| v1.35.9 | Fix lag em TODOS inputs: todos os 11 setters de useAIIntegration convertidos para useCallback + useCloudSync.return memoizado com useMemo |
| v1.35.8 | Fix lag: findSuggestions e refineWithAI com useCallback (evita re-criação a cada render) |
| v1.35.7 | Fix lag: setRelatorioInstruction/setDispositivoInstruction com useCallback (referência estável) |
| v1.35.6 | Fix lag: removidas arrow functions inline em onInstructionChange |
| v1.35.5 | Fix erro "Rendered more hooks": hooks useCallback movidos para antes do return condicional |
| v1.35.4 | Fix lag: dependência circular no Cloud Sync (libraryModels nas deps causava loop infinito) |
| v1.35.3 | Fix lag de escrita nos editores: debounce 150ms no onChange/sanitização do Quill, memoização de getCategories, primitivos em isIndividualDirty |
| v1.35.2 | Fix exclusão em massa: deleteAllModels() rastreia cada modelo para sync; delete salva apenas id (evita QuotaExceededError no localStorage com 456+ modelos) |
| v1.35.1 | Compartilhamento por email: convite direto digitando email do destinatário, envio via Resend, edição colaborativa (edit permission permite editar/deletar originais), fix sync modelos compartilhados deletados, fix typing lag (memoização callbacks), fix contraste tema claro no ShareLibraryModal |
| v1.35.0 | Compartilhamento de biblioteca: gerar link para compartilhar modelos (view/edit), badge de proprietário no ModelCard, filtro Meus/Compartilhados, página /share/:token para aceitar |
| v1.34.9 | Fix validação: aceitar null em category/keywords (antes rejeitava modelos com campos opcionais null) |
| v1.34.8 | Fix perda de modelos: cache IndexedDB atualizado com modelos VALIDADOS (antes usava originais, causando discrepância cache vs DB) + log de modelos rejeitados |
| v1.34.7 | Fix sync: salvar IMEDIATAMENTE no IndexedDB após merge (não esperar debounce de 1500ms) |
| v1.34.6 | Forçar full sync se count local != servidor (localStorage sentencify-models-count) |
| v1.34.5 | Fix race condition: aguardar IndexedDB carregar antes de fazer merge |
| v1.34.4 | Admin Panel: interface /admin para gerenciar emails autorizados (allowed_emails) |
| v1.34.3 | Cloud Sync Full Sync: navegador novo ignora lastSyncAt e baixa todos os modelos do servidor |
| v1.34.2 | Cloud Sync Pull Paginado: limite de 50 modelos por request evita crash de memória (456 modelos em 10 páginas) |
| v1.34.1 | Cloud Sync Pull: modelos são carregados do servidor ao logar em novo navegador (merge com IndexedDB local) |
| v1.34.0 | Cloud Sync: Magic Link Authentication + SQLite Sync - modelos salvos na nuvem (Render Persistent Disk, Resend para emails) |
| v1.33.63 | Testes E2E expandidos (88 testes): auth, pdf-upload, generation, export, search - cobertura completa |
| v1.33.62 | Modal "Sessão Anterior Encontrada" não pode ser fechado (ESC, X, click fora) - preventClose no BaseModal |
| v1.33.61 | Auto-download de dados: legislação e jurisprudência baixados automaticamente do GitHub Releases (~5 MB) |
| v1.33.60 | Otimização drag: collision detection O(n) com Set pré-computado (antes O(n²) com find) |
| v1.33.59 | Fix drag feedback visual: collision detection customizado ignora RELATÓRIO/DISPOSITIVO (não abre espaço em posições inválidas) |
| v1.33.58 | dnd-kit para drag and drop de tópicos - suporte a wheel scroll durante arraste |
| v1.33.57 | Modal estilizado para confirmação de logout (substituir window.confirm) |
| v1.33.56 | Reduzir espaçamento entre cards no modo lista (space-y-1, itemHeight 90) |
| v1.33.55 | Fix borda superior cortada no hover do modo lista (remover translateY) |
| v1.33.54 | Fix borda sumindo no hover do modo lista (ModelCard) - border-2 |
| v1.33.53 | Otimizar hover elevation - GPU acceleration (will-change, translateZ) |
| v1.33.52 | Fix mensagens hardcoded no bulk upload (agora mostra parallelRequests) |
| v1.33.51 | Modal changelog migrado para BaseModal (ESC + glassmorphism) |
| v1.33.50 | Micro-interações visuais: cards hover elevação, badges fade-in, favoritos coloridos, empty states pulsando, drag&drop suave, focus rings, spinner neon no app loading |
| v1.33.49 | Spinner Neon + Ripple no AnalysisModal (anéis girando com ondas pulsantes) |
| v1.33.48 | ESC handler centralizado no BaseModal (18 modais beneficiados) |
| v1.33.47 | Glassmorphism + ESC em 7 modais (ExtractModel, ExtractedModelPreview, AIAssistant, Dispositivo, Similarity, Config) + AnalysisModal visual only |
| v1.33.46 | Aplicar estilo Glassmorphism ao BulkUploadModal (consistência visual) |
| v1.33.45 | Migrar ProofAnalysisModal e LinkProofModal para BaseModal (padronização UI) |
| v1.33.44 | Fix título e botão X dos modais no tema claro |
| v1.33.43 | Fix modais: tema claro respeitado, transparência adequada, glow adaptativo |
| v1.33.42 | Modais com estilo Glassmorphism: blur, gradientes, ícones em círculos, botão X, animação suave |
| v1.33.41 | Autenticação simples: tela de login, senha SHA-256, botão Sair (11 testes) |
| v1.33.40 | Validação de PDFs (33 testes): magic bytes, tamanho, MIME type, estimativa de tempo |
| v1.33.39 | Testes de regressão de prompts (21 testes snapshot): Art. 337 CPC, ordem mérito |
| v1.33.38 | Testes de integração (71 testes): topicOrdering, analyzeProof, generateSentence |
| v1.33.37 | Comentários padronizados: 9 seções com bordas ═══ e descrições |
| v1.33.36 | Índice/mapa estruturado no topo: navegação LLM, 9 seções mapeadas, fluxos críticos, lista de hooks |
| v1.33.35 | Ordenação v3: numeração única (6a-6f), sem referências cruzadas, explicações contextuais |
| v1.33.34 | Ordenação v2: 7 grupos + ordem lógica do mérito (CAUSA > OBRIGAÇÃO > EFEITO FINANCEIRO) |
| v1.33.33 | Ordenação de preliminares conforme Art. 337 CPC (13 incisos na ordem legal) |
| v1.33.32 | Fix embeddings 502: streaming com Readable.fromWeb() evita OOM no Render free tier (512MB RAM) |
| v1.33.31 | Migração para Render: sem limite de payload (100MB), heartbeat keepalive, timeout 100min, CORS multi-origin |
| v1.33.30 | Testes sanitizeHTML expandidos (39 testes XSS) - total 285 testes (261 unit + 24 E2E) |
| v1.33.29 | Testes E2E expandidos (24 testes) - total 267 testes (243 unit + 24 E2E) |
| v1.33.28 | Testes useTopicManager (42 testes) - total 243 testes unitários |
| v1.33.27 | Reverter useModalManager para App.jsx (consistência: todos hooks no mesmo padrão) |
| v1.33.26 | Refatorar useModalManager para arquivo separado (src/hooks/useModalManager.js) |
| v1.33.25 | Fix setState durante render: contextualInsertFn como ref em useModelPreview |
| v1.33.24 | Fix HTML nesting warning: spinner div→span no GlobalEditorModal |
| v1.33.23 | Fix infinite loop: ref para handleInsertModel em GlobalEditorModal (useMemo insuficiente) |
| v1.33.22 | Fix infinite loop: useMemo em useFieldVersioning e useModelPreview (bug latente exposto por re-renders extras) |
| v1.33.21 | Fix botão limpar formatação: usa format(key,false) em vez de removeFormat (wrapper não expõe getSelection) |
| v1.33.20 | Fix botão limpar formatação (onMouseDown) + toggle semântico por padrão + badge similaridade sempre visível |
| v1.33.19 | Botão limpar formatação no InlineFormattingToolbar + toggle 🧠/🔤 semântico na busca manual de modelos (editor individual e global) |
| v1.33.18 | Badge % similaridade em jurisprudência e modelos sugeridos |
| v1.33.17 | Fix modal jurisprudência: sincronizar toggle com config IA Local ao abrir |
| v1.33.16 | Modal jurisprudência: badge IA Local + toggle semântico/textual |
| v1.33.15 | Fix batchSize hardcoded em mini-relatórios/subtópicos + contraste "Erro 429" no tema escuro |
| v1.33.14 | Fix NER: indexOf case-insensitive, dedup inclui entityType, fallback ORG limitado a 4 palavras + normaliza espaços |
| v1.33.13 | NER healing: subtokens órfãos (##edo) unidos ao prefixo (Mac→Macedo) + fallback regex para ORG (V2 LTDA) |
| v1.33.12 | Fix contraste do aviso de erro 429 no tema claro |
| v1.33.11 | Requisições paralelas configuráveis: escolha 3-20 em Config IA, com explicativo de limites por API/tier |
| v1.33.10 | Tooltip no SlashCommand mostra modelo completo (não truncado) |
| v1.33.9 | Fix contraste do badge de similaridade no SlashCommand (tema claro) |
| v1.33.8 | SlashCommand melhorado: posicionamento viewport-aware, tooltip preview, busca semântica, hover corrigido nos toggles 🧠 |
| v1.33.7 | Feedback visual ao duplicar modelo: toast "Duplicando..." durante geração de embedding |
| v1.33.6 | Layout 1 card por linha em toda aba Modelos (busca textual + inicial) |
| v1.33.5 | Layout 1 card por linha na busca semântica de modelos |
| v1.33.4 | Unificar UI busca semântica de modelos: usar ModelCard com editar/duplicar/excluir, respeitar modo cards/lista, badge de similaridade |
| v1.33.3 | Feedback visual "Salvando..." no SimilarityWarningModal durante geração de embedding |
| v1.33.2 | Remover logs de AI/Search em produção (apenas import.meta.env.DEV) |
| v1.33.1 | Fix CORS: proxy serverless /api/embeddings, UI simplificada (remove import manual), z-index modal corrigido |
| v1.33.0 | Auto-download embeddings via CDN: legislação e jurisprudência baixados do GitHub Releases (~250MB), modal de download com progresso |
| v1.32.42 | Tailwind CDN → PostCSS: build-time compilation, remove warning de produção, tailwindcss v3 |
| v1.32.41 | Suporte a deploy Vercel: serverless functions (/api/*), API_BASE dinâmico, vercel.json |
| v1.32.40 | Toggle para ativar/desativar logs de thinking no console (Config IA > logThinking) |
| v1.32.39 | Log de thinking no console do browser: Claude (extended thinking) e Gemini 3 (includeThoughts) para debug/análise |
| v1.32.38 | Gemini thinking buffer: auto-aumenta maxOutputTokens baseado no thinking_level (high +16K, evita MAX_TOKENS) |
| v1.32.37 | Fix Gemini 3 Pro: validar thinking_level (Pro só suporta low/high, minimal/medium convertidos para low) |
| v1.32.36 | Removido Gemini 2.5: apenas Gemini 3 (Flash/Pro), UI simplificada (thinking_level apenas), migração automática de 2.5→3 |
| v1.32.35 | Fix Gemini thinking: extração de texto busca part sem thought=true (antes pegava parts[0] que era thinking block, retornando vazio) |
| v1.32.34 | Fix reorderTopicsViaLLM: regex mais robusto (suporta markdown code blocks, newlines no JSON) |
| v1.32.33 | Auto-timeout 5 min para thinking budgets >= 40K + warning "respostas podem demorar mais" |
| v1.32.32 | Budget thinking dinâmico por modelo Claude: Sonnet até 62K, Opus até 30K + warning para budgets >= 40K |
| v1.32.31 | UI Gemini 2.5 Pro: toggle mostra "Mínimo" + badge "1024 tokens" quando thinking "desativado" (API não permite desligar) |
| v1.32.30 | Fix thinking config: Gemini 2.5 Flash desativa com thinking_budget: 0 (antes undefined usava dinâmico), 2.5 Pro usa mínimo 1024 |
| v1.32.29 | Fix crítico Gemini: callGeminiAPI agora honra useInstructions - AI_INSTRUCTIONS enviadas como systemInstruction (13 funcionalidades corrigidas) |
| v1.32.28 | Chat assistente: verificação obrigatória - LLM deve listar informações pendentes ANTES de redigir qualquer texto de decisão |
| v1.32.27 | Chat assistente: instrução de perguntas fortalecida - LLM deve perguntar quando informação não estiver EXPRESSAMENTE no contexto, "prefira perguntar a presumir" |
| v1.32.26 | Chat assistente: maxTokens aumentado para 16000 (respostas longas) + log finishReason no servidor Gemini para diagnóstico |
| v1.32.25 | Fix reorderTopicsViaLLM: regex robusto para extrair JSON (ignora thinking tokens) + maxTokens 4000 (evita truncamento) |
| v1.32.24 | Modal de changelog: clique na versão no header abre modal com histórico de alterações (40 versões) |
| v1.32.23 | Títulos de tópicos com causa de pedir nuclear: prompt ajustado para gerar títulos como "RESCISÃO INDIRETA - ASSÉDIO MORAL" quando relevante, melhorando busca semântica |
| v1.32.22 | Sugestões de modelos usando apenas título: embedding da query usa só topic.title (categoria e relatório diluíam relevância) |
| v1.32.21 | Filtros antes do limit: filtros de tipo/tribunal aplicados ANTES de limitar em 30 resultados (aba e modal), permitindo até 30 do tipo selecionado |
| v1.32.20 | Fix case sensitivity E5: modelo é sensível a maiúsculas/minúsculas, todas as queries convertidas para .toLowerCase() antes de gerar embedding (5 locais corrigidos) |
| v1.32.19 | Fix busca semântica no modal de jurisprudência: exibição de texto corrigida (fallback para fullText/text), query usa apenas título do tópico (não relatório longo que diluía relevância) |
| v1.32.18 | Busca semântica de jurisprudência nos editores: toggle "🤖 Jurisprudência via IA Local" em Config IA, usa embeddings no JurisprudenciaModal (individual e global), texto do toggle de modelos atualizado para "Busca semântica instantânea" |
| v1.32.17 | NER sob demanda: modelo carrega só ao clicar "Detectar Nomes" e descarrega após uso, economizando ~2GB RAM. dispose() libera memória WASM corretamente |
| v1.32.16 | Botões responsivos na aba Tópicos: flex-nowrap + overflow-x-auto - botões ficam na mesma linha com scroll horizontal quando necessário |
| v1.32.15 | Tesseract alta qualidade: SCALE 4.0 (4x resolução) + PSM 6 (bloco único) + preserve_interword_spaces - melhor OCR para PDFs escaneados |
| v1.32.14 | Fix Tesseract em Provas: executeExtraction usava lógica errada (forçava pdfjs), agora usa blockedModes igual aos Uploads |
| v1.32.13 | Permitir Tesseract com anonimização: só bloquear claude-vision e pdf-puro (ambos enviam binário), PDF.js e Tesseract extraem texto → podem anonimizar |
| v1.32.12 | Fix mergeOrgLoc: aceita ORG+ORG curto (modelo classifica cidades como ORG, não LOC) - "COMPANHIA DE TRANSITO E TRANSPORTE DE MACAPA" agora funde corretamente |
| v1.32.11 | Botão Manual do Usuário (📖) no header - abre MANUAL_USUARIO_AVANCADO.html em nova aba |
| v1.32.10 | NER fusão ORG+LOC: mergeOrgLoc detecta padrão "ORG + DE/DO/DA + LOC" e funde em única ORG (ex: "COMPANHIA DE TRANSITO E TRANSPORTE DE MACAPA") |
| v1.32.09 | Fix NER modelo: trocado DistilBERT por BERT completo (Xenova/bert-base-multilingual-cased-ner-hrl) - mesmo modelo do sandbox, qualidade restaurada |
| v1.32.08 | IA Local via Web Worker: AIModelService roda em thread separada (UI nunca trava), SIMD+threads automáticos via Transformers.js |
| v1.32.07 | Fix NER separação de nomes: restaurado lógica v1.28 com offsets manuais via indexOf e distance para separar entidades não-adjacentes |
| v1.32.06 | Auto-inicialização: modelos NER/E5 inicializam automaticamente ao carregar página se estavam ativados (sem precisar clicar "Baixar Agora") |
| v1.32.05 | Fix NER espaçamento: processTokens usa ## prefix para detectar subtokens (evita nomes concatenados) |
| v1.32.04 | Fix cache HTML: forçar env.allowRemoteModels=true e env.useBrowserCache=true para evitar cache de páginas de erro |
| v1.32.03 | AIModelService sem Worker: execução na main thread com dynamic import (mais estável com Vite) |
| v1.32.02 | Fix Worker: instalação @xenova/transformers via npm, import direto no worker |
| v1.32.01 | Config IA: botão "Baixar Agora" e barra de progresso para modelo E5-base, toggles NER e E5 com sub-toggles (legislação, jurisprudência, modelos, sugestões) |
| v1.32.00 | IA Local Refatoração: Web Worker para não bloquear UI, modelos do HuggingFace (Xenova/distilbert-multilingual-ner, Xenova/multilingual-e5-base), download automático, WASM otimizado (SIMD/threads), removido upload manual e LocalAIProcessingOverlay |
| v1.31.05 | Fix Anonimização: permitir com Tesseract OCR (além de PDF.js), removido App_min.jsx obsoleto |
| v1.31.04 | IA Local Otimização: detectAICapabilities() para SIMD/threads/WebGPU, SIMD habilitado (97% browsers), proxy worker como fallback, multi-threading quando crossOriginIsolated |
| v1.31.03 | Tesseract OCR Batching: workers dinâmicos (75% cores, max 8), batching para limitar memória em PDFs grandes |
| v1.31.02 | Tesseract OCR Paralelo: Scheduler com pool de workers (~3x mais rápido), renderização e OCR em paralelo |
| v1.31.01 | Fix RECITATION Gemini: reorderTopicsViaLLM retorna índices ao invés de títulos (evita corte por filtro de conteúdo) |
| v1.31.00 | Tesseract.js OCR Offline: engine de OCR 100% offline para PDFs escaneados, gratuito, privacidade total, ~15-30s/página |
| v1.30.00 | Gemini Vision OCR: nova engine OCR para PDFs escaneados, 4x mais barato que Claude Vision (~$0.01/10 páginas) |
| v1.29.05 | Desabilitar sugestões de modelos para tópicos especiais RELATÓRIO e DISPOSITIVO |
| v1.29.04 | Fix overlay NER: prop `message` customizada no LocalAIProcessingOverlay, texto correto "Detectando nomes..." |
| v1.29.03 | Overlay "IA Local Processando" no modal de anonimização durante detecção NER (uploads e provas) |
| v1.29.02 | Fix NER ORG: remover LTDA/EIRELI do STOP_WORDS_CONTAINS, fuzzy dedup separado por tipo (PER vs ORG), threshold ORG 85% |
| v1.29.01 | Fix NER ORG: remover LTDA/EIRELI/S.A do STOP_WORDS (são sufixos válidos), threshold reduzido para 85% |
| v1.29.00 | NER incluir ORG (empresas): toggle em Config IA, STOP_WORDS para tribunais/órgãos públicos, filtro score ≥ 90%, persistência localStorage |
| v1.28.18 | Cleanup NER: removido regex de resgate - causava sobreposição e quebrava fusão de nomes |
| v1.28.17 | Cleanup NER: removido regex de completar preposição (v1.28.10) - offsets manuais resolvem fragmentação |
| v1.28.16 | Fix NER: offsets manuais via `indexOf` + filtro [CLS]/[SEP]/[UNK] - resolve fragmentação de nomes |
| v1.28.15 | Fix NER offsets manuais via `indexOf` + `aggregation_strategy: 'none'` (causou erro "offset out of bounds") |
| v1.28.14 | NER reconstrução baseada em offsets (falhou: Transformers.js retorna start/end zerados) |
| v1.28.13 | Fix tokenização fragmentada no NER LeNER-BR: `aggregation_strategy: 'average'` (não funcionou no Transformers.js) |
| v1.28.12 | NER suporta modelo LeNER-BR jurídico (tag PESSOA além de PER) - F1 0.983 para pessoas |
| v1.28.11 | NER permite nomes curtos (4+ chars): JEAN, JOSE, CAIO, LUAN, etc |
| v1.28.10 | Fix NER - completar nomes que terminam em preposição (DOS, DE, DA, E): busca palavra seguinte no texto original |
| v1.28.09 | Fix feedback visual ao detectar nomes na anonimização de provas: `setDetectingNames(true)` imediato antes de extrair PDF |
| v1.28.08 | Overlay "IA Local Processando" (componente `LocalAIProcessingOverlay`): feedback visual durante geração de embedding no editor individual e GlobalEditorModal |
| v1.28.07 | Badge IA Local no GlobalEditorModal (header do painel de sugestões) |
| v1.28.06 | Badge IA Local em todos editores (individual, fullscreen, global); Fix UI freeze ao ativar split view (yield antes de onFindSuggestions) |
| v1.28.05 | Fix badge IA Local: cache agora salva { suggestions, source } em vez de apenas array |
| v1.28.04 | Badge "🤖 IA Local" nas sugestões quando vêm de embeddings; findSuggestions retorna { suggestions, source } |
| v1.28.03 | Fix UI freeze ao abrir editor: yield (setTimeout) antes de getEmbedding para UI atualizar primeiro |
| v1.28.02 | Sugestões de modelos via IA Local: toggle em Config IA > Modelos para usar embeddings ao invés de Claude API; ~100ms latência vs 2-5s; zero custo; funciona offline |
| v1.28.01 | Botão X e ESC para limpar campos de busca (5 campos); Toggle semântico (🧠) como padrão ao habilitar busca semântica em Config IA |
| v1.28.00 | Remoção da geração inline de embeddings para Legislação e Jurisprudência (agora apenas via importação JSON do Python); redução de ~220 linhas de código; simplificação da UI em Config IA |
| v1.27.02 | Geração automática de embedding em todos os cenários de modelo (novo, editar, duplicar, quick edit, salvar como novo, importar, bulk); feedback visual "Salvando..." no botão durante geração; fix UI freezing (yield) |
| v1.27.01 | Busca Semântica na aba Modelos: toggle 🧠/🔤, embeddings inline nos modelos, geração em lote via Configurações IA, searchModelsBySimilarity, fix bug `local/local` no path do modelo Search |
| v1.27.00 | Busca Semântica na Jurisprudência: JurisEmbeddingsService, toggle 🧠/🔤 na aba, chunking para teses longas (IRR/IAC), threshold separado, script Python `generate_juris_embeddings.py` |
| v1.26.05 | Busca semântica mostra artigo completo (caput + §/incisos/alíneas) com destaque amarelo no trecho similar |
| v1.26.04 | Script Python `generate_embeddings.py` para gerar embeddings offline + botão "Importar JSON" no Sentencify |
| v1.26.03 | Fix property name: `allArticles` → `artigos` (hook retorna `artigos`, não `allArticles`) |
| v1.26.02 | Fix `legislacao is not defined` + Geração incremental de embeddings (só processa artigos novos, não regenera existentes) |
| v1.26.01 | Fix logs initPipeline ([NER]→[SEARCH/NER]) + Persistência Search (auto-init ao recuperar sessão) + Auto-unload ao desativar (libera memória) |
| v1.26.00 | Busca Semântica na Legislação: Modelo E5-base (multilingual-e5-base) com embeddings por item (caput/§/inciso), toggle 🧠/🔤 na aba Legislação, threshold configurável, EmbeddingsService para IndexedDB |
| v1.25.26 | Fix NER: Modal de provas usa texto correto (não petição/contestação) + Fix re-inicialização após disable/enable (limpa initPromises) |
| v1.25.25 | Cleanup: Remover logs de debug do NER (manteve apenas Fuzzy merge e resultado final) |
| v1.25.24 | Fix NER: Limpar gentílicos do final dos nomes após fuzzy dedup ("AURIAN...BRASILEIRA" → "AURIAN...SILVA") |
| v1.25.23 | Fix NER: Separar STOP_WORDS em contains/exact - "ALMEIDA" era filtrado por conter "ME" (Microempresa). Usa word boundary para palavras curtas |
| v1.25.22 | Fix NER: Filtrar gentílicos (paraense, paulista, brasileiro...) + Debug logs para investigar nomes perdidos no fuzzy dedup |
| v1.25.21 | Auto-unload NER: Modelo descarregado da memória ao desligar anonimização (libera ~200-300MB RAM), arquivos mantidos no IndexedDB para re-init rápido |
| v1.25.20 | UI: Seção "IA Offline" movida para dentro de Anonimização (só aparece quando ativo) + Contraste corrigido nas badges de arquivo no tema claro |
| v1.25.19 | Fix: Limpar nomes de anonimização ao limpar projeto + Botão "Detectar Nomes" funcional nos modais de prova |
| v1.25.18 | Memory Leak Fix: blur listener com handler nomeado + cleanup, helper extractPlainText (evita DOM parsing) |
| v1.25.17 | Fuzzy Deduplication para variações de nomes (Renald/Ranald/Nald → manter mais longo). Similarity >70% = merge |
| v1.25.16 | Segment Title Case (converte segmentos ALL CAPS, não chunk inteiro) + Regex remove siglas de estado (AP, SP, RJ) |
| v1.25.15 | Smart Title Case para ALL CAPS (modelo cased confunde >70% maiúsculas) + Regex Resgate padrão "NOME, brasileiro" |
| v1.25.14 | Debug NER detalhado + filtro falsos positivos (V.EXA, LTDA, RECLAMANTE, etc.). Teste sanidade com frase completa |
| v1.25.02 | IA Offline NER: AIModelService com script injection e WASM trap, UI upload modelo NER nas Configurações IA, botão "Detectar Nomes" no modal anonimização, função detectarNomesAutomaticamente |
| v1.25.01 | Dashboard de tokens: Adicionado Gemini 3 Flash ($0.50/1M input, $3.00/1M output) às estimativas de custo |
| v1.25.00 | Otimização de cache: cache_control em contestações, complementares e provas (economia ~40-50% em tokens) |
| v1.24.00 | Sistema de Versionamento do campo fundamentação: `useFieldVersioning` hook, `VersionSelect` dropdown, salva versão ao blur, restaura versões anteriores (salva atual antes), integrado no GlobalEditorModal e DecisionEditorContainer |
| v1.22.03 | Fix: filtro Informativo faltando no modal de jurisprudencia do editor |
| v1.22.02 | Fix: contraste ruim das tags de status no tema claro (jurisprudencia) |
| v1.22.01 | Fix: tokenMetrics nao persistia apos F5 (faltava trigger no auto-save) |
| v1.22.00 | Centralizacao prompts mini-relatorios + parametros LLM otimizados (20 chamadas) |
| v1.21.25 | Parametros LLM especificos para revisao (temperature=0.2, topP=0.9, topK=40) |
| v1.21.24 | Prompt revisão completo Opus 4.5 - protocolo 5 fases, 6 exemplos, 10 regras, tabela quantitativa, nota A/B/C/D |
| v1.21.21 | Botão "Revisar Sentença" na aba tópicos - análise crítica por IA (omissões, contradições, obscuridades) |
| v1.21.20 | Filtro "Informativo" na aba de jurisprudência + Script convert-informativos.js + JSON informativos-tst.json |
| v1.21.19 | Fix: tokenMetrics perdido na importação de projeto (faltava setProofSendFullContent) |
| v1.21.18 | Fix: título FUNDAMENTAÇÃO alinhado à esquerda na exportação de minuta |
| v1.21.6 | Modal nomes no Assistente IA com provas vinculadas + Aviso visual PDF com anonimização ativa |
| v1.21.5 | Anonimização completa provas: modal nomes na extração, texto anonimizado ao enviar, bloqueio visual PDF puro |
| v1.21.4 | Fix hover botões fullscreen: hover-slate-500 para contraste em ambos os temas |
| v1.21.3 | Anonimização de provas na entrada: modal nomes, persistência, nomesUsuario em analyzeProof |
| v1.21.2 | Fix: respeitar modo de processamento (proofProcessingModes) ao enviar provas à LLM |
| v1.20.0 | Fix duplicação tópicos complementares + VirtualList altura dinâmica (Legislação) |
| v1.19.1 | Fix: onInsertResponse assinatura corrigida + normalizeHTMLSpacing no global |
| v1.19.0 | Chat interativo no assistente IA + INSTRUCAO_NAO_PRESUMIR + preservarAnonimizacao condicional |
| v1.18.4 | Fix copyHandlerRef undefined in QuillFieldEditor cleanup |
| v1.14.0 | Detecção TF-IDF de similaridade + Botão "Salvar como Modelo" + Comparação lado a lado |
| v1.12.27 | Progresso de extração inline no ProofCard (não mais banner de erro) |

**Last Updated**: 2026-01-08
- sempre atualize a versão nas alterações realizadas