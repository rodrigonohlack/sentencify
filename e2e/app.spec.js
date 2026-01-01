// Testes E2E para SentencifyAI
import { test, expect } from '@playwright/test';

test.describe('SentencifyAI - Testes Básicos', () => {
  
  test('deve carregar a aplicação corretamente', async ({ page }) => {
    await page.goto('/');
    
    // Aguarda a aplicação carregar completamente
    await page.waitForLoadState('networkidle');
    
    // Verifica que o body está visível
    await expect(page.locator('body')).toBeVisible();
    
    // Verifica que há conteúdo na página (não está em branco)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.length).toBeGreaterThan(100);
  });

  test('deve exibir as abas principais', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Aguarda pelo menos um botão ou tab estar visível
    await expect(page.locator('button').first()).toBeVisible({ timeout: 15000 });
  });

  test('não deve haver erros críticos no console', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignorar erros conhecidos/esperados
        if (!text.includes('Download the React DevTools') &&
            !text.includes('favicon.ico') &&
            !text.includes('net::ERR') &&
            !text.includes('Failed to load resource')) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Aguarda processamento inicial
    
    // Não deve haver erros críticos como "Maximum update depth exceeded"
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('Maximum update depth exceeded') ||
      err.includes('Cannot update a component') ||
      err.includes('Uncaught Error')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

});

test.describe('SentencifyAI - Interações', () => {
  
  test('deve ter botões clicáveis', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Encontra qualquer botão e verifica que está habilitado
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Pelo menos o primeiro botão deve estar visível
    await expect(buttons.first()).toBeVisible();
  });

  test('deve responder a cliques sem erros', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Clica no primeiro botão visível
    const firstButton = page.locator('button').first();
    if (await firstButton.isVisible()) {
      await firstButton.click();
      await page.waitForTimeout(500);
    }
    
    // Não deve ter causado erros de JavaScript
    const criticalErrors = errors.filter(e => 
      e.includes('Maximum update depth') || 
      e.includes('Cannot update a component')
    );
    expect(criticalErrors).toHaveLength(0);
  });

});

test.describe('SentencifyAI - Editor Global (bug v1.33.25)', () => {
  
  test('não deve dar erro ao abrir editor global e interagir', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Procura pelo botão de Editor Global (pode ter diferentes textos)
    const editorGlobalBtn = page.locator('button').filter({ 
      hasText: /Editor Global|Editar Todos|Global/i 
    }).first();
    
    if (await editorGlobalBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editorGlobalBtn.click();
      await page.waitForTimeout(1000);
      
      // Verifica se não houve erro de setState durante render
      const stateErrors = consoleErrors.filter(e => 
        e.includes('Cannot update a component') ||
        e.includes('Maximum update depth exceeded')
      );
      
      expect(stateErrors).toHaveLength(0);
    }
  });

  test('não deve dar erro ao clicar em campos do editor global', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tenta abrir editor global
    const editorGlobalBtn = page.locator('button').filter({ 
      hasText: /Editor Global|Editar Todos|Global/i 
    }).first();
    
    if (await editorGlobalBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editorGlobalBtn.click();
      await page.waitForTimeout(1000);
      
      // Tenta clicar em qualquer campo de texto/editor dentro do modal
      const editor = page.locator('[contenteditable="true"], .ql-editor, textarea').first();
      
      if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editor.click();
        await page.waitForTimeout(500);
      }
      
      // Verifica erros críticos
      const criticalErrors = consoleErrors.filter(e => 
        e.includes('Cannot update a component') ||
        e.includes('Maximum update depth exceeded') ||
        e.includes('null') && e.includes('render')
      );
      
      expect(criticalErrors).toHaveLength(0);
    }
  });

});
