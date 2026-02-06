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
  | 'RELATÓRIO'
  | 'DISPOSITIVO';

export type TopicResultado =
  | 'PROCEDENTE'
  | 'IMPROCEDENTE'
  | 'PARCIALMENTE PROCEDENTE'
  | 'ACOLHIDO'
  | 'REJEITADO'
  | 'SEM RESULTADO'
  | 'INDEFINIDO'
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
  // Propriedades adicionais usadas no App.tsx
  resultadoManual?: boolean;
  editedContent?: string;
  content?: string;
  text?: string;
  context?: string;
  instruction?: string;
  includeComplementares?: boolean;
  isInitialGeneration?: boolean;
  documentsOverride?: unknown;
  isComplementar?: boolean;
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
  sharedPermission?: 'view' | 'edit';
  // Embedding
  embedding?: number[];
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  // Propriedades adicionais usadas no App.tsx
  usageCount?: number;
  similarity?: number;
  sourceFile?: string;
  similarityInfo?: { similarity: number; similarModel: Model };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROOF TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ProofType = 'pdf' | 'text';
export type ProcessingMode = 'pdfjs' | 'pdf-puro' | 'claude-vision' | 'tesseract';
export type InsertMode = 'replace' | 'append' | 'prepend';

export interface ProofFile {
  id: string | number;
  file?: File;
  name: string;
  type: 'pdf';
  size?: number;
  uploadDate: string;
  isPdf?: boolean;
  fileData?: string; // Base64 data for restored PDFs
  isPlaceholder?: boolean; // v1.35.92: PDF placeholder (arquivo não salvo, só texto)
  attachments?: ProofAttachment[]; // v1.38.8: Anexos da prova
  // Union compatibility
  text?: never;
}

export interface ProofText {
  id: string | number;
  text: string;
  name: string;
  type: 'text';
  uploadDate: string;
  isPlaceholder?: boolean; // v1.35.92: Consistência com ProofFile
  isPdf?: boolean; // v1.35.79: Compat com linkedProofs
  attachments?: ProofAttachment[]; // v1.38.8: Anexos da prova
  // Union compatibility
  file?: never;
  size?: never;
  fileData?: never;
}

/**
 * v1.38.8: Anexo de prova (impugnações, esclarecimentos, etc.)
 * Permite agrupar documentos relacionados sob uma única prova
 */
export interface ProofAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'text';
  file?: File;              // File object (runtime)
  fileData?: string;        // Base64 para persistência (IndexedDB)
  text?: string;            // Conteúdo para anexos de texto
  size?: number;
  uploadDate: string;
  extractedText?: string;   // Texto extraído de PDF (OCR/pdf.js)
  processingMode?: ProcessingMode;  // v1.38.10: Modo de extração para PDFs
}

export type Proof = ProofFile | ProofText;

export interface ProofAnalysisResult {
  id: string;
  type: 'contextual' | 'livre' | 'importada';
  result: string;
  topicTitle?: string;
  timestamp: string;
  sourceProvaOralId?: string;  // Rastreabilidade para análises importadas de Prova Oral
}

/** Limite máximo de análises por prova */
export const MAX_PROOF_ANALYSES = 5;

// ═══════════════════════════════════════════════════════════════════════════
// AI SETTINGS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok';
export type OCREngine = 'pdfjs' | 'tesseract' | 'pdf-puro' | 'claude-vision';
export type GeminiThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';
export type OpenAIReasoningLevel = 'low' | 'medium' | 'high' | 'xhigh';

/** Gemini API types - v1.35.95 */
export interface GeminiGenerationConfig {
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  thinking_config?: {
    thinking_budget?: number;
    includeThoughts?: boolean;
  };
}

export interface GeminiRequest {
  contents: unknown[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig?: GeminiGenerationConfig;
}

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

/** v1.40.XX: Sub-opção para quickprompts com múltiplos modos */
export interface QuickPromptSubOption {
  id: string;
  label: string;
  icon?: string;
  /** Modo de coleta de dados de prova */
  proofDataMode: 'all' | 'conclusions_only';
}

export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
  // Propriedades adicionais usadas no App.tsx
  icon?: string;
  name?: string;
  proofFilter?: string;
  /** v1.40.XX: Sub-opções para quickprompts com dropdown */
  subOptions?: QuickPromptSubOption[];
  /** v1.40.XX: Handler especial para lógica customizada */
  specialHandler?: 'proof-decision';
  /** v1.40.XX: Indica se é um quickprompt padrão (não editável/excluível) */
  isDefault?: boolean;
}

/** Tópico complementar para geração automática */
export interface TopicoComplementar {
  id: number;
  title: string;
  category: TopicCategory;
  enabled: boolean;
  ordem: number;
  descricao?: string;
}

export interface AISettings {
  provider: AIProvider;
  claudeModel: string;
  geminiModel: string;
  openaiModel: 'gpt-5.2' | 'gpt-5.2-chat-latest';
  openaiReasoningLevel: OpenAIReasoningLevel;
  grokModel: 'grok-4-1-fast-reasoning' | 'grok-4-1-fast-non-reasoning';
  apiKeys: { claude: string; gemini: string; openai: string; grok: string };
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
  topicsPerRequest?: number | 'all';
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
  // v1.36.50: Double Check de respostas da IA
  doubleCheck?: DoubleCheckSettings;
  // v1.37.88: Melhoria de texto ditado por voz com IA
  voiceImprovement?: VoiceImprovementSettings;
}

// ═══════════════════════════════════════════════════════════════════════════
// VOICE IMPROVEMENT TYPES (v1.37.88)
// ═══════════════════════════════════════════════════════════════════════════

/** Modelos disponíveis para melhoria de voz (rápidos/baratos) */
export type VoiceImprovementModel = 'haiku' | 'flash' | 'gpt-4o-mini' | 'grok-instant';

/** Configurações de melhoria de texto ditado por voz */
export interface VoiceImprovementSettings {
  enabled: boolean;
  model: VoiceImprovementModel;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOUBLE CHECK TYPES (v1.36.50)
// ═══════════════════════════════════════════════════════════════════════════

/** Operações que podem usar Double Check */
export interface DoubleCheckOperations {
  topicExtraction: boolean;
  dispositivo: boolean;      // v1.36.56: Verificação do dispositivo
  sentenceReview: boolean;   // v1.36.56: Verificação da revisão de sentença
  factsComparison: boolean;  // v1.36.58: Verificação do confronto de fatos
  proofAnalysis: boolean;    // v1.37.65: Verificação da análise de provas
  quickPrompt: boolean;      // v1.37.65: Verificação dos quick prompts do assistente IA
}

/** Configurações de Double Check */
export interface DoubleCheckSettings {
  enabled: boolean;
  provider: AIProvider;
  model: string;
  operations: DoubleCheckOperations;
  // v1.36.56: Thinking config específico para Double Check
  claudeThinkingBudget?: number;        // 0 = desativado, 10000-62000 para Sonnet, 10000-30000 para Opus
  geminiThinkingLevel?: GeminiThinkingLevel;  // minimal, low, medium, high
  openaiReasoningLevel?: 'low' | 'medium' | 'high' | 'xhigh';
}

/** Resultado do Double Check */
export interface DoubleCheckResult {
  verifiedTopics: unknown[];
  corrections: DoubleCheckCorrection[];
  confidence: number;
  summary: string;
}

/** Tipos de correção por operação */
export type DoubleCheckCorrectionType =
  // Extração de Tópicos
  | 'remove' | 'add' | 'merge' | 'reclassify'
  // Dispositivo
  | 'modify'
  // Revisão de Sentença
  | 'false_positive' | 'missed' | 'improve'
  // Confronto de Fatos
  | 'add_row' | 'fix_row' | 'remove_row' | 'add_fato';

/** Correção identificada pelo Double Check */
export interface DoubleCheckCorrection {
  type: DoubleCheckCorrectionType;
  // Campos comuns
  reason: string;
  // Extração de Tópicos
  topic?: string | { title: string; category: string };
  topics?: string[];
  into?: string;
  from?: string;
  to?: string;
  // Dispositivo / Revisão de Sentença
  item?: string;
  suggestion?: string;
  // Confronto de Fatos
  tema?: string;
  field?: string;
  newValue?: string;
  list?: 'fatosIncontroversos' | 'fatosControversos';
  fato?: string;
  row?: Record<string, unknown>;
}

/** Retorno da função performDoubleCheck */
export interface PerformDoubleCheckReturn {
  verified: string;
  corrections: DoubleCheckCorrection[];
  summary: string;
  confidence?: number;  // 0.0-1.0 retornado pela IA
}

// ═══════════════════════════════════════════════════════════════════════════
// DOUBLE CHECK REVIEW MODAL TYPES (v1.37.58)
// ═══════════════════════════════════════════════════════════════════════════

/** Operações disponíveis para Double Check */
// v1.37.65: Adicionado proofAnalysis e quickPrompt
export type DoubleCheckOperation = 'topicExtraction' | 'dispositivo' | 'sentenceReview' | 'factsComparison' | 'proofAnalysis' | 'quickPrompt';

/** Dados para abrir o modal de revisão do Double Check */
export interface DoubleCheckReviewData {
  operation: DoubleCheckOperation;
  originalResult: string;
  verifiedResult: string;
  corrections: DoubleCheckCorrection[];
  summary: string;
  confidence: number;
}

/** Resultado da decisão do usuário no modal de revisão */
export interface DoubleCheckReviewResult {
  selected: DoubleCheckCorrection[];
  finalResult: string;
  operation: DoubleCheckOperation;
}

/** Correção com flag de seleção para o modal */
export interface DoubleCheckCorrectionWithSelection extends DoubleCheckCorrection {
  id: string;
  selected: boolean;
  description: string;
}

/**
 * Tipo centralizado para a função performDoubleCheck
 * Usado em: useDocumentAnalysis, useDecisionTextGeneration, useProofAnalysis, useReportGeneration
 * @since v1.38.50
 */
export type PerformDoubleCheckFunction = (
  operation: DoubleCheckOperation,
  originalResponse: string,
  context: AIMessageContent[],
  onProgress?: (msg: string) => void,
  userPrompt?: string
) => Promise<PerformDoubleCheckReturn & { failed?: boolean }>;

// ═══════════════════════════════════════════════════════════════════════════
// OPENAI/GROK TYPES (v1.35.97)
// ═══════════════════════════════════════════════════════════════════════════

/** Parte de mensagem OpenAI/Grok (texto, imagem ou arquivo PDF) */
// v1.36.29: Adicionado 'file' para suporte a PDF via base64 (apenas OpenAI, Grok não suporta)
export interface OpenAIMessagePart {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  image_url?: { url: string };
  file?: { filename: string; file_data: string };
}

/** Mensagem OpenAI/Grok */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIMessagePart[];
}

/** Config de reasoning OpenAI (não usado no Grok) */
export interface OpenAIReasoningConfig {
  effort: OpenAIReasoningLevel;
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTS COMPARISON TYPES (v1.36.12)
// ═══════════════════════════════════════════════════════════════════════════

/** Fonte para análise de confronto de fatos */
export type FactsComparisonSource = 'mini-relatorio' | 'documentos-completos';

/** Linha da tabela de confronto de fatos */
export interface FactsComparisonRow {
  tema: string;
  alegacaoReclamante: string;
  alegacaoReclamada: string;
  status: 'controverso' | 'incontroverso' | 'silencio';
  relevancia: 'alta' | 'media' | 'baixa';
  observacao?: string;
}

/** Resultado completo do confronto de fatos para um tópico */
export interface FactsComparisonResult {
  topicTitle: string;
  source: FactsComparisonSource;
  generatedAt: string;
  tabela: FactsComparisonRow[];
  fatosIncontroversos: string[];
  fatosControversos: string[];
  pontosChave: string[];
  resumo?: string;
}

/** Entrada de cache para confronto de fatos */
export interface FactsComparisonCacheEntry {
  id?: number;
  topicTitle: string;
  source: FactsComparisonSource;
  result: FactsComparisonResult;
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SENTENCE REVIEW CACHE TYPES (v1.36.57)
// ═══════════════════════════════════════════════════════════════════════════

/** Escopo da revisão de sentença */
export type ReviewScope = 'decisionOnly' | 'decisionWithDocs';

/** Entrada de cache para revisão de sentença */
export interface SentenceReviewCacheEntry {
  id?: number;
  scope: ReviewScope;
  result: string;
  createdAt: number;
}

/** Props para FactsComparisonModal */
export interface FactsComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
  topicRelatorio?: string;
  hasPeticao: boolean;
  hasContestacao: boolean;
  onGenerate: (source: FactsComparisonSource) => Promise<void>;
  cachedResult: FactsComparisonResult | null;
  isGenerating: boolean;
  error: string | null;
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
  | 'deleteAllLegislacao'
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
  | 'modelGenerator'
  | 'regenerateRelatorioCustom'
  | 'bulkModal'
  | 'factsComparisonIndividual' // v1.36.21: Confronto de Fatos (editor individual)
  | 'driveFiles' // v1.37.49: Modal de arquivos do Google Drive
  | 'importProvaOralList' // v1.39.08: Lista de análises de Prova Oral para importar
  | 'importProvaOralSections'; // v1.39.08: Seleção de seções da Prova Oral

export type ModalState = Record<ModalKey, boolean>;

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN METRICS TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** v1.37.91: Métricas por modelo específico */
export interface PerModelMetrics {
  provider: 'claude' | 'gemini' | 'openai' | 'grok';
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  requestCount: number;
}

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
  /** v1.37.91: Breakdown por modelo - chave é o model ID (ex: "claude-sonnet-4-20250514") */
  byModel?: Record<string, PerModelMetrics>;
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
  preview?: string;
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
  cache_control?: { type: 'ephemeral' | string };
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
  cache_control?: { type: 'ephemeral' | string };
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
  systemPrompt?: string | null;
  model?: string;
  disableThinking?: boolean;
  timeout?: number;
  abortSignal?: AbortSignal;
  logMetrics?: boolean;
  extractText?: boolean;
  validateResponse?: boolean;
  /** v1.37.90: Override do provider para chamadas específicas (ex: voice improvement) */
  provider?: 'claude' | 'gemini' | 'openai' | 'grok';
  /** v1.38.44: Override do thinking level do Gemini para chamadas específicas */
  geminiThinkingLevel?: GeminiThinkingLevel;
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
  type: 'success' | 'error' | 'info' | 'warning';
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

/** Target field para geração de modelo (valores matcham meta-prompts.ts) */
export type TargetField = 'modeloRelatorio' | 'modeloDispositivo' | 'modeloTopicoRelatorio' | 'estiloRedacao';

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
  tribunal?: string[];
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
  ts?: number;
  contentForApi?: AIMessageContent[] | string;
  error?: string;
}

/** Entrada de cache do histórico de chat por tópico (v1.37.92) */
export interface ChatHistoryCacheEntry {
  id?: number;
  topicTitle: string;
  messages: ChatMessage[];
  includeMainDocs?: boolean;  // v1.38.16: Persistir toggle "Incluir petições e contestações" por tópico
  includeComplementaryDocs?: boolean;  // v1.39.06: Toggle "Incluir documentos complementares" no chat
  createdAt: number;
  updatedAt: number;
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
  // Propriedades adicionais usadas no App.tsx
  tipoProcesso?: string;
  titulo?: string;
  tese?: string;
  enunciado?: string;
  status?: string;
  keywords?: string | string[];
  orgao?: string;
  category?: string;
  tema?: string;
  numeroProcesso?: string;
  // Propriedades de metadados (IRDRs, IACs, etc.)
  relator?: string;
  dataJulgamento?: string;
  dataAprovacao?: string;
  dataPublicacao?: string;
  resolucao?: string;
  // Propriedades para chunking de teses longas
  totalChunks?: number;
  chunkIndex?: number;
}

/** Artigo de legislação */
export interface Artigo {
  id: string;
  lei: string;
  numero: string;
  texto: string;
  caput?: string;
  incisos?: { numero: string; texto: string }[];
  paragrafos?: { numero: string; texto: string }[];
  // Propriedades adicionais usadas no App.tsx
  alineas?: { letra: string; texto: string }[];
  keywords?: string | string[];
  artigoId?: string;
  type?: string;
  similarity?: number;
  status?: string;
}

/** Sugestão de jurisprudência */
export interface JurisSuggestion {
  id: string;
  texto?: string;  // v1.36.53: Opcional - dados textuais podem vir de 'texto' ou 'text'
  text?: string;   // v1.36.53: Campo do JSON de embeddings
  tipo?: string;
  similarity: number;
  // Propriedades adicionais usadas no App.tsx
  tipoProcesso?: string;
  numero?: string;
  tema?: string;
  status?: string;
  orgao?: string;
  tribunal?: string;
  titulo?: string;
  tese?: string;
  enunciado?: string;
  fullText?: string;
}

/** Informação de compartilhamento */
export interface ShareInfo {
  id: string;
  email: string;
  permission: 'view' | 'edit';
  createdAt: string;
  status?: 'pending' | 'accepted';
  // Propriedades adicionais usadas no App.tsx
  accessId?: string;
  ownerId?: string;
  ownerEmail?: string;
  owner?: { email: string } | string;
  recipient_email?: string;
  recipients?: Array<{ email: string; permission: string }>;
  modelsCount?: number;
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

/** Interface para Quill Delta (objeto de mudanças) */
export interface QuillDeltaOp {
  insert?: string | Record<string, unknown>;
  delete?: number;
  retain?: number;
  attributes?: Record<string, unknown>;
}

export interface QuillDelta {
  ops: QuillDeltaOp[];
}

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
  off: (event: string, handler?: (...args: unknown[]) => void) => void;
  root: HTMLElement;
  clipboard: {
    dangerouslyPasteHTML: ((html: string) => void) & ((index: number, html: string) => void);
    convert: (html: string) => unknown;
  };
  // Métodos adicionais usados no App.tsx
  focus: () => void;
  getBounds: (index: number, length?: number) => { top: number; left: number; height: number; width: number; bottom: number; right: number };
  getLength: () => number;
  update: (source?: string) => void;
  enable: (enabled?: boolean) => void;
  getFormat: (index?: number, length?: number) => Record<string, unknown>;
}

/** Estado de provas para novo texto */
export interface NewProofTextData {
  name: string;
  text: string;
}

/** Entrada de cache genérica */
export interface CacheEntry<T = unknown> {
  data?: T;
  result?: T;
  timestamp: number;
  hits?: number;
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

/** Data passed to onSlashCommand callback */
export interface SlashCommandData {
  position: { top: number; left: number };
  quillInstance: QuillInstance | null;
  triggerPosition: number;
}

/** Callback type for slash command */
export type OnSlashCommandCallback = (data: SlashCommandData) => void;

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
  text: string;  // v1.36.53: Corrigido para corresponder ao JSON (era "texto")
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
  numero?: string;
  numeroProcesso?: string;
  tema?: string;
  titulo?: string;
  totalChunks?: number;
  chunkIndex?: number;
}

/** Filtros de jurisprudência extendidos */
export interface JurisFiltros {
  tipo?: string[];
  tribunal?: string[];
  searchTerm?: string;
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

// ═══════════════════════════════════════════════════════════════════════════
// MODAL PROPS (movido de App.tsx v1.35.79)
// ═══════════════════════════════════════════════════════════════════════════

/** NewModelData type for model forms */
export interface NewModelData {
  title: string;
  content: string;
  keywords?: string;
  category?: string;
}

/** Props para ModelFormModal - v1.35.92 */
export interface ModelFormModalProps {
  isOpen: boolean;
  editingModel: Model | null;
  newModel: NewModelData;
  setNewModel: React.Dispatch<React.SetStateAction<NewModelData>>;
  models: Model[];
  onSave: (modelData?: NewModelData) => void;
  onCancel: () => void;
  onGenerateKeywords: () => void;
  generatingKeywords?: boolean;
  onGenerateTitle: () => void;
  generatingTitle?: boolean;
  onSaveWithoutClosing: (modelData?: NewModelData) => void;
  onOpenAIAssistant: () => void;
  sanitizeHTML: (html: string) => string;
  modelEditorRef: React.RefObject<QuillInstance | null>;
  quillReady?: boolean;
  quillError?: Error | string | null;
  editorTheme?: 'dark' | 'light' | string;
  toggleEditorTheme?: () => void;
  modelSaved?: boolean;
  savingModel?: boolean;
}

/** Props para ModelPreviewModal - v1.35.92 */
export interface ModelPreviewModalProps {
  isOpen: boolean;
  model: Model | null;
  onInsert: (html: string, topic?: Topic | null) => void;
  onClose: () => void;
  sanitizeHTML: (html: string) => string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isEditing?: boolean;
  editedContent?: string;
  onStartEditing?: () => void;
  onCancelEditing?: () => void;
  onSaveEdit?: (ref: React.RefObject<{ root?: HTMLElement } | null>) => void;
  onContentChange?: (content: string) => void;
  quillReady?: boolean;
  quillError?: Error | string | null;
  fontSize?: 'small' | 'normal' | 'large' | string;
  spacing?: 'compact' | 'normal' | 'relaxed' | string;
  editorTheme?: 'dark' | 'light' | string;
  onDelete?: (model: Model) => void;
  onToggleFavorite?: (id: string) => void;
  onOpenSaveAsNew?: (content: string, model: Model) => void;
}

export interface RenameTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicToRename: Topic | null;
  setTopicToRename: (topic: Topic | null) => void;
  newTopicName: string;
  setNewTopicName: (name: string) => void;
  handleRenameTopic: (regenerate: boolean) => void;
  isRegenerating?: boolean;
  hasDocuments?: boolean;
}

export interface DeleteTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicToDelete: Topic | null;
  setTopicToDelete: (topic: Topic | null) => void;
  onConfirmDelete: () => void;
}

export interface MergeTopicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicsToMerge: Topic[];
  onConfirmMerge: () => void;
  isRegenerating?: boolean;
  hasDocuments?: boolean;
}

export interface SplitTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicToSplit: Topic | null;
  setTopicToSplit: (topic: Topic | null) => void;
  splitNames: string[];
  setSplitNames: (names: string[]) => void;
  onConfirmSplit: () => void;
  isRegenerating?: boolean;
  hasDocuments?: boolean;
}

export interface NewTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTopicData: Partial<Topic> | null;
  setNewTopicData: React.Dispatch<React.SetStateAction<Partial<Topic> | null>>;
  onConfirmCreate: () => void;
  isRegenerating?: boolean;
  hasDocuments?: boolean;
}

export interface DeleteModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelToDelete: Model | null;
  setModelToDelete: (model: Model | null) => void;
  onConfirmDelete: () => void;
}

export interface DeleteAllModelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalModels: number;
  confirmText: string;
  setConfirmText: (text: string) => void;
  onConfirmDelete: () => void;
}

export interface DeleteAllPrecedentesModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPrecedentes: number;
  confirmText: string;
  setConfirmText: (text: string) => void;
  onConfirmDelete: () => void;
}

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportedText: string;
  exportedHtml: string;
  copySuccess: boolean;
  setCopySuccess: (success: boolean) => void;
  setError: (error: string) => void;
}

export interface JurisprudenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle?: string;
  topicRelatorio?: string;
  callAI?: (messages: AIMessage[], options?: AICallOptions) => Promise<string>;
  useLocalAI?: boolean;
  jurisSemanticThreshold?: number;
  jurisSemanticEnabled?: boolean;
}

/** Tipo para similarityWarning state - v1.35.95 */
export type SimilarityWarningContext = 'saveModel' | 'saveExtractedModel' | 'saveAsNew' | 'saveBulkModel';

export interface SimilarityWarningState {
  newModel: Model;
  similarModel: Model;
  similarity: number;
  context: SimilarityWarningContext;
  // Propriedades específicas para bulk operations
  bulkQueue?: Array<{ title: string; content: string; keywords?: string | string[]; category?: string; embedding?: number[] }>;
  bulkSaved?: Model[];
  bulkSkipped?: number;
  bulkReplacements?: Array<{ oldId: string; newModel: Model }>;
}

export interface SimilarityWarningModalProps {
  warning: SimilarityWarningState | null;
  saving: boolean;
  onCancel: () => void;
  onSaveNew: () => void;
  onReplace: () => void;
  sanitizeHTML?: (html: string) => string;
}

export interface ShareLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { email: string } | null;
  onRemoveSharedModels: (ownerEmail: string) => void;
}

/** Props para AnalysisModal - v1.35.95 */
export interface AnalysisModalProps {
  isOpen: boolean;
  analysisProgress: string;
  peticaoFiles?: UploadedFile[];
  pastedPeticaoTexts?: PastedText[];
  contestacaoFiles?: UploadedFile[];
  pastedContestacaoTexts?: PastedText[];
  complementaryFiles?: UploadedFile[];
  pastedComplementaryTexts?: PastedText[];
}

/** Props para DispositivoModal - v1.35.95 */
export interface DispositivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispositivoText?: string;
  setDispositivoText: (text: string) => void;
  copySuccess: boolean;
  setCopySuccess: (success: boolean) => void;
  setError: (error: string) => void;
  extractedTopics: Topic[];
  setExtractedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  selectedTopics: Topic[];
  setSelectedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  sanitizeHTML?: (html: string) => string;
}

/** Arquivo para processamento em lote (re-exportado de useModelLibrary) */
export interface BulkFile {
  file: File;
  name: string;
  size: number;
  status?: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

/** Modelo gerado no bulk processing (re-exportado de useModelLibrary) */
export interface BulkGeneratedModel {
  id?: string;
  title: string;
  content: string;
  keywords?: string | string[];
  category?: string;
  sourceFile?: string;
  similarityInfo?: {
    similarity: number;
    similarModel: { title: string };
  };
}

/** Erro no processamento bulk (re-exportado de useModelLibrary) */
export interface BulkError {
  file: string;
  error?: string;
  status?: string;
  duration?: string;
}

/** Props para BulkReviewModal - v1.35.95 */
export interface BulkReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulkReviewModels: BulkGeneratedModel[];
  bulkFiles: BulkFile[];
  bulkGeneratedModels: BulkGeneratedModel[];
  bulkErrors: BulkError[];
  onRemoveModel: (modelId: string) => void;
  onDiscard: () => void;
  onSave: () => void;
  sanitizeHTML?: (html: string) => string;
}

/** Props para BulkUploadModal - v1.35.95 */
export interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProcessing: boolean;
  isReviewOpen: boolean;
  bulkFiles: BulkFile[];
  bulkFileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onProcess: () => void;
  currentFileIndex: number;
  processedFiles: Array<{ file: string; status: string; modelsCount?: number; models?: Model[]; error?: string; duration?: string }>;
  bulkStaggerDelay: number;
  setBulkStaggerDelay: (delay: number) => void;
  bulkCancelController: AbortController | null;
  generatedModels: BulkGeneratedModel[];
  bulkCurrentBatch: number;
  bulkBatchSize?: number;
  openModal: (modalName: ModalKey) => void;
}

/** Props para SlashCommandMenu - v1.35.95 */
export interface SlashCommandMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  models: Model[];
  searchTerm: string;
  selectedIndex: number;
  onSelect: (model: Model) => void;
  onClose: () => void;
  onSearchChange: (term: string) => void;
  onNavigate: (direction: 'up' | 'down', length?: number) => void;
  semanticAvailable?: boolean;
  searchModelsBySimilarity?: ((models: Model[], query: string, options?: { threshold?: number; limit?: number }) => Promise<(Model & { similarity: number })[]>) | null;
}

/** Props para LinkedProofsModal - v1.35.95 */
export interface LinkedProofsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
  linkedProofs: Proof[];
  proofManager: {
    proofTopicLinks: Record<string, string[]>;
    setProofTopicLinks: (fn: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
    proofAnalysisResults: Record<string, ProofAnalysisResult[]>;
    proofConclusions: Record<string, string>;
  };
}

export interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export interface RestoreSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionLastSaved: string | number | null;
  onRestoreSession: () => void;
  onStartNew: () => void;
}

export interface ClearProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: () => void;
}

export interface AddProofTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  newProofData: { name: string; text: string } | null;
  setNewProofData: (data: { name: string; text: string } | ((prev: { name: string; text: string }) => { name: string; text: string })) => void;
  onAddProof: () => void;
}

export interface ProofAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  proofToAnalyze: Proof | null;
  customInstructions: string;
  setCustomInstructions: (value: string) => void;
  useOnlyMiniRelatorios: boolean;
  setUseOnlyMiniRelatorios: (value: boolean) => void;
  includeLinkedTopicsInFree: boolean;
  setIncludeLinkedTopicsInFree: (value: boolean) => void;
  proofTopicLinks: Record<string, string[]>;
  onAnalyzeContextual: () => void;
  onAnalyzeFree: () => void;
  editorTheme?: 'dark' | 'light' | string;
}

export interface DeleteProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  proofToDelete: Proof | null;
  onConfirmDelete: () => void;
}

export interface ConfirmBulkCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  filesInProgress: number;
  onConfirm: () => void;
}

export interface BulkDiscardConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalModels: number;
  onConfirm: () => void;
}

export interface TextPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
}

export interface ExtractModelConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTopic: Topic | null;
  editorRef: React.RefObject<QuillInstance | null>;
  onConfirmExtract: () => void;
}

export interface ExtractedModelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedModel: { title: string; content: string; keywords?: string; category?: string } | null;
  setExtractedModel: (model: { title: string; content: string; keywords?: string; category?: string } | null) => void;
  onSave: () => void;
  onCancel: () => void;
  sanitizeHTML?: (html: string) => string;
}

export interface LinkProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  proofToLink: Proof | null;
  extractedTopics: Topic[];
  proofTopicLinks: Record<string, string[]>;
  setProofTopicLinks: (fn: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT PROPS (movido de App.tsx v1.35.79)
// ═══════════════════════════════════════════════════════════════════════════

/** Props para FieldEditor - v1.35.93 */
export interface FieldEditorProps {
  label: string;
  content: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  onBlur?: ((html: string) => void) | null;
  onSlashCommand?: OnSlashCommandCallback | null;
  fieldType?: 'text' | 'relatorio' | 'fundamentacao' | 'dispositivo';
  quillReady?: boolean;
  quillError?: Error | string | null;
  minHeight?: string;
  editorTheme?: 'dark' | 'light' | string;
  hideVoiceButton?: boolean;
}

/** Ref exposta pelo FieldEditor - v1.35.93 */
export interface FieldEditorRef {
  format: (name: string, value: unknown) => void;
  getFormat: () => Record<string, unknown>;
  focus: () => void;
}

/** Props para GlobalEditorSection - v1.36.12 */
export interface GlobalEditorSectionProps {
  topic: Topic;
  topicIndex: number;
  onFieldChange: (index: number, field: string, value: string) => void;
  onFieldFocus?: (index: number, field: string, topic: Topic | null) => void | Promise<void>;
  onSlashCommand?: OnSlashCommandCallback | null;
  quillReady?: boolean;
  quillError?: Error | string | null;
  editorTheme?: 'dark' | 'light' | string;
  onOpenAIAssistant?: ((index: number) => void) | null;
  onOpenProofsModal?: ((index: number) => void) | null;
  onOpenJurisModal?: ((index: number) => void) | null;
  onOpenFactsComparison?: ((index: number) => void) | null;  // v1.36.12
  linkedProofsCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: ((index: number) => void) | null;
  versioning?: { saveVersion: (title: string, content: string) => void; getVersions: (title: string) => Promise<FieldVersion[]> } | null;
}

/** Props para QuillEditorBase - v1.35.94 */
export interface QuillEditorBaseProps {
  content?: string;
  onChange?: (html: string) => void;
  onReady?: (quill: QuillInstance) => void;
  onSelectionChange?: (range: { index: number; length: number } | null, oldRange?: { index: number; length: number } | null, source?: string) => void;
  onSlashCommand?: OnSlashCommandCallback;
  toolbarConfig?: unknown;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  theme?: string;
  modules?: Record<string, unknown>;
  quillReady?: boolean;
  quillError?: Error | string | null;
}

/** Props para QuillModelEditor - v1.35.94 */
export interface QuillModelEditorProps {
  content: string;
  onChange: (html: string) => void;
  onSaveWithoutClosing?: () => void;
  onOpenAIAssistant?: () => void;
  toolbarRef?: React.RefObject<HTMLDivElement | null>;
  quillReady?: boolean;
  quillError?: Error | string | null;
  editorTheme?: 'dark' | 'light' | string;
  toggleEditorTheme?: () => void;
}

/** Props para QuillDecisionEditor - v1.35.94 */
export interface QuillDecisionEditorProps {
  content?: string;
  onChange: (html: string) => void;
  onSaveWithoutClosing?: () => void;
  onOpenAIAssistant?: () => void;
  onOpenJurisModal?: () => void;
  onExtractModel?: () => void;
  onSaveAsModel?: () => void;
  extractingModel?: boolean;
  showExtractButton?: boolean;
  label?: string;
  placeholder?: string;
  topicTitle?: string;
  topicCategory?: string;
  quillReady?: boolean;
  quillError?: Error | string | null;
  onRegenerate?: () => void;
  customInstruction?: string;
  onInstructionChange?: (instruction: string) => void;
  regenerating?: boolean;
  showRegenerateSection?: boolean;
  editorTheme?: 'dark' | 'light' | string;
  toggleEditorTheme?: () => void;
  models?: Model[];
  onInsertModel?: (html: string) => void;
  onPreviewModel?: (model: Model) => void;
  sanitizeHTML?: (html: string) => string;
  topicRelatorio?: string;
  onFindSuggestions?: (topic: Topic) => Promise<{ suggestions: Model[]; source: string | null }>;
  onSlashCommand?: OnSlashCommandCallback;
  isDirty?: boolean;
  versioning?: { saveVersion: (title: string, content: string) => void; getVersions: (title: string) => Promise<FieldVersion[]> } | null;
  onBlur?: ((html: string) => void) | null;
  onOpenFactsComparison?: (() => void) | null; // v1.36.21: Confronto de Fatos
}

/** Props para QuillMiniRelatorioEditor - v1.35.94 */
export interface QuillMiniRelatorioEditorProps {
  content?: string;
  onChange: (html: string) => void;
  onRegenerate?: () => void;
  onSaveWithoutClosing?: () => void;
  customInstruction?: string;
  onInstructionChange?: (instruction: string) => void;
  regenerating?: boolean;
  topicTitle?: string;
  label?: string;
  showRegenerateSection?: boolean;
  quillReady?: boolean;
  quillError?: Error | string | null;
  editorTheme?: 'dark' | 'light' | string;
  toggleEditorTheme?: () => void;
  onSlashCommand?: OnSlashCommandCallback;
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR CALLBACKS INTERFACE (v1.40.05)
// Agrupa callbacks do editor para reduzir prop drilling
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interface para callbacks agrupados do editor
 * Reduz prop drilling de ~12 callbacks → 1 objeto
 */
export interface EditorCallbacks {
  /** Salva e fecha o editor */
  onSave: () => void;
  /** Cancela edição e fecha o editor */
  onCancel: () => void;
  /** Salva sem fechar o editor (auto-save) */
  onSaveWithoutClosing?: () => void;
  /** Mudança na fundamentação */
  onFundamentacaoChange: (html: string) => void;
  /** Mudança no relatório */
  onRelatorioChange: (html: string) => void;
  /** Mudança na categoria do tópico */
  onCategoryChange: (category: string) => void;
  /** Abre modal do assistente de IA */
  onOpenAIAssistant?: () => void;
  /** Abre modal de jurisprudência individual */
  onOpenJurisModal?: () => void;
  /** Extrai modelo do texto atual */
  onExtractModel?: () => void;
  /** Salva texto como modelo */
  onSaveAsModel?: () => void;
  /** Abre modal de confronto de fatos */
  onOpenFactsComparison?: () => void;
  /** Regenera o relatório */
  onRegenerateRelatorio?: () => void;
  /** Regenera o dispositivo */
  onRegenerateDispositivo?: () => void;
  /** Callback de seleção de texto */
  onTextSelection?: (text: string) => void;
  /** Callback de slash command */
  onSlashCommand?: OnSlashCommandCallback;
}

/** Props para DecisionEditorContainer - v1.40.05 (refatorado para usar stores) */
export interface DecisionEditorContainerProps {
  /** Ref do editor Quill principal */
  editorRef: React.RefObject<QuillInstance | null>;
  /** Ref do editor de relatório */
  relatorioRef: React.RefObject<QuillInstance | null>;
  /** Ref da toolbar (opcional) */
  toolbarRef?: React.RefObject<HTMLDivElement | null>;
  /** Tópico sendo editado */
  topic: Topic;
  /** Callbacks agrupados */
  callbacks: EditorCallbacks;
  /** Sanitizador de HTML */
  sanitizeHTML?: (html: string) => string;
  /** Função para buscar sugestões de modelos */
  findSuggestions?: (topic: Topic) => Promise<{ suggestions: Model[]; source: string | null }>;
  /** Config do editor para o tópico */
  getTopicEditorConfig: (title: string) => {
    showCategory?: boolean;
    showMiniRelatorio?: boolean;
    showDecisionEditor?: boolean;
    showRelatorio?: boolean;
    showFundamentacao?: boolean;
    relatorioConfig?: { label?: string; minHeight?: string; showRegenerateSection?: boolean };
    editorConfig?: { label?: string; placeholder?: string; showRegenerateSection?: boolean };
  };
  /** Versionamento de campos */
  versioning?: { saveVersion: (title: string, content: string) => void; getVersions: (title: string) => Promise<FieldVersion[]> } | null;
  /** Estado de salvamento (loading) */
  savingTopic?: boolean;
  /** Estado de extração de modelo (loading) */
  extractingModel?: boolean;
  /** Mostrar botão de extração */
  showExtractButton?: boolean;
}

/** Props legadas para DecisionEditorContainer (compatibilidade backwards) - v1.35.94 */
export interface DecisionEditorContainerPropsLegacy {
  editorRef: React.RefObject<QuillInstance | null>;
  relatorioRef: React.RefObject<QuillInstance | null>;
  toolbarRef?: React.RefObject<HTMLDivElement | null>;
  topic: Topic;
  onSave: () => void;
  onCancel: () => void;
  onSaveWithoutClosing?: () => void;
  onCategoryChange: (category: string) => void;
  onFundamentacaoChange: (html: string) => void;
  onRelatorioChange: (html: string) => void;
  onOpenAIAssistant?: () => void;
  onOpenJurisModal?: () => void;
  onExtractModel?: () => void;
  onSaveAsModel?: () => void;
  onRegenerateRelatorio?: () => void;
  savingTopic?: boolean;
  extractingModel?: boolean;
  showExtractButton?: boolean;
  regeneratingRelatorio?: boolean;
  relatorioInstruction?: string;
  onInstructionChange?: (instruction: string) => void;
  sanitizeHTML?: (html: string) => string;
  onTextSelection?: (text: string) => void;
  selectedTopics: Topic[];
  setSelectedTopics: (topics: Topic[]) => void;
  extractedTopics: Topic[];
  setExtractedTopics: (topics: Topic[]) => void;
  getTopicEditorConfig: (title: string) => {
    showCategory?: boolean;
    showMiniRelatorio?: boolean;
    showDecisionEditor?: boolean;
    showRelatorio?: boolean;
    showFundamentacao?: boolean;
    relatorioConfig?: { label?: string; minHeight?: string; showRegenerateSection?: boolean };
    editorConfig?: { label?: string; placeholder?: string; showRegenerateSection?: boolean };
  };
  quillReady?: boolean;
  quillError?: Error | string | null;
  onRegenerateDispositivo?: () => void;
  dispositivoInstruction?: string;
  onDispositivoInstructionChange?: (instruction: string) => void;
  regeneratingDispositivo?: boolean;
  editorTheme?: 'dark' | 'light' | string;
  toggleEditorTheme?: () => void;
  models?: Model[];
  onInsertModel?: (html: string) => void;
  onPreviewModel?: (model: Model) => void;
  findSuggestions?: (topic: Topic) => Promise<{ suggestions: Model[]; source: string | null }>;
  onSlashCommand?: OnSlashCommandCallback;
  isDirty?: boolean;
  versioning?: { saveVersion: (title: string, content: string) => void; getVersions: (title: string) => Promise<FieldVersion[]> } | null;
  onOpenFactsComparison?: (() => void) | null; // v1.36.21: Confronto de Fatos
}

/** Props para GlobalEditorModal - v1.35.95 */
export interface GlobalEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTopics: Topic[];
  setSelectedTopics: (topics: Topic[] | ((prev: Topic[]) => Topic[])) => void;
  setExtractedTopics: (fn: (prev: Topic[]) => Topic[]) => void;
  models: Model[];
  findSuggestions: (topic: Topic) => Promise<{ suggestions: Model[]; source: string | null }>;
  sanitizeHTML: (html: string) => string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  fontSize?: 'small' | 'normal' | 'large' | string;
  spacing?: 'compact' | 'normal' | 'wide' | string;
  setFontSize?: ((size: 'small' | 'normal' | 'large') => void) | null;
  setSpacing?: ((spacing: 'compact' | 'normal' | 'wide') => void) | null;
  editorTheme?: 'dark' | 'light' | string;
  quillReady?: boolean;
  quillError?: Error | string | null;
  modelPreview?: {
    previewingModel: Model | null;
    setPreviewingModel?: (model: Partial<Model> | null) => void;
    contextualInsertFn?: ((html: string) => void) | null;
    setContextualInsertFn: (fn: ((html: string) => void) | null) => void;
    onModelUpdatedRef: React.MutableRefObject<((model: Model) => void) | null>;
    openPreview: (model: Model) => void;
  } | null;
  analyzedDocuments?: AnalyzedDocuments;
  proofManager?: {
    proofFiles: ProofFile[];
    proofTexts: ProofText[];
    proofTopicLinks?: Record<string, string[]>;
    setProofTopicLinks: (fn: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
    proofAnalysisResults?: Record<string, ProofAnalysisResult[]>;
    proofConclusions?: Record<string, string>;
    extractedProofTexts?: Record<string, string>;
    proofProcessingModes?: Record<string, ProcessingMode>;
  } | null;
  aiIntegration?: {
    aiSettings: AISettings;
    callAI: (messages: AIMessage[], options?: AICallOptions) => Promise<string>;
    performDoubleCheck?: PerformDoubleCheckFunction;
  } | null;
  detectResultadoAutomatico?: ((topicTitle: string, fundamentacao: string, category: TopicCategory) => Promise<string | null>) | null;
  onSlashCommand?: OnSlashCommandCallback | null;
  fileToBase64?: ((file: File) => Promise<string>) | null;
  openModal?: ((modalName: ModalKey) => void) | null;
  closeModal?: ((name: ModalKey) => void) | null;
  useLocalAIForSuggestions?: boolean;
  useLocalAIForJuris?: boolean;
  jurisSemanticThreshold?: number;
  searchModelReady?: boolean;
  jurisEmbeddingsCount?: number;
  searchModelsBySimilarity?: ((models: Model[], query: string, options?: { threshold?: number; limit?: number }) => Promise<(Model & { similarity: number })[]>) | null;
  modelSemanticEnabled?: boolean;
}

export interface TopicCardProps {
  topic: Topic;
  selectedIdx: number;
  topicRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  lastEditedTopicTitle: string | null;
  isDragging: boolean;
  isOver: boolean;
  selectedTopics: Topic[];
  extractedTopics: Topic[];
  topicsToMerge: Topic[];
  toggleTopicSelection: (topic: Topic) => void;
  moveTopicUp: (idx: number) => void;
  moveTopicDown: (idx: number) => void;
  moveTopicToPosition: (idx: number, position: number) => void;
  setSelectedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setExtractedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  startEditing: (topic: Topic) => void;
  setTopicToRename: (topic: Topic | null) => void;
  setNewTopicName: (name: string) => void;
  openModal: (name: ModalKey) => void;
  setTopicToSplit: (topic: Topic | null) => void;
  setTopicsToMerge: (topics: Topic[]) => void;
}

export interface SortableTopicCardProps extends Omit<TopicCardProps, 'isDragging' | 'isOver'> {
  id: string;
}

export interface ModelCardProps {
  model: Model;
  viewMode: 'cards' | 'list';
  onEdit: (model: Model) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (model: Model) => void;
  onDelete: (model: Model) => void;
  onInsert?: (content: string) => void;
  sanitizeHTML: (html: string) => string;
  isShared?: boolean;
  ownerEmail?: string | null;
  sharedPermission?: 'view' | 'edit';
}

export interface ProofCardProps {
  proof: Proof;
  isPdf: boolean;
  proofManager: {
    setProofTopicLinks: (fn: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
    setProofConclusions: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
    setProofUsePdfMode: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
    setProofExtractionFailed: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
    setExtractedProofTexts: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
    setProofProcessingModes: (fn: (prev: Record<string, ProcessingMode>) => Record<string, ProcessingMode>) => void;
    setProofSendFullContent: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
    setProofToAnalyze: (proof: Proof | null) => void;
    setProofToDelete: (proof: Proof | null) => void;
    setProofToLink: (proof: Proof | null) => void;
    setPendingExtraction: (data: { proofId: string | number; proof: Proof; executeExtraction?: (nomes: string[]) => Promise<void> } | null) => void;
    isAnalyzingProof: (id: string) => boolean;
    proofTopicLinks: Record<string, string[]>;
    proofConclusions: Record<string, string>;
    proofUsePdfMode: Record<string, boolean>;
    proofExtractionFailed: Record<string, boolean>;
    extractedProofTexts: Record<string, string>;
    proofProcessingModes: Record<string, ProcessingMode>;
    proofAnalysisResults: Record<string, ProofAnalysisResult[]>;
    proofSendFullContent: Record<string, boolean>;
    removeProofAnalysis: (proofId: string, analysisId: string) => void;
    updateProofAnalysis: (proofId: string, analysisId: string, newResult: string) => void;
  };
  openModal: (name: ModalKey) => void;
  setError: (error: string) => void;
  extractTextFromPDFWithMode: (file: File, mode: string, progressCallback?: ((page: number, total: number) => void) | null) => Promise<string | null>;
  anonymizationEnabled?: boolean;
  grokEnabled?: boolean;  // v1.36.36: Bloquear PDF Puro quando Grok selecionado
  anonConfig?: AnonymizationSettings | null;
  nomesParaAnonimizar?: string[];
  editorTheme?: 'dark' | 'light' | string;
  setTextPreview?: (preview: TextPreviewState) => void;
}

export interface SuggestionCardProps {
  model: Model;
  index?: number;
  totalSuggestions?: number;
  onPreview: (model: Model) => void;
  onInsert: (content: string) => void;
  sanitizeHTML?: (html: string) => string;
  showRanking?: boolean;
  similarity?: number;
}

export interface ArtigoCardProps {
  artigo: Artigo;
  onCopy: (artigo: Artigo) => void;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  copiedId: string | null;
}

export interface JurisprudenciaCardProps {
  precedente: Precedente;
  onCopy: (precedente: Precedente) => void;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  copiedId?: string | null;  // v1.36.54: Feedback visual copiar
}

export interface ChatBubbleProps {
  msg: { role: string; content: string; ts?: number; error?: string };
  onUse: (content: string) => void;
  showUse: boolean;
  sanitizeHTML?: (html: string) => string;
}

// ═══════════════════════════════════════════════════════════════════════════
// UI/PANEL PROPS (movido de App.tsx v1.35.79)
// ═══════════════════════════════════════════════════════════════════════════

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  expandedIds?: Set<string>;
}

export interface ProcessingModeSelectorProps {
  value: ProcessingMode;
  onChange: (value: ProcessingMode) => void;
  disabled?: boolean;
  anonymizationEnabled?: boolean;
  grokEnabled?: boolean;  // v1.36.36: Bloquear PDF Puro quando Grok selecionado
  className?: string;
}

export interface InsertDropdownProps {
  onInsert: (mode: 'replace' | 'prepend' | 'append') => void;
  disabled: boolean;
}

export interface SpacingDropdownProps {
  value: string;
  onChange: (value: 'compact' | 'normal' | 'wide') => void;
  ariaLabel?: string;
}

export interface FontSizeDropdownProps {
  value: string;
  onChange: (value: 'small' | 'normal' | 'large') => void;
  ariaLabel?: string;
}

export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder: string;
}

export interface ChatHistoryAreaProps {
  history: Array<{ role: string; content: string; ts?: number }>;
  generating: boolean;
  onUseMessage: (content: string) => void;
  showUseButtons: boolean;
  sanitizeHTML: (html: string) => string;
}

export interface LockedTabOverlayProps {
  isPrimaryTab: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

/** Props da aba Legislação (v1.38.40 - FASE 3: modals migrados para useUIStore) */
export interface LegislacaoTabProps {
  isReadOnly?: boolean;
  semanticSearchEnabled?: boolean;
  searchModelReady?: boolean;
  embeddingsCount?: number;
  semanticThreshold?: number;
}

/** Props da aba Jurisprudência (v1.38.40 - FASE 3: modals migrados para useUIStore) */
export interface JurisprudenciaTabProps {
  isReadOnly?: boolean;
  jurisSemanticEnabled?: boolean;
  searchModelReady?: boolean;
  jurisEmbeddingsCount?: number;
  jurisSemanticThreshold?: number;
}

export interface FullscreenModelPanelProps {
  models: Model[];
  topicTitle?: string;
  topicCategory?: string;
  topicRelatorio?: string;
  onInsert: (content: string) => void;
  onPreview: (model: Model) => void;
  sanitizeHTML?: (html: string) => string;
  onFindSuggestions?: (topic: Topic) => Promise<{ suggestions: Model[]; source: string | null }>;
}

export interface ModelSearchPanelProps {
  models: Model[];
  onInsert: (content: string) => void;
  onPreview: (model: Model) => void;
  sanitizeHTML: (html: string) => string;
}

export interface AcceptSharePageProps {
  token: string;
  onAccepted?: () => void;
  onLogin?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI ASSISTANT PROPS (movido de App.tsx v1.35.79)
// ═══════════════════════════════════════════════════════════════════════════

export interface AIAssistantBaseLegacyProps {
  isOpen: boolean;
  onClose: () => void;
  aiInstruction?: string;
  setAiInstruction: (instruction: string) => void;
  generatingAi?: boolean;
  aiGeneratedText?: string;
  onGenerateText: () => void;
  onInsertText: ((text: string) => void) | ((mode: InsertMode) => void);
  title?: string;
  subtitle?: React.ReactNode;
  zIndex?: number;
  placeholder?: string;
  extraContent?: React.ReactNode;
  customExamples?: React.ReactNode;
  showInsertButtons?: boolean;
  showCopyButton?: boolean;
  sanitizeHTML?: (html: string) => string;
}

export interface AIAssistantBaseProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  onInsertResponse: (mode: InsertMode) => void;
  generating: boolean;
  onClear: () => void;
  lastResponse: string | null;
  title?: string;
  subtitle?: React.ReactNode;
  zIndex?: number;
  placeholder?: string;
  extraContent?: React.ReactNode;
  showInsertButtons?: boolean;
  sanitizeHTML?: (html: string) => string;
  quickPrompts?: QuickPrompt[];
  topicTitle?: string;
  onQuickPromptClick?: ((qp: QuickPrompt, resolvedPrompt: string) => void) | null;
  /** v1.40.XX: Handler para quickprompts com sub-opções */
  onSubOptionSelect?: ((qp: QuickPrompt, subOption: QuickPromptSubOption) => void) | null;
  qpError?: { id: string; message: string } | null;
}

export interface ProofManagerForAI {
  proofTopicLinks?: Record<string, string[]>;
  proofFiles: ProofFile[];
  proofTexts: ProofText[];
}

/** v1.38.12: Tipo para escopo de contexto do Assistente IA */
export type ContextScope = 'current' | 'selected' | 'all';

export interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextScope: ContextScope;  // v1.38.12: Tipo específico
  setContextScope: (scope: ContextScope) => void;
  topicTitle?: string;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string, options?: { proofFilter?: string; includeMainDocs?: boolean; includeComplementaryDocs?: boolean; selectedContextTopics?: string[] }) => void;
  onInsertResponse: (mode: InsertMode) => void;
  generating: boolean;
  onClear: () => void;
  lastResponse: string | null;
  sanitizeHTML?: (html: string) => string;
  quickPrompts?: QuickPrompt[];
  proofManager?: ProofManagerForAI | null;
  // v1.38.12: Novas props para controle granular de contexto
  allTopics?: Topic[];
  selectedContextTopics?: string[];
  setSelectedContextTopics?: (topics: string[]) => void;
  includeMainDocs?: boolean;
  setIncludeMainDocs?: (include: boolean) => void;
  // v1.39.06: Toggle "Incluir documentos complementares" no chat
  includeComplementaryDocs?: boolean;
  setIncludeComplementaryDocs?: (include: boolean) => void;
}

export interface AIAssistantGlobalModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextScope: ContextScope;  // v1.38.12: Tipo específico
  setContextScope: (scope: ContextScope) => void;
  topicTitle?: string;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string, options?: { proofFilter?: string; includeMainDocs?: boolean; includeComplementaryDocs?: boolean; selectedContextTopics?: string[] }) => void;
  onInsertResponse: (mode: InsertMode) => void;
  generating: boolean;
  onClear: () => void;
  lastResponse: string | null;
  sanitizeHTML?: (html: string) => string;
  quickPrompts?: QuickPrompt[];
  proofManager?: ProofManagerForAI | null;
  // v1.38.12: Novas props para controle granular de contexto
  allTopics?: Topic[];
  selectedContextTopics?: string[];
  setSelectedContextTopics?: (topics: string[]) => void;
  includeMainDocs?: boolean;
  setIncludeMainDocs?: (include: boolean) => void;
  // v1.39.06: Toggle "Incluir documentos complementares" no chat
  includeComplementaryDocs?: boolean;
  setIncludeComplementaryDocs?: (include: boolean) => void;
}

export interface AIAssistantModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiInstructionModel?: string;
  setAiInstructionModel: (instruction: string) => void;
  generatingAiModel?: boolean;
  aiGeneratedTextModel?: string;
  setAiGeneratedTextModel?: (text: string) => void;
  onGenerateText: () => void;
  onInsertText: (mode: InsertMode) => void;
  sanitizeHTML?: (html: string) => string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION/PROJECT TYPES (movido de App.tsx v1.35.79)
// ═══════════════════════════════════════════════════════════════════════════

export interface AnalyzedDocuments {
  peticoes: string[];
  peticoesText: PastedText[];
  contestacoes: string[];
  contestacoesText: PastedText[];
  complementares: string[];
  complementaresText: PastedText[];
  peticao?: string;
  peticaoType?: string;
}

export interface ExtractedTexts {
  peticoes: Array<{ text: string; name?: string }>;
  contestacoes: Array<{ text: string; name?: string }>;
  complementares: Array<{ text: string; name?: string }>;
}

export interface DocumentProcessingModes {
  peticoes: ProcessingMode[];
  contestacoes: ProcessingMode[];
  complementares: ProcessingMode[];
}

export interface UploadedFile {
  file: File;
  id: string;
  // Fallback properties for backwards compatibility
  name?: string;
  size?: number;
}

export interface SessionState {
  processoNumero: string;
  pastedPeticaoTexts: PastedText[];
  pastedContestacaoTexts: PastedText[];
  pastedComplementaryTexts: PastedText[];
  extractedTopics: Topic[];
  selectedTopics: Topic[];
  partesProcesso: PartesProcesso;
  activeTab: string;
  analyzedDocuments: AnalyzedDocuments;
  proofFiles: Proof[];
  proofTexts: ProofText[];
  proofUsePdfMode: Record<string, boolean>;
  extractedProofTexts: Record<string, string>;
  proofExtractionFailed: Record<string, boolean>;
  proofTopicLinks: Record<string, string[]>;
  proofAnalysisResults: Record<string, ProofAnalysisResult[]>;
  proofConclusions: Record<string, string>;
  proofSendFullContent?: Record<string, boolean>;
  extractedTexts: ExtractedTexts;
  documentProcessingModes: DocumentProcessingModes;
  peticaoFiles: UploadedFile[];
  contestacaoFiles: UploadedFile[];
  complementaryFiles: UploadedFile[];
  tokenMetrics?: TokenMetrics;
  hasUploadFiles?: boolean;
}

export interface ProjectState extends SessionState {
  aiSettings: AISettings;
}

export interface UploadPdfData {
  name: string;
  id: string;
  fileData: string;
}

export interface UploadPdfs {
  peticoes?: UploadPdfData[];
  peticao?: UploadPdfData;
  contestacoes?: UploadPdfData[];
  complementares?: UploadPdfData[];
}

export interface ImportedProject {
  version?: string;
  processoNumero?: string;
  pastedPeticaoTexts?: PastedText[];
  pastedPeticaoText?: string; // formato antigo
  pastedContestacaoTexts?: PastedText[];
  pastedComplementaryTexts?: PastedText[];
  extractedTopics?: Topic[];
  selectedTopics?: Topic[];
  partesProcesso?: PartesProcesso;
  analyzedDocuments?: AnalyzedDocuments;
  extractedTexts?: ExtractedTexts;
  documentProcessingModes?: DocumentProcessingModes;
  uploadPdfs?: UploadPdfs;
  proofFiles?: Proof[];
  proofTexts?: Record<string, string>;
  proofUsePdfMode?: Record<string, boolean>;
  extractedProofTexts?: Record<string, string>;
  proofExtractionFailed?: Record<string, boolean>;
  proofTopicLinks?: Record<string, string[]>;
  proofAnalysisResults?: Record<string, string>;
  proofConclusions?: Record<string, string>;
  proofSendFullContent?: Record<string, boolean>;
  aiSettings?: AISettings;
  tokenMetrics?: TokenMetrics;
  factsComparison?: Record<string, FactsComparisonResult>;
  sentenceReviewCache?: Record<string, string>; // v1.36.57
  chatHistory?: Record<string, ChatMessage[]>; // v1.37.92
}

export interface ImportCallbacks {
  setPastedPeticaoTexts: (texts: PastedText[]) => void;
  setPastedContestacaoTexts: (texts: PastedText[]) => void;
  setPastedComplementaryTexts: (texts: PastedText[]) => void;
  setExtractedTopics: (topics: Topic[]) => void;
  setSelectedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setPartesProcesso: (partes: PartesProcesso) => void;
  setAnalyzedDocuments: (docs: AnalyzedDocuments) => void;
  setProofFiles: React.Dispatch<React.SetStateAction<ProofFile[]>>;
  setProofTexts: (texts: ProofText[]) => void;
  setProofUsePdfMode: (modes: Record<string, boolean>) => void;
  setExtractedProofTexts: (texts: Record<string, string>) => void;
  setProofExtractionFailed: (failed: Record<string, boolean>) => void;
  setProofTopicLinks: (links: Record<string, string[]>) => void;
  setProofAnalysisResults: (results: Record<string, ProofAnalysisResult[]> | ((prev: Record<string, ProofAnalysisResult[]>) => Record<string, ProofAnalysisResult[]>)) => void;
  setProofConclusions: (conclusions: Record<string, string>) => void;
  setProofSendFullContent: (content: Record<string, boolean>) => void;
  setAiSettings: (settings: AISettings) => void;
  setActiveTab: (tab: string) => void;
  setError: (error: string | { type: string; message: string } | null) => void; // v1.37.49: Simplificado para compatibilidade com Zustand
  setProcessoNumero: (numero: string) => void;
  setPeticaoFiles?: (files: UploadedFile[]) => void;
  setContestacaoFiles?: (files: UploadedFile[]) => void;
  setComplementaryFiles?: (files: UploadedFile[]) => void;
  setExtractedTexts?: (texts: ExtractedTexts) => void;
  setDocumentProcessingModes?: (modes: DocumentProcessingModes) => void;
  setTokenMetrics?: (metrics: TokenMetrics) => void;
}

export interface RestoreSessionCallbacks extends Omit<ImportCallbacks, 'setAiSettings' | 'setSelectedTopics' | 'setProofFiles'> {
  closeModal: (modalName: ModalKey) => void;
  setSelectedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setProofFiles: React.Dispatch<React.SetStateAction<ProofFile[]>>;
}

export interface ImportProjectCallbacks {
  setError: (error: string | { type: string; message: string } | null) => void; // v1.37.49: Simplificado para compatibilidade com Zustand
}

export interface ClearProjectCallbacks extends Omit<ImportCallbacks, 'setAiSettings' | 'setSelectedTopics' | 'setProofFiles'> {
  closeModal: (modalName: ModalKey) => void;
  setSelectedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setProofFiles: React.Dispatch<React.SetStateAction<ProofFile[]>>;
  setProofToDelete: (proof: Proof | null) => void;
  setProofToLink: (proof: Proof | null) => void;
  setProofToAnalyze: (proof: Proof | null) => void;
  clearAnalyzingProofs: () => void;
  setShowProofPanel: (show: boolean) => void;
  setNewProofTextData: (data: NewProofTextData) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// BASE COMPONENT PROPS (movido de App.tsx v1.35.91)
// ═══════════════════════════════════════════════════════════════════════════

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactElement;
  iconColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  preventClose?: boolean;
}

export interface AnonymizationNamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nomes: string[]) => void;
  nomesTexto: string;
  setNomesTexto: (text: string) => void;
  nerEnabled: boolean;
  onDetectNames: () => void;
  detectingNames: boolean;
  onOpenAiSettings: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG MODAL PROPS (v1.37.30: Extraído de App.tsx)
// ═══════════════════════════════════════════════════════════════════════════

export type APITestStatus = 'testing' | 'ok' | 'error' | null;

/**
 * v1.40.06: ConfigModalProps simplificado
 * Anteriormente tinha 52 props. Agora ConfigModal importa hooks/stores diretamente.
 */
export interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELS TAB PROPS (v1.37.31)
// ═══════════════════════════════════════════════════════════════════════════

/** Category counts computed from models */
export interface CategoryCounts {
  counts: Record<string, number>;
  withoutCategory: number;
  favorites: number;
}

/** Props da aba Modelos (v1.38.40 - FASE 3: modals migrados para useUIStore) */
export interface ModelsTabProps {
  // Model Library
  modelLibrary: {
    models: Model[];
    searchTerm: string;
    selectedCategory: string;
    showFavoritesOnly: boolean;
    ownershipFilter: 'all' | 'mine' | 'shared';
    modelViewMode: 'cards' | 'list';
    currentModelPage: number;
    modelsPerPage: number;
    newModel: NewModelData;
    editingModel: Model | null;
    hasUnsavedChanges: boolean;
    setSearchTerm: (term: string) => void;
    setSelectedCategory: (category: string) => void;
    setShowFavoritesOnly: (show: boolean) => void;
    setOwnershipFilter: (filter: 'all' | 'mine' | 'shared') => void;
    setModelViewMode: (mode: 'cards' | 'list') => void;
    setCurrentModelPage: (page: number | ((prev: number) => number)) => void;
    setNewModel: React.Dispatch<React.SetStateAction<NewModelData>>;
    setEditingModel: (model: Model | null) => void;
  };

  // Cloud Sync (optional)
  cloudSync: {
    isAuthenticated: boolean;
    syncStatus: string;
    pendingCount: number;
    lastSyncAt: string | null;
    user: { email: string; profilePicture?: string } | null;
    pushAllModels: (models: Model[]) => Promise<{ success: boolean }>;
    sync: () => void;
  };

  // AI Integration (may be undefined when not active)
  aiIntegration: {
    generatingKeywords: boolean | undefined;
    generatingTitle: boolean | undefined;
  };

  // Semantic Search (may be undefined from aiSettings)
  useModelSemanticSearch: boolean | undefined;
  setUseModelSemanticSearch: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  modelSemanticResults: Model[] | null;
  setModelSemanticResults: React.Dispatch<React.SetStateAction<Model[] | null>>;
  searchingModelSemantics: boolean | undefined;
  modelSemanticAvailable: boolean | undefined;

  // Computed values
  filteredModels: Model[];
  currentModels: Model[];
  totalModelPages: number;
  indexOfFirstModel: number;
  indexOfLastModel: number;
  categories: string[];
  categoryCounts: CategoryCounts;

  // Model Operations
  exportModels: () => void;
  importModels: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveModel: () => Promise<void>;
  saveModelWithoutClosing: () => Promise<void>;
  generateKeywordsWithAI: () => Promise<void>;
  generateTitleWithAI: () => Promise<void>;
  startEditingModel: (model: Model) => void;
  toggleFavorite: (modelId: string) => void;
  duplicateModel: (model: Model) => Promise<void>;
  confirmDeleteModel: (model: Model) => void;

  // Utilities
  sanitizeHTML: (html: string | null | undefined) => string;

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  modelFormRef: React.RefObject<HTMLDivElement | null>;
  modelEditorRef: React.RefObject<QuillInstance | null>;

  // Editor state
  quillReady: boolean;
  quillError: Error | null;
  editorTheme: string;
  toggleEditorTheme: () => void;
  modelSaved: boolean;
  savingModel: boolean;
}

/** Props da aba Upload (v1.38.40 - FASE 3: estado migrado para useDocumentsStore) */
export interface UploadTabProps {
  // Processing mode default (from AI settings)
  getDefaultProcessingMode: () => ProcessingMode;

  // Processo número (App-level state)
  processoNumero: string;
  setProcessoNumero: (num: string) => void;

  // Upload handlers (I/O - IndexedDB)
  handleUploadPeticao: (files: File[]) => void;
  handleUploadContestacao: (files: File[]) => void;
  handleUploadComplementary: (files: File[]) => void;

  // Remove handler (I/O - IndexedDB)
  removePeticaoFile: (index: number) => void;

  // Document analysis
  handleAnalyzeDocuments: () => void;

  // AI settings (for ProcessingModeSelector provider detection)
  aiIntegration: {
    aiSettings: {
      provider?: string;
      anonymization?: { enabled?: boolean };
    };
  };

  // Document services (for auto-detecting processo número)
  documentServices: {
    autoDetectProcessoNumero: (docs: { peticao?: File; contestacoes?: File[]; complementares?: File[] }) => Promise<string | null>;
  };
}

// v1.37.54: ProofsTab props - usa mesmos tipos que ProofCardProps para proofManager
/** Props da aba Provas (v1.38.40 - FASE 3: estado migrado para stores) */
export interface ProofsTabProps {
  // Proof manager hook - tipo completo para ProofCard
  proofManager: ProofCardProps['proofManager'] & {
    proofFiles: Proof[];
    proofTexts: Proof[];
    handleUploadProofPdf: (files: File[]) => void;
    setNewProofTextData: (data: { name: string; text: string }) => void;
  };

  // Document services (I/O - PDF extraction)
  documentServices: {
    extractTextFromPDFWithMode: (file: File, mode: string, progressCallback?: ((page: number, total: number) => void) | null) => Promise<string | null>;
  };
}

/** Props da aba Tópicos (v1.38.40 - FASE 3: estado migrado para stores) */
export interface TopicsTabProps {
  // UI state (React refs - não vão para stores)
  topicRefs: React.RefObject<Record<string, HTMLDivElement | null>>;

  // DND (drag and drop)
  dndSensors: ReturnType<typeof import('@dnd-kit/core').useSensors>;
  customCollisionDetection: import('@dnd-kit/core').CollisionDetection;
  handleDndDragEnd: (event: import('@dnd-kit/core').DragEndEvent) => void;

  // AI/Generation state (App.tsx-level, not in stores)
  regenerating?: boolean;
  generatingDispositivo?: boolean;
  generatingReview: boolean;
  canGenerateDispositivo: { enabled: boolean; reason: string };

  // Topic actions (complex handlers in App.tsx)
  toggleTopicSelection: (topic: Topic) => void;
  moveTopicUp: (idx: number) => void;
  moveTopicDown: (idx: number) => void;
  moveTopicToPosition: (currentIndex: number, newPosition: number) => void;
  startEditing: (topic: Topic) => void;
  deleteTopic: (topic: Topic) => void;

  // Navigation/Generation
  generateDispositivo: () => void;
  exportDecision: () => void;

  // Helpers
  isTopicDecidido: (topic: Topic) => boolean;
  isSpecialTopic: (topic: Topic) => boolean;
  CSS: Record<string, string>;

  // Cache indicator
  hasReviewCache: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL TYPE AUGMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Quill editor constructor */
export interface QuillConstructor {
  new (container: HTMLElement | string, options?: Record<string, unknown>): QuillInstance;
  import: (path: string) => unknown;
  register: (path: string, module: unknown) => void;
  find: (element: Element) => QuillInstance | null;
}

/** PDF.js page interface */
export interface PdfPage {
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => { promise: Promise<void> };
  getViewport: (options: { scale: number }) => PdfViewport;
}

export interface PdfViewport {
  width: number;
  height: number;
}

/** PDF.js document interface */
export interface PdfDocument {
  numPages: number;
  getPage: (num: number) => Promise<PdfPage>;
  destroy: () => void;
}

/** PDF.js library interface */
export interface PdfjsLib {
  getDocument: (src: { data: ArrayBuffer } | string) => { promise: Promise<PdfDocument> };
  GlobalWorkerOptions: { workerSrc: string };
}

/** Mammoth library interface */
export interface MammothLib {
  extractRawText: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string; messages?: unknown[] }>;
}

/** Tesseract library interface */
export interface TesseractLib {
  createWorker: (lang?: string, loggerCallback?: (info: { status: string; progress: number }) => void) => Promise<TesseractWorker>;
  createScheduler: () => TesseractScheduler;
}

export interface TesseractWorker {
  terminate: () => Promise<void>;
  setParameters: (params: Record<string, unknown>) => Promise<void>;
  recognize: (image: unknown) => Promise<{ data: { text: string } }>;
}

export interface TesseractScheduler {
  addWorker: (worker: TesseractWorker) => void;
  addJob: (type: string, data: unknown) => Promise<{ data: { text: string } }>;
  terminate: () => void;
}

/** DOMPurify library interface */
export interface DOMPurifyInstance {
  sanitize: (html: string, options?: Record<string, unknown>) => string;
  version: string;
  isSupported: boolean;
}

declare global {
  interface Window {
    Quill: QuillConstructor;
    pdfjsLib: PdfjsLib;
    mammoth: MammothLib;
    DOMPurify?: DOMPurifyInstance;
    Tesseract: TesseractLib;
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: Record<string, unknown>) => { requestAccessToken: (options?: Record<string, unknown>) => void };
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: Record<string, unknown>) => Promise<void>;
        setToken: (token: { access_token: string } | null) => void;
        drive: {
          files: {
            list: (params: Record<string, unknown>) => Promise<{ result: { files: DriveFile[] } }>;
            get: (params: Record<string, unknown>) => Promise<{ body: string }>;
            create: (params: Record<string, unknown>, body?: unknown) => Promise<{ result: { id: string } }>;
            update: (params: Record<string, unknown>, body?: unknown) => Promise<{ result: { id: string } }>;
            delete: (params: Record<string, unknown>) => Promise<void>;
          };
          permissions: {
            list: (params: Record<string, unknown>) => Promise<{ result: { permissions: DrivePermission[] } }>;
            create: (params: Record<string, unknown>) => Promise<{ result: DrivePermission }>;
            delete: (params: Record<string, unknown>) => Promise<void>;
          };
          about: {
            get: (params: Record<string, unknown>) => Promise<{ result: { user: { emailAddress: string; displayName?: string; photoLink?: string } } }>;
          };
        };
      };
    };
  }

  interface ImportMeta {
    env: {
      PROD: boolean;
      DEV: boolean;
      MODE: string;
      BASE_URL: string;
      VITE_GOOGLE_CLIENT_ID?: string;
      VITE_API_KEY?: string;
    };
  }
}
