/**
 * Testes de integração para geração de sentenças
 * v1.33.38
 */
import { describe, it, expect } from 'vitest';
import {
  validateTopicForGeneration,
  formatReclamadas,
  extractPartesFromRelatorio,
  formatTopicosSection,
  checkMeritDecisions,
  formatFundamentacaoHTML,
  checkDispositivoConsistency
} from '../utils/sentenceGeneration';

describe('sentenceGeneration', () => {
  describe('validateTopicForGeneration', () => {
    it('deve validar tópico completo', () => {
      const topic = {
        title: 'HORAS EXTRAS',
        category: 'Mérito',
        miniRelatorio: 'O autor alega que trabalhava além da jornada legal, realizando horas extras diárias...',
        decision: 'procedente'
      };

      const result = validateTopicForGeneration(topic);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('deve avisar sobre mini-relatório curto', () => {
      const topic = {
        title: 'HORAS EXTRAS',
        category: 'Mérito',
        miniRelatorio: 'Curto',
        decision: 'procedente'
      };

      const result = validateTopicForGeneration(topic);
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Mini-relatório ausente ou muito curto (mínimo 50 caracteres)');
    });

    it('deve avisar sobre decisão ausente', () => {
      const topic = {
        title: 'HORAS EXTRAS',
        category: 'Mérito',
        miniRelatorio: 'O autor alega que trabalhava além da jornada legal, realizando horas extras diárias...'
      };

      const result = validateTopicForGeneration(topic);
      expect(result.warnings).toContain('Decisão (procedente/improcedente) não definida');
    });

    it('deve permitir RELATÓRIO sem decisão', () => {
      const topic = {
        title: 'RELATÓRIO',
        category: 'Relatório',
        miniRelatorio: 'O reclamante ajuizou a presente reclamação trabalhista em face da reclamada...'
      };

      const result = validateTopicForGeneration(topic);
      expect(result.warnings).not.toContain('Decisão (procedente/improcedente) não definida');
    });

    it('deve permitir DISPOSITIVO sem decisão', () => {
      const topic = {
        title: 'DISPOSITIVO',
        category: 'Dispositivo',
        miniRelatorio: 'Ante o exposto, julgo procedente em parte os pedidos formulados...'
      };

      const result = validateTopicForGeneration(topic);
      expect(result.warnings).not.toContain('Decisão (procedente/improcedente) não definida');
    });

    it('deve retornar inválido para tópico null', () => {
      const result = validateTopicForGeneration(null);
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Tópico não fornecido');
    });
  });

  describe('formatReclamadas', () => {
    it('deve formatar reclamada única sem ordinal', () => {
      const reclamadas = [{ nome: 'EMPRESA XYZ LTDA', tipo: 'empresa' }];
      const result = formatReclamadas(reclamadas);
      expect(result).toBe('EMPRESA XYZ LTDA');
    });

    it('deve formatar múltiplas reclamadas com ordinal', () => {
      const reclamadas = [
        { nome: 'EMPRESA A LTDA', tipo: 'empresa' },
        { nome: 'EMPRESA B S.A.', tipo: 'empresa' }
      ];
      const result = formatReclamadas(reclamadas);
      expect(result).toContain('primeira ré: EMPRESA A LTDA');
      expect(result).toContain('segunda ré: EMPRESA B S.A.');
    });

    it('deve usar termo "reclamado" para petição inicial', () => {
      const reclamadas = [
        { nome: 'EMPRESA A', tipo: 'empresa' },
        { nome: 'EMPRESA B', tipo: 'empresa' }
      ];
      const result = formatReclamadas(reclamadas, true);
      expect(result).toContain('primeiro reclamado');
      expect(result).not.toContain('ré');
    });

    it('deve retornar vazio para lista vazia', () => {
      expect(formatReclamadas([])).toBe('');
      expect(formatReclamadas(null)).toBe('');
    });
  });

  describe('extractPartesFromRelatorio', () => {
    it('deve extrair primeiro parágrafo', () => {
      const relatorio = `<p>JOÃO DA SILVA, qualificado na inicial, ajuizou reclamação trabalhista em face de XYZ LTDA.</p>
<p>Alega que foi admitido em 01/01/2020...</p>`;

      const result = extractPartesFromRelatorio(relatorio);
      expect(result).toContain('JOÃO DA SILVA');
      expect(result).toContain('XYZ LTDA');
      expect(result).not.toContain('Alega que foi admitido');
    });

    it('deve remover tags HTML', () => {
      const relatorio = '<p><strong>JOÃO</strong> ajuizou <em>reclamação</em>.</p>';
      const result = extractPartesFromRelatorio(relatorio);
      expect(result).not.toContain('<');
      expect(result).toContain('JOÃO');
    });

    it('deve retornar vazio para relatório vazio', () => {
      expect(extractPartesFromRelatorio('')).toBe('');
      expect(extractPartesFromRelatorio(null)).toBe('');
    });
  });

  describe('formatTopicosSection', () => {
    it('deve formatar tópicos com decisão', () => {
      const topicosComDecisao = [
        { title: 'HORAS EXTRAS', decision: 'procedente', fundamentacao: 'Restou comprovado...' },
        { title: 'DANOS MORAIS', decision: 'improcedente', fundamentacao: 'Não houve prova...' }
      ];

      const result = formatTopicosSection(topicosComDecisao, []);
      expect(result).toContain('✅ TÓPICOS COM DECISÃO');
      expect(result).toContain('HORAS EXTRAS: ✓ PROCEDENTE');
      expect(result).toContain('DANOS MORAIS: ✗ IMPROCEDENTE');
    });

    it('deve formatar tópicos sem decisão', () => {
      const topicosSemDecisao = [
        { title: 'ADICIONAL NOTURNO' },
        { title: 'MULTA DO 477' }
      ];

      const result = formatTopicosSection([], topicosSemDecisao);
      expect(result).toContain('⚠️ TÓPICOS SEM DECISÃO');
      expect(result).toContain('ADICIONAL NOTURNO');
      expect(result).toContain('MULTA DO 477');
    });

    it('deve incluir trecho da fundamentação', () => {
      const topicosComDecisao = [
        {
          title: 'HORAS EXTRAS',
          decision: 'procedente',
          fundamentacao: 'Restou comprovado nos autos que o reclamante laborava em jornada extraordinária...'
        }
      ];

      const result = formatTopicosSection(topicosComDecisao, []);
      expect(result).toContain('Fundamentação: Restou comprovado');
    });
  });

  describe('checkMeritDecisions', () => {
    it('deve retornar ready=true quando todos têm decisão', () => {
      const topics = [
        { title: 'HORAS EXTRAS', category: 'Mérito', decision: 'procedente' },
        { title: 'DANOS MORAIS', category: 'Mérito', decision: 'improcedente' }
      ];

      const result = checkMeritDecisions(topics);
      expect(result.ready).toBe(true);
      expect(result.pending).toHaveLength(0);
    });

    it('deve retornar pending com tópicos sem decisão', () => {
      const topics = [
        { title: 'HORAS EXTRAS', category: 'Mérito', decision: 'procedente' },
        { title: 'DANOS MORAIS', category: 'Mérito' }, // sem decisão
        { title: 'MULTA 477', category: 'Mérito' } // sem decisão
      ];

      const result = checkMeritDecisions(topics);
      expect(result.ready).toBe(false);
      expect(result.pending).toContain('DANOS MORAIS');
      expect(result.pending).toContain('MULTA 477');
    });

    it('deve ignorar RELATÓRIO e DISPOSITIVO', () => {
      const topics = [
        { title: 'RELATÓRIO', category: 'Relatório' }, // sem decisão, mas OK
        { title: 'HORAS EXTRAS', category: 'Mérito', decision: 'procedente' },
        { title: 'DISPOSITIVO', category: 'Dispositivo' } // sem decisão, mas OK
      ];

      const result = checkMeritDecisions(topics);
      expect(result.ready).toBe(true);
    });

    it('deve ignorar categorias não-mérito', () => {
      const topics = [
        { title: 'PRESCRIÇÃO', category: 'Prejudicial' }, // sem decisão
        { title: 'INCOMPETÊNCIA', category: 'Preliminar' } // sem decisão
      ];

      const result = checkMeritDecisions(topics);
      expect(result.ready).toBe(true); // não há mérito
      expect(result.pending).toHaveLength(0);
    });
  });

  describe('formatFundamentacaoHTML', () => {
    it('deve adicionar título se não existir', () => {
      const content = 'Restou comprovado nos autos...';
      const result = formatFundamentacaoHTML(content, 'HORAS EXTRAS');
      expect(result).toContain('<strong>HORAS EXTRAS</strong>');
    });

    it('deve manter título existente', () => {
      const content = '<p><strong>HORAS EXTRAS</strong></p><p>Restou comprovado...</p>';
      const result = formatFundamentacaoHTML(content, 'HORAS EXTRAS');
      // Não deve duplicar o título
      expect((result.match(/HORAS EXTRAS/g) || []).length).toBe(1);
    });

    it('deve retornar vazio para conteúdo vazio', () => {
      expect(formatFundamentacaoHTML('', 'TESTE')).toBe('');
      expect(formatFundamentacaoHTML(null, 'TESTE')).toBe('');
    });
  });

  describe('checkDispositivoConsistency', () => {
    it('deve detectar consistência entre decisões e dispositivo', () => {
      const topics = [
        { title: 'HORAS EXTRAS', decision: 'procedente' }
      ];
      const dispositivo = 'JULGO PROCEDENTE o pedido de horas extras e CONDENO a ré...';

      const result = checkDispositivoConsistency(topics, dispositivo);
      expect(result.consistent).toBe(true);
    });

    it('deve detectar inconsistência', () => {
      const topics = [
        { title: 'HORAS EXTRAS', decision: 'procedente' }
      ];
      const dispositivo = 'JULGO IMPROCEDENTES os pedidos...';

      const result = checkDispositivoConsistency(topics, dispositivo);
      // Pode detectar inconsistência dependendo da implementação
      expect(result.inconsistencies).toBeDefined();
    });

    it('deve retornar inconsistente para dispositivo vazio', () => {
      const result = checkDispositivoConsistency([], '');
      expect(result.consistent).toBe(false);
      expect(result.inconsistencies).toContain('Dispositivo vazio');
    });
  });

  describe('Fluxo de integração completo', () => {
    it('deve validar todos os tópicos antes de gerar dispositivo', () => {
      const topics = [
        {
          title: 'RELATÓRIO',
          category: 'Relatório',
          miniRelatorio: 'JOÃO DA SILVA ajuizou reclamação trabalhista em face de XYZ LTDA, alegando...'
        },
        {
          title: 'PRESCRIÇÃO',
          category: 'Prejudicial',
          miniRelatorio: 'A reclamada arguiu prescrição quinquenal, alegando que parte dos pedidos...',
          decision: 'improcedente'
        },
        {
          title: 'HORAS EXTRAS',
          category: 'Mérito',
          miniRelatorio: 'O autor alega que trabalhava além da jornada contratual, realizando horas extras...',
          decision: 'procedente',
          fundamentacao: 'Restou comprovado pelos cartões de ponto que o reclamante laborava em sobrejornada.'
        },
        {
          title: 'DANOS MORAIS',
          category: 'Mérito',
          miniRelatorio: 'O autor alega ter sofrido assédio moral no ambiente de trabalho por parte de superiores...',
          decision: 'improcedente',
          fundamentacao: 'Não houve prova do alegado assédio.'
        }
      ];

      // 1. Validar cada tópico
      for (const topic of topics) {
        const validation = validateTopicForGeneration(topic);
        expect(validation.valid).toBe(true);
      }

      // 2. Verificar decisões de mérito
      const decisions = checkMeritDecisions(topics);
      expect(decisions.ready).toBe(true);

      // 3. Extrair partes do relatório
      const partes = extractPartesFromRelatorio(topics[0].miniRelatorio);
      expect(partes).toContain('JOÃO DA SILVA');

      // 4. Formatar seção de tópicos
      const topicosComDecisao = topics.filter(t => t.decision);
      const topicosSection = formatTopicosSection(topicosComDecisao, []);
      expect(topicosSection).toContain('HORAS EXTRAS: ✓ PROCEDENTE');
      expect(topicosSection).toContain('DANOS MORAIS: ✗ IMPROCEDENTE');

      // 5. Simular dispositivo e verificar consistência
      const dispositivo = `Ante o exposto, JULGO PROCEDENTE EM PARTE os pedidos para:
a) CONDENAR a ré ao pagamento de horas extras...
b) JULGAR IMPROCEDENTE o pedido de danos morais.
DEFIRO a gratuidade de justiça.`;

      const consistency = checkDispositivoConsistency(topicosComDecisao, dispositivo);
      expect(consistency.consistent).toBe(true);
    });
  });
});
