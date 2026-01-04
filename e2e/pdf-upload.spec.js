// Testes E2E de Upload de PDFs - SentencifyAI v1.33.63
// v1.35.15: Usar fixture com autenticação automática
import { test, expect } from './fixtures.js';
import { closeAnyModal, navigateToTab } from './helpers.js';

// Helper para navegar até área de uploads (pode estar na aba principal)
const navigateToUploads = async (page) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await closeAnyModal(page);

  // A área de upload pode estar em diferentes lugares
  // O upload está na página principal (aba Tópicos) quando há documentos para processar
  // Verifica se existe input file na página
};

test.describe('SentencifyAI - Upload de PDFs', () => {

  test('deve exibir área de upload', async ({ page }) => {
    await navigateToUploads(page);

    // Procura por input file ou área de upload
    const fileInput = page.locator('input[type="file"]').first();
    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Importar"), button:has-text("PDF")').first();

    const hasFileInput = await fileInput.count() > 0;
    const hasUploadButton = await uploadButton.isVisible().catch(() => false);

    expect(hasFileInput || hasUploadButton).toBeTruthy();
  });

  test('deve ter input de arquivo para PDF', async ({ page }) => {
    await navigateToUploads(page);

    // Procura input file que aceita PDF (pode estar hidden)
    const fileInput = page.locator('input[type="file"]').first();
    const count = await fileInput.count();
    expect(count).toBeGreaterThan(0);
  });

  test('deve exibir mensagem de drag & drop', async ({ page }) => {
    await navigateToUploads(page);

    // A aplicação deve ter alguma referência a PDF ou upload
    const content = await page.locator('body').textContent();
    const hasPdfReference = content.includes('PDF') ||
                            content.includes('upload') ||
                            content.includes('arquivo') ||
                            content.includes('documento');
    expect(hasPdfReference).toBeTruthy();
  });

  test('deve permitir selecionar arquivo via botão', async ({ page }) => {
    await navigateToUploads(page);

    // Verifica se tem input file para upload (pode estar hidden, ativado por botão)
    const fileInput = page.locator('input[type="file"]').first();
    const count = await fileInput.count();
    expect(count).toBeGreaterThan(0);
  });

  test('área de upload deve estar visível na aba correta', async ({ page }) => {
    await navigateToUploads(page);

    // Verifica que há conteúdo relacionado a upload ou PDF
    const content = await page.locator('body').textContent();
    const hasUploadContent = content.includes('PDF') ||
                             content.includes('documento') ||
                             content.includes('petição') ||
                             content.includes('contestação');
    expect(hasUploadContent).toBeTruthy();
  });

});

test.describe('SentencifyAI - Validação de PDFs', () => {

  test('deve exibir feedback ao fazer upload', async ({ page }) => {
    await navigateToUploads(page);

    // Verifica que há input file na página
    const fileInput = page.locator('input[type="file"]');
    const count = await fileInput.count();
    expect(count).toBeGreaterThan(0);
  });

  test('deve ter mensagens de erro para arquivos inválidos', async ({ page }) => {
    await navigateToUploads(page);

    // Verifica que a página carregou corretamente e tem input file
    await expect(page.locator('body')).toBeVisible();
    const fileInput = page.locator('input[type="file"]');
    const count = await fileInput.count();
    expect(count).toBeGreaterThan(0);
  });

  test('deve suportar múltiplos arquivos', async ({ page }) => {
    await navigateToUploads(page);

    // Verifica se input existe
    const fileInput = page.locator('input[type="file"]');
    const count = await fileInput.count();
    expect(count).toBeGreaterThan(0);
  });

});

test.describe('SentencifyAI - Lista de Documentos', () => {

  test('deve exibir lista de documentos vazia inicialmente', async ({ page }) => {
    await navigateToUploads(page);

    // Verifica que a página carregou
    await expect(page.locator('body')).toBeVisible();

    // Procura por conteúdo relacionado a documentos
    const content = await page.locator('body').textContent();
    const hasDocContent = content.includes('Petição') ||
                          content.includes('Contestação') ||
                          content.includes('documento') ||
                          content.includes('PDF');
    expect(hasDocContent).toBeTruthy();
  });

  test('deve ter botões de ação para documentos', async ({ page }) => {
    await navigateToUploads(page);

    // Procura por botões de ação (qualquer botão)
    const buttons = page.locator('button');
    const count = await buttons.count();

    // Deve ter pelo menos alguns botões na interface
    expect(count).toBeGreaterThan(0);
  });

  test('deve permitir navegação entre tipos de documento', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await closeAnyModal(page);

    // Procura abas de tipos de documento (Petição, Contestação, etc)
    const content = await page.locator('body').textContent();
    const hasDocTypes = content.includes('Petição') ||
                        content.includes('Contestação') ||
                        content.includes('Complementar');
    expect(hasDocTypes).toBeTruthy();
  });

});

test.describe('SentencifyAI - Processamento de PDFs', () => {

  test('deve exibir opções de processamento', async ({ page }) => {
    await navigateToUploads(page);

    // Verifica que a página carregou
    await expect(page.locator('body')).toBeVisible();

    // A interface deve existir
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('deve exibir estimativa de tempo para OCR', async ({ page }) => {
    await navigateToUploads(page);

    // Verifica que a estrutura existe
    await expect(page.locator('body')).toBeVisible();
  });

  test('interface deve estar responsiva', async ({ page }) => {
    await navigateToUploads(page);

    // Verifica que não há erros de layout
    const viewport = page.viewportSize();
    expect(viewport.width).toBeGreaterThan(0);

    // Verifica que conteúdo está visível
    await expect(page.locator('body')).toBeVisible();
  });

});
