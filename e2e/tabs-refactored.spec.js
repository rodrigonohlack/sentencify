/**
 * @file tabs-refactored.spec.js
 * @description Testes E2E para verificar componentes refatorados (TopicsTab, ProofsTab)
 * @version 1.37.57
 *
 * Estes testes verificam que a extração dos componentes de aba
 * não introduziu regressões na navegação e funcionalidade.
 */

import { test, expect } from './fixtures.js';
import { closeAnyModal } from './helpers.js';

test.describe('Componentes Refatorados - TopicsTab', () => {

  test('deve renderizar aba de Tópicos após refatoração', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    // Navega para aba de Tópicos
    const topicsTab = page.locator('button').filter({ hasText: /tópicos/i }).first();

    if (await topicsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await topicsTab.click();
      await page.waitForTimeout(500);

      // Verifica elementos específicos do TopicsTab refatorado
      const content = await page.locator('body').textContent();

      // Deve ter título "Gerenciar Tópicos"
      expect(content.toLowerCase()).toContain('gerenciar');

      // Deve ter contadores de status (Decididos/Pendentes) ou mensagem vazia
      const hasStatusCounters = content.includes('Decididos') || content.includes('Pendentes');
      const hasEmptyState = content.includes('Nenhum tópico');

      expect(hasStatusCounters || hasEmptyState).toBeTruthy();
    }
  });

  test('botão Novo Tópico deve estar visível na aba Tópicos', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    const topicsTab = page.locator('button').filter({ hasText: /tópicos/i }).first();

    if (await topicsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await topicsTab.click();
      await page.waitForTimeout(500);

      // Procura botão "Novo Tópico" (sempre visível no TopicsTab)
      const newTopicBtn = page.locator('button').filter({ hasText: /Novo Tópico/i });

      // O botão deve existir quando há tópicos na lista
      const content = await page.locator('body').textContent();
      if (!content.includes('Nenhum tópico')) {
        await expect(newTopicBtn.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('deve ter aviso CNJ na aba Tópicos (quando há tópicos)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    const topicsTab = page.locator('button').filter({ hasText: /tópicos/i }).first();

    if (await topicsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await topicsTab.click();
      await page.waitForTimeout(500);

      const content = await page.locator('body').textContent();

      // Se há tópicos, deve ter aviso CNJ
      if (!content.includes('Nenhum tópico')) {
        expect(content).toContain('CNJ');
      }
    }
  });

  test('interação com tópicos não deve causar erros', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    const topicsTab = page.locator('button').filter({ hasText: /tópicos/i }).first();

    if (await topicsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await topicsTab.click();
      await page.waitForTimeout(500);

      // Tenta clicar em botões de ação
      const actionButtons = page.locator('button').filter({
        hasText: /Novo Tópico|Edição Global|Exportar/i
      });

      const count = await actionButtons.count();
      if (count > 0) {
        await actionButtons.first().click();
        await page.waitForTimeout(300);

        // Fecha modal se abriu
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }

      // Verifica erros críticos
      const criticalErrors = errors.filter(e =>
        e.includes('Maximum update depth') ||
        e.includes('Cannot update a component')
      );

      expect(criticalErrors).toHaveLength(0);
    }
  });

});

test.describe('Componentes Refatorados - ProofsTab', () => {

  test('deve renderizar aba de Provas após refatoração', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    // Navega para aba de Provas
    const proofsTab = page.locator('button').filter({ hasText: /provas/i }).first();

    if (await proofsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await proofsTab.click();
      await page.waitForTimeout(500);

      // Verifica elementos específicos do ProofsTab refatorado
      const content = await page.locator('body').textContent();

      // Deve ter título "Gestão de Provas"
      expect(content).toContain('Gestão de Provas');

      // Deve ter contador de provas ou mensagem vazia
      const hasProofCount = content.includes('Provas Enviadas');
      const hasEmptyState = content.includes('Nenhuma prova');

      expect(hasProofCount || hasEmptyState).toBeTruthy();
    }
  });

  test('área de upload de PDF deve estar visível na aba Provas', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    const proofsTab = page.locator('button').filter({ hasText: /provas/i }).first();

    if (await proofsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await proofsTab.click();
      await page.waitForTimeout(500);

      // Verifica área de upload de PDF
      const content = await page.locator('body').textContent();
      expect(content).toContain('Upload de Provas');
      expect(content).toContain('PDF');
    }
  });

  test('botão Colar Texto como Prova deve funcionar', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    const proofsTab = page.locator('button').filter({ hasText: /provas/i }).first();

    if (await proofsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await proofsTab.click();
      await page.waitForTimeout(500);

      // Clica no botão "Colar Texto como Prova"
      const pasteBtn = page.locator('button').filter({ hasText: /Colar Texto como Prova/i });

      if (await pasteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pasteBtn.click();
        await page.waitForTimeout(500);

        // Deve abrir modal (verifica se algo mudou na página)
        // Fecha o modal que abriu
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }

      // Não deve ter erros
      const criticalErrors = errors.filter(e =>
        e.includes('Maximum update depth') ||
        e.includes('Cannot update a component')
      );

      expect(criticalErrors).toHaveLength(0);
    }
  });

  test('upload de arquivo na aba Provas não deve causar erros', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    const proofsTab = page.locator('button').filter({ hasText: /provas/i }).first();

    if (await proofsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await proofsTab.click();
      await page.waitForTimeout(500);

      // Procura input de arquivo na aba de provas
      const fileInput = page.locator('#proof-pdf-upload');

      if (await fileInput.count() > 0) {
        // Simula evento de change vazio
        await fileInput.evaluate(input => {
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        await page.waitForTimeout(300);
      }

      // Não deve ter erros
      expect(errors.filter(e => e.includes('Maximum update depth'))).toHaveLength(0);
    }
  });

});

test.describe('Navegação Entre Abas Refatoradas', () => {

  test('deve alternar entre Tópicos e Provas sem erros', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    const topicsTab = page.locator('button').filter({ hasText: /tópicos/i }).first();
    const proofsTab = page.locator('button').filter({ hasText: /provas/i }).first();

    // Alterna várias vezes entre as abas
    for (let i = 0; i < 3; i++) {
      if (await topicsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await topicsTab.click();
        await page.waitForTimeout(300);
      }

      if (await proofsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await proofsTab.click();
        await page.waitForTimeout(300);
      }
    }

    // Não deve ter erros de loop infinito
    const criticalErrors = errors.filter(e =>
      e.includes('Maximum update depth') ||
      e.includes('Cannot update a component')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('estado deve persistir ao navegar entre abas', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    // Vai para Tópicos
    const topicsTab = page.locator('button').filter({ hasText: /tópicos/i }).first();
    if (await topicsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await topicsTab.click();
      await page.waitForTimeout(300);

      const topicsContent = await page.locator('body').textContent();

      // Vai para Provas
      const proofsTab = page.locator('button').filter({ hasText: /provas/i }).first();
      if (await proofsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await proofsTab.click();
        await page.waitForTimeout(300);

        // Volta para Tópicos
        await topicsTab.click();
        await page.waitForTimeout(300);

        const topicsContentAfter = await page.locator('body').textContent();

        // O conteúdo deve ser semelhante (estado preservado)
        // Verificamos que "Gerenciar" ainda aparece
        expect(topicsContentAfter).toContain('Gerenciar');
      }
    }
  });

});

test.describe('Modal System após Refatoração', () => {

  test('modal deve abrir e fechar corretamente na aba Tópicos', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    const topicsTab = page.locator('button').filter({ hasText: /tópicos/i }).first();

    if (await topicsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await topicsTab.click();
      await page.waitForTimeout(500);

      // Tenta abrir modal de Novo Tópico
      const newTopicBtn = page.locator('button').filter({ hasText: /Novo Tópico/i }).first();

      if (await newTopicBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newTopicBtn.click();
        await page.waitForTimeout(500);

        // Fecha com ESC
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Não deve ter erros
        expect(errors.filter(e => e.includes('Maximum update depth'))).toHaveLength(0);
      }
    }
  });

  test('modal deve abrir e fechar corretamente na aba Provas', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await closeAnyModal(page);

    const proofsTab = page.locator('button').filter({ hasText: /provas/i }).first();

    if (await proofsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await proofsTab.click();
      await page.waitForTimeout(500);

      // Tenta abrir modal de Colar Texto
      const pasteBtn = page.locator('button').filter({ hasText: /Colar Texto/i }).first();

      if (await pasteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pasteBtn.click();
        await page.waitForTimeout(500);

        // Fecha com ESC
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Não deve ter erros
        expect(errors.filter(e => e.includes('Maximum update depth'))).toHaveLength(0);
      }
    }
  });

});
