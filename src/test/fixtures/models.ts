/**
 * @file models.ts
 * @description Fixtures de modelos para testes
 * @usage import { mockModels } from 'src/test/fixtures/models'
 */

import type { Model } from '../../types';

// Modelo de exemplo
export const createMockModel = (overrides: Partial<Model> = {}): Model => ({
  id: crypto.randomUUID(),
  title: 'Modelo de Horas Extras',
  content: '<p>Considerando os elementos probatórios, resta demonstrado que...</p>',
  category: 'MÉRITO',
  keywords: ['horas extras', 'jornada', 'sobrejornada'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  embedding: undefined,
  ...overrides,
});

// Lista de modelos padrão
export const mockModels: Model[] = [
  createMockModel({
    id: 'model-1',
    title: 'Horas Extras - Procedente',
    content: '<p>Diante das provas carreadas aos autos, resta evidenciado que o reclamante laborava em jornada extraordinária...</p>',
    category: 'MÉRITO',
    keywords: ['horas extras', 'procedente', 'jornada extraordinária'],
  }),
  createMockModel({
    id: 'model-2',
    title: 'Horas Extras - Improcedente',
    content: '<p>Não restou comprovada a jornada alegada pelo reclamante...</p>',
    category: 'MÉRITO',
    keywords: ['horas extras', 'improcedente', 'não comprovado'],
  }),
  createMockModel({
    id: 'model-3',
    title: 'Inépcia da Inicial',
    content: '<p>Rejeito a preliminar de inépcia, pois a petição inicial atende aos requisitos do art. 840 da CLT...</p>',
    category: 'PRELIMINAR',
    keywords: ['inépcia', 'preliminar', 'requisitos'],
  }),
  createMockModel({
    id: 'model-4',
    title: 'Adicional Noturno',
    content: '<p>O trabalho noturno, prestado entre 22h e 5h, enseja o pagamento de adicional de 20%...</p>',
    category: 'MÉRITO',
    keywords: ['adicional noturno', 'horário noturno', 'jornada'],
  }),
  createMockModel({
    id: 'model-5',
    title: 'Honorários Advocatícios',
    content: '<p>Condeno a reclamada ao pagamento de honorários advocatícios de 15% sobre o valor da condenação...</p>',
    category: 'MÉRITO',
    keywords: ['honorários', 'sucumbência', 'advocatícios'],
  }),
];

// Modelo com embedding (para testes de busca semântica)
export const modelWithEmbedding: Model = createMockModel({
  id: 'model-with-embedding',
  title: 'Modelo com Embedding',
  embedding: Array(768).fill(0.1), // Vetor de 768 dimensões
});

// Modelos por categoria para testes de filtro
export const modelsByCategory = {
  MÉRITO: mockModels.filter(m => m.category === 'MÉRITO'),
  PRELIMINAR: mockModels.filter(m => m.category === 'PRELIMINAR'),
  DISPOSITIVO: [],
};

// Modelo grande (para testes de limite)
export const largeModel: Model = createMockModel({
  id: 'large-model',
  title: 'Modelo Grande',
  content: '<p>' + 'Lorem ipsum dolor sit amet. '.repeat(1000) + '</p>',
});

// Modelo compartilhado (para testes de sync)
export const sharedModel: Model = createMockModel({
  id: 'shared-model',
  title: 'Modelo Compartilhado',
  sharedBy: 'outro@email.com',
  sharedPermission: 'view',
});

// Helper para criar lista de modelos
export const createMockModelList = (count: number): Model[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockModel({
      id: `model-${i}`,
      title: `Modelo ${i + 1}`,
    })
  );
};

// Modelo inválido (para testes de validação)
export const invalidModel = {
  id: '',
  title: '',
  content: '',
  // Faltando campos obrigatórios
} as Partial<Model>;
