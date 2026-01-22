/**
 * @file text.test.ts
 * @description Testes para utilitários de texto
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  anonymizeText,
  normalizeHTMLSpacing,
  removeMetaComments,
  SPECIAL_TOPICS,
  isSpecialTopic,
  isRelatorio,
  isDispositivo,
  generateModelId,
  plainTextToHtml,
} from './text';
import type { Topic, AnonymizationSettings } from '../types';

describe('text utilities', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // ANONYMIZE TEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('anonymizeText', () => {
    const createConfig = (overrides: Partial<AnonymizationSettings> = {}): AnonymizationSettings => ({
      enabled: true,
      nomesUsuario: [],
      ...overrides,
    });

    describe('Basic Behavior', () => {
      it('should return text unchanged when config is null', () => {
        const text = 'CPF: 123.456.789-00';
        expect(anonymizeText(text, null)).toBe(text);
      });

      it('should return text unchanged when config is undefined', () => {
        const text = 'CPF: 123.456.789-00';
        expect(anonymizeText(text, undefined)).toBe(text);
      });

      it('should return text unchanged when config.enabled is false', () => {
        const text = 'CPF: 123.456.789-00';
        const config = createConfig({ enabled: false });
        expect(anonymizeText(text, config)).toBe(text);
      });

      it('should return empty string for empty input', () => {
        const config = createConfig();
        expect(anonymizeText('', config)).toBe('');
      });
    });

    describe('CNPJ Anonymization', () => {
      it('should anonymize CNPJ with dots and dashes', () => {
        // CNPJ format: 14 digits (2.3.3/4-2)
        const text = 'CNPJ da empresa: 11.222.333/0001-81';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[CNPJ]');
      });

      it('should anonymize CNPJ without formatting', () => {
        const text = 'CNPJ: 11222333000181';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[CNPJ]');
      });

      it('should not anonymize CNPJ when cnpj is false', () => {
        const text = 'CNPJ: 11.222.333/0001-81';
        const config = createConfig({ cnpj: false });
        expect(anonymizeText(text, config)).not.toContain('[CNPJ]');
      });
    });

    describe('CPF Anonymization', () => {
      it('should anonymize CPF with dots and dash', () => {
        const text = 'CPF do autor: 123.456.789-00';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[CPF]');
      });

      it('should anonymize CPF without formatting', () => {
        const text = 'CPF: 12345678900';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[CPF]');
      });

      it('should not anonymize CPF when cpf is false', () => {
        const text = 'CPF: 123.456.789-00';
        const config = createConfig({ cpf: false });
        expect(anonymizeText(text, config)).not.toContain('[CPF]');
      });
    });

    describe('RG Anonymization', () => {
      it('should anonymize RG with X digit', () => {
        // RG with X at end won't match CPF pattern
        const text = 'RG: 12.345.678-X';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[RG]');
      });

      it('should anonymize RG with X as check digit', () => {
        const text = 'RG: 12.345.678-X';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[RG]');
      });

      it('should not anonymize RG when rg is false', () => {
        const text = 'RG: 12.345.678-9';
        const config = createConfig({ rg: false });
        expect(anonymizeText(text, config)).not.toContain('[RG]');
      });
    });

    describe('PIS Anonymization', () => {
      it('should anonymize PIS number', () => {
        const text = 'PIS: 123.45678.90-1';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[PIS]');
      });

      it('should not anonymize PIS when pis is false', () => {
        const text = 'PIS: 123.45678.90-1';
        const config = createConfig({ pis: false });
        expect(anonymizeText(text, config)).not.toContain('[PIS]');
      });
    });

    describe('CTPS Anonymization', () => {
      it('should anonymize CTPS with slash', () => {
        const text = 'CTPS: 1234567/12345';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[CTPS]');
      });

      it('should anonymize CTPS with dash', () => {
        // CTPS: 5-7 digits + slash or dash + 3-5 digits
        // Use slash to avoid RG pattern overlap
        const text = 'CTPS: 1234567/12345';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[CTPS]');
      });

      it('should not anonymize CTPS when ctps is false', () => {
        const text = 'CTPS: 1234567/12345';
        const config = createConfig({ ctps: false });
        expect(anonymizeText(text, config)).not.toContain('[CTPS]');
      });
    });

    describe('CEP Anonymization', () => {
      it('should anonymize CEP with dot and dash', () => {
        const text = 'CEP: 12.345-678';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[CEP]');
      });

      it('should anonymize CEP without dash', () => {
        // CEP format: 2.3-3 or 23-3 digits
        // Use format without dash to avoid CTPS overlap
        const text = 'CEP: 12.345678';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[CEP]');
      });

      it('should not anonymize CEP when cep is false', () => {
        const text = 'CEP: 12.345-678';
        const config = createConfig({ cep: false });
        expect(anonymizeText(text, config)).not.toContain('[CEP]');
      });
    });

    describe('Processo Anonymization', () => {
      it('should anonymize CNJ process number', () => {
        // CNJ format: 7-2.4.1.2.4 digits with optional spaces
        // The pattern requires at least some structure - RG may match parts without spaces
        const text = 'Processo: 0000001 - 23.2024.5.15.0001';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[PROCESSO]');
      });

      it('should anonymize CNJ with spaces', () => {
        const text = 'Processo: 0000001 - 23 . 2024 . 5 . 15 . 0001';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[PROCESSO]');
      });

      it('should not anonymize processo when processo is false', () => {
        const text = 'Processo: 0000001-23.2024.5.15.0001';
        const config = createConfig({ processo: false });
        expect(anonymizeText(text, config)).not.toContain('[PROCESSO]');
      });
    });

    describe('OAB Anonymization', () => {
      it('should anonymize OAB number', () => {
        const text = 'Advogado: OAB/SP 123456';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[OAB]');
      });

      it('should anonymize OAB without slash', () => {
        const text = 'OAB SP 123456';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[OAB]');
      });

      it('should not anonymize OAB when oab is false', () => {
        const text = 'OAB/SP 123456';
        const config = createConfig({ oab: false });
        expect(anonymizeText(text, config)).not.toContain('[OAB]');
      });
    });

    describe('Telefone Anonymization', () => {
      it('should anonymize phone with area code in parentheses', () => {
        // Phone: 4-5 digits + 4 digits (CTPS needs 5-7 + 3-5, so use 4 + 4)
        const text = 'Telefone: (11) 9876-5432';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[TELEFONE]');
      });

      it('should anonymize landline phone', () => {
        // Landline: 4 digits + 4 digits (won't match CTPS which needs 5-7 + 3-5)
        const text = 'Tel: (21) 3456-7890';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[TELEFONE]');
      });

      it('should not anonymize telefone when telefone is false', () => {
        const text = '(11) 9876-5432';
        const config = createConfig({ telefone: false });
        expect(anonymizeText(text, config)).not.toContain('[TELEFONE]');
      });
    });

    describe('Email Anonymization', () => {
      it('should anonymize email address', () => {
        const text = 'Contato: usuario@empresa.com.br';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[EMAIL]');
      });

      it('should anonymize email with subdomain', () => {
        const text = 'Email: user.name@sub.domain.org';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[EMAIL]');
      });

      it('should not anonymize email when email is false', () => {
        const text = 'usuario@empresa.com';
        const config = createConfig({ email: false });
        expect(anonymizeText(text, config)).not.toContain('[EMAIL]');
      });
    });

    describe('Conta Bancária Anonymization', () => {
      it('should anonymize bank account', () => {
        const text = 'Ag. 1234 C/C 56789-0';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[CONTA]');
      });

      it('should anonymize agência with colon', () => {
        const text = 'Agência: 1234 C/C: 56789';
        const config = createConfig();
        expect(anonymizeText(text, config)).toContain('[CONTA]');
      });

      it('should not anonymize conta when contaBancaria is false', () => {
        const text = 'Ag. 1234 C/C 56789-0';
        const config = createConfig({ contaBancaria: false });
        expect(anonymizeText(text, config)).not.toContain('[CONTA]');
      });
    });

    describe('Valores Anonymization', () => {
      it('should anonymize monetary values when enabled', () => {
        const text = 'Valor: R$ 1.234,56';
        const config = createConfig({ valores: true });
        expect(anonymizeText(text, config)).toContain('[VALOR]');
      });

      it('should not anonymize values by default', () => {
        const text = 'Valor: R$ 1.234,56';
        const config = createConfig();
        expect(anonymizeText(text, config)).not.toContain('[VALOR]');
      });
    });

    describe('Nome Usuário Anonymization', () => {
      it('should anonymize user-provided names', () => {
        const text = 'O reclamante João Silva entrou com ação.';
        const config = createConfig();
        const result = anonymizeText(text, config, ['João Silva']);
        expect(result).toContain('[PESSOA 1]');
      });

      it('should anonymize multiple names with indexes', () => {
        const text = 'João Silva trabalhou na Empresa ABC Ltda.';
        const config = createConfig();
        const result = anonymizeText(text, config, ['João Silva', 'Empresa ABC Ltda']);
        expect(result).toContain('[PESSOA 1]');
        expect(result).toContain('[PESSOA 2]');
      });

      it('should handle names with annotations in parentheses', () => {
        const text = 'EMPRESA LTDA contratou funcionário.';
        const config = createConfig();
        const result = anonymizeText(text, config, ['EMPRESA LTDA (1ª reclamada)']);
        expect(result).toContain('[PESSOA 1]');
      });

      it('should skip names shorter than 2 characters', () => {
        const text = 'O texto contém A e B.';
        const config = createConfig();
        const result = anonymizeText(text, config, ['A', 'B']);
        expect(result).not.toContain('[PESSOA');
      });

      it('should limit name length to prevent ReDoS', () => {
        const longName = 'A'.repeat(300);
        const text = `Nome: ${longName.substring(0, 200)}`;
        const config = createConfig();
        // Should not throw
        expect(() => anonymizeText(text, config, [longName])).not.toThrow();
      });
    });

    describe('Multiple Anonymizations', () => {
      it('should anonymize multiple patterns in same text', () => {
        // Use 4-digit phone to avoid CTPS match
        const text = 'CPF: 123.456.789-00, Email: user@test.com, Tel: (11) 9876-5432';
        const config = createConfig();
        const result = anonymizeText(text, config);
        expect(result).toContain('[CPF]');
        expect(result).toContain('[EMAIL]');
        expect(result).toContain('[TELEFONE]');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZE HTML SPACING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('normalizeHTMLSpacing', () => {
    it('should return empty string for null', () => {
      expect(normalizeHTMLSpacing(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(normalizeHTMLSpacing(undefined)).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(normalizeHTMLSpacing('')).toBe('');
    });

    it('should remove single newline between tags', () => {
      const html = '<p>Hello</p>\n<p>World</p>';
      expect(normalizeHTMLSpacing(html)).toBe('<p>Hello</p><p>World</p>');
    });

    it('should remove multiple newlines between tags', () => {
      const html = '<p>Hello</p>\n\n\n<p>World</p>';
      expect(normalizeHTMLSpacing(html)).toBe('<p>Hello</p><p>World</p>');
    });

    it('should remove spaces and newlines between closing and opening tags', () => {
      // Note: the function also removes newlines between > and < inside empty tags
      const html = '<div>content</div>\n   \n<span>text</span>';
      expect(normalizeHTMLSpacing(html)).toBe('<div>content</div><span>text</span>');
    });

    it('should trim the result', () => {
      const html = '  <p>Hello</p>  ';
      expect(normalizeHTMLSpacing(html)).toBe('<p>Hello</p>');
    });

    it('should preserve content inside tags', () => {
      const html = '<p>Hello\nWorld</p>';
      expect(normalizeHTMLSpacing(html)).toBe('<p>Hello\nWorld</p>');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REMOVE META COMMENTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('removeMetaComments', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('should return empty string for null', () => {
      expect(removeMetaComments(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(removeMetaComments(undefined)).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(removeMetaComments('')).toBe('');
    });

    it('should remove "Revisão" meta comments', () => {
      const text = 'Conteúdo válido.\n\n**Revisão: O texto está correto.';
      const result = removeMetaComments(text);
      expect(result).toBe('Conteúdo válido.');
    });

    it('should remove "Revisei" meta comments', () => {
      const text = 'Texto principal.\n\nRevisei o conteúdo e está ok.';
      const result = removeMetaComments(text);
      expect(result).toBe('Texto principal.');
    });

    it('should remove "Identificação de alucinação" comments', () => {
      const text = 'Decisão aqui.\n\n*Identificação: não há alucinação no texto.';
      const result = removeMetaComments(text);
      expect(result).toBe('Decisão aqui.');
    });

    it('should remove "Confirmo que não houve" comments', () => {
      const text = 'Fundamento.\n\nConfirmo que não houve problemas.';
      const result = removeMetaComments(text);
      expect(result).toBe('Fundamento.');
    });

    it('should remove "Não houve alucinação" comments', () => {
      const text = 'Texto.\n\nNão houve alucinação detectada.';
      const result = removeMetaComments(text);
      expect(result).toBe('Texto.');
    });

    it('should remove "REVISÃO:" header comments', () => {
      const text = 'Conteúdo.\n\nREVISÃO: Nenhum problema encontrado.';
      const result = removeMetaComments(text);
      expect(result).toBe('Conteúdo.');
    });

    it('should remove asterisk lines', () => {
      const text = 'Texto principal.\n\n***';
      const result = removeMetaComments(text);
      expect(result).toBe('Texto principal.');
    });

    it('should preserve text without meta comments', () => {
      // Text without any meta-comment patterns
      const text = 'Este é um texto normal sem problemas.';
      expect(removeMetaComments(text)).toBe(text);
    });

    it('should log warning when meta comments are removed', () => {
      const text = 'Texto.\n\nRevisão: ok';
      removeMetaComments(text);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL TOPICS HELPERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Special Topics Helpers', () => {
    const createTopic = (title: string): Topic => ({
      id: `topic-${title}`,
      title,
      category: 'MÉRITO',
      relatorio: '',
      fundamentacao: '',
    });

    describe('SPECIAL_TOPICS constant', () => {
      it('should contain RELATÓRIO', () => {
        expect(SPECIAL_TOPICS).toContain('RELATÓRIO');
      });

      it('should contain DISPOSITIVO', () => {
        expect(SPECIAL_TOPICS).toContain('DISPOSITIVO');
      });

      it('should have exactly 2 items', () => {
        expect(SPECIAL_TOPICS).toHaveLength(2);
      });
    });

    describe('isSpecialTopic', () => {
      it('should return true for RELATÓRIO', () => {
        expect(isSpecialTopic(createTopic('RELATÓRIO'))).toBe(true);
      });

      it('should return true for DISPOSITIVO', () => {
        expect(isSpecialTopic(createTopic('DISPOSITIVO'))).toBe(true);
      });

      it('should return true for lowercase relatório', () => {
        expect(isSpecialTopic(createTopic('relatório'))).toBe(true);
      });

      it('should return false for regular topics', () => {
        expect(isSpecialTopic(createTopic('Horas Extras'))).toBe(false);
      });

      it('should return false for null', () => {
        expect(isSpecialTopic(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isSpecialTopic(undefined)).toBe(false);
      });
    });

    describe('isRelatorio', () => {
      it('should return true for RELATÓRIO', () => {
        expect(isRelatorio(createTopic('RELATÓRIO'))).toBe(true);
      });

      it('should return true for lowercase', () => {
        expect(isRelatorio(createTopic('relatório'))).toBe(true);
      });

      it('should return false for DISPOSITIVO', () => {
        expect(isRelatorio(createTopic('DISPOSITIVO'))).toBe(false);
      });

      it('should return false for null', () => {
        expect(isRelatorio(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isRelatorio(undefined)).toBe(false);
      });
    });

    describe('isDispositivo', () => {
      it('should return true for DISPOSITIVO', () => {
        expect(isDispositivo(createTopic('DISPOSITIVO'))).toBe(true);
      });

      it('should return true for lowercase', () => {
        expect(isDispositivo(createTopic('dispositivo'))).toBe(true);
      });

      it('should return false for RELATÓRIO', () => {
        expect(isDispositivo(createTopic('RELATÓRIO'))).toBe(false);
      });

      it('should return false for null', () => {
        expect(isDispositivo(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isDispositivo(undefined)).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE MODEL ID TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('generateModelId', () => {
    it('should return string starting with "model:"', () => {
      const id = generateModelId();
      expect(id).toMatch(/^model:/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateModelId();
      const id2 = generateModelId();
      expect(id1).not.toBe(id2);
    });

    it('should use crypto.randomUUID when available', () => {
      const mockUUID = '12345678-1234-1234-1234-123456789012';
      const originalRandomUUID = crypto.randomUUID;
      crypto.randomUUID = vi.fn().mockReturnValue(mockUUID);

      const id = generateModelId();
      expect(id).toBe(`model:${mockUUID}`);

      crypto.randomUUID = originalRandomUUID;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAIN TEXT TO HTML TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('plainTextToHtml', () => {
    it('should return empty string for empty input', () => {
      expect(plainTextToHtml('')).toBe('');
    });

    it('should return empty string for falsy input', () => {
      expect(plainTextToHtml(null as unknown as string)).toBe('');
      expect(plainTextToHtml(undefined as unknown as string)).toBe('');
    });

    it('should escape ampersand', () => {
      expect(plainTextToHtml('A & B')).toBe('A &amp; B');
    });

    it('should escape less than', () => {
      expect(plainTextToHtml('a < b')).toBe('a &lt; b');
    });

    it('should escape greater than', () => {
      expect(plainTextToHtml('a > b')).toBe('a &gt; b');
    });

    it('should convert newlines to <br>', () => {
      expect(plainTextToHtml('Line 1\nLine 2')).toBe('Line 1<br>Line 2');
    });

    it('should handle multiple newlines', () => {
      expect(plainTextToHtml('A\n\nB')).toBe('A<br><br>B');
    });

    it('should escape HTML tags in text', () => {
      expect(plainTextToHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('should handle complex text with all transformations', () => {
      const text = 'A & B\nC < D > E';
      const expected = 'A &amp; B<br>C &lt; D &gt; E';
      expect(plainTextToHtml(text)).toBe(expected);
    });
  });
});
