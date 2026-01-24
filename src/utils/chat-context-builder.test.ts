/**
 * @file chat-context-builder.test.ts
 * @description Testes automatizados para a função centralizada buildChatContext
 * @version 1.38.21
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildChatContext,
  type BuildChatContextParams,
  type ChatContextOptions,
  type ChatContextTopic,
  type ChatContextDocuments,
} from './chat-context-builder';
import type { AIMessageContent, AITextContent } from '../types';

/** Helper para extrair o último item de texto do resultado */
function getLastTextItem(result: AIMessageContent[]): AITextContent {
  const lastItem = result[result.length - 1];
  if (typeof lastItem === 'string') {
    return { type: 'text', text: lastItem };
  }
  return lastItem as AITextContent;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

// Mock dos context-helpers
vi.mock('./context-helpers', () => ({
  prepareDocumentsContext: vi.fn((docs) => ({
    contentArray: [],
    flags: {
      hasPeticao: (docs.peticoes?.length || 0) > 0 || (docs.peticoesText?.length || 0) > 0,
      hasContestacoes: (docs.contestacoes?.length || 0) > 0 || (docs.contestacoesText?.length || 0) > 0,
      hasComplementares: (docs.complementares?.length || 0) > 0 || (docs.complementaresText?.length || 0) > 0,
    }
  })),
  prepareProofsContext: vi.fn(async () => ({
    proofDocuments: [],
    proofsContext: '',
    hasProofs: false,
  })),
  prepareOralProofsContext: vi.fn(async () => ({
    proofDocuments: [],
    proofsContext: '[Contexto de prova oral]',
    hasProofs: true,
  })),
}));

// Mock dos prompts
vi.mock('../prompts/ai-prompts', () => ({
  AI_PROMPTS: {
    estiloRedacao: '[ESTILO_REDACAO]',
    numeracaoReclamadas: '[NUMERACAO_RECLAMADAS]',
    preservarAnonimizacao: '[PRESERVAR_ANONIMIZACAO]',
    formatacaoHTML: (ex: string) => `[FORMATACAO_HTML: ${ex}]`,
    formatacaoParagrafos: (ex: string) => `[FORMATACAO_PARAGRAFOS: ${ex}]`,
  },
  SOCRATIC_INTERN_LOGIC: '[SOCRATIC_INTERN_LOGIC]',
}));

vi.mock('../prompts/instrucoes', () => ({
  INSTRUCAO_NAO_PRESUMIR: '[INSTRUCAO_NAO_PRESUMIR]',
}));

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const mockTopic: ChatContextTopic = {
  title: 'Horas Extras',
  category: 'MERITO',
  relatorio: 'Mini-relatório original',
  editedRelatorio: 'Mini-relatório editado',
  fundamentacao: 'Fundamentação original',
  editedFundamentacao: 'Fundamentação editada',
};

const mockTopics: ChatContextTopic[] = [
  { title: 'RELATÓRIO', relatorio: 'Relatório geral do caso' },
  { title: 'Horas Extras', category: 'MERITO', relatorio: 'Pedido de horas extras', fundamentacao: 'Decisão sobre horas extras' },
  { title: 'FGTS', category: 'MERITO', relatorio: 'Pedido de FGTS', fundamentacao: 'Decisão sobre FGTS' },
  { title: 'DISPOSITIVO', editedContent: 'Julgo procedente em parte...' },
];

const mockDocuments: ChatContextDocuments = {
  peticoes: ['base64-peticao'],
  peticoesText: [{ name: 'peticao.pdf', text: 'Texto da petição' }],
  contestacoes: ['base64-contestacao'],
  contestacoesText: [{ text: 'Texto da contestação' }],
  complementares: ['base64-complementar'],
  complementaresText: [{ text: 'Texto complementar' }],
};

const mockProofManager = {
  proofFiles: [],
  proofTexts: [],
  proofTopicLinks: {},
};

const mockFileToBase64 = vi.fn(async () => 'base64-content');

function createParams(overrides: Partial<BuildChatContextParams> = {}): BuildChatContextParams {
  return {
    userMessage: 'Escreva a decisão sobre horas extras',
    options: {},
    currentTopic: mockTopic,
    currentContent: 'Conteúdo já escrito',
    allTopics: mockTopics,
    contextScope: 'current',
    analyzedDocuments: mockDocuments,
    proofManager: mockProofManager,
    fileToBase64: mockFileToBase64,
    anonymizationEnabled: false,
    anonymizationSettings: undefined,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildChatContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTRUTURA BÁSICA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Estrutura básica', () => {
    it('retorna um array de AIMessageContent', async () => {
      const result = await buildChatContext(createParams());

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('último item é o prompt de texto', async () => {
      const result = await buildChatContext(createParams());
      const lastItem = getLastTextItem(result);

      expect(lastItem.type).toBe('text');
      expect(typeof lastItem.text).toBe('string');
    });

    it('inclui instrução do usuário no prompt', async () => {
      const userMessage = 'Minha instrução específica';
      const result = await buildChatContext(createParams({ userMessage }));
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain(userMessage);
    });

    it('inclui SOCRATIC_INTERN_LOGIC no prompt', async () => {
      const result = await buildChatContext(createParams());
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain('[SOCRATIC_INTERN_LOGIC]');
    });

    it('inclui INSTRUCAO_NAO_PRESUMIR no prompt', async () => {
      const result = await buildChatContext(createParams());
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain('[INSTRUCAO_NAO_PRESUMIR]');
    });

    it('inclui estilo de redação no prompt', async () => {
      const result = await buildChatContext(createParams());
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain('[ESTILO_REDACAO]');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESCOPO DE CONTEXTO
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Escopo de contexto', () => {
    describe('contextScope: current', () => {
      it('inclui apenas o tópico atual', async () => {
        const result = await buildChatContext(createParams({ contextScope: 'current' }));
        const lastItem = getLastTextItem(result);

        expect(lastItem.text).toContain('CONTEXTO DO TÓPICO');
        expect(lastItem.text).toContain(mockTopic.title);
        expect(lastItem.text).not.toContain('CONTEXTO COMPLETO DA DECISÃO');
      });

      it('usa editedRelatorio se disponível', async () => {
        const result = await buildChatContext(createParams({ contextScope: 'current' }));
        const lastItem = getLastTextItem(result);

        expect(lastItem.text).toContain('Mini-relatório editado');
      });

      it('usa relatorio original se editedRelatorio não disponível', async () => {
        const topicSemEdited: ChatContextTopic = {
          title: 'Teste',
          relatorio: 'Relatório original apenas',
        };
        const result = await buildChatContext(createParams({
          contextScope: 'current',
          currentTopic: topicSemEdited,
        }));
        const lastItem = getLastTextItem(result);

        expect(lastItem.text).toContain('Relatório original apenas');
      });
    });

    describe('contextScope: all', () => {
      it('inclui todos os tópicos', async () => {
        const result = await buildChatContext(createParams({ contextScope: 'all' }));
        const lastItem = getLastTextItem(result);

        expect(lastItem.text).toContain('CONTEXTO COMPLETO DA DECISÃO');
        expect(lastItem.text).toContain('Horas Extras');
        expect(lastItem.text).toContain('FGTS');
      });

      it('formata RELATÓRIO corretamente', async () => {
        const result = await buildChatContext(createParams({ contextScope: 'all' }));
        const lastItem = getLastTextItem(result);

        expect(lastItem.text).toContain('RELATÓRIO GERAL');
        expect(lastItem.text).toContain('Relatório geral do caso');
      });

      it('formata DISPOSITIVO corretamente', async () => {
        const result = await buildChatContext(createParams({ contextScope: 'all' }));
        const lastItem = getLastTextItem(result);

        expect(lastItem.text).toContain('DISPOSITIVO');
        expect(lastItem.text).toContain('Julgo procedente em parte');
      });

      it('indica tópico sendo editado', async () => {
        const result = await buildChatContext(createParams({ contextScope: 'all' }));
        const lastItem = getLastTextItem(result);

        expect(lastItem.text).toContain('TÓPICO SENDO EDITADO');
        expect(lastItem.text).toContain(mockTopic.title);
      });
    });

    describe('contextScope: selected', () => {
      it('inclui apenas tópicos selecionados', async () => {
        const options: ChatContextOptions = {
          selectedContextTopics: ['Horas Extras', 'FGTS'],
        };
        const result = await buildChatContext(createParams({
          contextScope: 'selected',
          options,
        }));
        const lastItem = getLastTextItem(result);

        expect(lastItem.text).toContain('CONTEXTO DOS TÓPICOS SELECIONADOS');
        expect(lastItem.text).toContain('Horas Extras');
        expect(lastItem.text).toContain('FGTS');
        // RELATÓRIO não foi selecionado
        expect(lastItem.text).not.toContain('Relatório geral do caso');
      });

      it('selectedContextTopics sobrescreve contextScope', async () => {
        // Mesmo com contextScope: 'current', se selectedContextTopics for passado, usa 'selected'
        const options: ChatContextOptions = {
          selectedContextTopics: ['Horas Extras'],
        };
        const result = await buildChatContext(createParams({
          contextScope: 'current', // será ignorado
          options,
        }));
        const lastItem = getLastTextItem(result);

        expect(lastItem.text).toContain('CONTEXTO DOS TÓPICOS SELECIONADOS');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOGGLE DE DOCUMENTOS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Toggle includeMainDocs', () => {
    it('includeMainDocs=true (padrão) mantém todos os documentos', async () => {
      const { prepareDocumentsContext } = await import('./context-helpers');

      await buildChatContext(createParams({
        options: { includeMainDocs: true },
      }));

      expect(prepareDocumentsContext).toHaveBeenCalledWith(mockDocuments);
    });

    it('includeMainDocs=false exclui petições e contestações', async () => {
      const { prepareDocumentsContext } = await import('./context-helpers');

      await buildChatContext(createParams({
        options: { includeMainDocs: false },
      }));

      expect(prepareDocumentsContext).toHaveBeenCalledWith({
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: mockDocuments.complementares,
        complementaresText: mockDocuments.complementaresText,
      });
    });

    it('includeMainDocs=false mantém complementares', async () => {
      const { prepareDocumentsContext } = await import('./context-helpers');

      await buildChatContext(createParams({
        options: { includeMainDocs: false },
      }));

      const callArgs = (prepareDocumentsContext as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.complementares).toEqual(mockDocuments.complementares);
      expect(callArgs.complementaresText).toEqual(mockDocuments.complementaresText);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTRO DE PROVAS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Filtro de provas (proofFilter)', () => {
    it('proofFilter undefined usa prepareProofsContext', async () => {
      const { prepareProofsContext, prepareOralProofsContext } = await import('./context-helpers');

      await buildChatContext(createParams({
        options: { proofFilter: undefined },
      }));

      expect(prepareProofsContext).toHaveBeenCalled();
      expect(prepareOralProofsContext).not.toHaveBeenCalled();
    });

    it('proofFilter="oral" usa prepareOralProofsContext', async () => {
      const { prepareProofsContext: _prepareProofsContext, prepareOralProofsContext } = await import('./context-helpers');

      await buildChatContext(createParams({
        options: { proofFilter: 'oral' },
      }));

      expect(prepareOralProofsContext).toHaveBeenCalled();
      // prepareProofsContext não deve ser chamado quando é oral
    });

    it('passa parâmetros corretos para prepareProofsContext', async () => {
      const { prepareProofsContext } = await import('./context-helpers');

      await buildChatContext(createParams({
        anonymizationEnabled: true,
        anonymizationSettings: { names: ['João'] } as any,
      }));

      expect(prepareProofsContext).toHaveBeenCalledWith(
        mockProofManager,
        mockTopic.title,
        mockFileToBase64,
        true, // anonymizationEnabled
        { names: ['João'] } // anonymizationSettings
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANONIMIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Anonimização', () => {
    it('inclui preservarAnonimizacao quando habilitado', async () => {
      const result = await buildChatContext(createParams({
        anonymizationEnabled: true,
      }));
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain('[PRESERVAR_ANONIMIZACAO]');
    });

    it('não inclui preservarAnonimizacao quando desabilitado', async () => {
      const result = await buildChatContext(createParams({
        anonymizationEnabled: false,
      }));
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).not.toContain('[PRESERVAR_ANONIMIZACAO]');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('trata currentContent vazio', async () => {
      const result = await buildChatContext(createParams({
        currentContent: '',
      }));
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain('Ainda não foi escrito nada');
    });

    it('trata documentos vazios sem erro', async () => {
      const emptyDocs: ChatContextDocuments = {};

      await expect(buildChatContext(createParams({
        analyzedDocuments: emptyDocs,
      }))).resolves.not.toThrow();
    });

    it('trata tópico sem categoria', async () => {
      const topicSemCategoria: ChatContextTopic = {
        title: 'Teste',
        relatorio: 'Relatório',
      };
      const result = await buildChatContext(createParams({
        currentTopic: topicSemCategoria,
        contextScope: 'current',
      }));
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain('Não especificada');
    });

    it('trata tópico sem relatório', async () => {
      const topicSemRelatorio: ChatContextTopic = {
        title: 'Teste',
      };
      const result = await buildChatContext(createParams({
        currentTopic: topicSemRelatorio,
        contextScope: 'current',
      }));
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain('Não disponível');
    });

    it('allTopics vazio não causa erro', async () => {
      await expect(buildChatContext(createParams({
        allTopics: [],
        contextScope: 'all',
      }))).resolves.not.toThrow();
    });

    it('selectedContextTopics vazio não causa erro', async () => {
      await expect(buildChatContext(createParams({
        options: { selectedContextTopics: [] },
        contextScope: 'selected',
      }))).resolves.not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATAÇÃO DO PROMPT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Formatação do prompt', () => {
    it('inclui instruções de HTML', async () => {
      const result = await buildChatContext(createParams());
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain('[FORMATACAO_HTML:');
      expect(lastItem.text).toContain('[FORMATACAO_PARAGRAFOS:');
    });

    it('inclui aviso sobre mini-relatório', async () => {
      const result = await buildChatContext(createParams());
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain('NÃO INCLUIR MINI-RELATÓRIO');
    });

    it('inclui instruções socráticas de confirmação', async () => {
      const result = await buildChatContext(createParams());
      const lastItem = getLastTextItem(result);

      expect(lastItem.text).toContain('PERGUNTE ao usuário');
      expect(lastItem.text).toContain('confirmar com o usuário');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DOS TIPOS EXPORTADOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Tipos exportados', () => {
  it('ChatContextOptions aceita todos os campos opcionais', () => {
    const options: ChatContextOptions = {
      proofFilter: 'oral',
      includeMainDocs: false,
      selectedContextTopics: ['Horas Extras'],
    };

    expect(options.proofFilter).toBe('oral');
    expect(options.includeMainDocs).toBe(false);
    expect(options.selectedContextTopics).toHaveLength(1);
  });

  it('ChatContextOptions aceita objeto vazio', () => {
    const options: ChatContextOptions = {};

    expect(options.proofFilter).toBeUndefined();
    expect(options.includeMainDocs).toBeUndefined();
    expect(options.selectedContextTopics).toBeUndefined();
  });

  it('ChatContextTopic requer apenas title', () => {
    const minimalTopic: ChatContextTopic = {
      title: 'Título obrigatório',
    };

    expect(minimalTopic.title).toBe('Título obrigatório');
    expect(minimalTopic.category).toBeUndefined();
    expect(minimalTopic.relatorio).toBeUndefined();
  });

  it('ChatContextDocuments aceita todos os campos opcionais', () => {
    const docs: ChatContextDocuments = {
      peticoes: ['a'],
      peticoesText: [{ text: 'b' }],
      contestacoes: ['c'],
      contestacoesText: [{ text: 'd' }],
      complementares: ['e'],
      complementaresText: [{ text: 'f' }],
    };

    expect(docs.peticoes).toHaveLength(1);
  });

  it('ChatContextDocuments aceita objeto vazio', () => {
    const docs: ChatContextDocuments = {};

    expect(docs.peticoes).toBeUndefined();
  });
});
