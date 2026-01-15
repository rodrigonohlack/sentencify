/**
 * @file EmbeddingsServices.ts
 * @description Serviços de embeddings e similaridade para busca semântica
 * @version 1.36.81
 *
 * Extraído do App.tsx
 * Inclui: TFIDFSimilarity, EmbeddingsService, JurisEmbeddingsService, EmbeddingsCDNService
 */

import AIModelService from './AIModelService';
import { API_BASE } from '../constants/api';
import {
  saveArtigosToIndexedDB,
  loadArtigosFromIndexedDB,
  savePrecedentesToIndexedDB,
  loadPrecedentesFromIndexedDB
} from '../hooks';
import type {
  Model,
  LegislacaoEmbeddingItem,
  JurisEmbeddingItem,
  JurisEmbeddingWithSimilarity,
  JurisFiltros,
  CDNDownloadType,
  CDNFileName,
  DownloadProgressCallback,
  BatchCompleteCallback,
  EstimatedSizes,
  Artigo,
  Precedente
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TF-IDF SIMILARITY ENGINE (v1.13.1 - Detecção de modelos similares)
// ═══════════════════════════════════════════════════════════════════════════════

export const TFIDFSimilarity = {
  STOPWORDS: new Set(['de','da','do','das','dos','em','na','no','nas','nos','para','por','com','sem','sob','sobre','entre','ate','o','a','os','as','um','uma','uns','umas','e','ou','mas','porem','contudo','todavia','que','qual','quais','quando','onde','como','porque','ser','estar','ter','haver','fazer','ir','vir','foi','era','sido','sendo','seja','foram','sao','ao','aos','pela','pelo','pelas','pelos','este','esta','estes','estas','esse','essa','esses','essas','isso','isto','aquilo','aquele','aquela','se','nao','sim','mais','menos','muito','pouco','art','artigo','paragrafo','inciso','alinea','fls','folhas','pag','pagina','id','processo','autos','requerente','requerido','reclamante','reclamada','autor','reu','parte','partes','assim','ainda','ja','tambem','apenas','mesmo','so','entao','pois']),
  cache: { vectors: new Map<string, Map<number, number>>(), vocab: new Map<string, number>(), idf: new Map<string, number>(), valid: false },
  tokenize(t: string): string[] {
    return (t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/<[^>]+>/g,' ').replace(/[^\w\s]/g,' ').replace(/\d+/g,' ').split(/\s+/).filter((w: string)=>w.length>2&&!this.STOPWORDS.has(w));
  },
  buildIndex(models: Model[]) {
    const df=new Map<string, number>(), N=models.length;
    models.forEach((m: Model)=>{const terms=new Set(this.tokenize(m.content));terms.forEach((t: string)=>df.set(t,(df.get(t)||0)+1));});
    this.cache.vocab.clear();this.cache.idf.clear();let i=0;
    df.forEach((f: number,t: string)=>{if(f>=2&&f<N*0.9){this.cache.vocab.set(t,i++);this.cache.idf.set(t,Math.log(N/f)+1);}});
    this.cache.vectors.clear();
    models.forEach((m: Model)=>this.cache.vectors.set(m.id,this.computeVector(m.content)));
    this.cache.valid=true;
  },
  computeVector(text: string): Map<number, number> {
    const tokens=this.tokenize(text),tf=new Map<string, number>();
    tokens.forEach((t: string)=>{if(this.cache.vocab.has(t))tf.set(t,(tf.get(t)||0)+1);});
    const vec=new Map<number, number>();let norm=0;
    tf.forEach((f: number,t: string)=>{const idf=this.cache.idf.get(t);const idx=this.cache.vocab.get(t);if(idf===undefined||idx===undefined)return;const v=(1+Math.log(f))*idf;vec.set(idx,v);norm+=v*v;});
    norm=Math.sqrt(norm);if(norm>0)vec.forEach((v: number,k: number)=>vec.set(k,v/norm));
    return vec;
  },
  cosine(a: Map<number, number>,b: Map<number, number>){let dot=0;a.forEach((v: number,k: number)=>{if(typeof k==='number'&&b.has(k))dot+=v*(b.get(k) || 0);});return dot;},
  findSimilar(newModel: Model,models: Model[],threshold=0.80): { hasSimilar: true; similarModel: Model; similarity: number } | { hasSimilar: false; similarModel?: undefined; similarity?: undefined } {
    if(!this.cache.valid||this.cache.vectors.size!==models.length)this.buildIndex(models);
    const vec=this.computeVector(newModel.content);
    let best: Model | null=null,bestSim=0;
    models.forEach((m: Model)=>{if(m.id===newModel.id)return;const ev=this.cache.vectors.get(m.id);if(!ev)return;const s=this.cosine(vec,ev);if(s>=threshold&&s>bestSim){bestSim=s;best=m;}});
    return best?{hasSimilar:true as const,similarModel:best,similarity:bestSim}:{hasSimilar:false as const};
  },
  invalidate(){this.cache.valid=false;this.cache.vectors.clear();}
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMBEDDINGS SERVICE - IndexedDB para busca semântica v1.26.00
// ═══════════════════════════════════════════════════════════════════════════════

export const EmbeddingsService = {
  DB_NAME: 'sentencify-legislacao-embeddings',
  STORE_NAME: 'embeddings',
  VERSION: 1,

  openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('artigoId', 'artigoId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('lei', 'lei', { unique: false });
        }
      };
    });
  },

  async saveEmbedding(item: LegislacaoEmbeddingItem): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async saveEmbeddingsBatch(items: LegislacaoEmbeddingItem[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      items.forEach((item: LegislacaoEmbeddingItem) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAllEmbeddings(): Promise<LegislacaoEmbeddingItem[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const req = tx.objectStore(this.STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async getEmbeddingsByLei(lei: string): Promise<LegislacaoEmbeddingItem[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const index = tx.objectStore(this.STORE_NAME).index('lei');
      const req = index.getAll(lei);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async getCount(): Promise<number> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const req = tx.objectStore(this.STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  // v1.26.02: Obter apenas os IDs dos embeddings (para verificação incremental)
  async getAllIds(): Promise<IDBValidKey[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const req = tx.objectStore(this.STORE_NAME).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async clearAll(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async clearByLei(lei: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index('lei');
      const req = index.openCursor(lei);
      req.onsuccess = (e: Event) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // Buscar por similaridade (retorna top N resultados, deduplicado por artigoId)
  async searchBySimilarity(queryEmbedding: number[], threshold = 0.5, limit = 20): Promise<(LegislacaoEmbeddingItem & { similarity: number })[]> {
    const allEmbeddings = await this.getAllEmbeddings();
    const results = allEmbeddings
      .map((item: LegislacaoEmbeddingItem) => ({
        ...item,
        similarity: AIModelService.cosineSimilarity(queryEmbedding, item.embedding)
      }))
      .filter((item: LegislacaoEmbeddingItem & { similarity: number }) => item.similarity >= threshold);

    // Deduplicar por artigoId (manter chunk com maior similaridade)
    const deduped = Object.values(
      results.reduce((acc: Record<string, LegislacaoEmbeddingItem & { similarity: number }>, item: LegislacaoEmbeddingItem & { similarity: number }) => {
        const key = item.artigoId || item.id;
        if (!acc[key] || item.similarity > acc[key].similarity) {
          acc[key] = item;
        }
        return acc;
      }, {} as Record<string, LegislacaoEmbeddingItem & { similarity: number }>)
    );

    return (deduped as (LegislacaoEmbeddingItem & { similarity: number })[])
      .sort((a: LegislacaoEmbeddingItem & { similarity: number }, b: LegislacaoEmbeddingItem & { similarity: number }) => b.similarity - a.similarity)
      .slice(0, limit);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// JURIS EMBEDDINGS SERVICE - IndexedDB para busca semântica de jurisprudência
// v1.27.00: Suporte a chunking para textos longos (IRR, IAC)
// ═══════════════════════════════════════════════════════════════════════════════

export const JURIS_CHUNK_THRESHOLD = 1500;
export const JURIS_CHUNK_SIZE = 1200;
export const JURIS_CHUNK_OVERLAP = 200;

interface JurisChunk {
  text: string;
  chunkIndex: number;
  totalChunks: number;
}

export const chunkJurisText = (text: string): JurisChunk[] => {
  if (!text || text.length < JURIS_CHUNK_THRESHOLD) {
    return [{ text, chunkIndex: 0, totalChunks: 1 }];
  }
  const teseRegex = /(?:^|\n)\s*(?:\d+[ªº°]?\)|\d+\s*[\.\)]\s)/;
  const parts = text.split(teseRegex).filter((t: string) => t && t.trim().length > 50);
  if (parts.length > 1) {
    return parts.map((t: string, i: number) => ({ text: t.trim(), chunkIndex: i, totalChunks: parts.length }));
  }
  const chunks: JurisChunk[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + JURIS_CHUNK_SIZE, text.length);
    chunks.push({ text: text.slice(start, end), chunkIndex: chunks.length, totalChunks: 0 });
    start = end - JURIS_CHUNK_OVERLAP;
    if (start >= text.length - 50) break;
  }
  chunks.forEach((c: JurisChunk) => c.totalChunks = chunks.length);
  return chunks;
};

export const JurisEmbeddingsService = {
  DB_NAME: 'sentencify-juris-embeddings',
  STORE_NAME: 'embeddings',
  VERSION: 1,

  openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.VERSION) as IDBOpenDBRequest;
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('precedenteId', 'precedenteId', { unique: false });
          store.createIndex('tribunal', 'tribunal', { unique: false });
          store.createIndex('tipoProcesso', 'tipoProcesso', { unique: false });
        }
      };
    });
  },

  async saveEmbedding(item: JurisEmbeddingItem): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async saveEmbeddingsBatch(items: JurisEmbeddingItem[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      items.forEach(item => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAllEmbeddings(): Promise<JurisEmbeddingItem[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const req = tx.objectStore(this.STORE_NAME).getAll() as IDBRequest<JurisEmbeddingItem[]>;
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async getCount(): Promise<number> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const req = tx.objectStore(this.STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllIds(): Promise<IDBValidKey[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const req = tx.objectStore(this.STORE_NAME).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async clearAll(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // v1.32.21: Aceita filtros para aplicar ANTES do limit
  async searchBySimilarity(
    queryEmbedding: number[],
    threshold = 0.5,
    limit = 30,
    filters: JurisFiltros = {}
  ): Promise<JurisEmbeddingWithSimilarity[]> {
    const allEmbeddings = await this.getAllEmbeddings();
    let results: JurisEmbeddingWithSimilarity[] = allEmbeddings
      .map(item => ({
        ...item,
        similarity: AIModelService.cosineSimilarity(queryEmbedding, item.embedding)
      }) as JurisEmbeddingWithSimilarity)
      .filter(item => item.similarity >= threshold);

    // v1.32.21: Aplicar filtros ANTES de limitar (para ter até 30 do tipo desejado)
    if (filters.tipo && filters.tipo.length > 0) {
      const IRR_TYPES = new Set(['IRR', 'RR', 'RRAG', 'INCJULGRREMBREP', 'INCJULGRREPETITIVO']);
      results = results.filter(r => {
        if (filters.tipo!.includes('IRR') && IRR_TYPES.has((r.tipoProcesso || '').toUpperCase().replace(/-/g, ''))) return true;
        return filters.tipo!.includes(r.tipoProcesso || '');
      });
    }
    if (filters.tribunal && filters.tribunal.length > 0) {
      results = results.filter(r => filters.tribunal!.includes(r.tribunal || ''));
    }

    const deduped = Object.values(
      results.reduce((acc: Record<string, JurisEmbeddingWithSimilarity>, item) => {
        const key = item.precedenteId || item.id;
        if (!acc[key] || item.similarity > acc[key].similarity) {
          acc[key] = item;
        }
        return acc;
      }, {})
    );
    return deduped
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CDN SERVICE para download automático de embeddings (v1.33.0)
// ═══════════════════════════════════════════════════════════════════════════════

export const EmbeddingsCDNService = {
  VERSION: '1.0.0',

  // v1.35.20: Tamanhos estimados para fallback quando Content-Length não disponível
  // v1.37.58: Atualizado para E5-Large (1024 dim) - arquivos maiores
  ESTIMATED_SIZES: {
    'legis-embeddings.json': 272_000_000,  // ~272MB (E5-Large 1024 dim)
    'juris-embeddings.json': 27_000_000,   // ~27MB (E5-Large 1024 dim)
    'legis-data.json': 5_000_000,          // ~5MB
    'juris-data.json': 2_000_000,          // ~2MB
  } as EstimatedSizes,

  // Retorna URL do proxy (funciona local e Vercel, resolve CORS)
  getProxyUrl(file: CDNFileName): string {
    return `${API_BASE}/api/embeddings?file=${file}`;
  },

  // Verifica se precisa baixar embeddings
  async needsDownload(type: CDNDownloadType): Promise<boolean> {
    try {
      const count = type === 'legislacao'
        ? await EmbeddingsService.getCount()
        : await JurisEmbeddingsService.getCount();
      return count === 0;
    } catch {
      return true;
    }
  },

  // Download com progresso e retry
  // v1.35.20: Usa tamanhos estimados como fallback quando Content-Length não disponível
  async downloadFile(
    url: string,
    onProgress?: DownloadProgressCallback,
    maxRetries = 3
  ): Promise<string> {
    // Extrair nome do arquivo da URL (ex: ?file=legis-embeddings.json)
    const fileMatch = url.match(/[?&]file=([^&]+)/);
    const filename = fileMatch ? fileMatch[1] as CDNFileName : null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const contentLength = res.headers.get('Content-Length');
        let total = contentLength ? parseInt(contentLength, 10) : 0;

        // v1.35.20: Fallback para tamanho estimado quando Content-Length não disponível
        if (!total && filename && this.ESTIMATED_SIZES[filename]) {
          total = this.ESTIMATED_SIZES[filename];
          console.log(`[CDN] Usando tamanho estimado para ${filename}: ${(total / 1_000_000).toFixed(1)}MB`);
        }

        const reader = res.body!.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          // v1.35.20: Reportar progresso mesmo com tamanho estimado (cap em 99% até done)
          if (onProgress && total) {
            const progress = Math.min(received / total, 0.99);
            onProgress(progress);
          }
        }

        // v1.35.20: Garantir 100% ao finalizar
        if (onProgress) onProgress(1);

        const blob = new Blob(chunks as BlobPart[]);
        return blob.text();
      } catch (err) {
        if (attempt === maxRetries) throw err;
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    // TypeScript: unreachable, but needed for type safety
    throw new Error('Download failed after max retries');
  },

  // Baixa e salva embeddings de legislação
  async downloadLegislacao(
    onProgress?: DownloadProgressCallback,
    onBatchComplete?: BatchCompleteCallback
  ): Promise<number> {
    const url = this.getProxyUrl('legis-embeddings.json');
    const text = await this.downloadFile(url, onProgress);
    const items = JSON.parse(text) as LegislacaoEmbeddingItem[];

    // Salvar em batches de 100 para não travar
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await EmbeddingsService.saveEmbeddingsBatch(batch);
      onBatchComplete?.(Math.min(i + batchSize, items.length), items.length);
      // Yield para UI
      await new Promise(r => setTimeout(r, 0));
    }

    return items.length;
  },

  // Baixa e salva embeddings de jurisprudência
  async downloadJurisprudencia(
    onProgress?: DownloadProgressCallback,
    onBatchComplete?: BatchCompleteCallback
  ): Promise<number> {
    const url = this.getProxyUrl('juris-embeddings.json');
    const text = await this.downloadFile(url, onProgress);
    const items = JSON.parse(text) as JurisEmbeddingItem[];

    // Salvar em batches de 100
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await JurisEmbeddingsService.saveEmbeddingsBatch(batch);
      onBatchComplete?.(Math.min(i + batchSize, items.length), items.length);
      await new Promise(r => setTimeout(r, 0));
    }

    return items.length;
  },

  // ═══════════════════════════════════════════════════════════════
  // v1.33.61: AUTO-DOWNLOAD DE DADOS (legislação e jurisprudência)
  // ═══════════════════════════════════════════════════════════════

  // Verifica se precisa baixar dados (não embeddings)
  async needsDataDownload(type: CDNDownloadType): Promise<boolean> {
    try {
      if (type === 'legislacao') {
        const artigos = await loadArtigosFromIndexedDB();
        return artigos.length === 0;
      } else {
        const precedentes = await loadPrecedentesFromIndexedDB();
        return precedentes.length === 0;
      }
    } catch {
      return true;
    }
  },

  // Baixa e salva dados de legislação
  async downloadLegislacaoData(
    onProgress?: DownloadProgressCallback,
    onBatchComplete?: BatchCompleteCallback
  ): Promise<number> {
    const url = this.getProxyUrl('legis-data.json');
    const text = await this.downloadFile(url, onProgress);
    const json = JSON.parse(text);
    const items = (json.data || json) as Artigo[];

    // Salvar em batches de 500 (artigos são menores que embeddings)
    const batchSize = 500;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await saveArtigosToIndexedDB(batch);
      onBatchComplete?.(Math.min(i + batchSize, items.length), items.length);
      await new Promise(r => setTimeout(r, 0));
    }

    return items.length;
  },

  // Baixa e salva dados de jurisprudência
  async downloadJurisprudenciaData(
    onProgress?: DownloadProgressCallback,
    onBatchComplete?: BatchCompleteCallback
  ): Promise<number> {
    const url = this.getProxyUrl('juris-data.json');
    const text = await this.downloadFile(url, onProgress);
    const json = JSON.parse(text);
    const items = (json.data || json) as Precedente[];

    // Salvar em batches de 200
    const batchSize = 200;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await savePrecedentesToIndexedDB(batch);
      onBatchComplete?.(Math.min(i + batchSize, items.length), items.length);
      await new Promise(r => setTimeout(r, 0));
    }

    return items.length;
  }
};
