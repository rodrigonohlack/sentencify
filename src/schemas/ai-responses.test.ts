/**
 * Testes para ai-responses.ts (Schemas Zod para validação de respostas da IA)
 * Verifica validação com dados válidos e inválidos para cada schema
 */
import { describe, it, expect } from 'vitest';
import {
  AnalysisIdentificacaoSchema,
  AnalysisPedidoSchema,
  AnalysisAlertaSchema,
  AnalysisResponseSchema,
  CorrectionSchema,
  DoubleCheckResponseSchema,
  TopicSchema,
  TopicExtractionSchema,
  FactRowSchema,
  FactsComparisonSchema,
  BulkModelSchema,
  BulkExtractionSchema,
  extractJSON,
  parseAIResponse,
} from './ai-responses';

describe('ai-responses schemas', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // AnalysisIdentificacaoSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AnalysisIdentificacaoSchema', () => {
    it('deve aceitar dados completos', () => {
      const data = {
        numeroProcesso: '0001234-56.2024.5.04.0001',
        reclamantes: ['João da Silva'],
        reclamadas: ['Empresa XYZ Ltda', 'Empresa ABC SA'],
        rito: 'Ordinário',
        vara: '1ª Vara do Trabalho',
        dataAjuizamento: '2024-01-15',
      };
      const result = AnalysisIdentificacaoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar dados parciais (todos os campos são opcionais exceto arrays)', () => {
      const data = {};
      const result = AnalysisIdentificacaoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reclamantes).toEqual([]);
        expect(result.data.reclamadas).toEqual([]);
      }
    });

    it('deve aceitar null nos campos nullable', () => {
      const data = {
        numeroProcesso: null,
        reclamantes: [],
        reclamadas: [],
        rito: null,
        vara: null,
        dataAjuizamento: null,
      };
      const result = AnalysisIdentificacaoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar reclamantes como tipo errado', () => {
      const data = { reclamantes: 'não é array' };
      const result = AnalysisIdentificacaoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('deve permitir campos extras (passthrough)', () => {
      const data = { campoExtra: 'valor', reclamantes: [], reclamadas: [] };
      const result = AnalysisIdentificacaoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).campoExtra).toBe('valor');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AnalysisPedidoSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AnalysisPedidoSchema', () => {
    it('deve aceitar pedido completo', () => {
      const data = {
        numero: 1,
        tema: 'Horas Extras',
        descricao: 'Pagamento de horas extras habituais',
        periodo: '2020-2023',
        valor: 'R$ 50.000,00',
        fatosReclamante: 'Trabalhava das 7h às 20h',
        defesaReclamada: 'Nega a jornada alegada',
        teseJuridica: 'Art. 59 CLT',
        controversia: true,
        confissaoFicta: 'Aplicável',
        pontosEsclarecer: ['Jornada exata', 'Intervalo'],
      };
      const result = AnalysisPedidoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar pedido mínimo', () => {
      const data = {};
      const result = AnalysisPedidoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tema).toBe('');
        expect(result.data.controversia).toBe(true);
        expect(result.data.pontosEsclarecer).toEqual([]);
      }
    });

    it('deve aceitar numero como string e converter para number', () => {
      const data = { numero: '5' };
      const result = AnalysisPedidoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numero).toBe(5);
      }
    });

    it('deve aceitar valor como number e converter para string', () => {
      const data = { valor: 50000 };
      const result = AnalysisPedidoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valor).toBe('50000');
      }
    });

    it('deve aceitar null em campos nullable', () => {
      const data = {
        tema: null,
        fatosReclamante: null,
        defesaReclamada: null,
        teseJuridica: null,
      };
      const result = AnalysisPedidoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        // tema usa .nullable().default('') - null permanece null (default só aplica para undefined)
        expect(result.data.tema).toBeNull();
        // fatosReclamante/defesaReclamada/teseJuridica usam .transform(v => v ?? '')
        expect(result.data.fatosReclamante).toBe('');
        expect(result.data.defesaReclamada).toBe('');
        expect(result.data.teseJuridica).toBe('');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AnalysisAlertaSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AnalysisAlertaSchema', () => {
    it('deve aceitar alerta completo', () => {
      const data = {
        tipo: 'prescrição',
        descricao: 'Possível prescrição quinquenal',
        severidade: 'alta',
        recomendacao: 'Verificar datas',
      };
      const result = AnalysisAlertaSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar alerta mínimo com defaults', () => {
      const data = {};
      const result = AnalysisAlertaSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tipo).toBe('');
        expect(result.data.descricao).toBe('');
        expect(result.data.severidade).toBe('media');
        expect(result.data.recomendacao).toBe('');
      }
    });

    it('deve aceitar null nos campos nullable e aplicar transforms', () => {
      const data = {
        tipo: null,
        descricao: null,
        severidade: null,
        recomendacao: null,
      };
      const result = AnalysisAlertaSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tipo).toBe('');
        expect(result.data.descricao).toBe('');
        expect(result.data.severidade).toBe('media');
        expect(result.data.recomendacao).toBe('');
      }
    });

    it('deve aceitar severidades válidas', () => {
      for (const sev of ['alta', 'media', 'baixa'] as const) {
        const result = AnalysisAlertaSchema.safeParse({ severidade: sev });
        expect(result.success).toBe(true);
      }
    });

    it('deve rejeitar severidade inválida', () => {
      const data = { severidade: 'critica' };
      const result = AnalysisAlertaSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AnalysisResponseSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AnalysisResponseSchema', () => {
    it('deve aceitar resposta completa', () => {
      const data = {
        identificacao: {
          numeroProcesso: '0001234-56.2024.5.04.0001',
          reclamantes: ['João'],
          reclamadas: ['Empresa'],
        },
        pedidos: [{ tema: 'Horas Extras' }],
        alertas: [{ tipo: 'atenção', descricao: 'Teste', severidade: 'alta' }],
      };
      const result = AnalysisResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar resposta mínima com defaults', () => {
      const data = {};
      const result = AnalysisResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pedidos).toEqual([]);
        expect(result.data.alertas).toEqual([]);
        expect(result.data.tutelasProvisoras).toEqual([]);
        expect(result.data.preliminares).toEqual([]);
        expect(result.data.defesasAutonomas).toEqual([]);
        expect(result.data.tabelaSintetica).toEqual([]);
      }
    });

    it('deve validar pedidos com schema correto', () => {
      const data = {
        pedidos: [
          { tema: 'Horas Extras', controversia: false },
          { tema: null, numero: '2' },
        ],
      };
      const result = AnalysisResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pedidos[0].tema).toBe('Horas Extras');
        expect(result.data.pedidos[0].controversia).toBe(false);
        // tema: null permanece null (nullable().default('') não transforma null, só undefined)
        expect(result.data.pedidos[1].tema).toBeNull();
        expect(result.data.pedidos[1].numero).toBe(2);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CorrectionSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CorrectionSchema', () => {
    it('deve aceitar todos os tipos de correção válidos', () => {
      const validTypes = [
        'remove', 'add', 'merge', 'reclassify',
        'modify', 'false_positive', 'missed', 'improve',
        'add_row', 'fix_row', 'remove_row', 'add_fato',
      ];
      for (const type of validTypes) {
        const result = CorrectionSchema.safeParse({ type });
        expect(result.success).toBe(true);
      }
    });

    it('deve rejeitar tipo inválido', () => {
      const result = CorrectionSchema.safeParse({ type: 'invalido' });
      expect(result.success).toBe(false);
    });

    it('deve aceitar correção completa', () => {
      const data = {
        type: 'improve',
        description: 'Melhorar redação',
        original: 'Texto original',
        corrected: 'Texto corrigido',
      };
      const result = CorrectionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve transformar null em defaults', () => {
      const data = {
        type: 'remove',
        description: null,
        original: null,
        corrected: null,
      };
      const result = CorrectionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('');
        expect(result.data.original).toBeUndefined();
        expect(result.data.corrected).toBeUndefined();
      }
    });

    it('deve permitir campos extras (passthrough)', () => {
      const data = { type: 'remove', topic: 'Horas Extras', reason: 'Não pertence' };
      const result = CorrectionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).topic).toBe('Horas Extras');
        expect((result.data as Record<string, unknown>).reason).toBe('Não pertence');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DoubleCheckResponseSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DoubleCheckResponseSchema', () => {
    it('deve aceitar resposta completa', () => {
      const data = {
        corrections: [
          { type: 'remove', description: 'Falso positivo' },
        ],
        confidence: 0.95,
        summary: 'Uma correção identificada',
      };
      const result = DoubleCheckResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar resposta mínima com defaults', () => {
      const data = {};
      const result = DoubleCheckResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.corrections).toEqual([]);
        expect(result.data.confidence).toBe(0.85);
        expect(result.data.summary).toBe('');
      }
    });

    it('deve rejeitar confidence fora do intervalo [0, 1]', () => {
      const resultAbove = DoubleCheckResponseSchema.safeParse({ confidence: 1.5 });
      expect(resultAbove.success).toBe(false);

      const resultBelow = DoubleCheckResponseSchema.safeParse({ confidence: -0.1 });
      expect(resultBelow.success).toBe(false);
    });

    it('deve aceitar confidence nos limites', () => {
      const result0 = DoubleCheckResponseSchema.safeParse({ confidence: 0 });
      expect(result0.success).toBe(true);

      const result1 = DoubleCheckResponseSchema.safeParse({ confidence: 1 });
      expect(result1.success).toBe(true);
    });

    it('deve aceitar null em summary', () => {
      const result = DoubleCheckResponseSchema.safeParse({ summary: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toBe('');
      }
    });

    it('deve permitir campos extras como verifiedDispositivo', () => {
      const data = {
        corrections: [],
        confidence: 0.9,
        summary: 'OK',
        verifiedDispositivo: 'Texto do dispositivo verificado',
      };
      const result = DoubleCheckResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).verifiedDispositivo).toBe('Texto do dispositivo verificado');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TopicSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TopicSchema', () => {
    it('deve aceitar tópico completo', () => {
      const data = { title: 'HORAS EXTRAS', category: 'MÉRITO' };
      const result = TopicSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar null e transformar para string vazia', () => {
      const data = { title: null, category: null };
      const result = TopicSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('');
        expect(result.data.category).toBe('');
      }
    });

    it('deve usar defaults quando não fornecido', () => {
      const data = {};
      const result = TopicSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('');
        expect(result.data.category).toBe('');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TopicExtractionSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TopicExtractionSchema', () => {
    it('deve aceitar extração completa', () => {
      const data = {
        partes: {
          reclamante: 'João da Silva',
          reclamadas: ['Empresa XYZ Ltda'],
        },
        topics: [
          { title: 'HORAS EXTRAS', category: 'MÉRITO' },
          { title: 'PRESCRIÇÃO', category: 'PRELIMINAR' },
        ],
      };
      const result = TopicExtractionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar dados mínimos com defaults', () => {
      const data = {};
      const result = TopicExtractionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.partes).toEqual({ reclamante: '', reclamadas: [] });
        expect(result.data.topics).toEqual([]);
      }
    });

    it('deve transformar null em reclamante para string vazia', () => {
      const data = {
        partes: { reclamante: null, reclamadas: [] },
        topics: [],
      };
      const result = TopicExtractionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.partes!.reclamante).toBe('');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FactRowSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('FactRowSchema', () => {
    it('deve aceitar fato completo', () => {
      const data = {
        tema: 'Jornada de Trabalho',
        fato: 'Jornada das 7h às 20h',
        alegacaoReclamante: 'Trabalhava 13h por dia',
        alegacaoReclamada: 'Jornada era de 8h',
        status: 'controverso',
        relevancia: 'alta',
        observacao: 'Há prova documental',
      };
      const result = FactRowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar fato mínimo com defaults', () => {
      const data = {};
      const result = FactRowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('controverso');
        expect(result.data.relevancia).toBe('media');
        expect(result.data.fato).toBe('');
        expect(result.data.alegacaoReclamante).toBe('');
        expect(result.data.alegacaoReclamada).toBe('');
      }
    });

    it('deve aceitar todos os status válidos', () => {
      for (const status of ['controverso', 'incontroverso', 'silencio'] as const) {
        const result = FactRowSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('deve rejeitar status inválido', () => {
      const result = FactRowSchema.safeParse({ status: 'invalido' });
      expect(result.success).toBe(false);
    });

    it('deve aceitar todas as relevâncias válidas', () => {
      for (const rel of ['alta', 'media', 'baixa'] as const) {
        const result = FactRowSchema.safeParse({ relevancia: rel });
        expect(result.success).toBe(true);
      }
    });

    it('deve rejeitar relevância inválida', () => {
      const result = FactRowSchema.safeParse({ relevancia: 'critica' });
      expect(result.success).toBe(false);
    });

    it('deve transformar null em campos para string vazia', () => {
      const data = {
        fato: null,
        alegacaoReclamante: null,
        alegacaoReclamada: null,
      };
      const result = FactRowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fato).toBe('');
        expect(result.data.alegacaoReclamante).toBe('');
        expect(result.data.alegacaoReclamada).toBe('');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FactsComparisonSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('FactsComparisonSchema', () => {
    it('deve aceitar confronto completo', () => {
      const data = {
        tabela: [
          { tema: 'Jornada', status: 'controverso', relevancia: 'alta' },
        ],
        fatosIncontroversos: ['Data de admissão'],
        fatosControversos: ['Horário de trabalho'],
        pontosChave: ['Divergência sobre jornada'],
        resumo: 'Resumo do confronto',
      };
      const result = FactsComparisonSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar dados mínimos com defaults', () => {
      const data = {};
      const result = FactsComparisonSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tabela).toEqual([]);
        expect(result.data.fatosIncontroversos).toEqual([]);
        expect(result.data.fatosControversos).toEqual([]);
        expect(result.data.pontosChave).toEqual([]);
        expect(result.data.resumo).toBe('');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BulkModelSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('BulkModelSchema', () => {
    it('deve aceitar modelo completo', () => {
      const data = {
        titulo: 'Horas Extras - Procedente',
        categoria: 'Mérito',
        palavrasChave: ['horas extras', 'procedente'],
        conteudo: 'Texto do modelo',
      };
      const result = BulkModelSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar modelo mínimo com defaults', () => {
      const data = {};
      const result = BulkModelSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.titulo).toBe('');
        expect(result.data.categoria).toBe('');
        expect(result.data.palavrasChave).toEqual([]);
        expect(result.data.conteudo).toBe('');
      }
    });

    it('deve transformar null em strings vazias', () => {
      const data = {
        titulo: null,
        categoria: null,
        conteudo: null,
      };
      const result = BulkModelSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.titulo).toBe('');
        expect(result.data.categoria).toBe('');
        expect(result.data.conteudo).toBe('');
      }
    });

    it('deve aceitar palavrasChave como string separada por vírgulas', () => {
      const data = {
        palavrasChave: 'horas extras, procedente, mérito',
      };
      const result = BulkModelSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.palavrasChave).toEqual(['horas extras', 'procedente', 'mérito']);
      }
    });

    it('deve aceitar palavrasChave como array', () => {
      const data = {
        palavrasChave: ['keyword1', 'keyword2'],
      };
      const result = BulkModelSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.palavrasChave).toEqual(['keyword1', 'keyword2']);
      }
    });

    it('deve transformar string vazia de palavrasChave em array vazio', () => {
      const data = { palavrasChave: '' };
      const result = BulkModelSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.palavrasChave).toEqual([]);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BulkExtractionSchema
  // ═══════════════════════════════════════════════════════════════════════════

  describe('BulkExtractionSchema', () => {
    it('deve aceitar extração com modelos', () => {
      const data = {
        modelos: [
          { titulo: 'Modelo 1', conteudo: 'Conteúdo 1' },
          { titulo: 'Modelo 2', conteudo: 'Conteúdo 2' },
        ],
      };
      const result = BulkExtractionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve aceitar dados mínimos com default', () => {
      const data = {};
      const result = BulkExtractionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.modelos).toEqual([]);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractJSON (função utilitária)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractJSON', () => {
    it('deve extrair JSON de code block com tag json', () => {
      const response = 'Aqui está:\n```json\n{"key": "value"}\n```';
      expect(extractJSON(response)).toBe('{"key": "value"}');
    });

    it('deve extrair JSON de code block sem tag', () => {
      const response = 'Resultado:\n```\n{"key": "value"}\n```';
      expect(extractJSON(response)).toBe('{"key": "value"}');
    });

    it('deve extrair JSON direto (objeto)', () => {
      const response = 'A resposta é: {"topics": []}';
      expect(extractJSON(response)).toBe('{"topics": []}');
    });

    it('deve extrair JSON direto (array)', () => {
      const response = 'Lista: [{"id": 1}, {"id": 2}]';
      expect(extractJSON(response)).toBe('[{"id": 1}, {"id": 2}]');
    });

    it('deve retornar null quando não há JSON', () => {
      const response = 'Apenas texto sem JSON';
      expect(extractJSON(response)).toBeNull();
    });

    it('deve retornar null para string vazia', () => {
      expect(extractJSON('')).toBeNull();
    });

    it('deve extrair JSON multi-linha de code block', () => {
      const response = '```json\n{\n  "key": "value",\n  "arr": [1, 2, 3]\n}\n```';
      const result = extractJSON(response);
      expect(result).toContain('"key": "value"');
      expect(result).toContain('"arr": [1, 2, 3]');
    });

    it('deve priorizar code block sobre JSON direto', () => {
      const response = '{"outside": true}\n```json\n{"inside": true}\n```';
      const result = extractJSON(response);
      expect(result).toBe('{"inside": true}');
    });

    it('deve extrair JSON com conteúdo complexo', () => {
      const response = '```json\n{"corrections": [], "confidence": 0.95, "summary": "OK"}\n```';
      const result = extractJSON(response);
      expect(result).toContain('corrections');
      expect(result).toContain('0.95');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // parseAIResponse (função utilitária)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('parseAIResponse', () => {
    it('deve parsear resposta válida com sucesso', () => {
      const response = '```json\n{"corrections": [], "confidence": 0.9, "summary": "OK"}\n```';
      const result = parseAIResponse(response, DoubleCheckResponseSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.corrections).toEqual([]);
        expect(result.data.confidence).toBe(0.9);
        expect(result.data.summary).toBe('OK');
      }
    });

    it('deve retornar erro quando não há JSON na resposta', () => {
      const response = 'Apenas texto sem JSON válido';
      const result = parseAIResponse(response, DoubleCheckResponseSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Nenhum JSON encontrado');
      }
    });

    it('deve retornar erro para JSON malformado', () => {
      const response = '```json\n{invalid json here}\n```';
      const result = parseAIResponse(response, DoubleCheckResponseSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('JSON inválido');
      }
    });

    it('deve retornar erro quando validação do schema falha', () => {
      // confidence > 1 é inválido
      const response = '{"corrections": [], "confidence": 5.0, "summary": ""}';
      const result = parseAIResponse(response, DoubleCheckResponseSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validação falhou');
      }
    });

    it('deve funcionar com TopicExtractionSchema', () => {
      const response = '```json\n{"partes": {"reclamante": "João", "reclamadas": ["Empresa"]}, "topics": [{"title": "FÉRIAS", "category": "MÉRITO"}]}\n```';
      const result = parseAIResponse(response, TopicExtractionSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topics[0].title).toBe('FÉRIAS');
      }
    });

    it('deve funcionar com FactsComparisonSchema', () => {
      const response = '{"tabela": [{"tema": "Jornada", "status": "controverso"}], "fatosIncontroversos": ["Admissão"], "resumo": "Teste"}';
      const result = parseAIResponse(response, FactsComparisonSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tabela[0].tema).toBe('Jornada');
        expect(result.data.fatosIncontroversos).toContain('Admissão');
      }
    });

    it('deve funcionar com BulkExtractionSchema', () => {
      const response = '{"modelos": [{"titulo": "Modelo Teste", "conteudo": "Conteúdo"}]}';
      const result = parseAIResponse(response, BulkExtractionSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.modelos[0].titulo).toBe('Modelo Teste');
      }
    });

    it('deve aplicar transforms do schema (ex: null -> "")', () => {
      const response = '{"corrections": [{"type": "remove", "description": null}], "confidence": 0.8}';
      const result = parseAIResponse(response, DoubleCheckResponseSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.corrections[0].description).toBe('');
      }
    });

    it('deve aplicar defaults do schema', () => {
      const response = '{}';
      const result = parseAIResponse(response, DoubleCheckResponseSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.corrections).toEqual([]);
        expect(result.data.confidence).toBe(0.85);
      }
    });
  });
});
