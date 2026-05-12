/**
 * @file useResultStore.ts
 * @description Store Zustand para resultados da análise
 */

import { create } from 'zustand';
import type { AnalysisResult, AnalysisState, PedidoAnalise } from '../types';
import { generateTabelaSintetica } from '../utils/tabela';

interface ResultStoreState extends AnalysisState {
  // Contexto da audiência (preenchido ao abrir análise do histórico)
  dataPauta: string | null;
  horarioAudiencia: string | null;

  // Origem da análise (para reanálise)
  savedAnalysisId: string | null;
  nomeArquivoPeticao: string | null;
  nomesArquivosEmendas: string[];
  nomesArquivosContestacoes: string[];

  // Síntese do processo
  sintese: string | null;

  /**
   * Histórico de versões anteriores por pedido (chave = numero do pedido).
   * Append-only durante a sessão; a versão atual está em result.pedidos.
   * Cap em 5 entradas por pedido. Não persistido — limpo em setResult e reset.
   */
  pedidoUndoStack: Record<number, PedidoAnalise[]>;

  // Actions
  setResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setProgress: (progress: number, message?: string) => void;
  setError: (error: string | null) => void;
  setAnalysisContext: (dataPauta: string | null, horarioAudiencia: string | null) => void;
  setSavedAnalysisId: (id: string | null) => void;
  setFileNames: (
    nomeArquivoPeticao: string | null,
    nomesArquivosEmendas: string[],
    nomesArquivosContestacoes: string[]
  ) => void;
  setSintese: (sintese: string | null) => void;
  clearAnalysisContext: () => void;
  /**
   * Substitui o pedido pelo numero, empilhando a versão antiga em pedidoUndoStack
   * e regenerando tabelaSintetica deterministicamente.
   */
  refinePedidoInResult: (numero: number, novoPedido: PedidoAnalise) => void;
  /** Restaura a versão imediatamente anterior do pedido, se houver. */
  undoPedidoRefinement: (numero: number) => void;
  reset: () => void;
}

const initialState: AnalysisState & {
  dataPauta: string | null;
  horarioAudiencia: string | null;
  savedAnalysisId: string | null;
  nomeArquivoPeticao: string | null;
  nomesArquivosEmendas: string[];
  nomesArquivosContestacoes: string[];
  sintese: string | null;
  pedidoUndoStack: Record<number, PedidoAnalise[]>;
} = {
  result: null,
  isAnalyzing: false,
  progress: 0,
  progressMessage: '',
  error: null,
  dataPauta: null,
  horarioAudiencia: null,
  savedAnalysisId: null,
  nomeArquivoPeticao: null,
  nomesArquivosEmendas: [],
  nomesArquivosContestacoes: [],
  sintese: null,
  pedidoUndoStack: {}
};

const UNDO_STACK_CAP = 5;

export const useResultStore = create<ResultStoreState>((set) => ({
  ...initialState,

  setResult: (result) => set({
    result,
    isAnalyzing: false,
    progress: 100,
    error: null,
    pedidoUndoStack: {}
  }),

  setIsAnalyzing: (isAnalyzing) => set({
    isAnalyzing,
    progress: isAnalyzing ? 0 : 100,
    error: isAnalyzing ? null : undefined
  }),

  setProgress: (progress, message) => set((state) => ({
    progress,
    progressMessage: message ?? state.progressMessage
  })),

  setError: (error) => set({ error, isAnalyzing: false }),

  setAnalysisContext: (dataPauta, horarioAudiencia) => set({ dataPauta, horarioAudiencia }),

  setSavedAnalysisId: (savedAnalysisId) => set({ savedAnalysisId }),

  setFileNames: (nomeArquivoPeticao, nomesArquivosEmendas, nomesArquivosContestacoes) =>
    set({ nomeArquivoPeticao, nomesArquivosEmendas, nomesArquivosContestacoes }),

  setSintese: (sintese) => set({ sintese }),

  clearAnalysisContext: () => set({
    dataPauta: null,
    horarioAudiencia: null,
    savedAnalysisId: null,
    nomeArquivoPeticao: null,
    nomesArquivosEmendas: [],
    nomesArquivosContestacoes: [],
    sintese: null,
    pedidoUndoStack: {}
  }),

  refinePedidoInResult: (numero, novoPedido) => set((state) => {
    if (!state.result) return state;
    const antigo = state.result.pedidos.find(p => p.numero === numero);
    if (!antigo) return state;

    const stackAntiga = state.pedidoUndoStack[numero] || [];
    const stackNova = [...stackAntiga, antigo].slice(-UNDO_STACK_CAP);

    const pedidosNovos = state.result.pedidos.map(p =>
      p.numero === numero ? { ...novoPedido, numero } : p
    );

    return {
      result: {
        ...state.result,
        pedidos: pedidosNovos,
        tabelaSintetica: generateTabelaSintetica(pedidosNovos)
      },
      pedidoUndoStack: { ...state.pedidoUndoStack, [numero]: stackNova }
    };
  }),

  undoPedidoRefinement: (numero) => set((state) => {
    if (!state.result) return state;
    const stack = state.pedidoUndoStack[numero];
    if (!stack || stack.length === 0) return state;

    const restaurado = stack[stack.length - 1];
    const stackNova = stack.slice(0, -1);

    const pedidosNovos = state.result.pedidos.map(p =>
      p.numero === numero ? restaurado : p
    );

    const undoStackNovo = { ...state.pedidoUndoStack };
    if (stackNova.length === 0) {
      delete undoStackNovo[numero];
    } else {
      undoStackNovo[numero] = stackNova;
    }

    return {
      result: {
        ...state.result,
        pedidos: pedidosNovos,
        tabelaSintetica: generateTabelaSintetica(pedidosNovos)
      },
      pedidoUndoStack: undoStackNovo
    };
  }),

  reset: () => set(initialState)
}));

export default useResultStore;
