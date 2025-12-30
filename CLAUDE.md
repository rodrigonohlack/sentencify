# CLAUDE.md

## Project Overview

**SentencifyAI** - React-based legal decision tool for Brazilian labor court judges.

**Version**: 1.32.41 | **File**: `SentencifyAI_v1_28.jsx` (~920 KB) | **Runtime**: Standalone + Vercel

## Architecture

**Hooks**: `useModalManager`, `useAIIntegration`, `useLocalStorage`, `useModelLibrary`, `useProofManager`, `useDocumentManager`, `useTopicManager`, `usePrimaryTabLock`, `useGlobalEditor`, `useChatAssistant`, `useFieldVersioning`

**Components**: `TopicCard`, `ModelCard`, `SuggestionCard`, `ProofCard`, `GlobalEditorModal`, `LockedTabOverlay`, `VersionSelect`

**Storage**:
- `SentencifyAI` (IndexedDB) → modelos
- `sentencify-pdfs` (IndexedDB) → PDFs
- `sentencify-versions` (IndexedDB) → versionamento do campo fundamentação
- `sentencify-legislacao-embeddings` (IndexedDB) → embeddings pré-computados da legislação
- `sentencify-juris-embeddings` (IndexedDB) → embeddings pré-computados da jurisprudência
- `sentencifySession` (localStorage) → metadados + textos
- Modelos NER/E5 (cache browser) → baixados automaticamente do HuggingFace CDN

## Critical Guidelines

1. **Modals com Scroll**: Use `overflow-auto` no overlay + `my-auto` no container (ver DispositivoModal)
2. **File Rename (Windows)**: Use `powershell -Command "Rename-Item..."`
3. **API**: Use `buildApiRequest()` helper. Model: `claude-sonnet-4-20250514`
4. **z-index**: Base `z-50`, nested `+10` por nível

> **Nota**: Este projeto agora roda como aplicação standalone (fora do sandbox Claude.ai). Não há mais limite de tamanho de arquivo nem necessidade de minificação.

## Recent Changes

| Version | Feature |
|---------|---------|
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

**Last Updated**: 2025-12-29
- sempre atualize a versão nas alterações realizadas