/**
 * @file useKnowledgePackagesStore.ts
 * @description Store Zustand para Pacotes de Conhecimento
 * @version 1.40.34
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { KnowledgePackage, KnowledgePackageFile } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface KnowledgePackagesStoreState {
  packages: KnowledgePackage[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setPackages: (packages: KnowledgePackage[]) => void;
  addPackage: (pkg: KnowledgePackage) => void;
  updatePackage: (id: string, updates: Partial<KnowledgePackage>) => void;
  deletePackage: (id: string) => void;
  addFile: (packageId: string, file: KnowledgePackageFile) => void;
  removeFile: (packageId: string, fileId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Persistência
  serializeForPersistence: () => { packages: KnowledgePackage[] };
  restoreFromPersistence: (data: { packages?: KnowledgePackage[] }) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

export const useKnowledgePackagesStore = create<KnowledgePackagesStoreState>()(
  devtools(
    immer((set, get) => ({
      packages: [],
      isLoading: false,
      error: null,

      setPackages: (packages) => set((state) => {
        state.packages = packages;
      }, false, 'setPackages'),

      addPackage: (pkg) => set((state) => {
        state.packages.unshift(pkg);
      }, false, 'addPackage'),

      updatePackage: (id, updates) => set((state) => {
        const idx = state.packages.findIndex(p => p.id === id);
        if (idx !== -1) {
          state.packages[idx] = { ...state.packages[idx], ...updates };
        }
      }, false, 'updatePackage'),

      deletePackage: (id) => set((state) => {
        state.packages = state.packages.filter(p => p.id !== id);
      }, false, 'deletePackage'),

      addFile: (packageId, file) => set((state) => {
        const pkg = state.packages.find(p => p.id === packageId);
        if (pkg) pkg.files.push(file);
      }, false, 'addFile'),

      removeFile: (packageId, fileId) => set((state) => {
        const pkg = state.packages.find(p => p.id === packageId);
        if (pkg) pkg.files = pkg.files.filter(f => f.id !== fileId);
      }, false, 'removeFile'),

      setLoading: (loading) => set((state) => {
        state.isLoading = loading;
      }, false, 'setLoading'),

      setError: (error) => set((state) => {
        state.error = error;
      }, false, 'setError'),

      serializeForPersistence: () => ({
        packages: get().packages,
      }),

      restoreFromPersistence: (data) => set((state) => {
        if (Array.isArray(data?.packages)) {
          state.packages = data.packages;
        }
      }, false, 'restoreFromPersistence'),
    })),
    { name: 'KnowledgePackagesStore' }
  )
);
