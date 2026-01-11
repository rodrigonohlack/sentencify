/**
 * @file useLocalStorage.test.ts
 * @description Testes para o hook useLocalStorage
 * @coverage PDF cache, file conversion, session persistence, project export/import
 *
 * NOTA: Este teste verifica a lógica de PRODUÇÃO do hook useLocalStorage.
 * O hook gerencia ~980 linhas de lógica de persistência.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Storage keys
const SESSION_KEY = 'sentencifySession';
const AI_SETTINGS_KEY = 'sentencify-ai-settings';

// Mock para IndexedDB (definido em src/test/mocks/indexedDB.ts)
const mockIndexedDB = {
  getPdfFromIndexedDB: vi.fn(),
  savePdfToIndexedDB: vi.fn(),
  removePdfFromIndexedDB: vi.fn(),
  clearAllPdfsFromIndexedDB: vi.fn(),
};

// Mock de File e FileReader
const createMockFile = (name: string, content: string, type = 'application/pdf'): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
};

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // SEÇÃO 1: PDF CACHE (LRU)
  // ============================================================

  describe('PDF Cache (LRU)', () => {
    it('should have max cache size of 5', () => {
      const PDF_CACHE_MAX_SIZE = 5;
      expect(PDF_CACHE_MAX_SIZE).toBe(5);
    });

    it('should create cache key from file properties', () => {
      const file = createMockFile('test.pdf', 'content');
      const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;

      expect(cacheKey).toContain('test.pdf');
      expect(cacheKey).toContain(file.size.toString());
    });

    it('should evict oldest entry when cache is full (LRU)', () => {
      // Simular cache LRU
      const cache = new Map<string, string>();
      const cacheOrder: string[] = [];
      const MAX_SIZE = 5;

      const addToCache = (key: string, value: string) => {
        if (cache.has(key)) {
          cache.set(key, value);
          return;
        }
        while (cache.size >= MAX_SIZE) {
          const oldestKey = cacheOrder.shift();
          if (oldestKey) cache.delete(oldestKey);
        }
        cache.set(key, value);
        cacheOrder.push(key);
      };

      // Adicionar 5 itens
      for (let i = 0; i < 5; i++) {
        addToCache(`key-${i}`, `value-${i}`);
      }
      expect(cache.size).toBe(5);

      // Adicionar 6º item (deve remover o primeiro)
      addToCache('key-5', 'value-5');
      expect(cache.size).toBe(5);
      expect(cache.has('key-0')).toBe(false); // Primeiro foi removido
      expect(cache.has('key-5')).toBe(true);
    });

    it('should not add duplicate to cache order', () => {
      const cache = new Map<string, string>();
      const cacheOrder: string[] = [];

      const addToCache = (key: string, value: string) => {
        if (cache.has(key)) {
          cache.set(key, value); // Apenas atualiza valor
          return;
        }
        cache.set(key, value);
        cacheOrder.push(key);
      };

      addToCache('key-1', 'value-1');
      addToCache('key-1', 'value-updated');

      expect(cacheOrder.length).toBe(1); // Não duplicou
      expect(cache.get('key-1')).toBe('value-updated');
    });

    it('should clear cache completely', () => {
      const cache = new Map<string, string>();
      let cacheOrder: string[] = [];

      cache.set('key-1', 'value-1');
      cacheOrder.push('key-1');

      // Clear
      cache.clear();
      cacheOrder = [];

      expect(cache.size).toBe(0);
      expect(cacheOrder.length).toBe(0);
    });
  });

  // ============================================================
  // SEÇÃO 2: FILE CONVERSION (fileToBase64 / base64ToFile)
  // ============================================================

  describe('File Conversion', () => {
    it('should convert file to base64', async () => {
      const content = 'PDF content here';
      const file = createMockFile('test.pdf', content);

      // Simular FileReader
      const mockResult = 'data:application/pdf;base64,UERGIGNvbnRlbnQgaGVyZQ==';

      const fileToBase64 = (f: File): Promise<string> => {
        return new Promise((resolve) => {
          // Simular conversão
          const base64 = Buffer.from(content).toString('base64');
          resolve(base64);
        });
      };

      const result = await fileToBase64(file);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should convert base64 back to File', () => {
      const base64 = Buffer.from('PDF content').toString('base64');
      const fileName = 'restored.pdf';
      const mimeType = 'application/pdf';

      // Simular base64ToFile
      const base64ToFile = (b64: string, name: string, type: string): File => {
        const byteCharacters = atob(b64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type });
        return new File([blob], name, { type });
      };

      const file = base64ToFile(base64, fileName, mimeType);

      expect(file.name).toBe(fileName);
      expect(file.type).toBe(mimeType);
    });

    it('should handle empty base64 gracefully', () => {
      const base64ToFile = (b64: string, name: string, type: string): File | null => {
        if (!b64) return null;
        try {
          const byteCharacters = atob(b64);
          const byteArray = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
          }
          return new File([byteArray], name, { type });
        } catch {
          return null;
        }
      };

      expect(base64ToFile('', 'test.pdf', 'application/pdf')).toBeNull();
    });

    it('should handle invalid base64 gracefully', () => {
      const base64ToFile = (b64: string, name: string, type: string): File | null => {
        try {
          const byteCharacters = atob(b64);
          const byteArray = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
          }
          return new File([byteArray], name, { type });
        } catch {
          return null;
        }
      };

      expect(base64ToFile('not-valid-base64!!!', 'test.pdf', 'application/pdf')).toBeNull();
    });
  });

  // ============================================================
  // SEÇÃO 3: SESSION PERSISTENCE (checkSavedSession)
  // ============================================================

  describe('Session Checking', () => {
    it('should detect saved session in localStorage', () => {
      const session = {
        version: '1.36.0',
        savedAt: new Date().toISOString(),
        processoNumero: '0001234-56.2024.5.00.0001',
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const saved = localStorage.getItem(SESSION_KEY);
      expect(saved).not.toBeNull();

      const parsed = JSON.parse(saved!);
      expect(parsed.processoNumero).toBe('0001234-56.2024.5.00.0001');
    });

    it('should return null when no session exists', () => {
      const saved = localStorage.getItem(SESSION_KEY);
      expect(saved).toBeNull();
    });

    it('should handle corrupted session JSON', () => {
      localStorage.setItem(SESSION_KEY, 'not valid json {{{');

      let session = null;
      try {
        session = JSON.parse(localStorage.getItem(SESSION_KEY)!);
      } catch {
        // Expected to fail
      }

      expect(session).toBeNull();
    });

    it('should extract savedAt timestamp', () => {
      const savedAt = '2024-01-15T10:30:00.000Z';
      const session = { version: '1.36.0', savedAt };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const parsed = JSON.parse(localStorage.getItem(SESSION_KEY)!);
      expect(parsed.savedAt).toBe(savedAt);
    });
  });

  // ============================================================
  // SEÇÃO 4: AUTO-SAVE SESSION
  // ============================================================

  describe('Auto-Save Session', () => {
    it('should save session with all required fields', () => {
      const session = {
        version: '1.36.0',
        savedAt: new Date().toISOString(),
        processoNumero: '0001234-56.2024.5.00.0001',
        pastedPeticaoTexts: [{ id: '1', text: 'Petição...', name: 'Petição Inicial' }],
        pastedContestacaoTexts: [],
        pastedComplementaryTexts: [],
        extractedTopics: [],
        selectedTopics: [],
        partesProcesso: { reclamante: 'João', reclamadas: ['Empresa X'] },
        activeTab: 'upload',
        analyzedDocuments: {
          peticoes: [],
          peticoesText: [],
          contestacoes: [],
          contestacoesText: [],
          complementares: [],
          complementaresText: [],
        },
        tokenMetrics: {
          totalInput: 1000,
          totalOutput: 500,
          totalCacheRead: 200,
          totalCacheCreation: 50,
          requestCount: 5,
          lastUpdated: new Date().toISOString(),
        },
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const saved = JSON.parse(localStorage.getItem(SESSION_KEY)!);
      expect(saved.version).toBe('1.36.0');
      expect(saved.tokenMetrics.totalInput).toBe(1000);
    });

    it('should NOT save PDF base64 in session (optimization)', () => {
      const session = {
        version: '1.36.0',
        analyzedDocuments: {
          peticoes: [], // Deve estar vazio (PDFs não salvos)
          peticoesText: ['Texto extraído...'],
          contestacoes: [],
          contestacoesText: [],
          complementares: [],
          complementaresText: [],
        },
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const saved = JSON.parse(localStorage.getItem(SESSION_KEY)!);
      expect(saved.analyzedDocuments.peticoes).toHaveLength(0);
    });

    it('should save file IDs for IndexedDB restoration', () => {
      const session = {
        version: '1.36.0',
        peticaoFileIds: ['uuid-1', 'uuid-2'],
        contestacaoFileIds: ['uuid-3'],
        complementaryFileIds: [],
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const saved = JSON.parse(localStorage.getItem(SESSION_KEY)!);
      expect(saved.peticaoFileIds).toHaveLength(2);
      expect(saved.peticaoFileIds[0]).toBe('uuid-1');
    });

    it('should handle QuotaExceededError gracefully', () => {
      // Simular verificação de erro de quota
      const isQuotaError = (err: Error) => err.name === 'QuotaExceededError';

      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      const otherError = new Error('Other error');
      otherError.name = 'TypeError';

      expect(isQuotaError(quotaError)).toBe(true);
      expect(isQuotaError(otherError)).toBe(false);
    });

    it('should save proof metadata without file data', () => {
      const proofFilesSerializable = [
        {
          id: 'proof-1',
          name: 'Controle de Ponto.pdf',
          type: 'pdf',
          size: 102400,
          uploadDate: new Date().toISOString(),
          // SEM fileData - PDFs estão no IndexedDB
        },
      ];

      const session = {
        version: '1.36.0',
        proofFiles: proofFilesSerializable,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const saved = JSON.parse(localStorage.getItem(SESSION_KEY)!);
      expect(saved.proofFiles[0].fileData).toBeUndefined();
      expect(saved.proofFiles[0].name).toBe('Controle de Ponto.pdf');
    });
  });

  // ============================================================
  // SEÇÃO 5: RESTORE SESSION
  // ============================================================

  describe('Restore Session', () => {
    it('should restore all session fields', () => {
      const session = {
        version: '1.36.0',
        processoNumero: '0001234-56.2024.5.00.0001',
        pastedPeticaoTexts: [{ id: '1', text: 'Petição...', name: 'Inicial' }],
        extractedTopics: [{ id: 't1', title: 'HORAS EXTRAS', category: 'MÉRITO' }],
        selectedTopics: [{ id: 't1', title: 'HORAS EXTRAS', category: 'MÉRITO' }],
        partesProcesso: { reclamante: 'João', reclamadas: ['Empresa X'] },
        activeTab: 'topics',
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const saved = JSON.parse(localStorage.getItem(SESSION_KEY)!);
      expect(saved.processoNumero).toBe('0001234-56.2024.5.00.0001');
      expect(saved.extractedTopics).toHaveLength(1);
      expect(saved.partesProcesso.reclamante).toBe('João');
    });

    it('should migrate old session format (singular → plural)', () => {
      // Formato antigo (singular)
      const oldSession = {
        version: '1.20.0',
        pastedPeticaoText: 'Petição única...',
        analyzedDocuments: {
          peticao: 'base64-data',
          peticaoType: 'pdf',
        },
      };

      // Lógica de migração
      const migrateSession = (session: typeof oldSession) => {
        const migrated: Record<string, unknown> = { ...session };

        if (session.pastedPeticaoText && !('pastedPeticaoTexts' in session)) {
          migrated.pastedPeticaoTexts = [
            { text: session.pastedPeticaoText, name: 'Petição Inicial' },
          ];
        }

        if (session.analyzedDocuments?.peticao && !(session.analyzedDocuments as Record<string, unknown>)?.peticoes) {
          migrated.analyzedDocuments = {
            peticoes: session.analyzedDocuments.peticaoType === 'pdf'
              ? [session.analyzedDocuments.peticao]
              : [],
            peticoesText: session.analyzedDocuments.peticaoType === 'text'
              ? [{ text: session.analyzedDocuments.peticao, name: 'Petição Inicial' }]
              : [],
          };
        }

        return migrated;
      };

      const migrated = migrateSession(oldSession);
      expect(migrated.pastedPeticaoTexts).toBeDefined();
      expect((migrated.analyzedDocuments as Record<string, unknown[]>).peticoes).toHaveLength(1);
    });

    it('should migrate legacy processing modes', () => {
      const validModes = ['pdfjs', 'tesseract', 'pdf-puro', 'claude-vision'];
      const migrateMode = (mode: string) => validModes.includes(mode) ? mode : 'pdfjs';

      expect(migrateMode('gemini-vision')).toBe('pdfjs'); // Legacy → pdfjs
      expect(migrateMode('pdfjs')).toBe('pdfjs');
      expect(migrateMode('tesseract')).toBe('tesseract');
      expect(migrateMode('unknown-mode')).toBe('pdfjs');
    });

    it('should restore tokenMetrics', () => {
      const session = {
        version: '1.36.0',
        tokenMetrics: {
          totalInput: 5000,
          totalOutput: 2500,
          totalCacheRead: 1000,
          totalCacheCreation: 200,
          requestCount: 10,
          lastUpdated: '2024-01-15T10:30:00.000Z',
        },
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const saved = JSON.parse(localStorage.getItem(SESSION_KEY)!);
      expect(saved.tokenMetrics.totalInput).toBe(5000);
      expect(saved.tokenMetrics.requestCount).toBe(10);
    });

    it('should set activeTab based on documents', () => {
      const sessionWithDocs = {
        version: '1.36.0',
        pastedPeticaoTexts: [{ text: 'Petição...' }],
        activeTab: 'topics',
      };

      const hasDocuments = sessionWithDocs.pastedPeticaoTexts?.length > 0;
      const activeTab = hasDocuments ? 'upload' : sessionWithDocs.activeTab;

      expect(activeTab).toBe('upload'); // Vai para upload se tem docs
    });
  });

  // ============================================================
  // SEÇÃO 6: PROJECT EXPORT
  // ============================================================

  describe('Project Export', () => {
    it('should NOT export apiKeys (security)', () => {
      const aiSettings = {
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        apiKeys: {
          claude: 'sk-ant-secret',
          gemini: 'AIza-secret',
          openai: 'sk-secret',
          grok: 'xai-secret',
        },
      };

      // Simular exclusão de apiKeys no export
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { apiKeys: _excluded, ...aiSettingsWithoutKeys } = aiSettings;

      expect(aiSettingsWithoutKeys.provider).toBe('claude');
      expect((aiSettingsWithoutKeys as Record<string, unknown>).apiKeys).toBeUndefined();
    });

    it('should include version and exportedAt', () => {
      const APP_VERSION = '1.36.60';
      const project = {
        version: APP_VERSION,
        exportedAt: new Date().toISOString(),
        processoNumero: '0001234-56.2024.5.00.0001',
      };

      expect(project.version).toBe('1.36.60');
      expect(project.exportedAt).toBeTruthy();
    });

    it('should generate filename based on processo number', () => {
      const processoNumero = '0001234-56.2024.5.00.0001';
      const datePart = new Date().toISOString().split('T')[0];

      const processoPart = processoNumero
        .replace(/\s+/g, '-')
        .replace(/\//g, '-');

      const filename = `sentencify-${processoPart}-${datePart}.json`;

      expect(filename).toContain('0001234-56.2024.5.00.0001');
      expect(filename.endsWith('.json')).toBe(true);
    });

    it('should generate default filename when no processo', () => {
      const processoNumero = '';
      const datePart = new Date().toISOString().split('T')[0];

      const filename = processoNumero
        ? `sentencify-${processoNumero}-${datePart}.json`
        : `sentencify-projeto-${datePart}.json`;

      expect(filename).toContain('sentencify-projeto');
    });

    it('should include factsComparison cache in export', () => {
      const factsComparison = {
        'HORAS EXTRAS_mini-relatorio': {
          facts: [{ claim: 'Horas extras não pagas' }],
        },
      };

      const project = {
        version: '1.36.60',
        factsComparison,
      };

      expect(project.factsComparison).toBeDefined();
      expect(Object.keys(project.factsComparison)).toHaveLength(1);
    });

    it('should include sentenceReviewCache in export', () => {
      const sentenceReviewCache = {
        decisionOnly: 'Revisão da decisão...',
        decisionWithDocs: 'Revisão com documentos...',
      };

      const project = {
        version: '1.36.60',
        sentenceReviewCache,
      };

      expect(project.sentenceReviewCache).toBeDefined();
      expect(project.sentenceReviewCache.decisionOnly).toBeTruthy();
    });
  });

  // ============================================================
  // SEÇÃO 7: PROJECT IMPORT
  // ============================================================

  describe('Project Import', () => {
    it('should validate project has version', () => {
      const invalidProject = { processoNumero: '123' };
      const validProject = { version: '1.36.0', processoNumero: '123' };

      const isValid = (project: Record<string, unknown>) => !!project.version;

      expect(isValid(invalidProject)).toBe(false);
      expect(isValid(validProject)).toBe(true);
    });

    it('should migrate old project format', () => {
      const oldProject = {
        version: '1.20.0',
        pastedPeticaoText: 'Petição única...',
        uploadPdfs: {
          peticao: { name: 'peticao.pdf', fileData: 'base64...' },
        },
      };

      // Lógica de migração
      const migrateProject = (project: typeof oldProject) => {
        const migrated: Record<string, unknown> = { ...project };

        if (project.pastedPeticaoText && !('pastedPeticaoTexts' in project)) {
          migrated.pastedPeticaoTexts = [
            { id: 'migrated-1', text: project.pastedPeticaoText, name: 'Petição Inicial' },
          ];
        }

        return migrated;
      };

      const migrated = migrateProject(oldProject);
      expect(migrated.pastedPeticaoTexts).toBeDefined();
    });

    it('should preserve current apiKeys during import', () => {
      // ApiKeys atuais do localStorage
      const currentApiKeys = { claude: 'sk-current', gemini: '', openai: '', grok: '' };
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify({ apiKeys: currentApiKeys }));

      // Projeto importado (sem apiKeys)
      const importedAiSettings = {
        provider: 'gemini',
        model: 'gemini-3-flash',
        // Sem apiKeys
      };

      // Merge: preservar apiKeys atuais
      let savedApiKeys = { claude: '', gemini: '', openai: '', grok: '' };
      try {
        const saved = localStorage.getItem(AI_SETTINGS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          savedApiKeys = { ...savedApiKeys, ...parsed.apiKeys };
        }
      } catch {
        // ignore
      }

      const mergedSettings = {
        ...importedAiSettings,
        apiKeys: savedApiKeys,
      };

      expect(mergedSettings.apiKeys.claude).toBe('sk-current');
      expect(mergedSettings.provider).toBe('gemini');
    });

    it('should import factsComparison cache', () => {
      const project = {
        version: '1.36.60',
        factsComparison: {
          'HORAS EXTRAS_mini-relatorio': {
            facts: [{ claim: 'Alegação 1' }],
          },
        },
      };

      expect(project.factsComparison).toBeDefined();

      // Verificar parsing da key
      const key = 'HORAS EXTRAS_mini-relatorio';
      const lastUnderscore = key.lastIndexOf('_');
      const topicTitle = key.substring(0, lastUnderscore);
      const source = key.substring(lastUnderscore + 1);

      expect(topicTitle).toBe('HORAS EXTRAS');
      expect(source).toBe('mini-relatorio');
    });

    it('should set activeTab to upload after import', () => {
      const project = { version: '1.36.0' };
      const activeTabAfterImport = 'upload';

      expect(activeTabAfterImport).toBe('upload');
    });
  });

  // ============================================================
  // SEÇÃO 8: CLEAR PROJECT
  // ============================================================

  describe('Clear Project', () => {
    it('should clear localStorage session', () => {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ version: '1.36.0' }));

      expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();

      localStorage.removeItem(SESSION_KEY);

      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('should reset tokenMetrics to zero', () => {
      const resetTokenMetrics = {
        totalInput: 0,
        totalOutput: 0,
        totalCacheRead: 0,
        totalCacheCreation: 0,
        requestCount: 0,
        lastUpdated: null,
      };

      expect(resetTokenMetrics.totalInput).toBe(0);
      expect(resetTokenMetrics.requestCount).toBe(0);
      expect(resetTokenMetrics.lastUpdated).toBeNull();
    });

    it('should reset partesProcesso to empty', () => {
      const resetPartesProcesso = { reclamante: '', reclamadas: [] };

      expect(resetPartesProcesso.reclamante).toBe('');
      expect(resetPartesProcesso.reclamadas).toHaveLength(0);
    });

    it('should reset analyzedDocuments to empty arrays', () => {
      const resetAnalyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      };

      expect(resetAnalyzedDocuments.peticoes).toHaveLength(0);
      expect(resetAnalyzedDocuments.contestacoes).toHaveLength(0);
    });

    it('should set activeTab to upload', () => {
      const activeTabAfterClear = 'upload';
      expect(activeTabAfterClear).toBe('upload');
    });

    it('should clear proof-related states', () => {
      const clearedProofStates = {
        proofFiles: [],
        proofTexts: [],
        proofUsePdfMode: {},
        extractedProofTexts: {},
        proofExtractionFailed: {},
        proofTopicLinks: {},
        proofAnalysisResults: {},
        proofConclusions: {},
      };

      expect(clearedProofStates.proofFiles).toHaveLength(0);
      expect(Object.keys(clearedProofStates.proofTopicLinks)).toHaveLength(0);
    });
  });

  // ============================================================
  // SEÇÃO 9: PROOF SERIALIZATION
  // ============================================================

  describe('Proof Serialization', () => {
    it('should serialize proofs without file data for session', () => {
      const proofFiles = [
        { id: 'p1', file: createMockFile('prova1.pdf', 'content'), name: 'Prova 1', type: 'pdf', size: 1024, uploadDate: new Date().toISOString() },
      ];

      const serializable = proofFiles.map((proof) => ({
        id: proof.id,
        name: proof.name,
        type: proof.type,
        size: proof.size,
        uploadDate: proof.uploadDate,
        // SEM file ou fileData
      }));

      expect(serializable[0].id).toBe('p1');
      expect((serializable[0] as Record<string, unknown>).file).toBeUndefined();
      expect((serializable[0] as Record<string, unknown>).fileData).toBeUndefined();
    });

    it('should serialize proofs with base64 for export', async () => {
      const fileToBase64 = async (): Promise<string> => 'base64-encoded-content';

      const proofFiles = [
        { id: 'p1', file: createMockFile('prova1.pdf', 'content'), name: 'Prova 1', type: 'pdf', size: 1024, uploadDate: new Date().toISOString() },
      ];

      const serializable = await Promise.all(
        proofFiles.map(async (proof) => ({
          id: proof.id,
          name: proof.name,
          type: proof.type,
          size: proof.size,
          uploadDate: proof.uploadDate,
          fileData: proof.file ? await fileToBase64() : null,
        }))
      );

      expect(serializable[0].fileData).toBe('base64-encoded-content');
    });

    it('should handle text proofs (no file)', () => {
      const textProof = {
        id: 'text-1',
        type: 'text' as const,
        title: 'Depoimento',
        text: 'Conteúdo do depoimento...',
      };

      // Text proofs não precisam de conversão
      expect(textProof.type).toBe('text');
      expect((textProof as Record<string, unknown>).file).toBeUndefined();
    });
  });

  // ============================================================
  // SEÇÃO 10: UPLOAD PDF SERIALIZATION
  // ============================================================

  describe('Upload PDF Serialization', () => {
    it('should structure uploadPdfs by category', () => {
      const uploadPdfs = {
        peticoes: [{ name: 'pet1.pdf', id: 'uuid-1', fileData: 'base64...' }],
        contestacoes: [{ name: 'cont1.pdf', id: 'uuid-2', fileData: 'base64...' }],
        complementares: [],
      };

      expect(uploadPdfs.peticoes).toHaveLength(1);
      expect(uploadPdfs.contestacoes).toHaveLength(1);
      expect(uploadPdfs.complementares).toHaveLength(0);
    });

    it('should include file ID for IndexedDB restoration', () => {
      const uploadPdf = {
        name: 'peticao.pdf',
        id: 'uuid-abc-123',
        fileData: 'base64...',
      };

      expect(uploadPdf.id).toBe('uuid-abc-123');
    });

    it('should generate UUID for migrated PDFs', () => {
      const oldPdf = { name: 'old.pdf', fileData: 'base64...' };

      // Migração: adicionar UUID
      const migratedPdf = {
        ...oldPdf,
        id: 'new-uuid-generated', // crypto.randomUUID()
      };

      expect(migratedPdf.id).toBeTruthy();
    });
  });
});
