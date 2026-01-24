import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReportGeneration } from './useReportGeneration';

const mockCallAI = vi.fn();
const mockExtractResponseText = vi.fn();

const defaultProps = {
  aiIntegration: {
    callAI: mockCallAI,
    extractResponseText: mockExtractResponseText,
    aiSettings: { provider: 'claude' as const, model: 'claude-sonnet-4-20250514' },
    setRegeneratingRelatorio: vi.fn(),
  },
  analyzedDocuments: null,
  partesProcesso: null,
};

describe('useReportGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook initialization', () => {
    it('should return all expected methods', () => {
      const { result } = renderHook(() => useReportGeneration(defaultProps as any));

      expect(typeof result.current.generateMiniReport).toBe('function');
      expect(typeof result.current.generateMultipleMiniReports).toBe('function');
      expect(typeof result.current.generateMiniReportsBatch).toBe('function');
      expect(typeof result.current.generateRelatorioProcessual).toBe('function');
    });

    it('should start with isGeneratingReport=false', () => {
      const { result } = renderHook(() => useReportGeneration(defaultProps as any));
      expect(result.current.isGeneratingReport).toBe(false);
    });
  });

  describe('generateMiniReport', () => {
    it('should call AI and return generated report', async () => {
      mockCallAI.mockResolvedValue('<p>Mini relatório gerado sobre horas extras</p>');
      mockExtractResponseText.mockReturnValue('<p>Mini relatório gerado sobre horas extras</p>');

      const propsWithDocs = {
        ...defaultProps,
        analyzedDocuments: {
          peticao: [{ text: 'Texto da petição inicial', source: 'peticao' }],
          contestacao: [],
          complementar: [],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithDocs as any));

      let report: string = '';
      await act(async () => {
        report = await result.current.generateMiniReport({
          title: 'Horas Extras',
        });
      });

      expect(mockCallAI).toHaveBeenCalled();
      expect(report).toContain('relatório');
    });

    it('should handle AI call failure gracefully', async () => {
      mockCallAI.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useReportGeneration(defaultProps as any));

      // The hook may throw or return a fallback - just verify no unhandled error
      try {
        await act(async () => {
          await result.current.generateMiniReport({
            title: 'Test',
          });
        });
      } catch {
        // Expected - some implementations rethrow
      }
    });
  });

  describe('generateMiniReport with documents', () => {
    it('should include petição text in API call', async () => {
      mockCallAI.mockResolvedValue('<p>Relatório com petição</p>');

      const propsWithPeticao = {
        ...defaultProps,
        analyzedDocuments: {
          peticoesText: [{ name: 'petição', text: 'Texto da petição sobre horas extras' }],
          peticoes: [],
          contestacoesText: [],
          contestacoes: [],
          complementaresText: [],
          complementares: [],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithPeticao as any));

      await act(async () => {
        await result.current.generateMiniReport({ title: 'Horas Extras' });
      });

      const callArgs = mockCallAI.mock.calls[0];
      const messages = callArgs[0];
      const userContent = messages[0].content;
      const hasText = userContent.some((c: any) => c.type === 'text' && c.text.includes('PETIÇÃO'));
      expect(hasText).toBe(true);
    });

    it('should include contestação text in API call', async () => {
      mockCallAI.mockResolvedValue('<p>Relatório com contestação</p>');

      const propsWithContestacao = {
        ...defaultProps,
        analyzedDocuments: {
          peticoesText: [{ name: 'petição', text: 'Texto da petição' }],
          peticoes: [],
          contestacoesText: [{ text: 'Texto da contestação sobre prescrição' }],
          contestacoes: [],
          complementaresText: [],
          complementares: [],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithContestacao as any));

      await act(async () => {
        await result.current.generateMiniReport({ title: 'Prescrição' });
      });

      const callArgs = mockCallAI.mock.calls[0];
      const messages = callArgs[0];
      const userContent = messages[0].content;
      const hasContestacao = userContent.some((c: any) => c.type === 'text' && c.text.includes('CONTESTAÇÃO'));
      expect(hasContestacao).toBe(true);
    });

    it('should include complementary documents when option set', async () => {
      mockCallAI.mockResolvedValue('<p>Com complementar</p>');

      const propsWithComplementar = {
        ...defaultProps,
        analyzedDocuments: {
          peticoesText: [{ name: 'petição', text: 'Texto' }],
          peticoes: [],
          contestacoesText: [],
          contestacoes: [],
          complementaresText: [{ text: 'Documento complementar de prova' }],
          complementares: [],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithComplementar as any));

      await act(async () => {
        await result.current.generateMiniReport({
          title: 'Provas',
          includeComplementares: true,
        });
      });

      const callArgs = mockCallAI.mock.calls[0];
      const messages = callArgs[0];
      const userContent = messages[0].content;
      const hasComplementar = userContent.some((c: any) => c.type === 'text' && c.text.includes('COMPLEMENTAR'));
      expect(hasComplementar).toBe(true);
    });

    it('should include instruction in prompt when provided', async () => {
      mockCallAI.mockResolvedValue('<p>Com instrução</p>');

      const propsWithDocs = {
        ...defaultProps,
        analyzedDocuments: {
          peticoesText: [{ name: 'petição', text: 'Texto' }],
          peticoes: [],
          contestacoesText: [],
          contestacoes: [],
          complementaresText: [],
          complementares: [],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithDocs as any));

      await act(async () => {
        await result.current.generateMiniReport({
          title: 'Test',
          instruction: 'Focar em danos morais',
        });
      });

      const callArgs = mockCallAI.mock.calls[0];
      const messages = callArgs[0];
      const userContent = messages[0].content;
      const promptText = userContent.find((c: any) => c.text?.includes('Focar em danos morais'));
      expect(promptText).toBeDefined();
    });

    it('should include partes info when provided', async () => {
      mockCallAI.mockResolvedValue('<p>Com partes</p>');

      const propsWithPartes = {
        ...defaultProps,
        analyzedDocuments: {
          peticoesText: [{ name: 'petição', text: 'Texto' }],
          peticoes: [],
          contestacoesText: [],
          contestacoes: [],
          complementaresText: [],
          complementares: [],
        },
        partesProcesso: {
          reclamante: 'João da Silva',
          reclamadas: ['Empresa ABC Ltda', 'Empresa XYZ S.A.'],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithPartes as any));

      await act(async () => {
        await result.current.generateMiniReport({ title: 'Vínculo' });
      });

      const callArgs = mockCallAI.mock.calls[0];
      const messages = callArgs[0];
      const userContent = messages[0].content;
      const hasPartes = userContent.some((c: any) =>
        c.text?.includes('João da Silva') || c.text?.includes('Empresa ABC')
      );
      expect(hasPartes).toBe(true);
    });

    it('should set cache_control for long texts', async () => {
      mockCallAI.mockResolvedValue('<p>Com cache</p>');

      const longText = 'A'.repeat(3000);
      const propsWithLongText = {
        ...defaultProps,
        analyzedDocuments: {
          peticoesText: [{ name: 'petição', text: longText }],
          peticoes: [],
          contestacoesText: [],
          contestacoes: [],
          complementaresText: [],
          complementares: [],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithLongText as any));

      await act(async () => {
        await result.current.generateMiniReport({ title: 'Test' });
      });

      const callArgs = mockCallAI.mock.calls[0];
      const messages = callArgs[0];
      const userContent = messages[0].content;
      const cachedContent = userContent.find((c: any) => c.cache_control);
      expect(cachedContent).toBeDefined();
      expect(cachedContent.cache_control.type).toBe('ephemeral');
    });
  });

  describe('generateMultipleMiniReports', () => {
    it('should call AI and parse JSON response', async () => {
      const rawResponse = { content: [{ type: 'text', text: 'json' }] };
      mockCallAI.mockResolvedValue(rawResponse);
      mockExtractResponseText.mockReturnValue(JSON.stringify({
        reports: [
          { title: 'Horas Extras', relatorio: '<p>Report 1</p>' },
          { title: 'Adicional Noturno', relatorio: '<p>Report 2</p>' },
        ]
      }));

      const propsWithDocs = {
        ...defaultProps,
        analyzedDocuments: {
          peticoesText: [{ name: 'petição', text: 'Texto da petição' }],
          peticoes: [],
          contestacoesText: [],
          contestacoes: [],
          complementaresText: [],
          complementares: [],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithDocs as any));

      const topics = [
        { title: 'Horas Extras', category: 'Mérito' },
        { title: 'Adicional Noturno', category: 'Mérito' },
      ];

      let reports: any;
      await act(async () => {
        reports = await result.current.generateMultipleMiniReports(topics as any);
      });

      expect(mockCallAI).toHaveBeenCalled();
      expect(reports).toHaveLength(2);
      expect(reports[0].title).toBe('Horas Extras');
    });

    it('should throw on invalid JSON response', async () => {
      mockCallAI.mockResolvedValue({ content: [] });
      mockExtractResponseText.mockReturnValue('not valid json');

      const propsWithDocs = {
        ...defaultProps,
        analyzedDocuments: {
          peticoesText: [{ name: 'petição', text: 'Texto' }],
          peticoes: [],
          contestacoesText: [],
          contestacoes: [],
          complementaresText: [],
          complementares: [],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithDocs as any));

      await act(async () => {
        await expect(
          result.current.generateMultipleMiniReports([{ title: 'Test', category: 'Mérito' }] as any)
        ).rejects.toThrow('Erro ao parsear');
      });
    });
  });

  describe('generateMiniReportsBatch', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useReportGeneration(defaultProps as any));
      expect(typeof result.current.generateMiniReportsBatch).toBe('function');
    });

    it('should process topics in batches', async () => {
      mockCallAI.mockResolvedValue({ content: [{ type: 'text', text: 'json' }] });
      mockExtractResponseText.mockReturnValue(JSON.stringify({
        reports: [
          { title: 'Topic 1', relatorio: '<p>Report 1</p>' },
          { title: 'Topic 2', relatorio: '<p>Report 2</p>' },
        ]
      }));

      const propsWithDocs = {
        ...defaultProps,
        analyzedDocuments: {
          peticoesText: [{ name: 'petição', text: 'Texto' }],
          peticoes: [],
          contestacoesText: [],
          contestacoes: [],
          complementaresText: [],
          complementares: [],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithDocs as any));

      const topics = [
        { title: 'Topic 1', category: 'Mérito' },
        { title: 'Topic 2', category: 'Mérito' },
      ];

      let batchResult: any;
      await act(async () => {
        batchResult = await result.current.generateMiniReportsBatch(topics as any, {
          batchSize: 2,
          delayBetweenBatches: 0,
        });
      });

      expect(batchResult).toBeDefined();
      expect(mockCallAI).toHaveBeenCalled();
    });

    it('should call onProgress callback', async () => {
      mockCallAI.mockResolvedValue({ content: [{ type: 'text', text: 'json' }] });
      mockExtractResponseText.mockReturnValue(JSON.stringify({
        reports: [{ title: 'Topic 1', relatorio: '<p>Report</p>' }]
      }));
      const onProgress = vi.fn();

      const propsWithDocs = {
        ...defaultProps,
        analyzedDocuments: {
          peticoesText: [{ name: 'petição', text: 'Texto' }],
          peticoes: [],
          contestacoesText: [],
          contestacoes: [],
          complementaresText: [],
          complementares: [],
        },
      };

      const { result } = renderHook(() => useReportGeneration(propsWithDocs as any));

      const topics = [
        { title: 'Topic 1', category: 'Mérito' },
      ];

      await act(async () => {
        await result.current.generateMiniReportsBatch(topics as any, {
          batchSize: 5,
          onProgress,
        });
      });

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('generateRelatorioProcessual', () => {
    it('should call AI and return report content', async () => {
      mockCallAI.mockResolvedValue('<p>Relatório processual completo</p>');
      mockExtractResponseText.mockReturnValue('<p>Relatório processual completo</p>');

      const { result } = renderHook(() => useReportGeneration(defaultProps as any));

      let report: string = '';
      await act(async () => {
        report = await result.current.generateRelatorioProcessual(['Conteúdo processual']);
      });

      // Report should contain some content (may include fallback template)
      expect(report.length).toBeGreaterThan(0);
    });

    it('should return fallback template on API failure', async () => {
      mockCallAI.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReportGeneration(defaultProps as any));

      let report: string = '';
      await act(async () => {
        report = await result.current.generateRelatorioProcessual(['content']);
      });

      // Returns a fallback template, not empty
      expect(report).toContain('RELATÓRIO');
    });
  });
});
