// Setup para testes com Vitest + React Testing Library
import '@testing-library/jest-dom';

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock do IndexedDB (simplificado)
global.indexedDB = {
  open: vi.fn(),
};

// Suprimir warnings do React 18 sobre act()
global.IS_REACT_ACT_ENVIRONMENT = true;
