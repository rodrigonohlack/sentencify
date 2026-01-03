// Helpers para testes E2E - SentencifyAI
// v1.33.63: Utilitários compartilhados

/**
 * Configura autenticação no localStorage
 */
export const setupAuth = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('sentencify-auth', 'true');
    // Marcar que já viu o prompt de download para não aparecer
    localStorage.setItem('dismissedDownloadPrompt', 'true');
    localStorage.setItem('dismissedDataPrompt', 'true');
    // Limpar sessão anterior para evitar modal
    localStorage.removeItem('sentencifySession');
  });
};

/**
 * Fecha qualquer modal que esteja aberto (download, sessão, etc)
 */
export const closeAnyModal = async (page) => {
  // Aguarda um pouco para modais aparecerem
  await page.waitForTimeout(1000);

  // Tenta fechar modal de download de dados
  const downloadLater = page.locator('button:has-text("Depois"), button:has-text("Fechar"), button:has-text("Cancelar")').first();
  if (await downloadLater.isVisible({ timeout: 1000 }).catch(() => false)) {
    await downloadLater.click();
    await page.waitForTimeout(500);
  }

  // Tenta fechar modal de embeddings
  const embeddingsLater = page.locator('text=Depois').first();
  if (await embeddingsLater.isVisible({ timeout: 500 }).catch(() => false)) {
    await embeddingsLater.click();
    await page.waitForTimeout(500);
  }

  // Tenta clicar em "Começar do Zero" se modal de sessão aparecer
  const startNew = page.locator('button:has-text("Começar do Zero")').first();
  if (await startNew.isVisible({ timeout: 500 }).catch(() => false)) {
    await startNew.click();
    await page.waitForTimeout(500);
  }

  // Tenta pressionar ESC para fechar outros modais
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
};

/**
 * Aguarda a aplicação carregar completamente
 */
export const waitForAppLoad = async (page) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await closeAnyModal(page);
};

/**
 * Navega para uma aba específica
 */
export const navigateToTab = async (page, tabName) => {
  await closeAnyModal(page);

  const tab = page.locator(`button:has-text("${tabName}")`).first();

  // Tenta clicar várias vezes se houver modal bloqueando
  for (let i = 0; i < 3; i++) {
    try {
      if (await tab.isVisible({ timeout: 2000 })) {
        await tab.click({ timeout: 5000 });
        await page.waitForTimeout(500);
        return true;
      }
    } catch (e) {
      await closeAnyModal(page);
      await page.waitForTimeout(500);
    }
  }
  return false;
};

/**
 * Verifica se existe campo de busca na página
 */
export const hasSearchInput = async (page) => {
  const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="uscar"]').first();
  return await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
};
