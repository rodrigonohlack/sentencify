/**
 * Testes de integração para análise de provas
 * v1.33.38
 */
import { describe, it, expect } from 'vitest';
import {
  anonymizeText,
  formatProofContext,
  validateProofForAnalysis,
  buildProofAnalysisPrompt,
  parseAnalysisResponse
} from '../utils/proofAnalysis';

describe('proofAnalysis', () => {
  describe('anonymizeText', () => {
    it('deve anonimizar nome simples', () => {
      const text = 'João Silva trabalhou na empresa por 5 anos.';
      const names = [{ original: 'João Silva', replacement: '[AUTOR]' }];

      const result = anonymizeText(text, names);
      expect(result).toBe('[AUTOR] trabalhou na empresa por 5 anos.');
    });

    it('deve anonimizar múltiplos nomes', () => {
      const text = 'João Silva processou Maria Santos e Pedro Oliveira.';
      const names = [
        { original: 'João Silva', replacement: '[AUTOR]' },
        { original: 'Maria Santos', replacement: '[RÉ 1]' },
        { original: 'Pedro Oliveira', replacement: '[RÉ 2]' }
      ];

      const result = anonymizeText(text, names);
      expect(result).toBe('[AUTOR] processou [RÉ 1] e [RÉ 2].');
    });

    it('deve ser case-insensitive', () => {
      const text = 'JOÃO SILVA e João Silva são a mesma pessoa.';
      const names = [{ original: 'João Silva', replacement: '[AUTOR]' }];

      const result = anonymizeText(text, names);
      expect(result).toBe('[AUTOR] e [AUTOR] são a mesma pessoa.');
    });

    it('deve retornar texto original se names for vazio', () => {
      const text = 'João Silva trabalhou.';
      expect(anonymizeText(text, [])).toBe(text);
      expect(anonymizeText(text, null)).toBe(text);
    });

    it('deve respeitar word boundaries', () => {
      const text = 'Joãozinho não deve ser anonimizado.';
      const names = [{ original: 'João', replacement: '[AUTOR]' }];

      const result = anonymizeText(text, names);
      expect(result).toBe('Joãozinho não deve ser anonimizado.');
    });
  });

  describe('formatProofContext', () => {
    const mockProof = {
      name: 'Contrato de Trabalho.pdf',
      type: 'documento',
      date: '2024-01-15',
      extractedText: 'CONTRATO INDIVIDUAL DE TRABALHO\n\nAs partes contratantes...'
    };

    it('deve formatar prova com metadados', () => {
      const context = formatProofContext(mockProof);

      expect(context).toContain('📄 PROVA: Contrato de Trabalho.pdf');
      expect(context).toContain('Tipo: documento');
      expect(context).toContain('Data: 2024-01-15');
      expect(context).toContain('CONTRATO INDIVIDUAL DE TRABALHO');
    });

    it('deve omitir metadados quando solicitado', () => {
      const context = formatProofContext(mockProof, { includeMetadata: false });

      expect(context).not.toContain('📄 PROVA:');
      expect(context).toContain('CONTRATO INDIVIDUAL DE TRABALHO');
    });

    it('deve truncar texto longo', () => {
      const longProof = {
        ...mockProof,
        extractedText: 'A'.repeat(60000) // 60k caracteres
      };

      const context = formatProofContext(longProof, { maxLength: 50000 });
      expect(context.length).toBeLessThan(60000);
      expect(context).toContain('[... texto truncado ...]');
    });

    it('deve incluir tópicos vinculados quando solicitado', () => {
      const proofWithTopics = {
        ...mockProof,
        linkedTopics: [
          { title: 'HORAS EXTRAS', miniRelatorio: 'O autor alega horas extras...' },
          { title: 'VÍNCULO', miniRelatorio: 'Discussão sobre vínculo empregatício...' }
        ]
      };

      const context = formatProofContext(proofWithTopics, { includeLinkedTopics: true });

      expect(context).toContain('📎 TÓPICOS VINCULADOS:');
      expect(context).toContain('HORAS EXTRAS');
      expect(context).toContain('VÍNCULO');
    });
  });

  describe('validateProofForAnalysis', () => {
    it('deve validar prova com texto extraído', () => {
      const proof = { extractedText: 'Texto da prova com mais de 10 caracteres.' };
      const result = validateProofForAnalysis(proof);
      expect(result.valid).toBe(true);
    });

    it('deve rejeitar prova null', () => {
      const result = validateProofForAnalysis(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Prova não fornecida');
    });

    it('deve rejeitar prova sem texto', () => {
      const proof = { name: 'arquivo.pdf' };
      const result = validateProofForAnalysis(proof);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Prova sem texto extraído');
    });

    it('deve rejeitar texto muito curto', () => {
      const proof = { extractedText: 'ABC' };
      const result = validateProofForAnalysis(proof);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito curto');
    });

    it('deve aceitar campo text como alternativa a extractedText', () => {
      const proof = { text: 'Texto alternativo com mais de 10 caracteres.' };
      const result = validateProofForAnalysis(proof);
      expect(result.valid).toBe(true);
    });
  });

  describe('buildProofAnalysisPrompt', () => {
    const proofContext = 'Conteúdo da prova aqui...';

    it('deve criar prompt contextual', () => {
      const prompt = buildProofAnalysisPrompt('contextual', '', proofContext);

      expect(prompt).toContain('contexto dos tópicos');
      expect(prompt).toContain('Relevância da prova');
      expect(prompt).toContain('Valor probatório');
      expect(prompt).toContain(proofContext);
    });

    it('deve criar prompt livre', () => {
      const prompt = buildProofAnalysisPrompt('livre', '', proofContext);

      expect(prompt).toContain('Analise livremente');
      expect(prompt).toContain('Resumo do conteúdo');
      expect(prompt).toContain(proofContext);
    });

    it('deve incluir instruções customizadas', () => {
      const customInstructions = 'Foque na questão do horário de trabalho.';
      const prompt = buildProofAnalysisPrompt('contextual', customInstructions, proofContext);

      expect(prompt).toContain('INSTRUÇÕES ADICIONAIS');
      expect(prompt).toContain('Foque na questão do horário de trabalho');
    });
  });

  describe('parseAnalysisResponse', () => {
    it('deve extrair seções numeradas da resposta', () => {
      const response = `1. Relevância: A prova é altamente relevante para a discussão de horas extras.

2. Fatos: Comprova que o autor trabalhava das 8h às 20h.

3. Valor probatório: Forte, por ser documento assinado por ambas as partes.

4. Sugestão: Utilizar para fundamentar a procedência do pedido de horas extras.`;

      const result = parseAnalysisResponse(response);

      expect(result.structured).not.toBeNull();
      expect(result.structured.relevancia).toContain('altamente relevante');
      expect(result.structured.fatos).toContain('8h às 20h');
      expect(result.structured.valorProbatorio).toContain('Forte');
      expect(result.structured.sugestao).toContain('procedência');
    });

    it('deve retornar null para structured se não encontrar seções', () => {
      const response = 'Esta prova não apresenta informações relevantes.';
      const result = parseAnalysisResponse(response);

      expect(result.raw).toBe(response);
      expect(result.structured).toBeNull();
    });

    it('deve retornar objeto vazio para resposta vazia', () => {
      const result = parseAnalysisResponse('');
      expect(result.raw).toBe('');
      expect(result.structured).toBeNull();
    });
  });

  describe('Fluxo de integração completo', () => {
    it('deve processar análise de prova end-to-end', () => {
      // 1. Prova original com nomes
      const proof = {
        name: 'Testemunho João.pdf',
        type: 'testemunho',
        extractedText: 'João Silva declarou que trabalhou na empresa XYZ LTDA sob as ordens de Maria Santos.',
        linkedTopics: [{ title: 'VÍNCULO', miniRelatorio: 'Discussão sobre vínculo' }]
      };

      // 2. Validar prova
      const validation = validateProofForAnalysis(proof);
      expect(validation.valid).toBe(true);

      // 3. Anonimizar
      const anonymized = anonymizeText(proof.extractedText, [
        { original: 'João Silva', replacement: '[TESTEMUNHA]' },
        { original: 'Maria Santos', replacement: '[PREPOSTA]' }
      ]);
      expect(anonymized).toContain('[TESTEMUNHA]');
      expect(anonymized).toContain('[PREPOSTA]');
      expect(anonymized).not.toContain('João Silva');

      // 4. Formatar contexto
      const proofWithAnonymizedText = { ...proof, extractedText: anonymized };
      const context = formatProofContext(proofWithAnonymizedText, { includeLinkedTopics: true });
      expect(context).toContain('[TESTEMUNHA]');
      expect(context).toContain('VÍNCULO');

      // 5. Construir prompt
      const prompt = buildProofAnalysisPrompt('contextual', '', context);
      expect(prompt).toContain('[TESTEMUNHA]');
      expect(prompt).toContain('Relevância da prova');

      // 6. Simular resposta da IA e parsear
      const iaResponse = `1. Relevância: Altamente relevante para comprovar vínculo empregatício.

2. Fatos: [TESTEMUNHA] confirma subordinação a [PREPOSTA].

3. Valor probatório: Médio, por ser testemunho indireto.

4. Sugestão: Combinar com outros elementos de prova.`;

      const parsed = parseAnalysisResponse(iaResponse);
      expect(parsed.structured.relevancia).toContain('Altamente relevante');
      expect(parsed.structured.fatos).toContain('[TESTEMUNHA]');
    });
  });
});
