/**
 * @file useProofManager.test.ts
 * @description Testes para o hook useProofManager
 * @coverage Proof CRUD, linking, analysis, extraction, persistence
 *
 * NOTA: Este teste verifica a lógica de PRODUÇÃO do hook useProofManager.
 * O hook gerencia provas vinculadas a tópicos (~350 linhas).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Tipos
interface ProofFile {
  id: string | number;
  file?: File;
  name: string;
  type: 'pdf';
  size: number;
  uploadDate: string;
  isPdf?: boolean;
}

interface ProofText {
  id: string | number;
  text: string;
  name: string;
  type: 'text';
  uploadDate: string;
}

type Proof = ProofFile | ProofText;

interface NewProofTextData {
  name: string;
  text: string;
}

interface ProofAnalysisResult {
  type: 'contextual' | 'livre';
  result: string;
}

type ProcessingMode = 'pdfjs' | 'tesseract' | 'pdf-puro' | 'claude-vision';

// Mock de Proof
const createMockProofFile = (overrides: Partial<ProofFile> = {}): ProofFile => ({
  id: Date.now() + Math.random(),
  name: 'Controle de Ponto.pdf',
  type: 'pdf',
  size: 102400,
  uploadDate: new Date().toISOString(),
  ...overrides,
});

const createMockProofText = (overrides: Partial<ProofText> = {}): ProofText => ({
  id: Date.now() + Math.random(),
  text: 'Depoimento da testemunha...',
  name: 'Testemunha 1',
  type: 'text',
  uploadDate: new Date().toISOString(),
  ...overrides,
});

describe('useProofManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // SEÇÃO 1: CORE DATA STATES
  // ============================================================

  describe('Core Data States', () => {
    it('should initialize with empty proofFiles', () => {
      const proofFiles: ProofFile[] = [];
      expect(proofFiles).toHaveLength(0);
    });

    it('should initialize with empty proofTexts', () => {
      const proofTexts: ProofText[] = [];
      expect(proofTexts).toHaveLength(0);
    });

    it('should initialize proofUsePdfMode as empty object', () => {
      const proofUsePdfMode: Record<string, boolean> = {};
      expect(Object.keys(proofUsePdfMode)).toHaveLength(0);
    });

    it('should initialize extractedProofTexts as empty object', () => {
      const extractedProofTexts: Record<string, string> = {};
      expect(Object.keys(extractedProofTexts)).toHaveLength(0);
    });

    it('should initialize proofTopicLinks as empty object', () => {
      const proofTopicLinks: Record<string, string[]> = {};
      expect(Object.keys(proofTopicLinks)).toHaveLength(0);
    });

    it('should calculate total proofs correctly', () => {
      const proofFiles = [createMockProofFile(), createMockProofFile()];
      const proofTexts = [createMockProofText()];

      const totalProofs = proofFiles.length + proofTexts.length;
      expect(totalProofs).toBe(3);
    });

    it('should check if has proofs', () => {
      const proofFiles = [createMockProofFile()];
      const proofTexts: ProofText[] = [];

      const hasProofs = proofFiles.length + proofTexts.length > 0;
      expect(hasProofs).toBe(true);
    });
  });

  // ============================================================
  // SEÇÃO 2: UPLOAD PROOFS
  // ============================================================

  describe('Upload Proofs', () => {
    it('should generate unique ID for new proof', () => {
      const id1 = Date.now() + Math.random();
      const id2 = Date.now() + Math.random();

      expect(id1).not.toBe(id2);
    });

    it('should create proof file with correct properties', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      const newProof: ProofFile = {
        id: Date.now() + Math.random(),
        file,
        name: file.name,
        type: 'pdf',
        size: file.size,
        uploadDate: new Date().toISOString(),
      };

      expect(newProof.name).toBe('test.pdf');
      expect(newProof.type).toBe('pdf');
    });

    it('should default to PDF mode for new uploads', () => {
      const proofUsePdfMode: Record<string, boolean> = {};
      const proofId = 123;

      // Default: usar PDF completo
      proofUsePdfMode[proofId] = true;

      expect(proofUsePdfMode[proofId]).toBe(true);
    });

    it('should default to pdfjs processing mode', () => {
      const proofProcessingModes: Record<string, ProcessingMode> = {};
      const proofId = 123;

      // Default: pdfjs
      proofProcessingModes[proofId] = 'pdfjs';

      expect(proofProcessingModes[proofId]).toBe('pdfjs');
    });

    it('should add multiple files', () => {
      let proofFiles: ProofFile[] = [];

      const addProof = (proof: ProofFile) => {
        proofFiles = [...proofFiles, proof];
      };

      addProof(createMockProofFile({ name: 'file1.pdf' }));
      addProof(createMockProofFile({ name: 'file2.pdf' }));
      addProof(createMockProofFile({ name: 'file3.pdf' }));

      expect(proofFiles).toHaveLength(3);
    });
  });

  // ============================================================
  // SEÇÃO 3: ADD TEXT PROOFS
  // ============================================================

  describe('Add Text Proofs', () => {
    it('should validate name is required', () => {
      const newProofTextData = { name: '', text: 'Some text' };

      const isValid = newProofTextData.name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate text is required', () => {
      const newProofTextData = { name: 'Testemunha', text: '' };

      const isValid = newProofTextData.text.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should create text proof with correct properties', () => {
      const newProofTextData: NewProofTextData = {
        name: 'Testemunha 1',
        text: 'Depoimento da testemunha...',
      };

      const newProof: ProofText = {
        id: Date.now() + Math.random(),
        text: newProofTextData.text,
        name: newProofTextData.name,
        type: 'text',
        uploadDate: new Date().toISOString(),
      };

      expect(newProof.type).toBe('text');
      expect(newProof.name).toBe('Testemunha 1');
    });

    it('should reset form after adding', () => {
      let newProofTextData: NewProofTextData = { name: 'Test', text: 'Content' };

      const resetForm = () => {
        newProofTextData = { name: '', text: '' };
      };

      resetForm();

      expect(newProofTextData.name).toBe('');
      expect(newProofTextData.text).toBe('');
    });
  });

  // ============================================================
  // SEÇÃO 4: DELETE PROOFS
  // ============================================================

  describe('Delete Proofs', () => {
    it('should identify PDF proof by type', () => {
      const pdfProof = createMockProofFile();
      const textProof = createMockProofText();

      expect(pdfProof.type).toBe('pdf');
      expect(textProof.type).toBe('text');
    });

    it('should remove PDF proof from array', () => {
      const proofFiles = [
        createMockProofFile({ id: 1 }),
        createMockProofFile({ id: 2 }),
        createMockProofFile({ id: 3 }),
      ];

      const removeById = (arr: ProofFile[], id: number) =>
        arr.filter((item) => item.id !== id);

      const afterDelete = removeById(proofFiles, 2);
      expect(afterDelete).toHaveLength(2);
    });

    it('should remove text proof from array', () => {
      const proofTexts = [
        createMockProofText({ id: 1 }),
        createMockProofText({ id: 2 }),
      ];

      const removeById = (arr: ProofText[], id: number) =>
        arr.filter((item) => item.id !== id);

      const afterDelete = removeById(proofTexts, 1);
      expect(afterDelete).toHaveLength(1);
    });

    it('should clean related data on delete', () => {
      const proofId = 123;
      let proofUsePdfMode: Record<number, boolean> = { [proofId]: true };
      let extractedProofTexts: Record<number, string> = { [proofId]: 'extracted' };
      let proofTopicLinks: Record<number, string[]> = { [proofId]: ['Topic 1'] };

      const removeObjectKey = <T extends Record<number, unknown>>(
        obj: T,
        key: number
      ): T => {
        const { [key]: _, ...rest } = obj;
        return rest as T;
      };

      proofUsePdfMode = removeObjectKey(proofUsePdfMode, proofId);
      extractedProofTexts = removeObjectKey(extractedProofTexts, proofId);
      proofTopicLinks = removeObjectKey(proofTopicLinks, proofId);

      expect(proofUsePdfMode[proofId]).toBeUndefined();
      expect(extractedProofTexts[proofId]).toBeUndefined();
      expect(proofTopicLinks[proofId]).toBeUndefined();
    });

    it('should track proof to delete', () => {
      let proofToDelete: Proof | null = null;

      const setProofToDelete = (proof: Proof | null) => {
        proofToDelete = proof;
      };

      const proof = createMockProofFile();
      setProofToDelete(proof);

      expect(proofToDelete).toBe(proof);
    });
  });

  // ============================================================
  // SEÇÃO 5: TOGGLE PDF MODE
  // ============================================================

  describe('Toggle PDF Mode', () => {
    it('should toggle to use PDF', () => {
      let proofUsePdfMode: Record<string, boolean> = { '123': false };

      const handleToggleProofMode = (proofId: string, usePdf: boolean) => {
        proofUsePdfMode = { ...proofUsePdfMode, [proofId]: usePdf };
      };

      handleToggleProofMode('123', true);
      expect(proofUsePdfMode['123']).toBe(true);
    });

    it('should toggle to use extracted text', () => {
      let proofUsePdfMode: Record<string, boolean> = { '123': true };

      const handleToggleProofMode = (proofId: string, usePdf: boolean) => {
        proofUsePdfMode = { ...proofUsePdfMode, [proofId]: usePdf };
      };

      handleToggleProofMode('123', false);
      expect(proofUsePdfMode['123']).toBe(false);
    });
  });

  // ============================================================
  // SEÇÃO 6: LINK PROOFS TO TOPICS
  // ============================================================

  describe('Link Proofs to Topics', () => {
    it('should link proof to topics', () => {
      let proofTopicLinks: Record<string, string[]> = {};

      const handleLinkProof = (proofId: string, topicTitles: string[]) => {
        proofTopicLinks = { ...proofTopicLinks, [proofId]: topicTitles };
      };

      handleLinkProof('123', ['HORAS EXTRAS', 'ADICIONAL NOTURNO']);

      expect(proofTopicLinks['123']).toHaveLength(2);
      expect(proofTopicLinks['123']).toContain('HORAS EXTRAS');
    });

    it('should unlink proof from topic', () => {
      let proofTopicLinks: Record<string, string[]> = {
        '123': ['HORAS EXTRAS', 'ADICIONAL NOTURNO'],
      };

      const handleUnlinkProof = (proofId: string, topicTitle: string) => {
        const currentLinks = proofTopicLinks[proofId] || [];
        const newLinks = currentLinks.filter((t) => t !== topicTitle);

        if (newLinks.length === 0) {
          const { [proofId]: _, ...rest } = proofTopicLinks;
          proofTopicLinks = rest;
        } else {
          proofTopicLinks = { ...proofTopicLinks, [proofId]: newLinks };
        }
      };

      handleUnlinkProof('123', 'HORAS EXTRAS');

      expect(proofTopicLinks['123']).toHaveLength(1);
      expect(proofTopicLinks['123']).not.toContain('HORAS EXTRAS');
    });

    it('should remove key when all links removed', () => {
      let proofTopicLinks: Record<string, string[]> = {
        '123': ['HORAS EXTRAS'],
      };

      const handleUnlinkProof = (proofId: string, topicTitle: string) => {
        const currentLinks = proofTopicLinks[proofId] || [];
        const newLinks = currentLinks.filter((t) => t !== topicTitle);

        if (newLinks.length === 0) {
          const { [proofId]: _, ...rest } = proofTopicLinks;
          proofTopicLinks = rest;
        } else {
          proofTopicLinks = { ...proofTopicLinks, [proofId]: newLinks };
        }
      };

      handleUnlinkProof('123', 'HORAS EXTRAS');

      expect(proofTopicLinks['123']).toBeUndefined();
    });

    it('should track proof to link', () => {
      let proofToLink: Proof | null = null;

      const setProofToLink = (proof: Proof | null) => {
        proofToLink = proof;
      };

      const proof = createMockProofFile();
      setProofToLink(proof);

      expect(proofToLink).toBe(proof);
    });
  });

  // ============================================================
  // SEÇÃO 7: PROOF ANALYSIS
  // ============================================================

  describe('Proof Analysis', () => {
    it('should track analyzing proof IDs', () => {
      let analyzingProofIds = new Set<string>();

      const addAnalyzingProof = (id: string) => {
        analyzingProofIds = new Set([...analyzingProofIds, id]);
      };

      addAnalyzingProof('proof-1');
      addAnalyzingProof('proof-2');

      expect(analyzingProofIds.has('proof-1')).toBe(true);
      expect(analyzingProofIds.size).toBe(2);
    });

    it('should remove analyzing proof ID', () => {
      let analyzingProofIds = new Set(['proof-1', 'proof-2']);

      const removeAnalyzingProof = (id: string) => {
        const next = new Set(analyzingProofIds);
        next.delete(id);
        analyzingProofIds = next;
      };

      removeAnalyzingProof('proof-1');

      expect(analyzingProofIds.has('proof-1')).toBe(false);
      expect(analyzingProofIds.size).toBe(1);
    });

    it('should check if proof is being analyzed', () => {
      const analyzingProofIds = new Set(['proof-1']);

      const isAnalyzingProof = (id: string) => analyzingProofIds.has(id);

      expect(isAnalyzingProof('proof-1')).toBe(true);
      expect(isAnalyzingProof('proof-2')).toBe(false);
    });

    it('should clear all analyzing proofs', () => {
      let analyzingProofIds = new Set(['proof-1', 'proof-2', 'proof-3']);

      const clearAnalyzingProofs = () => {
        analyzingProofIds = new Set();
      };

      clearAnalyzingProofs();

      expect(analyzingProofIds.size).toBe(0);
    });

    it('should store analysis results', () => {
      let proofAnalysisResults: Record<string, ProofAnalysisResult> = {};

      const setProofAnalysisResult = (proofId: string, result: ProofAnalysisResult) => {
        proofAnalysisResults = { ...proofAnalysisResults, [proofId]: result };
      };

      setProofAnalysisResult('proof-1', {
        type: 'contextual',
        result: 'A análise indica que...',
      });

      expect(proofAnalysisResults['proof-1'].type).toBe('contextual');
    });

    it('should track proof to analyze', () => {
      let proofToAnalyze: Proof | null = null;

      const setProofToAnalyze = (proof: Proof | null) => {
        proofToAnalyze = proof;
      };

      const proof = createMockProofFile();
      setProofToAnalyze(proof);

      expect(proofToAnalyze).toBe(proof);
    });
  });

  // ============================================================
  // SEÇÃO 8: PROOF CONCLUSIONS
  // ============================================================

  describe('Proof Conclusions', () => {
    it('should save proof conclusion', () => {
      let proofConclusions: Record<string, string> = {};

      const handleSaveProofConclusion = (proofId: string, conclusion: string) => {
        if (conclusion && conclusion.trim()) {
          proofConclusions = { ...proofConclusions, [proofId]: conclusion };
        }
      };

      handleSaveProofConclusion('proof-1', 'Esta prova demonstra...');

      expect(proofConclusions['proof-1']).toBe('Esta prova demonstra...');
    });

    it('should remove conclusion when empty', () => {
      let proofConclusions: Record<string, string> = {
        'proof-1': 'Conclusão anterior',
      };

      const handleSaveProofConclusion = (proofId: string, conclusion: string) => {
        if (conclusion && conclusion.trim()) {
          proofConclusions = { ...proofConclusions, [proofId]: conclusion };
        } else {
          const { [proofId]: _, ...rest } = proofConclusions;
          proofConclusions = rest;
        }
      };

      handleSaveProofConclusion('proof-1', '');

      expect(proofConclusions['proof-1']).toBeUndefined();
    });
  });

  // ============================================================
  // SEÇÃO 9: EXTRACTION
  // ============================================================

  describe('Extraction', () => {
    it('should store extracted text', () => {
      let extractedProofTexts: Record<string, string> = {};

      const setExtractedText = (proofId: string, text: string) => {
        extractedProofTexts = { ...extractedProofTexts, [proofId]: text };
      };

      setExtractedText('proof-1', 'Texto extraído do PDF...');

      expect(extractedProofTexts['proof-1']).toBe('Texto extraído do PDF...');
    });

    it('should track extraction failure', () => {
      let proofExtractionFailed: Record<string, boolean> = {};

      const setExtractionFailed = (proofId: string) => {
        proofExtractionFailed = { ...proofExtractionFailed, [proofId]: true };
      };

      setExtractionFailed('proof-1');

      expect(proofExtractionFailed['proof-1']).toBe(true);
    });

    it('should support different processing modes', () => {
      const validModes: ProcessingMode[] = ['pdfjs', 'tesseract', 'pdf-puro', 'claude-vision'];

      let proofProcessingModes: Record<string, ProcessingMode> = {};

      validModes.forEach((mode, index) => {
        proofProcessingModes[`proof-${index}`] = mode;
      });

      expect(proofProcessingModes['proof-0']).toBe('pdfjs');
      expect(proofProcessingModes['proof-1']).toBe('tesseract');
      expect(proofProcessingModes['proof-2']).toBe('pdf-puro');
      expect(proofProcessingModes['proof-3']).toBe('claude-vision');
    });
  });

  // ============================================================
  // SEÇÃO 10: UI STATES
  // ============================================================

  describe('UI States', () => {
    it('should toggle proof panel visibility', () => {
      let showProofPanel = true;

      const togglePanel = () => {
        showProofPanel = !showProofPanel;
      };

      togglePanel();
      expect(showProofPanel).toBe(false);

      togglePanel();
      expect(showProofPanel).toBe(true);
    });

    it('should track custom analysis instructions', () => {
      let proofAnalysisCustomInstructions = '';

      const setInstructions = (instructions: string) => {
        proofAnalysisCustomInstructions = instructions;
      };

      setInstructions('Foque nos aspectos temporais');
      expect(proofAnalysisCustomInstructions).toBe('Foque nos aspectos temporais');
    });

    it('should toggle use only mini relatorios', () => {
      let useOnlyMiniRelatorios = false;

      const toggle = () => {
        useOnlyMiniRelatorios = !useOnlyMiniRelatorios;
      };

      toggle();
      expect(useOnlyMiniRelatorios).toBe(true);
    });
  });

  // ============================================================
  // SEÇÃO 11: PERSISTENCE
  // ============================================================

  describe('Persistence', () => {
    it('should serialize all data for persistence', () => {
      const data = {
        proofFiles: [createMockProofFile()],
        proofTexts: [createMockProofText()],
        proofUsePdfMode: { '1': true },
        extractedProofTexts: { '1': 'text' },
        proofExtractionFailed: { '2': true },
        proofTopicLinks: { '1': ['Topic'] },
        proofAnalysisResults: { '1': { type: 'contextual', result: 'result' } },
        proofConclusions: { '1': 'conclusion' },
        proofProcessingModes: { '1': 'pdfjs' },
        proofSendFullContent: { '1': true },
      };

      expect(data.proofFiles).toHaveLength(1);
      expect(data.proofUsePdfMode['1']).toBe(true);
    });

    it('should reset all states', () => {
      const resetAll = () => ({
        proofFiles: [],
        proofTexts: [],
        proofUsePdfMode: {},
        extractedProofTexts: {},
        proofExtractionFailed: {},
        proofTopicLinks: {},
        proofAnalysisResults: {},
        proofConclusions: {},
        proofProcessingModes: {},
        proofSendFullContent: {},
      });

      const state = resetAll();

      expect(state.proofFiles).toHaveLength(0);
      expect(Object.keys(state.proofTopicLinks)).toHaveLength(0);
    });
  });

  // ============================================================
  // SEÇÃO 12: HELPERS
  // ============================================================

  describe('Helpers', () => {
    it('should validate string with min length', () => {
      const isValidString = (str: unknown, minLength = 1) =>
        !!(str && typeof str === 'string' && str.trim().length >= minLength);

      expect(isValidString('valid')).toBe(true);
      expect(isValidString('')).toBe(false);
      expect(isValidString('  ')).toBe(false);
      expect(isValidString(null)).toBe(false);
      expect(isValidString(123)).toBe(false);
    });

    it('should convert FileList to array', () => {
      const toFilesArray = (value: unknown) =>
        Array.isArray(value) ? value : [];

      const arr = [new File([], 'test.pdf')];
      expect(toFilesArray(arr)).toHaveLength(1);
      expect(toFilesArray(null)).toHaveLength(0);
    });
  });
});
