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
  cpf: boolean;
  rg: boolean;
  pis: boolean;
  ctps: boolean;
  telefone: boolean;
  email: boolean;
  contaBancaria: boolean;
  valores: boolean;
  nomes: boolean;
  nomesUsuario: string[];
}

export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
}

export interface AISettings {
  provider: AIProvider;
  claudeModel: string;
  geminiModel: string;
  apiKeys: { claude: string; gemini: string };
  useExtendedThinking: boolean;
  thinkingBudget: string;
  geminiThinkingLevel: GeminiThinkingLevel;
  customPrompt: string;
  modeloRelatorio: string;
  modeloDispositivo: string;
  modeloTopicoRelatorio: string;
  estiloRedacao?: string;
  ocrEngine: OCREngine;
  parallelRequests: number;
  anonymization: AnonymizationSettings;
  semanticSearchEnabled: boolean;
  semanticThreshold: number;
  jurisSemanticEnabled: boolean;
  quickPrompts: QuickPrompt[];
  logThinking: boolean;
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
  | 'rename'
  | 'merge'
  | 'split'
  | 'newTopic'
  | 'deleteTopic'
  | 'aiAssistant'
  | 'analysis'
  | 'settings'
  | 'dispositivo'
  | 'restoreSession'
  | 'clearProject'
  | 'bulkModel'
  | 'globalEditor'
  | 'jurisIndividual'
  | 'sentenceReview'
  | 'shareLibrary'
  | 'changelog'
  | 'topicCuration'
  | 'modelGenerator';

export type ModalState = Record<ModalKey, boolean>;

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN METRICS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TokenMetrics {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalCost: number;
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
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Partial with required id */
export type PartialWithId<T extends { id: string }> = Partial<T> & Pick<T, 'id'>;

/** Make specific keys required */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Callback type for generic functions */
export type VoidCallback = () => void;
export type AsyncVoidCallback = () => Promise<void>;
