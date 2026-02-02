/**
 * @file analysis-phases.ts
 * @description Constantes para as fases de análise de prova oral
 */

// ═══════════════════════════════════════════════════════════════════════════
// FASES DA ANÁLISE
// ═══════════════════════════════════════════════════════════════════════════

export interface AnalysisPhase {
  id: 'transcription' | 'juridical' | 'probatory';
  name: string;
  description: string;
  /** Porcentagem de início desta fase no progresso total (0-100) */
  progressStart: number;
  /** Porcentagem de fim desta fase no progresso total (0-100) */
  progressEnd: number;
}

export const ANALYSIS_PHASES: Record<string, AnalysisPhase> = {
  transcription: {
    id: 'transcription',
    name: 'Transcrição',
    description: 'Extraindo e estruturando depoimentos',
    progressStart: 0,
    progressEnd: 35,
  },
  juridical: {
    id: 'juridical',
    name: 'Classificação Jurídica',
    description: 'Agrupando por temas e identificando confissões/contradições',
    progressStart: 35,
    progressEnd: 65,
  },
  probatory: {
    id: 'probatory',
    name: 'Análise Probatória',
    description: 'Produzindo conclusões juridicamente fundamentadas',
    progressStart: 65,
    progressEnd: 95,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MENSAGENS DE PROGRESSO
// ═══════════════════════════════════════════════════════════════════════════

export interface ProgressMessage {
  phase: AnalysisPhase['id'];
  progress: number;
  message: string;
}

export const PROGRESS_MESSAGES: ProgressMessage[] = [
  // Preparação
  { phase: 'transcription', progress: 5, message: 'Preparando análise em três fases...' },

  // Fase 1: Transcrição
  { phase: 'transcription', progress: 10, message: 'Fase 1: Transcrevendo depoimentos...' },
  { phase: 'transcription', progress: 20, message: 'Fase 1: Identificando depoentes...' },
  { phase: 'transcription', progress: 30, message: 'Fase 1: Extraindo declarações com timestamps...' },
  { phase: 'transcription', progress: 35, message: 'Fase 1 concluída. Processando transcrição...' },

  // Fase 2: Classificação Jurídica
  { phase: 'juridical', progress: 40, message: 'Fase 2: Agrupando por temas...' },
  { phase: 'juridical', progress: 50, message: 'Fase 2: Identificando confissões...' },
  { phase: 'juridical', progress: 55, message: 'Fase 2: Detectando contradições...' },
  { phase: 'juridical', progress: 60, message: 'Fase 2: Avaliando credibilidade...' },
  { phase: 'juridical', progress: 65, message: 'Fase 2 concluída. Processando classificação...' },

  // Fase 3: Análise Probatória
  { phase: 'probatory', progress: 70, message: 'Fase 3: Iniciando análise probatória...' },
  { phase: 'probatory', progress: 75, message: 'Fase 3: Aplicando regras de valoração...' },
  { phase: 'probatory', progress: 80, message: 'Fase 3: Verificando ônus da prova...' },
  { phase: 'probatory', progress: 85, message: 'Fase 3: Fundamentando conclusões...' },
  { phase: 'probatory', progress: 90, message: 'Fase 3: Validando análises...' },
  { phase: 'probatory', progress: 95, message: 'Fase 3 concluída. Finalizando...' },

  // Conclusão
  { phase: 'probatory', progress: 100, message: 'Análise concluída!' },
];

/**
 * Retorna a mensagem de progresso para uma determinada porcentagem
 */
export function getProgressMessage(progress: number): string {
  // Encontra a mensagem mais próxima (igual ou menor)
  const message = [...PROGRESS_MESSAGES]
    .reverse()
    .find(m => m.progress <= progress);

  return message?.message || 'Processando...';
}

/**
 * Retorna a fase atual baseada na porcentagem de progresso
 */
export function getCurrentPhase(progress: number): AnalysisPhase | null {
  for (const phase of Object.values(ANALYSIS_PHASES)) {
    if (progress >= phase.progressStart && progress < phase.progressEnd) {
      return phase;
    }
  }
  // Se progress >= 95, retorna a última fase
  if (progress >= 95) {
    return ANALYSIS_PHASES.probatory;
  }
  return null;
}

/**
 * Calcula o progresso dentro de uma fase específica (0-100)
 */
export function getPhaseProgress(totalProgress: number, phaseId: AnalysisPhase['id']): number {
  const phase = ANALYSIS_PHASES[phaseId];
  if (!phase) return 0;

  const phaseRange = phase.progressEnd - phase.progressStart;
  const progressInPhase = totalProgress - phase.progressStart;

  if (progressInPhase <= 0) return 0;
  if (progressInPhase >= phaseRange) return 100;

  return Math.round((progressInPhase / phaseRange) * 100);
}
