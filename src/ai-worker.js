/**
 * AI Worker - Executa modelos de IA em thread separada
 * v1.33.14 - GLiNER para NER (spans ao invés de tokens)
 *
 * Modelos:
 * - NER: onnx-community/gliner_small-v2.1 (via pacote gliner) - spans completos
 * - Embeddings: Xenova/multilingual-e5-base (busca semântica)
 */

import { pipeline, env } from '@xenova/transformers';
import { Gliner } from 'gliner';

// Configurar para baixar modelos do HuggingFace
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

let glinerInstance = null;
let searchPipeline = null;

// Inicializar GLiNER
async function initNER(onProgress) {
  if (glinerInstance) return glinerInstance;

  onProgress?.({ model: 'ner', status: 'initiate', name: 'onnx-community/gliner_small-v2.1' });

  glinerInstance = new Gliner({
    tokenizerPath: "onnx-community/gliner_small-v2.1",
    onnxSettings: {
      modelPath: "onnx-community/gliner_small-v2.1",
      executionProvider: "wasm",
      multiThread: true,
      maxThreads: 4,
    },
    transformersSettings: {
      useBrowserCache: true,
    },
  });

  await glinerInstance.initialize();

  onProgress?.({ model: 'ner', status: 'done' });
  return glinerInstance;
}

// Extrair entidades com GLiNER
async function extractEntitiesGLiNER(text, options = {}) {
  const gliner = await initNER();

  // Entidades a detectar (zero-shot!)
  const entityTypes = options.includeOrg
    ? ["person", "organization", "company"]
    : ["person"];

  const results = await gliner.inference({
    texts: [text],
    entities: entityTypes,
    threshold: 0.5,
    flatNer: true,
  });

  // Mapear para formato compatível com código existente
  return results[0].map(r => ({
    text: r.text,
    type: r.label === 'person' ? 'PER' : 'ORG',
    score: r.score,
    start: r.start,
    end: r.end,
  }));
}

// Inicializar pipeline de Embeddings
async function initSearch(onProgress) {
  if (searchPipeline) return searchPipeline;

  searchPipeline = await pipeline(
    'feature-extraction',
    'Xenova/multilingual-e5-base',
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

      case 'ner':
        // v1.33.14: Usar GLiNER ao invés de BERT
        result = await extractEntitiesGLiNER(text, options);
        break;

      case 'init-search':
        await initSearch(onProgress);
        result = { ready: true };
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
          ner: !!glinerInstance,
          search: !!searchPipeline
        };
        break;

      case 'unload':
        // v1.33.14: GLiNER unload
        if (options?.model === 'ner' || !options?.model) {
          // GLiNER não tem dispose(), apenas limpar referência para GC
          glinerInstance = null;
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
