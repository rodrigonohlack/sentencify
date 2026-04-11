/**
 * @file useKnowledgePackages.ts
 * @description Hook para CRUD de Pacotes de Conhecimento via API REST
 * @version 1.40.34
 */

import React from 'react';
import { useKnowledgePackagesStore } from '../stores/useKnowledgePackagesStore';
import { API_BASE } from '../constants/api';
import type { KnowledgePackage, KnowledgePackageFile } from '../types';

const AUTH_KEY = 'sentencify-auth-token';
const PERSISTENCE_KEY = 'sentencify-knowledge-packages';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(AUTH_KEY));
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export interface UseKnowledgePackagesReturn {
  packages: KnowledgePackage[];
  isLoading: boolean;
  error: string | null;
  fetchPackages: () => Promise<void>;
  createPackage: (data: { name: string; description?: string; instructions?: string }) => Promise<KnowledgePackage | null>;
  updatePackage: (id: string, data: { name: string; description?: string; instructions?: string }) => Promise<boolean>;
  deletePackage: (id: string) => Promise<boolean>;
  addFile: (packageId: string, file: { name: string; content: string }) => Promise<KnowledgePackageFile | null>;
  removeFile: (packageId: string, fileId: string) => Promise<boolean>;
}

export function useKnowledgePackages(): UseKnowledgePackagesReturn {
  const store = useKnowledgePackagesStore();

  // ─── Carregar cache local ao montar ──────────────────────────────────────
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSISTENCE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        store.restoreFromPersistence(data);
      }
    } catch {
      // cache inválido — ignorar
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Persistir no localStorage quando packages mudar ─────────────────────
  React.useEffect(() => {
    try {
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(store.serializeForPersistence()));
    } catch {
      // storage cheio — ignorar
    }
  }, [store.packages]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch do servidor ────────────────────────────────────────────────────
  const fetchPackages = React.useCallback(async () => {
    if (!isAuthenticated()) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/knowledge-packages`, {
        headers: getAuthHeaders(),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      store.setPackages(data.packages || []);
    } catch (err) {
      store.setError('Não foi possível carregar os pacotes de conhecimento.');
      console.warn('[useKnowledgePackages] fetchPackages error:', err);
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // ─── Carregar ao montar (se autenticado) ─────────────────────────────────
  React.useEffect(() => {
    if (isAuthenticated()) {
      void fetchPackages();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const createPackage = React.useCallback(async (
    data: { name: string; description?: string; instructions?: string }
  ): Promise<KnowledgePackage | null> => {
    try {
      const resp = await fetch(`${API_BASE}/api/knowledge-packages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { id } = await resp.json();
      const newPkg: KnowledgePackage = {
        id,
        name: data.name,
        description: data.description || '',
        instructions: data.instructions || '',
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncVersion: 1,
      };
      store.addPackage(newPkg);
      return newPkg;
    } catch (err) {
      console.warn('[useKnowledgePackages] createPackage error:', err);
      return null;
    }
  }, [store]);

  const updatePackage = React.useCallback(async (
    id: string,
    data: { name: string; description?: string; instructions?: string }
  ): Promise<boolean> => {
    try {
      const resp = await fetch(`${API_BASE}/api/knowledge-packages/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      store.updatePackage(id, {
        name: data.name,
        description: data.description || '',
        instructions: data.instructions || '',
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.warn('[useKnowledgePackages] updatePackage error:', err);
      return false;
    }
  }, [store]);

  const deletePackage = React.useCallback(async (id: string): Promise<boolean> => {
    try {
      const resp = await fetch(`${API_BASE}/api/knowledge-packages/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      store.deletePackage(id);
      return true;
    } catch (err) {
      console.warn('[useKnowledgePackages] deletePackage error:', err);
      return false;
    }
  }, [store]);

  const addFile = React.useCallback(async (
    packageId: string,
    file: { name: string; content: string }
  ): Promise<KnowledgePackageFile | null> => {
    try {
      const resp = await fetch(`${API_BASE}/api/knowledge-packages/${packageId}/files`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(file),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const newFile: KnowledgePackageFile = await resp.json();
      store.addFile(packageId, newFile);
      return newFile;
    } catch (err) {
      console.warn('[useKnowledgePackages] addFile error:', err);
      return null;
    }
  }, [store]);

  const removeFile = React.useCallback(async (
    packageId: string,
    fileId: string
  ): Promise<boolean> => {
    try {
      const resp = await fetch(`${API_BASE}/api/knowledge-packages/${packageId}/files/${fileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      store.removeFile(packageId, fileId);
      return true;
    } catch (err) {
      console.warn('[useKnowledgePackages] removeFile error:', err);
      return false;
    }
  }, [store]);

  return {
    packages: store.packages,
    isLoading: store.isLoading,
    error: store.error,
    fetchPackages,
    createPackage,
    updatePackage,
    deletePackage,
    addFile,
    removeFile,
  };
}
