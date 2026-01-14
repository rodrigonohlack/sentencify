/**
 * @file useTopicValidation.ts
 * @description Hook para validação e cálculos de tópicos
 *
 * FASE 49: Extraído do App.tsx para consolidar lógica de validação
 * de tópicos e cálculos relacionados à geração do dispositivo.
 *
 * Responsabilidades:
 * - Verificar se um tópico está decidido
 * - Contar tópicos decididos/pendentes
 * - Verificar se pode gerar dispositivo
 * - Filtrar tópicos para dispositivo
 */

import { useCallback, useMemo } from 'react';
import type { Topic } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CanGenerateDispositivoResult {
  enabled: boolean;
  reason: string;
}

export interface UseTopicValidationReturn {
  // Funções
  isTopicDecidido: (topic: Topic) => boolean;

  // Contadores
  topicsDecididos: number;
  topicsPendentes: number;

  // Arrays filtrados
  topicsSemDecisao: Topic[];
  topicsSemResultado: Topic[];
  topicsParaDispositivo: Topic[];
  unselectedTopics: Topic[];

  // Validação
  canGenerateDispositivo: CanGenerateDispositivoResult;

  // Utilidades
  selectedTopicTitles: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se é o tópico DISPOSITIVO
 */
function isDispositivo(topic: Topic): boolean {
  return topic.title.toUpperCase() === 'DISPOSITIVO';
}

/**
 * Verifica se é o tópico RELATÓRIO
 */
function isRelatorio(topic: Topic): boolean {
  return topic.title.toUpperCase() === 'RELATÓRIO';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para validação e cálculos de tópicos
 *
 * @param selectedTopics - Array de tópicos selecionados
 * @param extractedTopics - Array de tópicos extraídos (para calcular unselected)
 */
export function useTopicValidation(
  selectedTopics: Topic[],
  extractedTopics: Topic[]
): UseTopicValidationReturn {
  // ═══════════════════════════════════════════════════════════════════════════════
  // VERIFICA SE TÓPICO ESTÁ DECIDIDO
  // ═══════════════════════════════════════════════════════════════════════════════

  const isTopicDecidido = useCallback((topic: Topic): boolean => {
    if (!topic) return false;

    // DISPOSITIVO usa editedContent
    if (isDispositivo(topic)) {
      return !!(topic.editedContent && topic.editedContent.trim() !== '');
    }

    // RELATÓRIO usa editedRelatorio ou relatorio
    if (isRelatorio(topic)) {
      return !!(topic.editedRelatorio && topic.editedRelatorio.trim() !== '') ||
             !!(topic.relatorio && topic.relatorio.trim() !== '');
    }

    // Tópicos normais precisam de conteúdo E resultado selecionado
    const temConteudo = !!(topic.editedFundamentacao && topic.editedFundamentacao.trim() !== '');
    const temResultado = !!(topic.resultado && topic.resultado.trim() !== '');

    return temConteudo && temResultado;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTADORES MEMOIZADOS
  // ═══════════════════════════════════════════════════════════════════════════════

  const topicsDecididos = useMemo(() => {
    return selectedTopics.filter(t =>
      isTopicDecidido(t) &&
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO'
    ).length;
  }, [selectedTopics, isTopicDecidido]);

  const topicsPendentes = useMemo(() => {
    return selectedTopics.filter(t =>
      !isTopicDecidido(t) &&
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO'
    ).length;
  }, [selectedTopics, isTopicDecidido]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARRAYS FILTRADOS
  // ═══════════════════════════════════════════════════════════════════════════════

  const topicsSemDecisao = useMemo(() => {
    return selectedTopics.filter(t => !isTopicDecidido(t));
  }, [selectedTopics, isTopicDecidido]);

  const topicsSemResultado = useMemo(() => {
    return selectedTopics.filter(t =>
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO' &&
      !t.resultado
    );
  }, [selectedTopics]);

  // v1.14.5: Excluir DISPOSITIVO para evitar ruído do conteúdo antigo
  const topicsParaDispositivo = useMemo(() => {
    return selectedTopics.filter(topic =>
      topic.title.toUpperCase() !== 'RELATÓRIO' &&
      topic.title.toUpperCase() !== 'DISPOSITIVO' &&
      topic.resultado !== 'SEM RESULTADO'
    );
  }, [selectedTopics]);

  // v1.19.2: Normalizar comparação case-insensitive para evitar duplicatas
  const unselectedTopics = useMemo(() => {
    return extractedTopics.filter(topic =>
      !selectedTopics.find(st =>
        (st.title || '').toUpperCase().trim() === (topic.title || '').toUpperCase().trim()
      )
    );
  }, [extractedTopics, selectedTopics]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDAÇÃO PARA DISPOSITIVO
  // ═══════════════════════════════════════════════════════════════════════════════

  const canGenerateDispositivo = useMemo((): CanGenerateDispositivoResult => {
    // Precisa ter pelo menos 1 tópico selecionado
    if (selectedTopics.length === 0) {
      return { enabled: false, reason: 'Nenhum tópico selecionado' };
    }

    // Filtrar tópicos relevantes (exceto RELATÓRIO e DISPOSITIVO)
    const topicsRelevantes = selectedTopics.filter(t =>
      t.title.toUpperCase() !== 'RELATÓRIO' &&
      t.title.toUpperCase() !== 'DISPOSITIVO'
    );

    if (topicsRelevantes.length === 0) {
      return { enabled: false, reason: 'Nenhum tópico de mérito/preliminar selecionado' };
    }

    // Verificar tópicos sem conteúdo (fundamentação não escrita)
    const semConteudo = topicsRelevantes.filter(t =>
      !t.editedFundamentacao || t.editedFundamentacao.trim() === ''
    );

    // Verificar tópicos com conteúdo mas sem resultado selecionado
    const semResultado = topicsRelevantes.filter(t =>
      t.editedFundamentacao && t.editedFundamentacao.trim() !== '' &&
      (!t.resultado || t.resultado.trim() === '')
    );

    const totalPendentes = semConteudo.length + semResultado.length;

    if (totalPendentes > 0) {
      // Construir mensagem detalhada
      const detalhes: string[] = [];

      if (semConteudo.length > 0) {
        const primeiros = semConteudo.slice(0, 3).map(t => t.title);
        const resto = semConteudo.length > 3 ? ` e mais ${semConteudo.length - 3}` : '';
        detalhes.push(`${semConteudo.length} sem conteúdo: ${primeiros.join(', ')}${resto}`);
      }

      if (semResultado.length > 0) {
        const primeiros = semResultado.slice(0, 3).map(t => t.title);
        const resto = semResultado.length > 3 ? ` e mais ${semResultado.length - 3}` : '';
        detalhes.push(`${semResultado.length} sem resultado: ${primeiros.join(', ')}${resto}`);
      }

      return {
        enabled: false,
        reason: `${totalPendentes} tópico${totalPendentes > 1 ? 's' : ''} pendente${totalPendentes > 1 ? 's' : ''} (${detalhes.join(' | ')})`
      };
    }

    return { enabled: true, reason: '' };
  }, [selectedTopics]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════════

  const selectedTopicTitles = useMemo(() =>
    selectedTopics.map(t => t.title).join('|'),
    [selectedTopics]
  );

  return {
    isTopicDecidido,
    topicsDecididos,
    topicsPendentes,
    topicsSemDecisao,
    topicsSemResultado,
    topicsParaDispositivo,
    unselectedTopics,
    canGenerateDispositivo,
    selectedTopicTitles,
  };
}

export default useTopicValidation;
