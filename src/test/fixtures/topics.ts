/**
 * @file topics.ts
 * @description Fixtures de tópicos para testes
 * @usage import { mockTopics } from 'src/test/fixtures/topics'
 */

import type { Topic, TopicCategory } from '../../types';

// Re-export do session.ts para consistência
export { mockTopics, specialTopics, createMockTopic } from './session';

// Categorias válidas
export const validCategories: TopicCategory[] = [
  'PRELIMINAR',
  'PREJUDICIAL',
  'MÉRITO',
  'RELATÓRIO',
  'DISPOSITIVO',
];

// Tópicos ordenados conforme Art. 337 CPC
export const orderedPreliminares: Topic[] = [
  { id: '1', title: 'INEXISTÊNCIA OU NULIDADE DA CITAÇÃO', category: 'PRELIMINAR', order: 1 } as Topic,
  { id: '2', title: 'INCOMPETÊNCIA ABSOLUTA', category: 'PRELIMINAR', order: 2 } as Topic,
  { id: '3', title: 'INCORREÇÃO DO VALOR DA CAUSA', category: 'PRELIMINAR', order: 3 } as Topic,
  { id: '4', title: 'INÉPCIA DA PETIÇÃO INICIAL', category: 'PRELIMINAR', order: 4 } as Topic,
  { id: '5', title: 'PEREMPÇÃO', category: 'PRELIMINAR', order: 5 } as Topic,
  { id: '6', title: 'LITISPENDÊNCIA', category: 'PRELIMINAR', order: 6 } as Topic,
  { id: '7', title: 'COISA JULGADA', category: 'PRELIMINAR', order: 7 } as Topic,
  { id: '8', title: 'CONEXÃO', category: 'PRELIMINAR', order: 8 } as Topic,
  { id: '9', title: 'INCAPACIDADE DA PARTE', category: 'PRELIMINAR', order: 9 } as Topic,
  { id: '10', title: 'CONVENÇÃO DE ARBITRAGEM', category: 'PRELIMINAR', order: 10 } as Topic,
  { id: '11', title: 'CARÊNCIA DE AÇÃO', category: 'PRELIMINAR', order: 11 } as Topic,
  { id: '12', title: 'FALTA DE CAUÇÃO', category: 'PRELIMINAR', order: 12 } as Topic,
  { id: '13', title: 'INDEVIDA CONCESSÃO DA GRATUIDADE', category: 'PRELIMINAR', order: 13 } as Topic,
];

// Tópicos de mérito ordenados (causa > obrigação > efeito financeiro)
export const orderedMerito: Topic[] = [
  // 6a - Declaratórias/Constitutivas
  { id: 'm1', title: 'VÍNCULO EMPREGATÍCIO', category: 'MÉRITO', order: 1 } as Topic,
  { id: 'm2', title: 'RESCISÃO INDIRETA', category: 'MÉRITO', order: 2 } as Topic,

  // 6b - Obrigações de fazer
  { id: 'm3', title: 'ANOTAÇÃO CTPS', category: 'MÉRITO', order: 3 } as Topic,
  { id: 'm4', title: 'ENTREGA DE GUIAS', category: 'MÉRITO', order: 4 } as Topic,

  // 6c - Condenações pecuniárias
  { id: 'm5', title: 'HORAS EXTRAS', category: 'MÉRITO', order: 5 } as Topic,
  { id: 'm6', title: 'ADICIONAL NOTURNO', category: 'MÉRITO', order: 6 } as Topic,
  { id: 'm7', title: 'FÉRIAS', category: 'MÉRITO', order: 7 } as Topic,
  { id: 'm8', title: '13º SALÁRIO', category: 'MÉRITO', order: 8 } as Topic,
  { id: 'm9', title: 'VERBAS RESCISÓRIAS', category: 'MÉRITO', order: 9 } as Topic,

  // 6d - Responsabilidade
  { id: 'm10', title: 'RESPONSABILIDADE SOLIDÁRIA', category: 'MÉRITO', order: 10 } as Topic,

  // 6e - Justiça gratuita
  { id: 'm11', title: 'JUSTIÇA GRATUITA', category: 'MÉRITO', order: 11 } as Topic,

  // 6f - Honorários (sempre por último)
  { id: 'm12', title: 'HONORÁRIOS ADVOCATÍCIOS', category: 'MÉRITO', order: 12 } as Topic,
];

// Tópicos desordenados (para testar reordenação)
export const unorderedTopics: Topic[] = [
  { id: '1', title: 'HONORÁRIOS ADVOCATÍCIOS', category: 'MÉRITO', order: 1 } as Topic,
  { id: '2', title: 'HORAS EXTRAS', category: 'MÉRITO', order: 2 } as Topic,
  { id: '3', title: 'INÉPCIA', category: 'PRELIMINAR', order: 3 } as Topic,
  { id: '4', title: 'PRESCRIÇÃO', category: 'PRELIMINAR', order: 4 } as Topic,
  { id: '5', title: 'VÍNCULO EMPREGATÍCIO', category: 'MÉRITO', order: 5 } as Topic,
];

// Tópico com fundamentação completa
export const topicWithFundamentacao: Topic = {
  id: 'complete-topic',
  title: 'HORAS EXTRAS',
  category: 'MÉRITO',
  content: '',
  fundamentacao: '<p>Diante das provas carreadas aos autos...</p>',
  miniRelatorio: 'O reclamante alega ter trabalhado em jornada extraordinária...',
  dispositivo: 'Julgo PROCEDENTE o pedido de horas extras...',
  veredicto: 'procedente',
  order: 1,
  isSpecial: false,
} as Topic;

// Tópico com veredicto parcialmente procedente
export const topicParcialmenteProcedente: Topic = {
  ...topicWithFundamentacao,
  id: 'partial-topic',
  title: 'ADICIONAL DE INSALUBRIDADE',
  veredicto: 'parcialmente procedente',
  dispositivo: 'Julgo PARCIALMENTE PROCEDENTE, deferindo o adicional em grau mínimo...',
} as Topic;

// Helper para criar tópicos em massa
export const createMockTopicList = (count: number, category: TopicCategory = 'MÉRITO'): Topic[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `topic-${i}`,
    title: `Tópico ${i + 1}`,
    category,
    content: '',
    fundamentacao: '',
    miniRelatorio: '',
    dispositivo: '',
    veredicto: 'procedente',
    order: i,
    isSpecial: false,
  } as Topic));
};
