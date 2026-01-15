/**
 * @file AIModelService.ts
 * @description Serviço de IA local (NER + Embeddings) via Web Worker
 * @version 1.37.58
 *
 * Modelos:
 * - NER: Xenova/distilbert-base-multilingual-cased-ner-hrl
 * - Embeddings: Xenova/multilingual-e5-large (1024 dimensões)
 *
 * @dependencies transformers.js (WASM), Web Worker API
 * @usedBy useLegislacao, useJurisprudencia, findSuggestions, NER detection
 * @extractedFrom App.tsx linhas 428-818
 */

import type {
  AIModelType,
  AIModelServiceStatus,
  AIModelServiceProgress,
  NERRawEntity,
  NERProcessedEntity,
  AIModelStatusCallback,
  AIWorkerMessage,
  PendingWorkerPromise,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: DETECT AI CAPABILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detectar capacidades de IA do navegador
 * - SIMD: WebAssembly SIMD (97% browsers 2024)
 * - Threads: SharedArrayBuffer + crossOriginIsolated
 * - WebGPU: GPU acceleration (~70% browsers 2024)
 */
export const detectAICapabilities = (): {
  simd: boolean;
  threads: boolean;
  webgpu: boolean;
  cores: number;
  crossOriginIsolated: boolean;
} => {
  // SIMD detection (97% browsers 2024)
  // Magic bytes que representam um módulo WASM mínimo com SIMD
  const simdSupported = (() => {
    try {
      return WebAssembly.validate(new Uint8Array([
        0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11
      ]));
    } catch { return false; }
  })();

  // Multi-threading detection
  // Requer SharedArrayBuffer + crossOriginIsolated (headers COOP/COEP)
  const threadsSupported = typeof SharedArrayBuffer !== 'undefined'
    && window.crossOriginIsolated === true;

  // WebGPU detection (~70% browsers 2024)
  const webgpuSupported = 'gpu' in navigator;

  const caps = {
    simd: simdSupported,
    threads: threadsSupported,
    webgpu: webgpuSupported,
    cores: navigator.hardwareConcurrency || 4,
    crossOriginIsolated: !!window.crossOriginIsolated
  };

  if (import.meta.env.DEV) console.log('[AI] Capabilities:', caps);
  return caps;
};

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: AI MODEL SERVICE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AIModelService - Gerenciador de modelos de IA via Web Worker
 *
 * Singleton que gerencia modelos NER e Embeddings E5.
 * Usa Web Worker para não bloquear a UI durante processamento.
 */
const AIModelService = {
  worker: null as Worker | null,
  pending: new Map<string, PendingWorkerPromise>(),
  status: { ner: 'idle', search: 'idle' } as AIModelServiceStatus,
  progress: { ner: 0, search: 0 } as AIModelServiceProgress,
  listeners: new Set<AIModelStatusCallback>(),

  /**
   * Obter ou criar worker
   */
  getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../ai-worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<AIWorkerMessage>) => {
        const { id, type, result, error, progress } = e.data;

        // Progresso de download
        if (type === 'progress' && progress) {
          const model = progress.model;
          if (model) {
            this.progress[model] = Math.round(progress.progress || 0);
            this._notify();
          }
          return;
        }

        // Worker pronto
        if (type === 'ready') return;

        // Resposta de chamada
        const pending = this.pending.get(id);
        if (!pending) return;
        this.pending.delete(id);

        if (type === 'error') {
          pending.reject(new Error(error || 'Unknown error'));
        } else {
          pending.resolve(result);
        }
      };

      // Handler de erro do worker - rejeita promises pendentes
      this.worker.onerror = (err: ErrorEvent) => {
        console.error('[AI Worker] Error:', err);
        // Rejeitar todas as promises pendentes
        this.pending.forEach(({ reject }) => {
          reject(new Error('Worker error: ' + (err.message || 'Unknown error')));
        });
        this.pending.clear();
        // Reset status para error
        (Object.keys(this.status) as AIModelType[]).forEach((key) => {
          this.status[key] = 'error';
        });
        this._notify();
      };
    }
    return this.worker;
  },

  /**
   * Chamar worker com timeout
   */
  _call(type: string, text: string | null = null, options: Record<string, unknown> | null = null, timeoutMs = 60000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();

      // Timeout para não travar indefinidamente
      const timeout = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Worker timeout: ${type}`));
        }
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (result: unknown) => { clearTimeout(timeout); resolve(result); },
        reject: (err: Error) => { clearTimeout(timeout); reject(err); }
      });

      this.getWorker().postMessage({ id, type, text, options });
    });
  },

  /**
   * Notificar listeners de mudança de status
   */
  _notify() {
    this.listeners.forEach((fn) => fn({ status: this.status, progress: this.progress }));
  },

  /**
   * Adicionar listener de status
   */
  onStatusChange(fn: AIModelStatusCallback): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  /**
   * Alias para onStatusChange (compatibilidade)
   */
  subscribe(fn: (status: AIModelServiceStatus, progress: AIModelServiceProgress) => void): () => void {
    const wrappedFn: AIModelStatusCallback = ({ status, progress }) => fn(status, progress);
    this.listeners.add(wrappedFn);
    return () => this.listeners.delete(wrappedFn);
  },

  /**
   * Limpar recursos e pending promises
   */
  cleanup() {
    // Rejeitar todas as promises pendentes
    this.pending.forEach(({ reject }) => {
      reject(new Error('AIModelService cleanup'));
    });
    this.pending.clear();

    // Terminar worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reset status
    (Object.keys(this.status) as AIModelType[]).forEach((key) => {
      this.status[key] = 'idle';
      this.progress[key] = 0;
    });

    this._notify();
    console.log('[AI] Cleanup completo');
  },

  /**
   * Inicializar modelo
   */
  async init(modelType: AIModelType = 'ner'): Promise<boolean> {
    if (this.status[modelType] === 'ready') return true;
    if (this.status[modelType] === 'loading') return false;

    this.status[modelType] = 'loading';
    this.progress[modelType] = 0;
    this._notify();

    const caps = detectAICapabilities();
    if (import.meta.env.DEV) console.log(`[AI] Iniciando ${modelType}...`, caps);

    try {
      // E5-Large é maior (~355MB), precisa de mais tempo para download inicial
      const initTimeout = modelType === 'search' ? 300000 : 60000; // 5min para search, 1min para NER
      await this._call(`init-${modelType}`, null, null, initTimeout);
      this.status[modelType] = 'ready';
      this.progress[modelType] = 100;
      this._notify();
      if (import.meta.env.DEV) console.log(`[AI] ${modelType} pronto!`);
      return true;
    } catch (err) {
      this.status[modelType] = 'error';
      this._notify();
      console.error(`[AI] Erro ao iniciar ${modelType}:`, err);
      throw err;
    }
  },

  /**
   * Verificar se modelo está pronto
   */
  isReady(modelType: AIModelType = 'ner'): boolean {
    return this.status[modelType] === 'ready';
  },

  /**
   * Descarregar modelo da memória
   */
  async unload(modelType: AIModelType): Promise<void> {
    await this._call('unload', null, { model: modelType });
    this.status[modelType] = 'idle';
    this.progress[modelType] = 0;
    this._notify();
    console.log(`[AI] ${modelType} descarregado`);
  },

  /**
   * Extrair entidades NER via Worker
   * Usa chunking para textos longos e healing para subtokens órfãos
   */
  async extractEntities(text: string): Promise<NERProcessedEntity[]> {
    if (!this.isReady('ner')) await this.init('ner');

    const cleanText = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    const CHUNK_SIZE = 1000;
    const OVERLAP = 200;
    let allRaw: NERRawEntity[] = [];

    for (let i = 0; i < cleanText.length; i += (CHUNK_SIZE - OVERLAP)) {
      let chunk = cleanText.slice(i, i + CHUNK_SIZE);
      if (chunk.length < 10) continue;

      // Segment Title Case para ALL CAPS
      chunk = chunk.replace(
        /\b([A-ZÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ]{2,}(?:\s+[A-ZÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ]{2,})+)\b/g,
        (match: string) => match.toLowerCase().replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase())
      );

      try {
        const chunkEntities = await this._call('ner', chunk, { truncation: true, max_length: 512 }) as NERRawEntity[];

        // OFFSETS MANUAIS via indexOf (Transformers.js retorna start/end incorretos)
        // Busca case-insensitive (BERT retorna "Mac" mas texto é "MACEDO")
        let cursor = 0;
        const chunkLower = chunk.toLowerCase();
        const adjusted = chunkEntities.reduce((acc: NERRawEntity[], e: NERRawEntity) => {
          if (e.word === '[UNK]' || e.word === '[CLS]' || e.word === '[SEP]') return acc;
          const cleanWord = (e.word || '').replace(/^##/, '');
          if (!cleanWord) return acc;
          const idx = chunkLower.indexOf(cleanWord.toLowerCase(), cursor);
          if (idx !== -1) {
            cursor = idx + cleanWord.length;
            acc.push({ ...e, start: idx + i, end: idx + cleanWord.length + i });
          }
          return acc;
        }, []);

        allRaw = allRaw.concat(adjusted);
      } catch (err) {
        console.warn('[NER] Erro no chunk:', (err as Error).message);
      }
    }

    // Deduplicar (incluir tipo de entidade na key para não confundir Mac/LOC com Mac/PER)
    const seen = new Set<string>();
    const unique = allRaw.filter((e: NERRawEntity) => {
      const entityType = (e.entity || '').replace(/^(B-|I-)/, ''); // PER, LOC, ORG
      const key = `${e.word?.toLowerCase()}-${entityType}-${Math.floor((e.start || 0) / 50)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const processed = this.processTokens(unique);
    const result = this.mergeOrgLoc(processed, cleanText);

    // Liberar memória NER após uso (modelo será recarregado no próximo uso)
    this.unload('ner');

    return result;
  },

  /**
   * Processar tokens NER com healing de subtokens órfãos
   * Healing: se subtoken (##xxx) é entidade mas prefixo foi 'O', unir se adjacentes
   */
  processTokens(rawEntities: NERRawEntity[]): NERProcessedEntity[] {
    const sorted = [...rawEntities].sort((a: NERRawEntity, b: NERRawEntity) => a.start - b.start);

    console.log('[NER] Tokens brutos:', rawEntities.slice(0, 50).map((t: NERRawEntity) =>
      `${t.word}(${t.entity}:${t.start}-${t.end})`).join(', '));

    const result: NERProcessedEntity[] = [];
    let current: NERProcessedEntity | null = null;
    let pendingPrefix: { word: string; end: number; start: number } | null = null;

    for (const token of sorted) {
      const isSubtoken = (token.word || '').startsWith('##');
      const cleanWord = (token.word || '').replace(/^##/, '');
      if (!cleanWord) continue;

      // Se token é 'O', guardar como possível prefixo
      if (token.entity === 'O') {
        pendingPrefix = { word: cleanWord, end: token.end, start: token.start };
        continue;
      }

      const entityType = (token.entity || '').replace(/^(B-|I-)/, '');
      let wordToUse = cleanWord;

      // HEALING - Se é subtoken entidade e temos prefixo pendente adjacente
      if (isSubtoken && pendingPrefix && token.start === pendingPrefix.end) {
        wordToUse = pendingPrefix.word + cleanWord;
        console.log(`[NER] Healing: "${pendingPrefix.word}" + "##${cleanWord}" → "${wordToUse}"`);
      }
      pendingPrefix = null;

      if (current) {
        const distance = token.start - current.end;

        // FUSÃO: mesmo tipo E adjacente (distance 0 ou 1)
        if (current.type === entityType && distance >= 0 && distance <= 1) {
          const separator = distance === 0 ? '' : ' ';
          current.text += separator + wordToUse;
          current.end = token.end;
          current.score = Math.min(current.score, token.score || 1);
          continue;
        }
      }

      // NOVA ENTIDADE
      if (current) result.push(current);
      current = {
        text: wordToUse,
        type: entityType,
        score: token.score || 1,
        start: token.start,
        end: token.end
      };
    }

    if (current) result.push(current);
    return result;
  },

  /**
   * Fundir ORG + LOC quando conectados por "DE/DO/DA"
   * Ex: "COMPANHIA DE TRANSITO" (ORG) + "MACAPA" (LOC) → "COMPANHIA DE TRANSITO DE MACAPA" (ORG)
   */
  mergeOrgLoc(entities: NERProcessedEntity[], originalText: string): NERProcessedEntity[] {
    const result: NERProcessedEntity[] = [];
    let i = 0;

    while (i < entities.length) {
      const current = entities[i];
      const next = entities[i + 1];

      // Padrão ORG + (LOC ou ORG curto) com preposição no meio
      const isOrgOrLoc = next && (next.type === 'LOC' || next.type === 'ORG');
      const nextIsShort = next && next.text.split(/\s+/).length <= 2;

      if (next && current.type === 'ORG' && isOrgOrLoc && nextIsShort) {
        const gap = originalText.substring(current.end, next.start).trim().toUpperCase();

        if (gap === 'DE' || gap === 'DO' || gap === 'DA' || gap === 'DOS' || gap === 'DAS') {
          result.push({
            text: `${current.text} ${gap} ${next.text}`,
            type: 'ORG',
            score: Math.min(current.score, next.score),
            start: current.start,
            end: next.end
          });
          i += 2;
          continue;
        }
      }

      result.push(current);
      i++;
    }

    return result;
  },

  /**
   * Gerar embedding via Worker
   * E5 recomenda prefixos "query: " e "passage: "
   */
  async getEmbedding(text: string, type: 'query' | 'passage' = 'passage'): Promise<number[]> {
    if (!this.isReady('search')) await this.init('search');

    const prefixed = type === 'query' ? `query: ${text}` : `passage: ${text}`;
    return this._call('embedding', prefixed) as Promise<number[]>;
  },

  /**
   * Calcular similaridade de cosseno entre dois vetores
   * Roda na main thread (é rápido, O(n))
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
};

export default AIModelService;
