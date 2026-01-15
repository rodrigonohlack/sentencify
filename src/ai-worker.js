/**
 * AI Worker - Executa modelos de IA em thread separada
 * v1.37.58 - E5-Large migration
 *
 * Modelos:
 * - NER: Xenova/bert-base-multilingual-cased-ner-hrl (PER, ORG, LOC) - BERT completo para qualidade
 * - Embeddings: Xenova/multilingual-e5-large (busca semântica) - 1024 dimensões
 */

import { pipeline, env } from '@xenova/transformers';

// Configurar para baixar modelos do HuggingFace
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

let nerPipeline = null;
let searchPipeline = null;

// Inicializar pipeline NER
async function initNER(onProgress) {
  if (nerPipeline) return nerPipeline;

  nerPipeline = await pipeline(
    'token-classification',
    'Xenova/bert-base-multilingual-cased-ner-hrl',
    {
      quantized: true,
      progress_callback: (progress) => {
        if (progress.status === 'progress' && onProgress) {
          onProgress({ model: 'ner', ...progress });
        }
      }
    }
  );

  return nerPipeline;
}

// Inicializar pipeline de Embeddings
async function initSearch(onProgress) {
  if (searchPipeline) return searchPipeline;

  searchPipeline = await pipeline(
    'feature-extraction',
    'Xenova/multilingual-e5-large',
    {
      quantized: true,
      progress_callback: (progress) => {
        if (progress.status === 'progress' && onProgress) {
          onProgress({ model: 'search', ...progress });
        }
      }
    }
  );

  return searchPipeline;
}

// Handler de mensagens
self.onmessage = async (event) => {
  const { id, type, text, options } = event.data;

  // Função para reportar progresso
  const onProgress = (progress) => {
    self.postMessage({ id, type: 'progress', progress });
  };

  try {
    let result;

    switch (type) {
      case 'init-ner':
        await initNER(onProgress);
        result = { ready: true };
        break;

      case 'init-search':
        await initSearch(onProgress);
        result = { ready: true };
        break;

      case 'ner':
        const ner = await initNER(onProgress);
        result = await ner(text, options);
        break;

      case 'embedding':
        const search = await initSearch(onProgress);
        const output = await search(text, {
          pooling: 'mean',
          normalize: true,
          ...options
        });
        result = Array.from(output.data);
        break;

      case 'status':
        result = {
          ner: !!nerPipeline,
          search: !!searchPipeline
        };
        break;

      case 'unload':
        // v1.32.17: Chamar dispose() para liberar memória WASM
        if (options?.model === 'ner' || !options?.model) {
          if (nerPipeline?.dispose) {
            try { await nerPipeline.dispose(); } catch (e) { /* ignore */ }
          }
          nerPipeline = null;
        }
        if (options?.model === 'search' || !options?.model) {
          if (searchPipeline?.dispose) {
            try { await searchPipeline.dispose(); } catch (e) { /* ignore */ }
          }
          searchPipeline = null;
        }
        result = { unloaded: true };
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ id, type: 'result', result });

  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error.message || String(error)
    });
  }
};

// Notificar que o worker está pronto
self.postMessage({ type: 'ready' });
