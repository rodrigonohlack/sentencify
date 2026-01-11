/**
 * @file useAPICache.ts
 * @description Hook para cache LRU com TTL para respostas de API
 * @tier 0 (sem dependências)
 * @extractedFrom App.tsx linhas 2446-2514
 * @usedBy useAIIntegration
 */

import { useRef, useCallback, useEffect } from 'react';
import type { CacheEntry, CacheStats } from '../types';

export interface UseAPICacheReturn {
  get: (key: string) => unknown | null;
  set: (key: string, result: unknown) => void;
  clear: () => void;
  invalidate: (pattern: string) => void;
  stats: () => {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    evictions: number;
    hitRate: string;
    ttlMinutes: string;
  };
}

/**
 * Hook que implementa cache LRU com TTL para respostas de API
 *
 * @param maxSize - Tamanho máximo do cache (default: 50)
 * @param ttlMs - Time-to-live em milissegundos (default: 5 minutos)
 * @returns Objeto com métodos get, set, clear, invalidate e stats
 */
export function useAPICache(maxSize = 50, ttlMs = 5 * 60 * 1000): UseAPICacheReturn {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const statsRef = useRef<CacheStats>({ hits: 0, misses: 0, evictions: 0 });

  const hashKey = useCallback((input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `cache_${hash.toString(36)}`;
  }, []);

  const isExpired = useCallback((entry: CacheEntry) => (Date.now() - entry.timestamp) > ttlMs, [ttlMs]);

  const evictLRU = useCallback(() => {
    const cache = cacheRef.current;
    if (cache.size < maxSize) return;
    let lruKey: string | null = null;
    let lruScore = Infinity;
    for (const [key, entry] of cache.entries()) {
      const score = (entry.hits ?? 0) - ((Date.now() - entry.timestamp) / 1000);
      if (score < lruScore) { lruScore = score; lruKey = key; }
    }
    if (lruKey) { cache.delete(lruKey); statsRef.current.evictions++; }
  }, [maxSize]);

  const get = useCallback((key: string) => {
    const cache = cacheRef.current;
    const hashedKey = hashKey(key);
    if (!cache.has(hashedKey)) { statsRef.current.misses++; return null; }
    const entry = cache.get(hashedKey);
    if (!entry || isExpired(entry)) { cache.delete(hashedKey); statsRef.current.misses++; return null; }
    entry.hits = (entry.hits ?? 0) + 1; statsRef.current.hits++;
    return entry.result;
  }, [hashKey, isExpired]);

  const set = useCallback((key: string, result: unknown) => {
    evictLRU();
    cacheRef.current.set(hashKey(key), { result, timestamp: Date.now(), hits: 0 });
  }, [hashKey, evictLRU]);

  const clear = useCallback(() => {
    cacheRef.current.clear();
    statsRef.current = { hits: 0, misses: 0, evictions: 0 };
  }, []);

  const invalidate = useCallback((pattern: string) => {
    for (const [key] of cacheRef.current.entries()) {
      if (key.includes(pattern)) cacheRef.current.delete(key);
    }
  }, []);

  const stats = useCallback(() => {
    const { hits, misses, evictions } = statsRef.current;
    const hitRate = hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(1) : 0;
    return {
      size: cacheRef.current.size,
      maxSize,
      hits,
      misses,
      evictions,
      hitRate: `${hitRate}%`,
      ttlMinutes: (ttlMs / 60000).toFixed(1)
    };
  }, [maxSize, ttlMs]);

  // v1.20.2: Cleanup ao desmontar para evitar memory leak
  useEffect(() => {
    return () => {
      cacheRef.current.clear();
      statsRef.current = { hits: 0, misses: 0, evictions: 0 };
    };
  }, []);

  return { get, set, clear, invalidate, stats };
}
