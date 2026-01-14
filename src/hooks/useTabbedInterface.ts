/**
 * @file useTabbedInterface.ts
 * @description Hook para gerenciamento de abas da interface
 * @version 1.37.37 - Extraído do App.tsx (FASE 32)
 */

import { useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type TabId = 'upload' | 'topics' | 'proofs' | 'jurisprudencia' | 'legislacao' | 'editor' | 'models';

export interface TabDefinition {
  id: TabId;
  label: string;
  iconName: string;
}

export interface UseTabbedInterfaceReturn {
  /** Aba atualmente ativa */
  activeTab: TabId;
  /** Setter para mudar aba ativa (aceita string para compatibilidade) */
  setActiveTab: (tab: TabId | string) => void;
  /** Navegar para aba Upload */
  goToUpload: () => void;
  /** Navegar para aba Tópicos */
  goToTopics: () => void;
  /** Navegar para aba Editor */
  goToEditor: () => void;
  /** Navegar para aba Modelos */
  goToModels: () => void;
  /** Navegar para aba Provas */
  goToProofs: () => void;
  /** Navegar para aba Jurisprudência */
  goToJurisprudencia: () => void;
  /** Navegar para aba Legislação */
  goToLegislacao: () => void;
  /** true se aba atual é read-only (pode ser acessada por abas secundárias) */
  isReadOnlyTab: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Definições das abas disponíveis
 * Nota: Os ícones são nomes de componentes Lucide-React
 */
export const TABS: TabDefinition[] = [
  { id: 'upload', label: 'Upload & Análise', iconName: 'Upload' },
  { id: 'topics', label: 'Tópicos', iconName: 'FileText' },
  { id: 'proofs', label: 'Provas', iconName: 'Scale' },
  { id: 'jurisprudencia', label: 'Jurisprudência', iconName: 'BookOpen' },
  { id: 'legislacao', label: 'Legislação', iconName: 'Book' },
  { id: 'editor', label: 'Editor', iconName: 'FileText' },
  { id: 'models', label: 'Modelos', iconName: 'Save' },
];

/**
 * Abas que podem ser acessadas por abas secundárias (read-only)
 * Usadas pelo LockedTabOverlay para permitir acesso mesmo quando não é aba primária
 */
export const READONLY_TABS: TabId[] = ['models', 'jurisprudencia', 'legislacao'];

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciamento de abas da interface
 *
 * Funcionalidades:
 * - Estado da aba ativa
 * - Helpers de navegação (goToTopics, goToEditor, etc.)
 * - Verificação de abas read-only
 *
 * @param initialTab - Aba inicial (default: 'upload')
 *
 * @example
 * const { activeTab, setActiveTab, goToTopics } = useTabbedInterface();
 */
export function useTabbedInterface(initialTab: TabId = 'upload'): UseTabbedInterfaceReturn {
  const [activeTab, setActiveTabInternal] = useState<TabId>(initialTab);

  // Wrapper que aceita string para compatibilidade com interfaces existentes
  const setActiveTab = useCallback((tab: TabId | string) => {
    setActiveTabInternal(tab as TabId);
  }, []);

  // Helpers de navegação
  const goToUpload = useCallback(() => setActiveTabInternal('upload'), []);
  const goToTopics = useCallback(() => setActiveTabInternal('topics'), []);
  const goToEditor = useCallback(() => setActiveTabInternal('editor'), []);
  const goToModels = useCallback(() => setActiveTabInternal('models'), []);
  const goToProofs = useCallback(() => setActiveTabInternal('proofs'), []);
  const goToJurisprudencia = useCallback(() => setActiveTabInternal('jurisprudencia'), []);
  const goToLegislacao = useCallback(() => setActiveTabInternal('legislacao'), []);

  return {
    activeTab,
    setActiveTab,
    goToUpload,
    goToTopics,
    goToEditor,
    goToModels,
    goToProofs,
    goToJurisprudencia,
    goToLegislacao,
    isReadOnlyTab: READONLY_TABS.includes(activeTab),
  };
}

export default useTabbedInterface;
