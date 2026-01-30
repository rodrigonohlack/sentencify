/**
 * @file styles.ts
 * @description Estilos e helpers de formatação para o app de Prova Oral
 */

import type { Qualificacao, StatusAnalise, Relevancia, NivelCredibilidade } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS POR STATUS DE ANÁLISE
// ═══════════════════════════════════════════════════════════════════════════

export const STATUS_STYLES = {
  'favoravel-autor': {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    label: 'Favorável ao Autor'
  },
  'favoravel-re': {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    label: 'Favorável à Ré'
  },
  'parcial': {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    label: 'Prova Dividida'
  },
  'inconclusivo': {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
    label: 'Inconclusivo'
  }
} as const;

export const getStatusStyle = (status: StatusAnalise) =>
  STATUS_STYLES[status] || STATUS_STYLES.inconclusivo;

export const getStatusLabel = (status: StatusAnalise): string =>
  STATUS_STYLES[status]?.label || 'Inconclusivo';

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS POR QUALIFICAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

export const QUALIFICACAO_STYLES = {
  'autor': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    label: 'Reclamante'
  },
  'preposto': {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
    label: 'Preposto'
  },
  'testemunha-autor': {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-800 dark:text-cyan-300',
    border: 'border-cyan-300 dark:border-cyan-700',
    label: 'Testemunha do Autor'
  },
  'testemunha-re': {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-800 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    label: 'Testemunha da Ré'
  }
} as const;

export const getQualificacaoStyle = (qualificacao: Qualificacao) =>
  QUALIFICACAO_STYLES[qualificacao] || QUALIFICACAO_STYLES.autor;

export const getQualificacaoLabel = (qualificacao: Qualificacao): string =>
  QUALIFICACAO_STYLES[qualificacao]?.label || qualificacao;

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS POR RELEVÂNCIA
// ═══════════════════════════════════════════════════════════════════════════

export const RELEVANCIA_STYLES = {
  'alta': {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    icon: 'text-red-500',
    label: 'Alta'
  },
  'media': {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-300',
    icon: 'text-amber-500',
    label: 'Média'
  },
  'baixa': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
    icon: 'text-blue-500',
    label: 'Baixa'
  }
} as const;

export const getRelevanciaStyle = (relevancia: Relevancia) =>
  RELEVANCIA_STYLES[relevancia] || RELEVANCIA_STYLES.media;

export const getRelevanciaLabel = (relevancia: Relevancia): string =>
  RELEVANCIA_STYLES[relevancia]?.label || relevancia;

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS POR CREDIBILIDADE
// ═══════════════════════════════════════════════════════════════════════════

export const CREDIBILIDADE_STYLES = {
  'alta': {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-300',
    icon: 'text-emerald-500',
    label: 'Alta'
  },
  'media': {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-300',
    icon: 'text-amber-500',
    label: 'Média'
  },
  'baixa': {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    icon: 'text-red-500',
    label: 'Baixa'
  }
} as const;

export const getCredibilidadeStyle = (nivel: NivelCredibilidade) =>
  CREDIBILIDADE_STYLES[nivel] || CREDIBILIDADE_STYLES.media;

export const getCredibilidadeLabel = (nivel: NivelCredibilidade): string =>
  CREDIBILIDADE_STYLES[nivel]?.label || nivel;

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS PARA FAVORABILIDADE
// ═══════════════════════════════════════════════════════════════════════════

export const FAVORABILIDADE_STYLES = {
  'autor': {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-300',
    label: 'Favorável ao Autor'
  },
  're': {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    label: 'Favorável à Ré'
  },
  'neutro': {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    label: 'Neutro'
  }
} as const;

export const getFavorabilidadeStyle = (favoravel: 'autor' | 're' | 'neutro') =>
  FAVORABILIDADE_STYLES[favoravel] || FAVORABILIDADE_STYLES.neutro;

export const getFavorabilidadeLabel = (favoravel: 'autor' | 're' | 'neutro'): string =>
  FAVORABILIDADE_STYLES[favoravel]?.label || favoravel;
