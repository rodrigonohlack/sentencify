/**
 * AI Worker - Executa modelos de IA em thread separada
 * v1.32.09 - Transformers.js via npm
 *
 * Modelos:
 * - NER: RNCC83/lenerbr-ner-onnx (PESSOA, ORGANIZACAO, LOCAL, TEMPO, LEGISLACAO, JURISPRUDENCIA)
 *        LeNER-br jurídico BR (BERTimbau fine-tune) convertido p/ ONNX int8 — recall superior em peças
 * - Embeddings: Xenova/multilingual-e5-base (busca semântica)
 */

import { pipeline, env } from '@xenova/transformers';

// Configurar para baixar modelos do HuggingFace
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

let nerPipeline = null;
let searchPipeline = null;

/**
 * Mapa token→caractere robusto via OFFSET_MAPPING VERDADEIRO (v1.52.49).
 *
 * O transformers.js v2.17.2 retorna start/end SEMPRE null (TODO no upstream) e o
 * pipeline decodifica cada token apagando o prefixo '##'. Reconstruir por indexOf
 * GALOPA: tokens curtos/pontuação (ex.: o '.'/':' de um nº de processo) casam uma
 * ocorrência distante e o cursor pula nomes inteiros, dropando-os (vazamento).
 *
 * Solução: a regex do BertPreTokenizer ([^\s\p{P}]+|[\p{P}]) dá a posição REAL de
 * cada palavra/pontuação no texto; cada wordpiece fica DENTRO da sua palavra
 * (galope estruturalmente impossível). convert_ids_to_tokens PRESERVA o '##' para
 * sabermos quando uma palavra continua.
 */
const PRETOKEN_RE = /[^\s\p{P}]+|[\p{P}]/gu;
function computeCharSpans(tokenizer, text) {
  const enc = tokenizer(text);
  const ids = Array.from(enc.input_ids.data).map(Number);
  const toks = tokenizer.model.convert_ids_to_tokens(ids);
  const pre = [...text.matchAll(PRETOKEN_RE)].map((m) => [m.index, m.index + m[0].length]);
  const spans = new Array(toks.length).fill(null);
  let p = -1, inner = 0;
  for (let j = 0; j < toks.length; j++) {
    const t = toks[j];
    if (t === '[CLS]' || t === '[SEP]' || t === '[PAD]' || t === '[MASK]') continue;
    const isSub = t.startsWith('##');
    const surf = t.replace(/^##/, '');
    if (!isSub) { p++; if (p >= pre.length) break; inner = pre[p][0]; }
    if (p < 0 || p >= pre.length) continue;
    const pend = pre[p][1];
    const st = inner;
    const en = t === '[UNK]' ? pend : Math.min(pend, inner + surf.length);
    spans[j] = [st, en];
    inner = en;
  }
  return { toks, spans };
}

// Inicializar pipeline NER
async function initNER(onProgress) {
  if (nerPipeline) return nerPipeline;

  nerPipeline = await pipeline(
    'token-classification',
    'RNCC83/lenerbr-ner-onnx',
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

      case 'ner': {
        const ner = await initNER(onProgress);
        // Guarda anti-crash: o ONNX do LeNER tem max_position_embeddings=512 e o
        // tokenizer NÃO trunca (model_max_length é uma sentinela gigante). Um texto
        // que gere >512 tokens crasharia o modelo. O chamador já fatia em ~400
        // chars (≤ ~402 tokens), então isto só protege chamadas anômalas: como
        // cada token consome ≥1 char, texto ≤500 chars nunca passa de 500 tokens.
        let safeText = text;
        if (text.length > 500) {
          const { spans: s0 } = computeCharSpans(ner.tokenizer, text);
          const cut = s0.slice(0, 500).reverse().find((x) => x);
          if (cut) safeText = text.slice(0, cut[1]);
        }
        // ignore_labels: [] → mantém TODOS os tokens (inclusive 'O') para alinhar
        // o índice de cada entidade ao mapa token→char de computeCharSpans.
        const rawTokens = await ner(safeText, { ignore_labels: [] });
        const { toks, spans } = computeCharSpans(ner.tokenizer, safeText);
        result = rawTokens
          .filter((e) => spans[e.index])
          .map((e) => ({
            entity: e.entity,
            score: e.score,
            word: toks[e.index],
            start: spans[e.index][0],
            end: spans[e.index][1],
          }));
        break;
      }

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
