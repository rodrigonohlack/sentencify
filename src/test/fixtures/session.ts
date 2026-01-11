/**
 * @file session.ts
 * @description Fixtures de sessão para testes
 * @usage import { mockSession } from 'src/test/fixtures/session'
 */

import type { Topic, Proof, AISettings, TopicCategory } from '../../types';

// Configurações de IA padrão
export const defaultAISettings: Partial<AISettings> = {
  provider: 'claude',
  claudeModel: 'claude-sonnet-4-20250514',
  geminiModel: 'gemini-3-flash',
  openaiModel: 'gpt-5.2',
  openaiReasoningLevel: 'medium',
  grokModel: 'grok-4-1-fast-reasoning',
  apiKeys: { claude: '', gemini: '', openai: '', grok: '' },
  useExtendedThinking: true,
  thinkingBudget: '10000',
  geminiThinkingLevel: 'medium',
  customPrompt: '',
  modeloRelatorio: '',
  modeloDispositivo: '',
  modeloTopicoRelatorio: '',
  doubleCheck: {
    enabled: false,
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    operations: {
      topicExtraction: false,
      dispositivo: false,
      sentenceReview: false,
      factsComparison: false,
    },
  },
};

// Tópico de exemplo
export const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
  id: crypto.randomUUID(),
  title: 'HORAS EXTRAS',
  category: 'MÉRITO' as TopicCategory,
  relatorio: '',
  fundamentacao: '',
  dispositivo: '',
  resultado: 'PROCEDENTE',
  ...overrides,
});

// Lista de tópicos padrão
export const mockTopics: Topic[] = [
  createMockTopic({
    id: 'topic-1',
    title: 'PRELIMINAR DE INÉPCIA',
    category: 'PRELIMINAR' as TopicCategory,
  }),
  createMockTopic({
    id: 'topic-2',
    title: 'HORAS EXTRAS',
    category: 'MÉRITO' as TopicCategory,
  }),
  createMockTopic({
    id: 'topic-3',
    title: 'ADICIONAL NOTURNO',
    category: 'MÉRITO' as TopicCategory,
  }),
  createMockTopic({
    id: 'topic-4',
    title: 'HONORÁRIOS ADVOCATÍCIOS',
    category: 'MÉRITO' as TopicCategory,
  }),
];

// Tópicos especiais
export const specialTopics: Topic[] = [
  createMockTopic({
    id: 'relatorio',
    title: 'RELATÓRIO',
    category: 'RELATÓRIO' as TopicCategory,
  }),
  createMockTopic({
    id: 'dispositivo',
    title: 'DISPOSITIVO',
    category: 'DISPOSITIVO' as TopicCategory,
  }),
];

// Prova de exemplo
export const createMockProof = (overrides: Partial<Proof> = {}): Proof => ({
  id: crypto.randomUUID(),
  type: 'text',
  name: 'Prova Testemunhal',
  text: 'Declaração da testemunha sobre os fatos...',
  uploadDate: new Date().toISOString(),
  ...overrides,
} as Proof);

// Lista de provas padrão
export const mockProofs: Proof[] = [
  createMockProof({
    id: 'proof-1',
    name: 'Controle de Ponto',
    text: 'Registros de ponto mostrando horas extras...',
  }),
  createMockProof({
    id: 'proof-2',
    name: 'Depoimento Testemunha',
    text: 'A testemunha declarou que via o reclamante trabalhando...',
  }),
];

// Sessão completa mockada
export const mockSession = {
  topics: mockTopics,
  proofs: mockProofs,
  aiSettings: defaultAISettings,
  peticaoInicial: 'Petição inicial com pedidos de horas extras e adicional noturno...',
  contestacao: 'A reclamada contesta todos os pedidos alegando...',
  impugnacao: '',
  relatorio: '',
  dispositivo: '',
  tokenMetrics: {
    input: 0,
    output: 0,
    cached: 0,
  },
};

// Session com dados mínimos para testes rápidos
export const minimalSession = {
  topics: [createMockTopic()],
  proofs: [],
  aiSettings: defaultAISettings,
  peticaoInicial: '',
  contestacao: '',
  impugnacao: '',
  relatorio: '',
  dispositivo: '',
  tokenMetrics: {
    input: 0,
    output: 0,
    cached: 0,
  },
};

// Helper para criar sessão customizada
export const createMockSession = (
  overrides: Partial<typeof mockSession> = {}
): typeof mockSession => ({
  ...mockSession,
  ...overrides,
});
