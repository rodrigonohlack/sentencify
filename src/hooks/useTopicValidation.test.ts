/**
 * @file useTopicValidation.test.ts
 * @description Testes para o hook de validação de tópicos
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTopicValidation } from './useTopicValidation';
import type { Topic, TopicCategory } from '../types';

describe('useTopicValidation', () => {
  // Mock topic factory
  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: `topic-${Date.now()}-${Math.random()}`,
    title: 'TEST TOPIC',
    content: '',
    category: 'MÉRITO' as TopicCategory,
    relatorio: '',
    fundamentacao: '',
    dispositivo: '',
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // isTopicDecidido TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isTopicDecidido', () => {
    it('should return false for null/undefined topic', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      expect(result.current.isTopicDecidido(null as any)).toBe(false);
      expect(result.current.isTopicDecidido(undefined as any)).toBe(false);
    });

    it('should return true for DISPOSITIVO with editedContent', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      const topic = createMockTopic({
        title: 'DISPOSITIVO',
        editedContent: '<p>Dispositivo content</p>'
      });

      expect(result.current.isTopicDecidido(topic)).toBe(true);
    });

    it('should return false for DISPOSITIVO without editedContent', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      const topic = createMockTopic({
        title: 'DISPOSITIVO',
        editedContent: ''
      });

      expect(result.current.isTopicDecidido(topic)).toBe(false);
    });

    it('should return true for RELATÓRIO with editedRelatorio', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      const topic = createMockTopic({
        title: 'RELATÓRIO',
        editedRelatorio: '<p>Relatório content</p>'
      });

      expect(result.current.isTopicDecidido(topic)).toBe(true);
    });

    it('should return true for RELATÓRIO with relatorio', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      const topic = createMockTopic({
        title: 'RELATÓRIO',
        relatorio: '<p>Relatório content</p>'
      });

      expect(result.current.isTopicDecidido(topic)).toBe(true);
    });

    it('should return false for RELATÓRIO without content', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      const topic = createMockTopic({
        title: 'RELATÓRIO',
        editedRelatorio: '',
        relatorio: ''
      });

      expect(result.current.isTopicDecidido(topic)).toBe(false);
    });

    it('should return true for normal topic with content AND resultado', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      const topic = createMockTopic({
        title: 'HORAS EXTRAS',
        editedFundamentacao: '<p>Fundamentação content</p>',
        resultado: 'PROCEDENTE'
      });

      expect(result.current.isTopicDecidido(topic)).toBe(true);
    });

    it('should return false for normal topic with content but no resultado', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      const topic = createMockTopic({
        title: 'HORAS EXTRAS',
        editedFundamentacao: '<p>Fundamentação content</p>',
        resultado: undefined
      });

      expect(result.current.isTopicDecidido(topic)).toBe(false);
    });

    it('should return false for normal topic with resultado but no content', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      const topic = createMockTopic({
        title: 'HORAS EXTRAS',
        editedFundamentacao: '',
        resultado: 'PROCEDENTE'
      });

      expect(result.current.isTopicDecidido(topic)).toBe(false);
    });

    it('should handle case-insensitive DISPOSITIVO', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      const topic = createMockTopic({
        title: 'Dispositivo',
        editedContent: '<p>Content</p>'
      });

      expect(result.current.isTopicDecidido(topic)).toBe(true);
    });

    it('should handle case-insensitive RELATÓRIO', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      const topic = createMockTopic({
        title: 'Relatório',
        editedRelatorio: '<p>Content</p>'
      });

      expect(result.current.isTopicDecidido(topic)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COUNTERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Counters', () => {
    it('should count topicsDecididos correctly', () => {
      const selectedTopics = [
        createMockTopic({ title: 'HORAS EXTRAS', editedFundamentacao: 'Content', resultado: 'PROCEDENTE' }),
        createMockTopic({ title: 'DANO MORAL', editedFundamentacao: 'Content', resultado: 'IMPROCEDENTE' }),
        createMockTopic({ title: 'PENDENTE', editedFundamentacao: '', resultado: undefined })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.topicsDecididos).toBe(2);
    });

    it('should count topicsPendentes correctly', () => {
      const selectedTopics = [
        createMockTopic({ title: 'HORAS EXTRAS', editedFundamentacao: 'Content', resultado: 'PROCEDENTE' }),
        createMockTopic({ title: 'PENDENTE 1', editedFundamentacao: '', resultado: undefined }),
        createMockTopic({ title: 'PENDENTE 2', editedFundamentacao: 'Content', resultado: undefined })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.topicsPendentes).toBe(2);
    });

    it('should exclude RELATÓRIO and DISPOSITIVO from counters', () => {
      const selectedTopics = [
        createMockTopic({ title: 'RELATÓRIO', editedRelatorio: 'Content' }),
        createMockTopic({ title: 'DISPOSITIVO', editedContent: 'Content' }),
        createMockTopic({ title: 'HORAS EXTRAS', editedFundamentacao: 'Content', resultado: 'PROCEDENTE' })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.topicsDecididos).toBe(1);
      expect(result.current.topicsPendentes).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERED ARRAYS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Filtered Arrays', () => {
    it('should return topicsSemDecisao correctly', () => {
      const selectedTopics = [
        createMockTopic({ title: 'DECIDIDO', editedFundamentacao: 'Content', resultado: 'PROCEDENTE' }),
        createMockTopic({ title: 'PENDENTE', editedFundamentacao: '', resultado: undefined })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.topicsSemDecisao).toHaveLength(1);
      expect(result.current.topicsSemDecisao[0].title).toBe('PENDENTE');
    });

    it('should return topicsSemResultado correctly', () => {
      const selectedTopics = [
        createMockTopic({ title: 'COM RESULTADO', resultado: 'PROCEDENTE' }),
        createMockTopic({ title: 'SEM RESULTADO 1', resultado: undefined }),
        createMockTopic({ title: 'SEM RESULTADO 2', resultado: undefined as any })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.topicsSemResultado).toHaveLength(2);
    });

    it('should exclude RELATÓRIO and DISPOSITIVO from topicsSemResultado', () => {
      const selectedTopics = [
        createMockTopic({ title: 'RELATÓRIO', resultado: undefined }),
        createMockTopic({ title: 'DISPOSITIVO', resultado: undefined }),
        createMockTopic({ title: 'SEM RESULTADO', resultado: undefined })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.topicsSemResultado).toHaveLength(1);
    });

    it('should return topicsParaDispositivo correctly', () => {
      const selectedTopics = [
        createMockTopic({ title: 'RELATÓRIO' }),
        createMockTopic({ title: 'DISPOSITIVO' }),
        createMockTopic({ title: 'HORAS EXTRAS', resultado: 'PROCEDENTE' }),
        createMockTopic({ title: 'SEM RESULTADO', resultado: 'SEM RESULTADO' })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      // Should only include HORAS EXTRAS (not RELATÓRIO, DISPOSITIVO, or SEM RESULTADO)
      expect(result.current.topicsParaDispositivo).toHaveLength(1);
      expect(result.current.topicsParaDispositivo[0].title).toBe('HORAS EXTRAS');
    });

    it('should return unselectedTopics correctly', () => {
      const extractedTopics = [
        createMockTopic({ title: 'TOPIC A' }),
        createMockTopic({ title: 'TOPIC B' }),
        createMockTopic({ title: 'TOPIC C' })
      ];

      const selectedTopics = [
        createMockTopic({ title: 'TOPIC A' })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, extractedTopics)
      );

      expect(result.current.unselectedTopics).toHaveLength(2);
    });

    it('should handle case-insensitive comparison for unselectedTopics', () => {
      const extractedTopics = [
        createMockTopic({ title: 'topic a' }),
        createMockTopic({ title: 'TOPIC B' })
      ];

      const selectedTopics = [
        createMockTopic({ title: 'TOPIC A' })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, extractedTopics)
      );

      expect(result.current.unselectedTopics).toHaveLength(1);
      expect(result.current.unselectedTopics[0].title).toBe('TOPIC B');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // canGenerateDispositivo TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('canGenerateDispositivo', () => {
    it('should return disabled when no topics selected', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      expect(result.current.canGenerateDispositivo.enabled).toBe(false);
      expect(result.current.canGenerateDispositivo.reason).toBe('Nenhum tópico selecionado');
    });

    it('should return disabled when only RELATÓRIO and DISPOSITIVO selected', () => {
      const selectedTopics = [
        createMockTopic({ title: 'RELATÓRIO' }),
        createMockTopic({ title: 'DISPOSITIVO' })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.canGenerateDispositivo.enabled).toBe(false);
      expect(result.current.canGenerateDispositivo.reason).toBe('Nenhum tópico de mérito/preliminar selecionado');
    });

    it('should return disabled when topics are missing content', () => {
      const selectedTopics = [
        createMockTopic({ title: 'HORAS EXTRAS', editedFundamentacao: '', resultado: 'PROCEDENTE' })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.canGenerateDispositivo.enabled).toBe(false);
      expect(result.current.canGenerateDispositivo.reason).toContain('sem conteúdo');
    });

    it('should return disabled when topics are missing resultado', () => {
      const selectedTopics = [
        createMockTopic({ title: 'HORAS EXTRAS', editedFundamentacao: 'Content', resultado: undefined })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.canGenerateDispositivo.enabled).toBe(false);
      expect(result.current.canGenerateDispositivo.reason).toContain('sem resultado');
    });

    it('should return enabled when all topics are complete', () => {
      const selectedTopics = [
        createMockTopic({ title: 'HORAS EXTRAS', editedFundamentacao: 'Content', resultado: 'PROCEDENTE' }),
        createMockTopic({ title: 'DANO MORAL', editedFundamentacao: 'Content', resultado: 'IMPROCEDENTE' })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.canGenerateDispositivo.enabled).toBe(true);
      expect(result.current.canGenerateDispositivo.reason).toBe('');
    });

    it('should list topics without content in reason', () => {
      const selectedTopics = [
        createMockTopic({ title: 'TOPIC A', editedFundamentacao: '', resultado: undefined }),
        createMockTopic({ title: 'TOPIC B', editedFundamentacao: '', resultado: undefined })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.canGenerateDispositivo.reason).toContain('TOPIC A');
      expect(result.current.canGenerateDispositivo.reason).toContain('TOPIC B');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // selectedTopicTitles TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('selectedTopicTitles', () => {
    it('should return empty string for no topics', () => {
      const { result } = renderHook(() =>
        useTopicValidation([], [])
      );

      expect(result.current.selectedTopicTitles).toBe('');
    });

    it('should return pipe-separated titles', () => {
      const selectedTopics = [
        createMockTopic({ title: 'TOPIC A' }),
        createMockTopic({ title: 'TOPIC B' }),
        createMockTopic({ title: 'TOPIC C' })
      ];

      const { result } = renderHook(() =>
        useTopicValidation(selectedTopics, [])
      );

      expect(result.current.selectedTopicTitles).toBe('TOPIC A|TOPIC B|TOPIC C');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK STABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Callback Stability', () => {
    it('isTopicDecidido should be stable across renders', () => {
      const { result, rerender } = renderHook(() =>
        useTopicValidation([], [])
      );

      const first = result.current.isTopicDecidido;
      rerender();
      const second = result.current.isTopicDecidido;

      expect(first).toBe(second);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMOIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Memoization', () => {
    it('should not recalculate when same topics array reference', () => {
      const selectedTopics = [
        createMockTopic({ title: 'TOPIC A', editedFundamentacao: 'Content', resultado: 'PROCEDENTE' })
      ];

      const { result, rerender } = renderHook(
        ({ topics }) => useTopicValidation(topics, []),
        { initialProps: { topics: selectedTopics } }
      );

      const firstDecididos = result.current.topicsDecididos;
      rerender({ topics: selectedTopics });
      const secondDecididos = result.current.topicsDecididos;

      expect(firstDecididos).toBe(secondDecididos);
    });
  });
});
