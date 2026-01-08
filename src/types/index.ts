/**
 * Tipos core do Sentencify
 *
 * Este arquivo centraliza todas as interfaces e types usados no projeto.
 * Criado como parte da migração TypeScript (v1.35.76).
 *
 * @version 1.35.76
 */

// ═══════════════════════════════════════════════════════════════════════════
// TOPIC TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TopicCategory =
  | 'PRELIMINAR'
  | 'PREJUDICIAL'
  | 'MÉRITO'
  | 'PROCESSUAL'
  | 'RELATÓRIO';

export type TopicResultado =
  | 'PROCEDENTE'
  | 'IMPROCEDENTE'
  | 'PARCIALMENTE PROCEDENTE'
  | 'ACOLHIDO'
  | 'REJEITADO'
  | null;

export interface Topic {
  id?: string | number;
  title: string;
  category: TopicCategory;
  relatorio?: string;
  fundamentacao?: string;
  dispositivo?: string;
  editedRelatorio?: string;
  editedFundamentacao?: string;
  resultado?: TopicResultado;
  proofLinks?: string[];
  createdAt?: string;
  updatedAt?: string;
  // TopicCurationModal extras
  mergedFrom?: string[];
  splitFrom?: string;
  isNew?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Model {
  id: string;
  title: string;
  content: string;
  keywords?: string | string[];
  category?: string;
  favorite?: boolean;
  // Sync
  syncVersion?: number;
  syncStatus?: 'pending' | 'synced';
  // Sharing
  ownerId?: string;
  ownerEmail?: string;
  sharedBy?: string;
  isShared?: boolean;
  // Embedding
  embedding?: number[];
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROOF TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ProofType = 'pdf' | 'text';
export type ProcessingMode = 'pdfjs' | 'pdf-puro' | 'claude-vision' | 'tesseract';

export interface ProofFile {
  id: string | number;
  file?: File;
  name: string;
  type: 'pdf';
  size?: number;
  uploadDate: string;
  isPdf?: true;
}

export interface ProofText {
  id: string | number;
  text: string;
  name: string;
  type: 'text';
  uploadDate: string;
}

export type Proof = ProofFile | ProofText;

export interface ProofAnalysisResult {
  type: 'contextual' | 'livre';
  result: string;
  topicTitle?: string;
  timestamp?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI SETTINGS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type AIProvider = 'claude' | 'gemini';
export type OCREngine = 'pdfjs' | 'tesseract' | 'pdf-puro' | 'claude-vision';
export type GeminiThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface AnonymizationSettings {
  enabled: boolean;
  cnpj?: boolean;
  cpf?: boolean;
  rg?: boolean;
  pis?: boolean;
  ctps?: boolean;
  cep?: boolean;
  processo?: boolean;
  oab?: boolean;
  telefone?: boolean;
  email?: boolean;
  contaBancaria?: boolean;
  valores?: boolean;
  nomes?: boolean;
  nomesUsuario: string[];
}

export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
}

/** Tópico complementar para geração automática */
export interface TopicoComplementar {
  id: number;
  title: string;
  category: TopicCategory;
  enabled: boolean;
  ordem: number;
}

export interface AISettings {
  provider: AIProvider;
  claudeModel: string;
  geminiModel: string;
  apiKeys: { claude: string; gemini: string };
  useExtendedThinking: boolean;
  thinkingBudget: string;
  geminiThinkingLevel: GeminiThinkingLevel;
  model?: string; // Legacy field for backwards compatibility
  customPrompt: string;
  modeloRelatorio: string;
  modeloDispositivo: string;
  modeloTopicoRelatorio: string;
  estiloRedacao?: string;
  topicosComplementares?: TopicoComplementar[];
  ocrEngine: OCREngine;
  ocrLanguage?: string;
  detailedMiniReports?: boolean;
  topicsPerRequest?: number;
  parallelRequests: number;
  anonymization: AnonymizationSettings;
  // IA Local settings
  semanticSearchEnabled: boolean;
  semanticThreshold: number;
  jurisSemanticEnabled: boolean;
  jurisSemanticThreshold?: number;
  modelSemanticEnabled?: boolean;
  modelSemanticThreshold?: number;
  useLocalAIForSuggestions?: boolean;
  useLocalAIForJuris?: boolean;
  quickPrompts: QuickPrompt[];
  logThinking?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// USER & AUTH TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PendingChange {
  operation: 'create' | 'update' | 'delete';
  model: Partial<Model> | { id: string; updatedAt: string };
  retryCount?: number;
}

export interface SyncConflict {
  id: string;
  reason: 'version_mismatch' | 'model_deleted' | 'no_permission';
}

export interface SyncResult {
  success: boolean;
  results?: {
    created: string[];
    updated: string[];
    deleted: string[];
    conflicts: SyncConflict[];
  };
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ModalKey =
  | 'modelForm'
  | 'extractModelConfirm'
  | 'extractedModelPreview'
  | 'export'
  | 'import'
  | 'exportModels'
  | 'deleteModel'
  | 'deleteAllModels'
  | 'deleteAllPrecedentes'
  | 'rename'
  | 'merge'
  | 'split'
  | 'newTopic'
  | 'deleteTopic'
  | 'aiAssistant'
  | 'aiAssistantModel'
  | 'analysis'
  | 'settings'
  | 'dispositivo'
  | 'restoreSession'
  | 'clearProject'
  | 'bulkModel'
  | 'bulkReview'
  | 'bulkDiscardConfirm'
  | 'confirmBulkCancel'
  | 'addProofText'
  | 'deleteProof'
  | 'linkProof'
  | 'proofAnalysis'
  | 'globalEditor'
  | 'jurisIndividual'
  | 'proofTextAnonymization'
  | 'proofExtractionAnonymization'
  | 'sentenceReview'
  | 'sentenceReviewResult'
  | 'logout'
  | 'shareLibrary'
  | 'changelog'
  | 'topicCuration'
  | 'modelGenerator';

export type ModalState = Record<ModalKey, boolean>;

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN METRICS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TokenMetrics {
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  totalCost?: number;
  // Campos usados no App.tsx
  totalInput?: number;
  totalOutput?: number;
  totalCacheRead?: number;
  totalCacheCreation?: number;
  requestCount?: number;
  lastUpdated?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI GENERATION TYPES (Reducer)
// ═══════════════════════════════════════════════════════════════════════════

export interface AIGenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  abortController: AbortController | null;
}

export type AIGenerationAction =
  | { type: 'START'; payload: AbortController }
  | { type: 'PROGRESS'; payload: { progress: number; step: string } }
  | { type: 'SUCCESS' }
  | { type: 'ERROR'; payload: string }
  | { type: 'RESET' };

/** Context item state for AI generation */
export interface AIGenContextItem {
  instruction?: string;
  text?: string;
  generating?: boolean;
  regenerating?: boolean;
}

/** Contextos do estado de geração de IA */
export type AIGenContext = 'generic' | 'model' | 'relatorio' | 'dispositivo' | 'keywords' | 'title';

/** Estado completo do reducer de geração de IA */
export type AIGenState = Record<AIGenContext, AIGenContextItem>;

/** Ação do reducer de geração de IA */
export type AIGenAction =
  | { type: 'SET_INSTRUCTION'; context: AIGenContext; value: string }
  | { type: 'SET_TEXT'; context: AIGenContext; value: string }
  | { type: 'SET_GENERATING'; context: AIGenContext; value: boolean }
  | { type: 'SET_REGENERATING'; context: AIGenContext; value: boolean }
  | { type: 'RESET_CONTEXT'; context: AIGenContext }
  | { type: 'RESET_ALL'; context: AIGenContext };

// ═══════════════════════════════════════════════════════════════════════════
// FIELD VERSIONING TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FieldVersion {
  id: string;
  topicId: string | number;
  field: 'fundamentacao' | 'relatorio' | 'dispositivo';
  content: string;
  timestamp: number;
  label?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE DRIVE TYPES (já existem em useGoogleDrive.ts, mas exportamos aqui)
// ═══════════════════════════════════════════════════════════════════════════

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  createdTime?: string;
  ownedByMe?: boolean;
  owners?: Array<{ emailAddress: string; displayName?: string }>;
  sharingUser?: { emailAddress: string; displayName?: string };
  shared?: boolean;
}

export interface DrivePermission {
  id: string;
  type: 'user' | 'anyone' | 'domain' | 'group';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
  displayName?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Papel da mensagem na conversa com IA */
export type AIMessageRole = 'user' | 'assistant' | 'system';

/** Conteúdo de texto simples */
export interface AITextContent {
  type: 'text';
  text: string;
}

/** Conteúdo de imagem (base64) */
export interface AIImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
}

/** Conteúdo de documento (PDF) */
export interface AIDocumentContent {
  type: 'document';
  source: {
    type: 'base64';
    media_type: 'application/pdf';
    data: string;
  };
}

/** Tipos de conteúdo possíveis */
export type AIMessageContent = string | AITextContent | AIImageContent | AIDocumentContent;

/** Mensagem para a API de IA */
export interface AIMessage {
  role: AIMessageRole;
  content: AIMessageContent | AIMessageContent[];
}

/** Opções para chamada de IA */
export interface AICallOptions {
  useInstructions?: boolean;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  cacheControl?: boolean;
  signal?: AbortSignal;
}

/** Tipo para função callAI */
export type CallAIFunction = (
  messages: AIMessage[],
  options?: AICallOptions
) => Promise<string>;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Partial with required id */
export type PartialWithId<T extends { id: string }> = Partial<T> & Pick<T, 'id'>;

/** Make specific keys required */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Callback type for generic functions */
export type VoidCallback = () => void;
export type AsyncVoidCallback = () => Promise<void>;

// ═══════════════════════════════════════════════════════════════════════════
// UI STATE TYPES (FASE 8.1)
// ═══════════════════════════════════════════════════════════════════════════

/** Estado do modal de preview de texto */
export interface TextPreviewState {
  isOpen: boolean;
  title: string;
  text: string;
}

/** Estado do toast de notificação */
export interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

/** Estado do menu slash command */
export interface SlashMenuState {
  visible: boolean;
  x: number;
  y: number;
  query: string;
  items: Model[];
}

/** Estado de progresso genérico */
export interface ProgressState {
  current: number;
  total: number;
}

/** Target field para geração de modelo */
export type TargetField = 'relatorio' | 'dispositivo' | 'topicoRelatorio' | 'estiloRedacao';

/** Estado do modal de geração de modelo */
export interface ModelGeneratorModalState {
  isOpen: boolean;
  targetField: TargetField | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER TYPES (FASE 8.1)
// ═══════════════════════════════════════════════════════════════════════════

/** Filtros de jurisprudência */
export interface FiltrosJuris {
  fonte: string[];
  tipo: string[];
}

/** Filtros de legislação */
export interface FiltrosLegislacao {
  tipo: string[];
  tribunal: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA TYPES (FASE 8.1)
// ═══════════════════════════════════════════════════════════════════════════

/** Texto colado (petição, contestação, complementar) */
export interface PastedText {
  id: string;
  text: string;
  name: string;
}

/** Mensagem do chat assistente */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/** Precedente (súmula, OJ, tese) */
export interface Precedente {
  id: string;
  tipo: string;
  numero: string;
  texto: string;
  tribunal?: string;
  similarity?: number;
  fullText?: string;
}

/** Artigo de legislação */
export interface Artigo {
  id: string;
  lei: string;
  numero: string;
  texto: string;
  caput?: string;
  incisos?: string[];
  paragrafos?: string[];
}

/** Sugestão de jurisprudência */
export interface JurisSuggestion {
  id: string;
  texto: string;
  tipo?: string;
  similarity: number;
}

/** Informação de compartilhamento */
export interface ShareInfo {
  id: string;
  email: string;
  permission: 'view' | 'edit';
  createdAt: string;
  status?: 'pending' | 'accepted';
}

// ═══════════════════════════════════════════════════════════════════════════
// DOWNLOAD STATUS TYPES (FASE 8.1)
// ═══════════════════════════════════════════════════════════════════════════

/** Status de download */
export type DownloadStatus = 'idle' | 'downloading' | 'done' | 'error';

/** Status de download de embeddings */
export interface EmbeddingsDownloadStatus {
  legislacao: DownloadStatus;
  jurisprudencia: DownloadStatus;
}

/** Status de download de dados */
export interface DataDownloadStatus {
  legislacao: DownloadStatus;
  jurisprudencia: DownloadStatus;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT TYPES (FASE 8.1)
// ═══════════════════════════════════════════════════════════════════════════

/** Resultado de análise de documento */
export interface DocumentAnalysis {
  extracted: boolean;
  text?: string;
  mode?: ProcessingMode;
}

/** Partes do processo */
export interface PartesProcesso {
  reclamante: string;
  reclamadas: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR TYPES (FASE 8.1)
// ═══════════════════════════════════════════════════════════════════════════

/** Interface do Quill Editor */
export interface QuillInstance {
  getText: () => string;
  getContents: () => unknown;
  setContents: (delta: unknown) => void;
  setText: (text: string) => void;
  getSelection: () => { index: number; length: number } | null;
  setSelection: (index: number, length?: number) => void;
  format: (name: string, value: unknown) => void;
  insertText: (index: number, text: string, formats?: Record<string, unknown>) => void;
  deleteText: (index: number, length: number) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  root: HTMLElement;
  clipboard: { dangerouslyPasteHTML: (html: string) => void };
}

/** Estado de provas para novo texto */
export interface NewProofTextData {
  name: string;
  text: string;
}

/** Entrada de cache genérica */
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

/** Estatísticas de cache */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// APP.TSX SPECIFIC TYPES (FASE 8.2)
// ═══════════════════════════════════════════════════════════════════════════

/** Local model form state (ModelFormModal) */
export interface LocalModelForm {
  title: string;
  content: string;
  keywords: string;
  category: string;
}

/** Slash menu extended state with position and quill instance */
export interface SlashMenuStateExtended {
  isOpen: boolean;
  position: { top: number; left: number };
  searchTerm: string;
  selectedIndex: number;
  quillInstance: QuillInstance | null;
  triggerPosition: number;
}

/** Download item status (detailed) */
export interface DownloadItemStatus {
  needed: boolean | null;
  downloading: boolean;
  progress: number;
  error: string | null;
  completed?: boolean;
}

/** Embeddings download status (detailed) */
export interface EmbeddingsDownloadStatusExtended {
  legislacao: DownloadItemStatus;
  jurisprudencia: DownloadItemStatus;
}

/** Data download status (detailed) */
export interface DataDownloadStatusExtended {
  legislacao: DownloadItemStatus;
  jurisprudencia: DownloadItemStatus;
}

/** Format state for inline formatting toolbar */
export type ActiveFormatsState = Record<string, boolean | string | undefined>

// ═══════════════════════════════════════════════════════════════════════════
// AI MODEL SERVICE TYPES (FASE 8.7)
// ═══════════════════════════════════════════════════════════════════════════

/** Tipo de modelo de IA local */
export type AIModelType = 'ner' | 'search';

/** Status do modelo de IA */
export type AIModelStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Status do AIModelService */
export type AIModelServiceStatus = Record<AIModelType, AIModelStatus>;

/** Progresso do AIModelService */
export type AIModelServiceProgress = Record<AIModelType, number>;

/** Entidade NER bruta do worker */
export interface NERRawEntity {
  word: string;
  entity: string;
  score: number;
  start: number;
  end: number;
}

/** Entidade NER processada */
export interface NERProcessedEntity {
  text: string;
  type: string;
  score: number;
  start: number;
  end: number;
}

/** Callback de status do AIModelService */
export type AIModelStatusCallback = (state: { status: AIModelServiceStatus; progress: AIModelServiceProgress }) => void;

/** Mensagem do worker de IA */
export interface AIWorkerMessage {
  id: string;
  type: string;
  result?: unknown;
  error?: string;
  progress?: { model: AIModelType; progress: number };
}

/** Promise pendente do worker */
export interface PendingWorkerPromise {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDINGS SERVICE TYPES (FASE 8.7)
// ═══════════════════════════════════════════════════════════════════════════

/** Item de embedding de legislação */
export interface LegislacaoEmbeddingItem {
  id: string;
  artigoId: string;
  type: string;
  lei: string;
  text: string;
  embedding: number[];
}

/** Item de embedding de jurisprudência */
export interface JurisEmbeddingItem {
  id: string;
  tipo: string;
  texto: string;
  embedding: number[];
  tribunal?: string;
  fullText?: string;
}

/** Resultado de busca por similaridade */
export interface SimilaritySearchResult {
  item: unknown;
  similarity: number;
}

/** Item de jurisprudência com similaridade (resultado de busca) */
export interface JurisEmbeddingWithSimilarity extends JurisEmbeddingItem {
  similarity: number;
  precedenteId?: string;
  tipoProcesso?: string;
}

/** Filtros de jurisprudência extendidos */
export interface JurisFiltros {
  tipo?: string[];
  tribunal?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CDN SERVICE TYPES (FASE 8.7)
// ═══════════════════════════════════════════════════════════════════════════

/** Tipo de download (embeddings ou dados) */
export type CDNDownloadType = 'legislacao' | 'jurisprudencia';

/** Callback de progresso de download (0-1) */
export type DownloadProgressCallback = (progress: number) => void;

/** Callback de batch completo (current, total) */
export type BatchCompleteCallback = (current: number, total: number) => void;

/** Nomes de arquivos conhecidos no CDN */
export type CDNFileName = 'legis-embeddings.json' | 'juris-embeddings.json' | 'legis-data.json' | 'juris-data.json';

/** Mapeamento de tamanhos estimados */
export type EstimatedSizes = Record<CDNFileName, number>;
