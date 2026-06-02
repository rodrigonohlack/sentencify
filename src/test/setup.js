// Setup para testes com Vitest + React Testing Library
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto'; // Habilita IndexedDB globalmente para testes

// O .env define VITE_DEV_AUTH_BYPASS=true para o auto-login de DEV (Playwright /
// app local). No Vitest import.meta.env.DEV é true e o .env é carregado, então
// sem este stub o useCloudSync dispararia /api/auth/magic/dev-login nos testes
// unitários (quebrando asserções de estado inicial e de "não autenticado").
// Testes unitários NUNCA devem acionar o bypass de dev.
vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');

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
