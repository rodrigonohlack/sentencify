// e2e/fixtures.js - Fixtures globais para testes E2E
// v1.35.15: Autenticação automática para todos os testes

import { test as base, expect } from '@playwright/test';

// Criar fixture customizado com autenticação
export const test = base.extend({
  // Página com autenticação configurada
  page: async ({ page }, use) => {
    // Configurar autenticação ANTES de qualquer navegação
    await page.addInitScript(() => {
      // Magic Link auth (v1.34.0+)
      localStorage.setItem('sentencify-auth-token', 'test-token-for-e2e');
      localStorage.setItem('sentencify-user', JSON.stringify({
        id: 'test-user-e2e',
        email: 'test@e2e.local',
        name: 'Test User E2E'
      }));
      // Compatibilidade com auth antiga
      localStorage.setItem('sentencify-auth', 'true');
      // Marcar que já viu os prompts para não aparecerem
      localStorage.setItem('dismissedDownloadPrompt', 'true');
      localStorage.setItem('dismissedDataPrompt', 'true');
      localStorage.setItem('dismissedEmbeddingsPrompt', 'true');
      // Limpar sessão anterior para evitar modal
      localStorage.removeItem('sentencifySession');
    });

    await use(page);
  },
});

export { expect };
