/**
 * @file useEmbeddingsManagement.ts
 * @description Hook para gerenciamento de embeddings (legislação, jurisprudência, modelos)
 * Extraído do App.tsx v1.37.9 - FASE 8 LegalDecisionEditor refactoring
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  ProgressState,
  EmbeddingsDownloadStatusExtended,
  DataDownloadStatusExtended,
  Model,
} from '../types';
import { EmbeddingsService, JurisEmbeddingsService, EmbeddingsCDNService } from '../services/EmbeddingsServices';
import AIModelService from '../services/AIModelService';
import { EMBEDDING_DIMENSION } from '../constants/embeddings';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface LegislacaoForEmbeddings {
  reloadArtigos: () => Promise<number>;
}

export interface JurisprudenciaForEmbeddings {
  reloadPrecedentes: () => Promise<number>;
}

export interface ModelLibraryForEmbeddings {
  models: Model[];
  setModels: (models: Model[] | ((prev: Model[]) => Model[])) => void;
}

export interface IndexedDBForEmbeddings {
  saveModels: (models: Model[]) => Promise<void>;
}

export interface UseEmbeddingsManagementProps {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  modelLibrary: ModelLibraryForEmbeddings;
  legislacao: LegislacaoForEmbeddings;
  jurisprudencia: JurisprudenciaForEmbeddings;
  indexedDB: IndexedDBForEmbeddings;
  searchModelReady: boolean;
}

export interface UseEmbeddingsManagementReturn {
  // Estado - Contagens
  embeddingsCount: number;
  jurisEmbeddingsCount: number;

  // Estado - Progresso de importação
  embeddingsProgress: ProgressState;
  jurisEmbeddingsProgress: ProgressState;
  importingEmbeddings: boolean;
  importingJurisEmbeddings: boolean;

  // Estado - Geração de embeddings de modelos
  generatingModelEmbeddings: boolean;
  modelEmbeddingsProgress: ProgressState;

  // Estado - Download modal (dados)
  showDataDownloadModal: boolean;
  setShowDataDownloadModal: (show: boolean) => void;
  dataDownloadStatus: DataDownloadStatusExtended;
  setDataDownloadStatus: React.Dispatch<React.SetStateAction<DataDownloadStatusExtended>>;

  // Estado - Download modal (embeddings)
  showEmbeddingsDownloadModal: boolean;
  setShowEmbeddingsDownloadModal: (show: boolean) => void;
  embeddingsDownloadStatus: EmbeddingsDownloadStatusExtended;

  // Refs
  embeddingsFileInputRef: React.RefObject<HTMLInputElement | null>;

  // Handlers - Importação
  handleImportEmbeddings: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleImportJurisEmbeddings: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;

  // Handlers - Download CDN
  handleStartDataDownload: () => Promise<void>;
  handleStartEmbeddingsDownload: () => Promise<void>;
  handleDismissDataPrompt: () => void;
  handleDismissEmbeddingsPrompt: () => void;

  // Handlers - Limpeza
  clearEmbeddings: () => Promise<void>;
  clearJurisEmbeddings: () => Promise<void>;
  clearModelEmbeddings: () => Promise<void>;

  // Handlers - Geração
  generateModelEmbeddings: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciamento completo de embeddings
 *
 * @description Gerencia:
 * - Importação de embeddings de arquivos JSON
 * - Download de embeddings e dados do CDN
 * - Geração de embeddings para modelos locais
 * - Limpeza de embeddings
 * - Estado de progresso e contagem
 */
export function useEmbeddingsManagement({
  showToast,
  modelLibrary,
  legislacao,
  jurisprudencia,
  indexedDB,
  searchModelReady,
}: UseEmbeddingsManagementProps): UseEmbeddingsManagementReturn {

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO - Contagens
  // ═══════════════════════════════════════════════════════════════════════════
  const [embeddingsCount, setEmbeddingsCount] = useState(0);
  const [jurisEmbeddingsCount, setJurisEmbeddingsCount] = useState(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO - Progresso de importação
  // ═══════════════════════════════════════════════════════════════════════════
  const [embeddingsProgress, setEmbeddingsProgress] = useState<ProgressState>({ current: 0, total: 0 });
  const [jurisEmbeddingsProgress, setJurisEmbeddingsProgress] = useState<ProgressState>({ current: 0, total: 0 });
  const [importingEmbeddings, setImportingEmbeddings] = useState(false);
  const [importingJurisEmbeddings, setImportingJurisEmbeddings] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO - Geração de embeddings de modelos
  // ═══════════════════════════════════════════════════════════════════════════
  const [generatingModelEmbeddings, setGeneratingModelEmbeddings] = useState(false);
  const [modelEmbeddingsProgress, setModelEmbeddingsProgress] = useState<ProgressState>({ current: 0, total: 0 });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO - Download modal (dados)
  // ═══════════════════════════════════════════════════════════════════════════
  const [showDataDownloadModal, setShowDataDownloadModal] = useState(false);
  const [dataDownloadStatus, setDataDownloadStatus] = useState<DataDownloadStatusExtended>({
    legislacao: { needed: null, downloading: false, progress: 0, error: null },
    jurisprudencia: { needed: null, downloading: false, progress: 0, error: null }
  });
  const [dismissedDataPrompt, setDismissedDataPrompt] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissedDataPrompt') || 'false'); } catch { return false; }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO - Download modal (embeddings)
  // ═══════════════════════════════════════════════════════════════════════════
  const [showEmbeddingsDownloadModal, setShowEmbeddingsDownloadModal] = useState(false);
  const [embeddingsDownloadStatus, setEmbeddingsDownloadStatus] = useState<EmbeddingsDownloadStatusExtended>({
    legislacao: { needed: null, downloading: false, progress: 0, error: null },
    jurisprudencia: { needed: null, downloading: false, progress: 0, error: null }
  });
  const [dismissedEmbeddingsPrompt, setDismissedEmbeddingsPrompt] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissedEmbeddingsPrompt') || 'false'); } catch { return false; }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════════
  const embeddingsFileInputRef = useRef<HTMLInputElement | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS - Inicialização
  // ═══════════════════════════════════════════════════════════════════════════

  // Inicializar contagem de embeddings de legislação
  useEffect(() => {
    EmbeddingsService.getCount().then(setEmbeddingsCount).catch(() => {});
  }, []);

  // Inicializar contagem de embeddings de jurisprudência
  useEffect(() => {
    JurisEmbeddingsService.getCount().then(setJurisEmbeddingsCount).catch(() => {});
  }, []);

  // Verificar se embeddings precisam ser baixados do CDN
  useEffect(() => {
    const checkEmbeddingsNeeded = async () => {
      try {
        const legCount = await EmbeddingsService.getCount();
        const jurisCount = await JurisEmbeddingsService.getCount();

        const legNeeded = legCount === 0;
        const jurisNeeded = jurisCount === 0;

        setEmbeddingsDownloadStatus(prev => ({
          legislacao: { ...prev.legislacao, needed: legNeeded },
          jurisprudencia: { ...prev.jurisprudencia, needed: jurisNeeded }
        }));

        // Mostrar modal se algum embedding estiver faltando e usuário não dismissou
        if ((legNeeded || jurisNeeded) && !dismissedEmbeddingsPrompt) {
          // Delay para não bloquear renderização inicial
          setTimeout(() => setShowEmbeddingsDownloadModal(true), 2000);
        }
      } catch (err) {
        console.warn('[CDN] Erro ao verificar embeddings:', err);
      }
    };

    checkEmbeddingsNeeded();
  }, [dismissedEmbeddingsPrompt]);

  // Verificar se dados (legislação/jurisprudência) precisam ser baixados do CDN
  useEffect(() => {
    const checkDataNeeded = async () => {
      try {
        const legNeeded = await EmbeddingsCDNService.needsDataDownload('legislacao');
        const jurisNeeded = await EmbeddingsCDNService.needsDataDownload('jurisprudencia');

        setDataDownloadStatus(prev => ({
          legislacao: { ...prev.legislacao, needed: legNeeded },
          jurisprudencia: { ...prev.jurisprudencia, needed: jurisNeeded }
        }));

        // Mostrar modal se algum dado estiver faltando e usuário não dismissou
        if ((legNeeded || jurisNeeded) && !dismissedDataPrompt) {
          // Delay para não bloquear renderização inicial
          setTimeout(() => setShowDataDownloadModal(true), 1500);
        }
      } catch (err) {
        console.warn('[CDN] Erro ao verificar dados:', err);
      }
    };

    checkDataNeeded();
  }, [dismissedDataPrompt]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - Importação de embeddings
  // ═══════════════════════════════════════════════════════════════════════════

  const handleImportEmbeddings = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingEmbeddings(true);
    try {
      const text = await file.text();
      const items = JSON.parse(text);

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Arquivo inválido: deve ser um array de embeddings');
      }

      // Verificar estrutura
      const first = items[0];
      if (!first.id || !first.embedding || !Array.isArray(first.embedding)) {
        throw new Error('Formato inválido: cada item deve ter id e embedding');
      }

      // Salvar em batches
      const BATCH_SIZE = 100;
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        await EmbeddingsService.saveEmbeddingsBatch(batch);
        setEmbeddingsProgress({ current: Math.min(i + BATCH_SIZE, items.length), total: items.length });
      }

      const count = await EmbeddingsService.getCount();
      setEmbeddingsCount(count);
      showToast(`${items.length} embeddings importados com sucesso!`, 'success');
    } catch (err) {
      showToast('Erro ao importar: ' + (err as Error).message, 'error');
      console.error('Import error:', err);
    } finally {
      setImportingEmbeddings(false);
      setEmbeddingsProgress({ current: 0, total: 0 });
      event.target.value = '';
    }
  }, [showToast]);

  const handleImportJurisEmbeddings = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingJurisEmbeddings(true);
    try {
      const text = await file.text();
      const items = JSON.parse(text);

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Arquivo inválido: deve ser um array de embeddings');
      }

      const first = items[0];
      if (!first.id || !first.embedding || !Array.isArray(first.embedding)) {
        throw new Error('Formato inválido: cada item deve ter id e embedding');
      }

      const BATCH_SIZE = 100;
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        await JurisEmbeddingsService.saveEmbeddingsBatch(batch);
        setJurisEmbeddingsProgress({ current: Math.min(i + BATCH_SIZE, items.length), total: items.length });
      }

      const count = await JurisEmbeddingsService.getCount();
      setJurisEmbeddingsCount(count);
      showToast(`${items.length} embeddings de jurisprudência importados!`, 'success');
    } catch (err) {
      showToast('Erro ao importar: ' + (err as Error).message, 'error');
      console.error('[JURIS-SEARCH] Import error:', err);
    } finally {
      setImportingJurisEmbeddings(false);
      setJurisEmbeddingsProgress({ current: 0, total: 0 });
      event.target.value = '';
    }
  }, [showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - Download do CDN
  // ═══════════════════════════════════════════════════════════════════════════

  const handleStartDataDownload = useCallback(async () => {
    if (!navigator.onLine) {
      showToast('Sem conexão com a internet', 'error');
      return;
    }

    const { legislacao: legStatus, jurisprudencia: jurisStatus } = dataDownloadStatus;

    // Download legislação se necessário
    if (legStatus.needed && !legStatus.downloading && !legStatus.completed) {
      setDataDownloadStatus(prev => ({
        ...prev,
        legislacao: { ...prev.legislacao, downloading: true, error: null }
      }));

      try {
        const count = await EmbeddingsCDNService.downloadLegislacaoData(
          (progress: number) => {
            setDataDownloadStatus(prev => ({
              ...prev,
              legislacao: { ...prev.legislacao, progress }
            }));
          }
        );

        // Atualizar artigos no hook de legislação
        await legislacao.reloadArtigos();

        setDataDownloadStatus(prev => ({
          ...prev,
          legislacao: { needed: false, downloading: false, progress: 1, error: null, completed: true }
        }));
        showToast(`${count} artigos de legislação baixados!`, 'success');
      } catch (err) {
        setDataDownloadStatus(prev => ({
          ...prev,
          legislacao: { ...prev.legislacao, downloading: false, error: (err as Error).message }
        }));
        showToast('Erro ao baixar legislação: ' + (err as Error).message, 'error');
      }
    }

    // Download jurisprudência se necessário
    if (jurisStatus.needed && !jurisStatus.downloading && !jurisStatus.completed) {
      setDataDownloadStatus(prev => ({
        ...prev,
        jurisprudencia: { ...prev.jurisprudencia, downloading: true, error: null }
      }));

      try {
        const count = await EmbeddingsCDNService.downloadJurisprudenciaData(
          (progress: number) => {
            setDataDownloadStatus(prev => ({
              ...prev,
              jurisprudencia: { ...prev.jurisprudencia, progress }
            }));
          }
        );

        // Atualizar precedentes no state via hook
        await jurisprudencia.reloadPrecedentes();

        setDataDownloadStatus(prev => ({
          ...prev,
          jurisprudencia: { needed: false, downloading: false, progress: 1, error: null, completed: true }
        }));
        showToast(`${count} precedentes baixados!`, 'success');
      } catch (err) {
        setDataDownloadStatus(prev => ({
          ...prev,
          jurisprudencia: { ...prev.jurisprudencia, downloading: false, error: (err as Error).message }
        }));
        showToast('Erro ao baixar jurisprudência: ' + (err as Error).message, 'error');
      }
    }
  }, [dataDownloadStatus, legislacao, jurisprudencia, showToast]);

  const handleStartEmbeddingsDownload = useCallback(async () => {
    if (!navigator.onLine) {
      showToast('Sem conexão com a internet', 'error');
      return;
    }

    const { legislacao: legStatus, jurisprudencia: jurisStatus } = embeddingsDownloadStatus;

    // Download legislação se necessário
    if (legStatus.needed && !legStatus.downloading) {
      setEmbeddingsDownloadStatus(prev => ({
        ...prev,
        legislacao: { ...prev.legislacao, downloading: true, error: null }
      }));

      try {
        await EmbeddingsCDNService.downloadLegislacao(
          (progress: number) => {
            setEmbeddingsDownloadStatus(prev => ({
              ...prev,
              legislacao: { ...prev.legislacao, progress }
            }));
          }
        );

        const count = await EmbeddingsService.getCount();
        setEmbeddingsCount(count);
        setEmbeddingsDownloadStatus(prev => ({
          ...prev,
          legislacao: { needed: false, downloading: false, progress: 1, error: null }
        }));
        showToast('Legislação baixada com sucesso!', 'success');
      } catch (err) {
        setEmbeddingsDownloadStatus(prev => ({
          ...prev,
          legislacao: { ...prev.legislacao, downloading: false, error: (err as Error).message }
        }));
        showToast('Erro ao baixar legislação: ' + (err as Error).message, 'error');
      }
    }

    // Download jurisprudência se necessário
    if (jurisStatus.needed && !jurisStatus.downloading) {
      setEmbeddingsDownloadStatus(prev => ({
        ...prev,
        jurisprudencia: { ...prev.jurisprudencia, downloading: true, error: null }
      }));

      try {
        await EmbeddingsCDNService.downloadJurisprudencia(
          (progress: number) => {
            setEmbeddingsDownloadStatus(prev => ({
              ...prev,
              jurisprudencia: { ...prev.jurisprudencia, progress }
            }));
          }
        );

        const count = await JurisEmbeddingsService.getCount();
        setJurisEmbeddingsCount(count);
        setEmbeddingsDownloadStatus(prev => ({
          ...prev,
          jurisprudencia: { needed: false, downloading: false, progress: 1, error: null }
        }));
        showToast('Jurisprudência baixada com sucesso!', 'success');
      } catch (err) {
        setEmbeddingsDownloadStatus(prev => ({
          ...prev,
          jurisprudencia: { ...prev.jurisprudencia, downloading: false, error: (err as Error).message }
        }));
        showToast('Erro ao baixar jurisprudência: ' + (err as Error).message, 'error');
      }
    }

    // Fechar modal após ambos terminarem (ou se nenhum precisava)
    const finalStatus = embeddingsDownloadStatus;
    if (!finalStatus.legislacao.downloading && !finalStatus.jurisprudencia.downloading) {
      setShowEmbeddingsDownloadModal(false);
    }
  }, [embeddingsDownloadStatus, showToast]);

  const handleDismissDataPrompt = useCallback(() => {
    setShowDataDownloadModal(false);
    setDismissedDataPrompt(true);
    localStorage.setItem('dismissedDataPrompt', 'true');
  }, []);

  const handleDismissEmbeddingsPrompt = useCallback(() => {
    setShowEmbeddingsDownloadModal(false);
    setDismissedEmbeddingsPrompt(true);
    localStorage.setItem('dismissedEmbeddingsPrompt', 'true');
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - Limpeza
  // ═══════════════════════════════════════════════════════════════════════════

  const clearEmbeddings = useCallback(async () => {
    try {
      await EmbeddingsService.clearAll();
      setEmbeddingsCount(0);
      showToast('Embeddings de legislação removidos', 'info');
    } catch (err) {
      showToast('Erro ao limpar embeddings: ' + (err as Error).message, 'error');
    }
  }, [showToast]);

  const clearJurisEmbeddings = useCallback(async () => {
    try {
      await JurisEmbeddingsService.clearAll();
      setJurisEmbeddingsCount(0);
      showToast('Embeddings de jurisprudência removidos', 'info');
    } catch (err) {
      showToast('Erro ao limpar embeddings: ' + (err as Error).message, 'error');
    }
  }, [showToast]);

  const clearModelEmbeddings = useCallback(async () => {
    try {
      const updatedModels = modelLibrary.models.map(m => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { embedding, ...rest } = m;
        return rest as Model;
      });
      await indexedDB.saveModels(updatedModels);
      showToast('Embeddings dos modelos removidos', 'info');
    } catch (err) {
      showToast('Erro ao limpar embeddings: ' + (err as Error).message, 'error');
    }
  }, [modelLibrary.models, indexedDB, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - Geração de embeddings de modelos
  // ═══════════════════════════════════════════════════════════════════════════

  const generateModelEmbeddings = useCallback(async () => {
    if (!searchModelReady) {
      showToast('Modelo de busca não está pronto', 'error');
      return;
    }
    if (generatingModelEmbeddings) return;

    const modelsWithoutEmbedding = modelLibrary.models.filter(m => !m.embedding || m.embedding.length !== EMBEDDING_DIMENSION);
    if (!modelsWithoutEmbedding.length) {
      showToast('Todos os modelos já têm embeddings', 'info');
      return;
    }

    setGeneratingModelEmbeddings(true);
    setModelEmbeddingsProgress({ current: 0, total: modelsWithoutEmbedding.length });

    // Yield para React renderizar estado de loading
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const stripHTML = (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        return div.textContent || div.innerText || '';
      };

      // v1.37.57: Coletar embeddings em um Map (evita mutação de objetos frozen do Zustand/Immer)
      const embeddingsMap = new Map<string, number[]>();

      for (let i = 0; i < modelsWithoutEmbedding.length; i++) {
        const model = modelsWithoutEmbedding[i];
        const text = [model.title, model.keywords, stripHTML(model.content).slice(0, 2000)].filter(Boolean).join(' ');
        const embedding = await AIModelService.getEmbedding(text, 'passage');
        embeddingsMap.set(model.id, embedding);
        setModelEmbeddingsProgress({ current: i + 1, total: modelsWithoutEmbedding.length });
        // Yield to event loop para permitir que React renderize o progresso
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Criar novos objetos com embeddings (respeitando imutabilidade do Zustand/Immer)
      const updatedModels = modelLibrary.models.map(m => {
        const embedding = embeddingsMap.get(m.id);
        return embedding ? { ...m, embedding } : m;
      });

      // Salvar modelos atualizados
      await indexedDB.saveModels(updatedModels);
      modelLibrary.setModels(updatedModels);
      showToast(`${modelsWithoutEmbedding.length} embeddings de modelos gerados`, 'success');
    } catch (err) {
      showToast('Erro ao gerar embeddings: ' + (err as Error).message, 'error');
      console.error('[MODEL-SEARCH] Erro:', err);
    } finally {
      setGeneratingModelEmbeddings(false);
      setModelEmbeddingsProgress({ current: 0, total: 0 });
    }
  }, [searchModelReady, generatingModelEmbeddings, modelLibrary, indexedDB, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Estado - Contagens
    embeddingsCount,
    jurisEmbeddingsCount,

    // Estado - Progresso de importação
    embeddingsProgress,
    jurisEmbeddingsProgress,
    importingEmbeddings,
    importingJurisEmbeddings,

    // Estado - Geração de embeddings de modelos
    generatingModelEmbeddings,
    modelEmbeddingsProgress,

    // Estado - Download modal (dados)
    showDataDownloadModal,
    setShowDataDownloadModal,
    dataDownloadStatus,
    setDataDownloadStatus,

    // Estado - Download modal (embeddings)
    showEmbeddingsDownloadModal,
    setShowEmbeddingsDownloadModal,
    embeddingsDownloadStatus,

    // Refs
    embeddingsFileInputRef,

    // Handlers - Importação
    handleImportEmbeddings,
    handleImportJurisEmbeddings,

    // Handlers - Download CDN
    handleStartDataDownload,
    handleStartEmbeddingsDownload,
    handleDismissDataPrompt,
    handleDismissEmbeddingsPrompt,

    // Handlers - Limpeza
    clearEmbeddings,
    clearJurisEmbeddings,
    clearModelEmbeddings,

    // Handlers - Geração
    generateModelEmbeddings,
  };
}
