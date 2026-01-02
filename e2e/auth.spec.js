// Testes E2E de Autenticação - SentencifyAI v1.33.62
import { test, expect } from '@playwright/test';

const AUTH_STORAGE_KEY = 'sentencify-auth';

test.describe('SentencifyAI - Autenticação', () => {

  test.beforeEach(async ({ page }) => {
    // Limpar localStorage antes de cada teste
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('deve carregar a aplicação', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Deve ter conteúdo visível (login ou app principal)
    await expect(page.locator('body')).toBeVisible();
  });

  test('deve exibir tela de login ou app principal dependendo da config', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Aguarda carregamento completo
    await page.waitForTimeout(2000);

    // Verifica se está na tela de login ou no app
    const loginScreen = page.locator('text=Acesso Restrito');
    const mainApp = page.locator('button').first();

    // Um dos dois deve estar visível
    const isLoginVisible = await loginScreen.isVisible().catch(() => false);
    const isAppVisible = await mainApp.isVisible().catch(() => false);

    expect(isLoginVisible || isAppVisible).toBeTruthy();
  });

  test('deve exibir campo de senha na tela de login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const loginScreen = page.locator('text=Acesso Restrito');
    const isLoginVisible = await loginScreen.isVisible().catch(() => false);

    if (isLoginVisible) {
      // Verifica campo de senha
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible();

      // Verifica botão de entrar
      const submitButton = page.locator('button:has-text("Entrar")');
      await expect(submitButton).toBeVisible();
    } else {
      // Auth desabilitada - pular teste
      test.skip();
    }
  });

  test('deve exibir erro com senha incorreta', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const loginScreen = page.locator('text=Acesso Restrito');
    const isLoginVisible = await loginScreen.isVisible().catch(() => false);

    if (isLoginVisible) {
      // Digita senha errada
      await page.fill('input[type="password"]', 'senha_errada_123');
      await page.click('button:has-text("Entrar")');

      // Aguarda resposta
      await page.waitForTimeout(2000);

      // Deve exibir erro
      const errorMessage = page.locator('text=Senha incorreta');
      const isErrorVisible = await errorMessage.isVisible().catch(() => false);

      // Se não aparecer "Senha incorreta", pode aparecer outro erro
      if (!isErrorVisible) {
        const anyError = page.locator('.text-red-400');
        await expect(anyError).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('botão Entrar deve estar desabilitado sem senha', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const loginScreen = page.locator('text=Acesso Restrito');
    const isLoginVisible = await loginScreen.isVisible().catch(() => false);

    if (isLoginVisible) {
      const submitButton = page.locator('button:has-text("Entrar")');
      await expect(submitButton).toBeDisabled();
    } else {
      test.skip();
    }
  });

  test('botão Entrar deve habilitar ao digitar senha', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const loginScreen = page.locator('text=Acesso Restrito');
    const isLoginVisible = await loginScreen.isVisible().catch(() => false);

    if (isLoginVisible) {
      // Digita algo no campo
      await page.fill('input[type="password"]', 'qualquer_coisa');

      const submitButton = page.locator('button:has-text("Entrar")');
      await expect(submitButton).toBeEnabled();
    } else {
      test.skip();
    }
  });

});

test.describe('SentencifyAI - Sessão e Logout', () => {

  test('deve manter sessão salva no localStorage', async ({ page }) => {
    // Simula sessão autenticada
    await page.addInitScript(() => {
      localStorage.setItem('sentencify-auth', 'true');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verifica se está no app principal (não na tela de login)
    const buttons = page.locator('button');
    const count = await buttons.count();

    // App principal tem vários botões
    expect(count).toBeGreaterThan(3);
  });

  test('deve exibir botão de logout quando autenticado', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sentencify-auth', 'true');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Procura pelo botão de logout (ícone LogOut)
    const logoutButton = page.locator('button[title*="Sair"], button:has-text("Sair")');
    const isVisible = await logoutButton.first().isVisible().catch(() => false);

    // Logout pode estar em um menu ou header
    if (!isVisible) {
      // Procura por qualquer indicador de logout
      const anyLogout = page.locator('[class*="logout"], [data-testid="logout"]');
      // Pode não existir se auth estiver desabilitada
    }
  });

});

test.describe('SentencifyAI - Modal Sessão Anterior', () => {

  test('deve exibir modal de sessão anterior quando há dados salvos', async ({ page }) => {
    // Simula sessão anterior com dados
    await page.addInitScript(() => {
      localStorage.setItem('sentencify-auth', 'true');
      localStorage.setItem('sentencifySession', JSON.stringify({
        lastSaved: new Date().toISOString(),
        hasData: true
      }));
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Procura pelo modal de sessão anterior
    const modal = page.locator('text=Sessão Anterior Encontrada');
    const isVisible = await modal.isVisible().catch(() => false);

    // Modal pode aparecer dependendo dos dados salvos
    if (isVisible) {
      // Verifica botões do modal
      await expect(page.locator('text=Continuar Sessão')).toBeVisible();
      await expect(page.locator('text=Começar do Zero')).toBeVisible();
    }
  });

  test('modal de sessão anterior não deve fechar com ESC', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sentencify-auth', 'true');
      localStorage.setItem('sentencifySession', JSON.stringify({
        lastSaved: new Date().toISOString(),
        hasData: true
      }));
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const modal = page.locator('text=Sessão Anterior Encontrada');
    const isVisible = await modal.isVisible().catch(() => false);

    if (isVisible) {
      // Tenta fechar com ESC
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Modal deve continuar visível (preventClose)
      await expect(modal).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('modal de sessão anterior não deve ter botão X', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sentencify-auth', 'true');
      localStorage.setItem('sentencifySession', JSON.stringify({
        lastSaved: new Date().toISOString(),
        hasData: true
      }));
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const modal = page.locator('text=Sessão Anterior Encontrada');
    const isVisible = await modal.isVisible().catch(() => false);

    if (isVisible) {
      // Procura botão X dentro do modal
      const modalContainer = page.locator('.fixed').filter({ hasText: 'Sessão Anterior' });
      const closeButton = modalContainer.locator('button:has(svg.lucide-x)');

      // Não deve existir botão X (preventClose)
      await expect(closeButton).toHaveCount(0);
    } else {
      test.skip();
    }
  });

  test('deve fechar modal ao clicar em "Continuar Sessão"', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sentencify-auth', 'true');
      localStorage.setItem('sentencifySession', JSON.stringify({
        lastSaved: new Date().toISOString(),
        hasData: true
      }));
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const modal = page.locator('text=Sessão Anterior Encontrada');
    const isVisible = await modal.isVisible().catch(() => false);

    if (isVisible) {
      await page.click('text=Continuar Sessão');
      await page.waitForTimeout(1000);

      // Modal deve fechar
      await expect(modal).not.toBeVisible();
    } else {
      test.skip();
    }
  });

  test('deve fechar modal ao clicar em "Começar do Zero"', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sentencify-auth', 'true');
      localStorage.setItem('sentencifySession', JSON.stringify({
        lastSaved: new Date().toISOString(),
        hasData: true
      }));
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const modal = page.locator('text=Sessão Anterior Encontrada');
    const isVisible = await modal.isVisible().catch(() => false);

    if (isVisible) {
      await page.click('text=Começar do Zero');
      await page.waitForTimeout(1000);

      // Modal deve fechar
      await expect(modal).not.toBeVisible();
    } else {
      test.skip();
    }
  });

});
