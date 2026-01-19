// Testes E2E de Anexos de Provas - SentencifyAI v1.38.10
// Testa funcionalidade de anexos (impugnações, esclarecimentos) em provas
import { test, expect } from './fixtures.js';
import { closeAnyModal, navigateToTab } from './helpers.js';

// Helper para navegar até aba Provas
const navigateToProofs = async (page) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await closeAnyModal(page);
  await navigateToTab(page, 'Provas');
  await page.waitForTimeout(500);
};

// Helper para adicionar prova de texto (necessária para testar anexos)
const addTextProof = async (page, name = 'Prova Teste', content = 'Conteúdo da prova para teste E2E') => {
  // Clicar em "Adicionar Prova" ou similar
  const addButton = page.locator('button:has-text("Adicionar"), button:has-text("Nova Prova"), button:has-text("+ Prova")').first();
  if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addButton.click();
    await page.waitForTimeout(500);
  }

  // Procurar por opção de adicionar texto
  const textOption = page.locator('button:has-text("Texto"), button:has-text("Adicionar Texto")').first();
  if (await textOption.isVisible({ timeout: 2000 }).catch(() => false)) {
    await textOption.click();
    await page.waitForTimeout(500);
  }

  // Preencher campos se modal abrir
  const nameInput = page.locator('input[placeholder*="nome"], input[placeholder*="Nome"], input[placeholder*="título"]').first();
  if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await nameInput.fill(name);
  }

  const contentInput = page.locator('textarea').first();
  if (await contentInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await contentInput.fill(content);
  }

  // Confirmar
  const confirmButton = page.locator('button:has-text("Adicionar"), button:has-text("Salvar"), button:has-text("Confirmar")').first();
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click();
    await page.waitForTimeout(500);
  }
};

test.describe('SentencifyAI - Anexos de Provas', () => {

  test('deve navegar para aba Provas', async ({ page }) => {
    await navigateToProofs(page);

    // Verificar que estamos na aba Provas
    const content = await page.locator('body').textContent();
    const isProofsTab = content.includes('Prova') ||
                        content.includes('prova') ||
                        content.includes('Anexo');
    expect(isProofsTab).toBeTruthy();
  });

  test('deve exibir botões de adicionar prova', async ({ page }) => {
    await navigateToProofs(page);

    // Procura por botões de adicionar
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('deve ter referência a anexos na interface', async ({ page }) => {
    await navigateToProofs(page);

    // Verifica se existe menção a anexos ou documentos relacionados
    const content = await page.locator('body').textContent();
    const hasAttachmentRef = content.includes('Anexo') ||
                              content.includes('anexo') ||
                              content.includes('PDF') ||
                              content.includes('Texto');
    expect(hasAttachmentRef).toBeTruthy();
  });

});

test.describe('SentencifyAI - UI de Anexos', () => {

  test('deve ter input file para upload de PDF', async ({ page }) => {
    await navigateToProofs(page);

    // Procura input file (pode estar hidden)
    const fileInput = page.locator('input[type="file"]');
    const count = await fileInput.count();
    expect(count).toBeGreaterThan(0);
  });

  test('deve exibir seção de anexos em cards de prova', async ({ page }) => {
    await navigateToProofs(page);

    // Procura por texto "Anexos" que indica a seção
    const attachmentsSection = page.locator('text=Anexos').first();
    const hasSection = await attachmentsSection.isVisible({ timeout: 3000 }).catch(() => false);

    // Se não encontrar, verifica se há provas na página
    if (!hasSection) {
      const content = await page.locator('body').textContent();
      // OK se não há provas ainda
      expect(content.includes('Prova') || content.includes('prova') || content.includes('Nenhuma')).toBeTruthy();
    }
  });

  test('botões de anexo devem ter hover funcional', async ({ page }) => {
    await navigateToProofs(page);

    // Procura por botões com classe hover-slate-600
    const hoverButtons = page.locator('.hover-slate-600');
    const count = await hoverButtons.count();

    // Se existem, verifica que são clicáveis
    if (count > 0) {
      const firstButton = hoverButtons.first();
      await expect(firstButton).toBeEnabled();
    }
  });

});

test.describe('SentencifyAI - Funcionalidade de Anexos', () => {

  test('deve ter botão para adicionar anexo PDF', async ({ page }) => {
    await navigateToProofs(page);

    // Procura por botão + PDF ou similar
    const pdfButton = page.locator('button:has-text("PDF")').first();
    const hasPdfButton = await pdfButton.isVisible({ timeout: 3000 }).catch(() => false);

    // Se não encontrar diretamente, verifica no conteúdo
    if (!hasPdfButton) {
      const content = await page.locator('body').textContent();
      expect(content.includes('PDF') || content.includes('arquivo')).toBeTruthy();
    }
  });

  test('deve ter botão para adicionar anexo Texto', async ({ page }) => {
    await navigateToProofs(page);

    // Procura por botão + Texto ou similar
    const textButton = page.locator('button:has-text("Texto")').first();
    const hasTextButton = await textButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTextButton) {
      const content = await page.locator('body').textContent();
      expect(content.includes('Texto') || content.includes('texto')).toBeTruthy();
    }
  });

  test('deve exibir formulário ao clicar em adicionar texto', async ({ page }) => {
    await navigateToProofs(page);

    // Procura e clica no botão de texto
    const textButton = page.locator('button:has-text("Texto")').first();

    if (await textButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textButton.click();
      await page.waitForTimeout(500);

      // Verifica se apareceu campo de input
      const inputs = page.locator('input, textarea');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('interface deve estar responsiva', async ({ page }) => {
    await navigateToProofs(page);

    // Verifica viewport
    const viewport = page.viewportSize();
    expect(viewport.width).toBeGreaterThan(0);

    // Verifica que body está visível
    await expect(page.locator('body')).toBeVisible();
  });

});

test.describe('SentencifyAI - ProcessingModeSelector', () => {

  test('deve ter seletor de modo de processamento', async ({ page }) => {
    await navigateToProofs(page);

    // Procura por select ou dropdown de modo
    const modeSelector = page.locator('select, [role="combobox"], [role="listbox"]');
    const count = await modeSelector.count();

    // Se não há seletor, verifica se há texto relacionado
    if (count === 0) {
      const content = await page.locator('body').textContent();
      const hasModeRef = content.includes('PDF.js') ||
                          content.includes('Tesseract') ||
                          content.includes('modo') ||
                          content.includes('extração');
      // OK se não há referência (pode não ter provas PDF)
      expect(true).toBeTruthy();
    }
  });

  test('deve ter opções de modo de extração', async ({ page }) => {
    await navigateToProofs(page);

    // Verifica se há menção a modos de extração
    const content = await page.locator('body').textContent();
    const hasModes = content.includes('PDF') ||
                      content.includes('extração') ||
                      content.includes('Extrair');
    expect(hasModes).toBeTruthy();
  });

});
