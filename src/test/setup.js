// Setup para testes com Vitest + React Testing Library
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto'; // Habilita IndexedDB globalmente para testes

// Mock robusto do localStorage
const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
  };
};

// Substitui localStorage global
Object.defineProperty(global, 'localStorage', {
  value: createLocalStorageMock(),
  writable: true,
});

// Suprimir warnings do React 18 sobre act()
global.IS_REACT_ACT_ENVIRONMENT = true;
