/**
 * @file AIModelService.ts
 * @description Serviço de IA local (NER + Embeddings) via Web Worker
 * @version 1.36.60
 *
 * Modelos:
 * - NER: RNCC83/lenerbr-ner-onnx (LeNER-br jurídico BR; labels PESSOA/ORGANIZACAO/LOCAL/TEMPO/LEGISLACAO/JURISPRUDENCIA)
 * - Embeddings: Xenova/multilingual-e5-base
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
      await this._call(`init-${modelType}`);
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
    // v1.52.49: chunk de 400 chars (≤ ~402 tokens) garante <512 do BERT — evita o
    // crash do ONNX (max_position_embeddings=512), pois o tokenizer não trunca.
    // Não há Title-Case: o LeNER-br foi treinado em texto jurídico real (ALL CAPS
    // comum) e lida melhor com o texto cru.
    const CHUNK_SIZE = 400;
    const OVERLAP = 100;
    const allEnts: NERProcessedEntity[] = [];

    for (let i = 0; i < cleanText.length; i += (CHUNK_SIZE - OVERLAP)) {
      const chunk = cleanText.slice(i, i + CHUNK_SIZE);
      if (chunk.length < 10) continue;

      try {
        // O worker devolve cada token com a forma de vocabulário (com '##') e
        // offsets de caractere CORRETOS (relativos ao chunk, via pretokenizer).
        const chunkTokens = await this._call('ner', chunk) as NERRawEntity[];
        // Agrega no espaço do chunk; reposiciona para o texto completo (+i).
        for (const e of this.aggregateEntities(chunkTokens, chunk)) {
          allEnts.push({ ...e, start: e.start + i, end: e.end + i });
        }
      } catch (err) {
        console.error('[NER] Falha ao processar chunk (nomes nele podem não ser anonimizados):', (err as Error).message);
      }
    }

    const result = this.dedupOverlapping(allEnts);

    // Liberar memória NER após uso (modelo será recarregado no próximo uso)
    this.unload('ner');

    return result;
  },

  /**
   * Remove entidades duplicadas pela SOBREPOSIÇÃO de offset (v1.52.49). O overlap
   * entre chunks gera a mesma entidade em posições sobrepostas (às vezes uma cortada
   * na borda) → mantém a de maior span. Nomes distintos ficam em posições que não se
   * sobrepõem, então não são removidos (evita falso-merge de homônimos).
   */
  dedupOverlapping(entities: NERProcessedEntity[]): NERProcessedEntity[] {
    const cand = entities
      .filter((e: NERProcessedEntity) => e.text && e.start != null)
      .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const res: NERProcessedEntity[] = [];
    for (const g of cand) {
      const ov = res.find((k) => k.type === g.type && g.start < k.end && k.start < g.end);
      if (ov) {
        if ((g.end - g.start) > (ov.end - ov.start)) { ov.start = g.start; ov.end = g.end; ov.text = g.text; ov.score = g.score; }
        continue;
      }
      res.push({ ...g });
    }
    return res;
  },

  /**
   * Agrega tokens NER em entidades, ao estilo do aggregation_strategy do HuggingFace
   * (v1.52.49). Substitui a reconstrução por offset+healing, que truncava nomes.
   *
   * (1) agrupa subtokens '##' na mesma PALAVRA;
   * (2) rotula a palavra com a 1ª label != 'O' entre seus subtokens (score = máximo);
   * (3) agrupa PALAVRAS contíguas do mesmo tipo, quebrando em 'O';
   * (4) o texto da entidade é o SLICE EXATO do documento entre o início da 1ª palavra
   *     e o fim da última — por construção, impossível truncar/fragmentar um nome.
   */
  aggregateEntities(tokens: NERRawEntity[], fullText: string): NERProcessedEntity[] {
    const sorted = [...tokens].sort((a: NERRawEntity, b: NERRawEntity) => a.start - b.start);
    const stripType = (e: string): string => (e || '').replace(/^(B-|I-)/, '');

    if (sorted.length) {
      console.log('[NER] Tokens brutos:', sorted.slice(0, 50).map((t: NERRawEntity) =>
        `${t.word}(${t.entity}:${t.start}-${t.end})`).join(', '));
    }

    // (1)+(2) subtokens '##' -> PALAVRAS, com label = 1ª != 'O' e score máximo
    type Word = { start: number; end: number; type: string; score: number };
    const words: Word[] = [];
    let parts: NERRawEntity[] = [];
    const flushWord = (): void => {
      if (!parts.length) return;
      let type = 'O', score = 0;
      for (const p of parts) {
        const tp = stripType(p.entity);
        if (tp !== 'O' && type === 'O') type = tp;
        if ((p.score || 0) > score) score = p.score || 0;
      }
      words.push({ start: parts[0].start, end: parts[parts.length - 1].end, type, score });
      parts = [];
    };
    for (const t of sorted) {
      const isSub = (t.word || '').startsWith('##');
      if (isSub && parts.length) parts.push(t);
      else { flushWord(); parts = [t]; }
    }
    flushWord();

    // (3) PALAVRAS contíguas do mesmo tipo (quebra em 'O')
    const grouped: NERProcessedEntity[] = [];
    let current: NERProcessedEntity | null = null;
    for (const w of words) {
      if (w.type === 'O') { if (current) { grouped.push(current); current = null; } continue; }
      if (current && current.type === w.type) {
        current.end = w.end;
        current.score = Math.min(current.score, w.score);
      } else {
        if (current) grouped.push(current);
        current = { text: '', type: w.type, score: w.score, start: w.start, end: w.end };
      }
    }
    if (current) grouped.push(current);

    // (4) texto = slice EXATO do documento, sem pontuação nas bordas
    return grouped
      .map((e: NERProcessedEntity) => ({
        ...e,
        text: fullText.slice(e.start, e.end).replace(/\s+/g, ' ').trim()
          .replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N}]+$/u, ''),
      }))
      .filter((e: NERProcessedEntity) => e.text.length >= 2);
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
