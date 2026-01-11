/**
 * @file useDocumentServices.ts
 * @description Hook para processamento de documentos (PDF, DOCX, OCR)
 * @version 1.36.79
 *
 * Extraído do App.tsx v1.9.12
 * Centraliza toda a lógica de processamento de documentos
 */

import React from 'react';
import type { PdfjsLib, MammothLib, TesseractLib, PdfDocument, TesseractScheduler, AISettings } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface mínima para integração com AI (evita dependência circular com useAIIntegration)
 */
export interface AIIntegrationForDocuments {
  aiSettings?: AISettings;
  getApiHeaders: () => Record<string, string>;
  logCacheMetrics: (data: { usage?: { input_tokens?: number; output_tokens?: number } }) => void;
}

export type UseDocumentServicesReturn = ReturnType<typeof useDocumentServices>;

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para processamento de documentos (PDF, DOCX, OCR)
 * @param aiIntegration - Integração com AI para OCR Claude Vision
 */
const useDocumentServices = (aiIntegration: AIIntegrationForDocuments | null) => {
  // 📚 CARREGAR BIBLIOTECAS VIA CDN

  const loadPDFJS = React.useCallback((): Promise<PdfjsLib> => {
    return new Promise((resolve, reject) => {

      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('pdfjsLib não encontrado após carregar script'));
        }
      };

      script.onerror = () => {
        reject(new Error('Falha ao carregar PDF.js da CDN'));
      };

      setTimeout(() => {
        if (!window.pdfjsLib) {
          reject(new Error('Timeout ao carregar PDF.js'));
        }
      }, 10000);

      document.head.appendChild(script);
    });
  }, []);

  const loadMammoth = React.useCallback((): Promise<MammothLib> => {
    return new Promise((resolve, reject) => {

      if (window.mammoth) {
        resolve(window.mammoth);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';

      script.onload = () => {
        if (window.mammoth) {
          resolve(window.mammoth);
        } else {
          reject(new Error('mammoth não encontrado após carregar script'));
        }
      };

      script.onerror = () => {
        reject(new Error('Falha ao carregar Mammoth.js da CDN'));
      };

      setTimeout(() => {
        if (!window.mammoth) {
          reject(new Error('Timeout ao carregar Mammoth.js'));
        }
      }, 10000);

      document.head.appendChild(script);
    });
  }, []);

  // 🆕 v1.31: Loader Tesseract.js para OCR offline
  const loadTesseract = React.useCallback((): Promise<TesseractLib> => {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

      script.onload = () => {
        if (window.Tesseract) {
          resolve(window.Tesseract);
        } else {
          reject(new Error('Tesseract não encontrado após carregar script'));
        }
      };

      script.onerror = () => {
        reject(new Error('Falha ao carregar Tesseract.js da CDN'));
      };

      // Timeout maior (30s) pois modelo português (~4MB) pode demorar
      setTimeout(() => {
        if (!window.Tesseract) {
          reject(new Error('Timeout ao carregar Tesseract.js'));
        }
      }, 30000);

      document.head.appendChild(script);
    });
  }, []);

  // 📝 EXTRAÇÃO DE TEXTO DE PDF

  // v1.20.2: Adicionado pdf.destroy() em finally (FIX memory leak ~50-100MB por PDF)
  const extractTextFromPDFPure = React.useCallback(async (file: File, progressCallback: ((page: number, total: number) => void) | null = null) => {
    let pdf: PdfDocument | null = null;
    try {
      const pdfjsLib = await loadPDFJS();
      const arrayBuffer = await file.arrayBuffer();
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        if (progressCallback) {
          progressCallback(i, totalPages);
        }
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // v1.14.1: Validar textContent.items antes de map (fix: null em alguns PDFs)
        const items = textContent?.items || [];
        const pageText = items.map((item: { str?: string }) => item?.str || '').join(' ');
        fullText += pageText + '\n\n';
      }

      // v1.16.7: Anonimização movida para analyzeDocuments (evita duplicação)
      return fullText.trim();
    } catch (err) {
      return null;
    } finally {
      if (pdf) {
        try { pdf.destroy(); } catch (e) { /* ignore */ }
      }
    }
  }, [loadPDFJS]);

  const extractTextFromDOCX = React.useCallback(async (file: File) => {
    try {
      const mammoth = await loadMammoth();

      const arrayBuffer = await file.arrayBuffer();

      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;

      return text;
    } catch (err) {
      throw new Error(`Falha ao extrair texto do DOCX: ${(err as Error).message}`);
    }
  }, [loadMammoth]);

  // 🆕 v1.12.23: Processamento em BATCH - envia até 50 páginas por requisição (25x mais rápido)
  // v1.20.2: Adicionado pdf.destroy() em finally (FIX memory leak)
  const extractTextFromPDFWithClaudeVision = React.useCallback(async (file: File, progressCallback: ((page: number, total: number, status?: string) => void) | null = null) => {
    // Constantes de configuração do batch
    const BATCH_SIZE = 50;        // Máximo de páginas por requisição (API suporta até 100)
    const SCALE = 1.5;            // Escala reduzida para garantir < 2000px por imagem
    const JPEG_QUALITY = 0.85;    // Qualidade JPEG (menor = mais rápido upload)
    const MAX_TOKENS = 16384;     // Tokens para acomodar múltiplas páginas

    let pdf: PdfDocument | null = null;
    try {
      if (progressCallback) {
        progressCallback(0, 0, 'iniciando');
      }

      const pdfjsLib = await loadPDFJS();
      const arrayBuffer = await file.arrayBuffer();

      // v1.12.15: Desabilita carregamento de fontes externas (evita erro CORS no Claude.ai)
      pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: true
      } as unknown as { data: ArrayBuffer }).promise;

      const totalPages = pdf.numPages;

      // FASE 1: Renderizar TODAS as páginas para imagens base64
      const pageImages: { pageNum: number; base64: string }[] = [];
      for (let i = 1; i <= totalPages; i++) {
        if (progressCallback) {
          progressCallback(i, totalPages, 'renderizando');
        }

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: SCALE });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        try {
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas 2D context not available');
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          const base64Image = canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
          pageImages.push({ pageNum: i, base64: base64Image });
        } finally {
          // Liberar memória do canvas sempre, mesmo em caso de erro
          canvas.width = 0;
          canvas.height = 0;
        }
      }

      // FASE 2: Processar em batches de até 50 páginas
      let fullText = '';
      const totalBatches = Math.ceil(totalPages / BATCH_SIZE);

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const startIdx = batchIdx * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, totalPages);
        const batchImages = pageImages.slice(startIdx, endIdx);
        const batchPageNumbers = batchImages.map(img => img.pageNum);

        if (progressCallback) {
          progressCallback(endIdx, totalPages, `processando batch ${batchIdx + 1}/${totalBatches}`);
        }

        // Construir array de content com todas as imagens do batch
        const content: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }> = [];

        // Adicionar cada imagem do batch
        batchImages.forEach((img) => {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: img.base64
            }
          });
        });

        // Prompt final pedindo extração de TODAS as páginas do batch
        const idioma = aiIntegration?.aiSettings?.ocrLanguage === 'por' ? 'Português' : 'English';
        // v1.14.1: Validar batchPageNumbers antes de acessar índices (fix: array vazio)
        const firstPage = batchPageNumbers[0] || 1;
        const lastPage = batchPageNumbers[batchPageNumbers.length - 1] || firstPage;
        content.push({
          type: 'text',
          text: `Extraia TODO o texto de TODAS as ${batchImages.length} imagens acima. São as páginas ${firstPage} a ${lastPage} de um documento legal.

INSTRUÇÕES IMPORTANTES:
- Processe CADA página na ordem exata apresentada
- Para CADA página, inicie com uma linha "--- PÁGINA ${firstPage <= 1 ? 'X' : firstPage + ' a ' + lastPage} ---" (substitua X pelo número)
- Retorne APENAS o texto extraído, sem comentários ou explicações
- Preserve a formatação de parágrafos e estrutura do documento
- Idioma do documento: ${idioma}`
        });

        // Fazer a requisição para o batch inteiro
        if (!aiIntegration) throw new Error('AI integration not available');
        const requestBody = {
          model: aiIntegration.aiSettings?.model || 'claude-sonnet-4-20250514',
          max_tokens: MAX_TOKENS,
          messages: [{ role: 'user', content }]
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: aiIntegration.getApiHeaders(),
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          // Se falhar no primeiro batch, fazer fallback para PDF.js puro
          if (batchIdx === 0) {
            console.warn('⚠️ Fallback para PDF.js puro');
            return await extractTextFromPDFPure(file, progressCallback);
          }

          // Se falhar em batches subsequentes, marcar erro e continuar
          fullText += `\n\n[ERRO: Páginas ${startIdx + 1} a ${endIdx} não puderam ser processadas via OCR]\n\n`;
          continue;
        }

        const data = await response.json();
        // v1.20.5: Contabilizar tokens de OCR Claude Vision
        if (data.usage) {
          aiIntegration.logCacheMetrics(data);
        }
        const batchText = data.content?.[0]?.text || '';
        fullText += batchText + '\n\n';
      }

      const finalText = fullText.trim();
      return finalText;

    } catch (err) {
      return await extractTextFromPDFPure(file, progressCallback);
    } finally {
      if (pdf) {
        try { pdf.destroy(); } catch (e) { /* ignore */ }
      }
    }
  }, [loadPDFJS, aiIntegration, extractTextFromPDFPure]);

  // 🆕 v1.31: OCR offline com Tesseract.js
  // v1.31.02: Paralelo com Scheduler (pool de workers)
  // v1.31.03: Batching + Workers dinâmicos (75% cores, max 8)
  // v1.32.15: Alta qualidade (SCALE 4.0 + PSM 6)
  const extractTextFromPDFWithTesseract = React.useCallback(async (file: File, progressCallback: ((page: number, total: number, status?: string) => void) | null = null) => {
    const SCALE = 4.0;  // v1.32.15: Máxima qualidade OCR
    // 75% dos cores lógicos, mínimo 2, máximo 8
    const NUM_WORKERS = Math.min(Math.max(Math.ceil((navigator.hardwareConcurrency || 4) * 0.75), 2), 8);
    const BATCH_SIZE = NUM_WORKERS;

    let pdf: PdfDocument | null = null;
    let scheduler: TesseractScheduler | null = null;

    try {
      // v1.36.33: Diagnóstico de performance Tesseract
      console.time('[Tesseract] Library load');
      const [pdfjsLib, Tesseract] = await Promise.all([
        loadPDFJS(),
        loadTesseract()
      ]);
      console.timeEnd('[Tesseract] Library load');

      console.time('[Tesseract] PDF parse');
      const arrayBuffer = await file.arrayBuffer();
      pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: true
      } as unknown as { data: ArrayBuffer }).promise;
      console.timeEnd('[Tesseract] PDF parse');

      const totalPages = pdf.numPages;

      // 1. Criar scheduler com pool de workers
      if (progressCallback) progressCallback(0, totalPages, `Iniciando ${NUM_WORKERS} workers...`);

      scheduler = Tesseract.createScheduler();
      const tesseractScheduler = scheduler; // Capture reference for closure

      // v1.36.33: Criar primeiro worker sozinho (cacheia modelo ~4MB)
      // Depois os demais em paralelo (usam cache)
      console.time('[Tesseract] First worker (downloads model)');
      const firstWorker = await Tesseract.createWorker('por');
      await firstWorker.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1'
      });
      tesseractScheduler.addWorker(firstWorker);
      console.timeEnd('[Tesseract] First worker (downloads model)');

      // Workers restantes em paralelo (modelo já cacheado)
      if (NUM_WORKERS > 1) {
        console.time(`[Tesseract] Remaining ${NUM_WORKERS - 1} workers (parallel)`);
        await Promise.all(
          Array.from({ length: NUM_WORKERS - 1 }, async () => {
            const worker = await Tesseract.createWorker('por');
            await worker.setParameters({
              tessedit_pageseg_mode: '6',
              preserve_interword_spaces: '1'
            });
            tesseractScheduler.addWorker(worker);
          })
        );
        console.timeEnd(`[Tesseract] Remaining ${NUM_WORKERS - 1} workers (parallel)`);
      }

      // v1.36.34: Mais diagnóstico - onde trava?
      console.log('[Tesseract] Workers ready, starting batch processing...');

      // 2. Processar em batches (limita memória)
      const allResults: { pageNum: number; text: string }[] = [];
      let completed = 0;

      for (let batchStart = 0; batchStart < totalPages; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalPages);
        const batchPages = Array.from(
          { length: batchEnd - batchStart },
          (_, i: number) => batchStart + i + 1
        );

        console.log(`[Tesseract] Processing batch: pages ${batchStart + 1}-${batchEnd}`);

        // 2a. Renderizar batch de páginas
        console.time('[Tesseract] Canvas render');
        const canvases = await Promise.all(
          batchPages.map(async (pageNum) => {
            if (!pdf) throw new Error('PDF not loaded');
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: SCALE });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas 2D context not available');
            await page.render({ canvasContext: ctx, viewport }).promise;
            console.log(`[Tesseract] Page ${pageNum} rendered`);
            return { canvas, pageNum };
          })
        );
        console.timeEnd('[Tesseract] Canvas render');

        // 2b. OCR batch em paralelo
        if (!scheduler) throw new Error('Tesseract scheduler not available');
        const activeScheduler = scheduler; // Capture non-null for closure
        console.time('[Tesseract] OCR batch');
        const batchResults = await Promise.all(
          canvases.map(async ({ canvas, pageNum }) => {
            console.log(`[Tesseract] Starting OCR page ${pageNum}...`);
            const { data: { text } } = await activeScheduler.addJob('recognize', canvas);
            console.log(`[Tesseract] Page ${pageNum} OCR complete`);
            completed++;
            if (progressCallback) progressCallback(completed, totalPages, 'OCR...');
            // Cleanup imediato
            canvas.width = 0;
            canvas.height = 0;
            return { pageNum, text };
          })
        );
        console.timeEnd('[Tesseract] OCR batch');

        allResults.push(...batchResults);
      }

      // 3. Ordenar e juntar
      allResults.sort((a, b) => a.pageNum - b.pageNum);
      return allResults.map(r => r.text).join('\n\n').trim();

    } catch (err) {
      console.error('[Tesseract OCR] Erro:', err);
      return null;
    } finally {
      if (scheduler) {
        try { await scheduler.terminate(); } catch (e) { /* ignore */ }
      }
      if (pdf) {
        try { pdf.destroy(); } catch (e) { /* ignore */ }
      }
    }
  }, [loadPDFJS, loadTesseract]);

  const extractTextFromPDF = React.useCallback(async (file: File, progressCallback: ((page: number, total: number, status?: string) => void) | null = null) => {
    const engine = aiIntegration?.aiSettings?.ocrEngine || 'pdfjs';

    switch (engine) {
      case 'claude-vision':
        return await extractTextFromPDFWithClaudeVision(file, progressCallback);
      case 'pdf-puro':
        return null;
      default:
        return await extractTextFromPDFPure(file, progressCallback);
    }
  }, [aiIntegration, extractTextFromPDFWithClaudeVision, extractTextFromPDFPure]);

  // 🆕 v1.12.20: Extração de texto com modo específico (para provas individuais)
  const extractTextFromPDFWithMode = React.useCallback(async (file: File, mode: string, progressCallback: ((page: number, total: number) => void) | null = null) => {
    // Modos: 'pdfjs' | 'tesseract' | 'claude-vision' | 'pdf-puro'
    switch (mode) {
      case 'pdf-puro':
        return null;
      case 'tesseract':
        return await extractTextFromPDFWithTesseract(file, progressCallback);
      case 'claude-vision':
        return await extractTextFromPDFWithClaudeVision(file, progressCallback);
      case 'pdfjs':
      default:
        return await extractTextFromPDFPure(file, progressCallback);
    }
  }, [extractTextFromPDFWithClaudeVision, extractTextFromPDFPure, extractTextFromPDFWithTesseract]);

  // 🔢 DETECÇÃO DE NÚMERO DO PROCESSO

  const extractProcessoFromFileName = React.useCallback((fileName: string) => {
    if (!fileName) return null;

    const match = fileName.match(/(AT|ATOrd|RO|RR|AP|AI|MS)?\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);

    if (match) {
      return match[0].trim();
    }

    return null;
  }, []);

  // v1.20.2: Adicionado pdf.destroy() em finally (FIX memory leak)
  const extractProcessoFromFirstPage = React.useCallback(async (file: File) => {
    if (!file || file.type !== 'application/pdf') return null;

    let pdf: PdfDocument | null = null;
    try {
      const pdfjsLib = await loadPDFJS();
      const arrayBuffer = await file.arrayBuffer();
      // v1.12.15: Desabilita carregamento de fontes externas (evita erro CORS no Claude.ai)
      pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: true
      } as unknown as { data: ArrayBuffer }).promise;

      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      // v1.14.1: Validar textContent.items
      const items = textContent?.items || [];
      const pageText = items.map((item: { str?: string }) => item?.str || '').join(' ');

      const match = pageText.match(/(AT|ATOrd|RO|RR|AP|AI|MS)?\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);

      if (match) {
        return match[0].trim();
      }

      return null;
    } catch (err) {
      return null;
    } finally {
      if (pdf) {
        try { pdf.destroy(); } catch (e) { /* ignore */ }
      }
    }
  }, [loadPDFJS]);

  const autoDetectProcessoNumero = React.useCallback(async (files: { peticao?: File | null; contestacoes?: File[]; complementares?: File[] }) => {
    try {
      if (files.peticao) {
        const numeroFromPeticao = extractProcessoFromFileName(files.peticao.name);
        if (numeroFromPeticao) {
          return numeroFromPeticao;
        }
      }

      if (files.contestacoes && files.contestacoes.length > 0) {
        const numeroFromContestacao = extractProcessoFromFileName(files.contestacoes[0].name);
        if (numeroFromContestacao) {
          return numeroFromContestacao;
        }
      }

      if (files.complementares && files.complementares.length > 0) {
        for (const comp of files.complementares) {
          const numeroFromComp = extractProcessoFromFileName(comp.name);
          if (numeroFromComp) {
            return numeroFromComp;
          }
        }
      }

      if (files.contestacoes && files.contestacoes.length > 0) {
        const numeroFromPage = await extractProcessoFromFirstPage(files.contestacoes[0]);
        if (numeroFromPage) {
          return numeroFromPage;
        }
      }

      if (files.peticao) {
        const numeroFromPage = await extractProcessoFromFirstPage(files.peticao);
        if (numeroFromPage) {
          return numeroFromPage;
        }
      }

      return null;
    } catch (err) {
      return null;
    }
  }, [extractProcessoFromFileName, extractProcessoFromFirstPage]);

  // 📦 PROCESSAMENTO EM LOTE

  const extractTextFromBulkFile = React.useCallback(async (file: File): Promise<string> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const text = e.target?.result as string;
          resolve(text);
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo TXT'));
        reader.readAsText(file);
      });
    }

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        const text = await extractTextFromPDF(file);

        if (!text || text.trim().length < 50) {
          throw new Error('PDF vazio ou texto muito curto');
        }

        return text;
      } catch (err) {
        throw new Error(`Falha ao extrair texto do PDF: ${(err as Error).message}`);
      }
    }

    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword' ||
        fileName.endsWith('.docx') ||
        fileName.endsWith('.doc')) {
      try {
        const text = await extractTextFromDOCX(file);

        if (!text || text.trim().length < 50) {
          throw new Error('DOCX vazio ou texto muito curto');
        }

        return text;
      } catch (err) {
        throw new Error(`Falha ao extrair texto do DOCX: ${(err as Error).message}`);
      }
    }

    throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
  }, [extractTextFromPDF, extractTextFromDOCX]);

  const tryExtractTextFromPDFs = React.useCallback(async (
    files: { peticao?: File | null; contestacoes?: File[]; complementares?: File[] },
    callbacks: {
      setExtractingText: (v: boolean) => void;
      setAnalysisProgress: (v: string) => void;
      setExtractedTexts: (v: { peticao: string | null; contestacoes: ({ text: string; name: string } | null)[]; complementares: ({ text: string; name: string } | null)[] }) => void;
      setError: (v: string | null) => void
    } | null | undefined
  ) => {
    if (!callbacks) return { peticao: null, contestacoes: [], complementares: [] };
    const { setExtractingText, setAnalysisProgress, setExtractedTexts, setError } = callbacks;

    setExtractingText(true);
    setAnalysisProgress('📄 Extraindo texto dos PDFs...');

    const extracted: {
      peticao: string | null;
      contestacoes: ({ text: string; name: string } | null)[];
      complementares: ({ text: string; name: string } | null)[];
    } = {
      peticao: null,
      contestacoes: [],
      complementares: []
    };

    try {
      if (files.peticao) {
        const engine = aiIntegration?.aiSettings?.ocrEngine || 'pdfjs';
        const engineLabel = engine === 'claude-vision' ? ' (Claude Vision)' : engine === 'tesseract' ? ' (Tesseract)' : engine === 'pdfjs' ? ' (PDF.js)' : '';
        setAnalysisProgress(`📄 Extraindo texto da petição inicial${engineLabel}...`);

        try {
          const text = await extractTextFromPDF(files.peticao, (page: number, total: number) => {
            setAnalysisProgress(`🔍 Petição inicial: página ${page}/${total}${engineLabel}...`);
          });

          if (text && text.length > 100) {
            extracted.peticao = text;
          }
        } catch (err) {
          // Silently ignore
        }
      }

      if (files.contestacoes && files.contestacoes.length > 0) {
        const engine = aiIntegration?.aiSettings?.ocrEngine || 'pdfjs';
        const engineLabel = engine === 'claude-vision' ? ' (Claude Vision)' : engine === 'tesseract' ? ' (Tesseract)' : engine === 'pdfjs' ? ' (PDF.js)' : '';
        for (let i = 0; i < files.contestacoes.length; i++) {
          try {
            setAnalysisProgress(`📑 Extraindo texto da contestação ${i + 1}/${files.contestacoes.length}${engineLabel}...`);
            const text = await extractTextFromPDF(files.contestacoes[i], (page: number, total: number) => {
              setAnalysisProgress(`🔍 Contestação ${i + 1}: página ${page}/${total}${engineLabel}...`);
            });

            if (text && text.length > 100) {
              extracted.contestacoes.push({ text, name: `Contestação ${i + 1}` });
            } else {
              extracted.contestacoes.push(null);
            }
          } catch (err) {
            extracted.contestacoes.push(null);
          }
        }
      }

      if (files.complementares && files.complementares.length > 0) {
        const engine = aiIntegration?.aiSettings?.ocrEngine || 'pdfjs';
        const engineLabel = engine === 'claude-vision' ? ' (Claude Vision)' : engine === 'tesseract' ? ' (Tesseract)' : engine === 'pdfjs' ? ' (PDF.js)' : '';
        for (let i = 0; i < files.complementares.length; i++) {
          try {
            setAnalysisProgress(`📎 Extraindo texto do documento complementar ${i + 1}/${files.complementares.length}${engineLabel}...`);
            const text = await extractTextFromPDF(files.complementares[i], (page: number, total: number) => {
              setAnalysisProgress(`🔍 Documento ${i + 1}: página ${page}/${total}${engineLabel}...`);
            });

            if (text && text.length > 100) {
              const fileName = files.complementares[i].name || `Documento Complementar ${i + 1}`;
              extracted.complementares.push({ text, name: fileName });
            } else {
              extracted.complementares.push(null);
            }
          } catch (err) {
            extracted.complementares.push(null);
          }
        }
      }

      setExtractedTexts(extracted);
      return extracted;
    } catch (err) {
      setError('Erro durante extração de texto. Usando PDFs originais.');
      return extracted;
    } finally {
      setExtractingText(false);
    }
  }, [aiIntegration, extractTextFromPDF]);

  return {
    loadPDFJS,
    loadMammoth,
    extractTextFromPDFPure,
    extractTextFromDOCX,
    extractTextFromPDFWithClaudeVision,
    extractTextFromPDFWithTesseract,  // 🆕 v1.31
    extractTextFromPDF,
    extractTextFromPDFWithMode,  // 🆕 v1.12.20
    extractProcessoFromFileName,
    extractProcessoFromFirstPage,
    autoDetectProcessoNumero,
    extractTextFromBulkFile,
    tryExtractTextFromPDFs
  };
};

export { useDocumentServices };
