/**
 * @file useDragDropTopics.ts
 * @description Hook para drag and drop de tópicos
 * Extraído do App.tsx v1.37.6 - FASE 5 LegalDecisionEditor refactoring
 */

import React, { useState, useCallback, useMemo } from 'react';
import { closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Topic, TopicoComplementar, AISettings } from '../types';
import { isSpecialTopic } from '../utils/text';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AISettingsForDragDrop {
  topicosComplementares?: TopicoComplementar[];
}

export interface AIIntegrationForDragDrop {
  aiSettings: AISettings;
  setAiSettings: (settings: AISettings | ((prev: AISettings) => AISettings)) => void;
}

export interface UseDragDropTopicsProps {
  selectedTopics: Topic[];
  setSelectedTopics: (topics: Topic[]) => void;
  aiIntegration: AIIntegrationForDragDrop;
}

export interface UseDragDropTopicsReturn {
  // Estados
  draggedIndex: number | null;
  dragOverIndex: number | null;
  draggedComplementaryIndex: number | null;
  dragOverComplementaryIndex: number | null;
  setDraggedIndex: (index: number | null) => void;
  setDragOverIndex: (index: number | null) => void;
  setDraggedComplementaryIndex: (index: number | null) => void;
  setDragOverComplementaryIndex: (index: number | null) => void;

  // Memos
  specialTopicIds: Set<string | number>;
  customCollisionDetection: (args: Parameters<typeof closestCenter>[0]) => ReturnType<typeof closestCenter>;

  // Handlers principais
  handleDndDragEnd: (event: { active: { id: string | number }; over: { id: string | number } | null }) => void;
  handleDragStart: (e: React.DragEvent<HTMLElement>, index: number) => void;
  handleDragEnd: (e: React.DragEvent<HTMLElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLElement>, index: number) => void;
  handleDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>, dropIndex: number) => void;

  // Handlers complementares
  handleComplementaryDragStart: (e: React.DragEvent<HTMLElement>, index: number) => void;
  handleComplementaryDragEnd: (e: React.DragEvent<HTMLElement>) => void;
  handleComplementaryDragOver: (e: React.DragEvent<HTMLElement>, index: number) => void;
  handleComplementaryDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  handleComplementaryDrop: (e: React.DragEvent<HTMLElement>, dropIndex: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciar drag and drop de tópicos
 *
 * @description Gerencia reordenação de tópicos via drag and drop, tanto para
 * tópicos principais quanto para tópicos complementares. Protege tópicos
 * especiais (RELATÓRIO e DISPOSITIVO) de serem movidos.
 *
 * @param props - Propriedades do hook
 * @returns Estados e handlers para drag and drop
 *
 * @example
 * const dragDrop = useDragDropTopics({ selectedTopics, setSelectedTopics, aiIntegration });
 * // Usar dragDrop.handleDndDragEnd no DndContext
 */
export function useDragDropTopics({
  selectedTopics,
  setSelectedTopics,
  aiIntegration,
}: UseDragDropTopicsProps): UseDragDropTopicsReturn {

  // Estados de drag
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedComplementaryIndex, setDraggedComplementaryIndex] = useState<number | null>(null);
  const [dragOverComplementaryIndex, setDragOverComplementaryIndex] = useState<number | null>(null);

  // v1.33.60: Set pré-computado para lookup O(1) no collision detection
  const specialTopicIds = useMemo(() => {
    return new Set(
      selectedTopics
        .filter(t => isSpecialTopic(t))
        .map(t => t.id || t.title)
    );
  }, [selectedTopics]);

  // v1.33.60: Collision detection otimizado - O(n) ao invés de O(n²)
  // Ignora RELATÓRIO e DISPOSITIVO para evitar feedback visual enganoso
  const customCollisionDetection = useCallback((args: Parameters<typeof closestCenter>[0]) => {
    const { droppableContainers, ...rest } = args;

    // Filtrar usando Set (O(1) por lookup)
    const filteredContainers = droppableContainers.filter(
      container => !specialTopicIds.has(container.id)
    );

    return closestCenter({ ...rest, droppableContainers: filteredContainers });
  }, [specialTopicIds]);

  // Handler para @dnd-kit
  const handleDndDragEnd = useCallback((event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = selectedTopics.findIndex((t: Topic) => (t.id || t.title) === active.id);
    const newIndex = selectedTopics.findIndex((t: Topic) => (t.id || t.title) === over.id);

    // Proteger tópicos especiais (RELATÓRIO e DISPOSITIVO)
    if (isSpecialTopic(selectedTopics[oldIndex]) || isSpecialTopic(selectedTopics[newIndex])) {
      return;
    }

    const reordered = arrayMove(selectedTopics, oldIndex, newIndex);
    setSelectedTopics(reordered);
  }, [selectedTopics, setSelectedTopics]);

  // v1.33.58: Handlers HTML5 antigos mantidos temporariamente para complementares
  const handleDragStart = useCallback((e: React.DragEvent<HTMLElement>, index: number) => {
    // Bloquear drag de RELATÓRIO e DISPOSITIVO
    const topic = selectedTopics[index];
    if (isSpecialTopic(topic)) {
      e.preventDefault();
      return;
    }

    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Adiciona um pequeno delay para permitir o visual do drag
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  }, [selectedTopics]);

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }

    // Auto-scroll quando arrastar perto das bordas
    const scrollThreshold = 150; // Área maior para detectar (150px da borda)
    const scrollSpeed = 25; // Scroll mais rápido
    const viewportHeight = window.innerHeight;
    const mouseY = e.clientY;

    // Scroll para baixo quando mouse está perto da borda inferior
    if (mouseY > viewportHeight - scrollThreshold) {
      window.scrollBy({
        top: scrollSpeed,
        behavior: 'auto'
      });
    }
    // Scroll para cima quando mouse está perto da borda superior
    else if (mouseY < scrollThreshold) {
      window.scrollBy({
        top: -scrollSpeed,
        behavior: 'auto'
      });
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    // Só limpa se realmente sair do elemento
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLElement>, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Bloquear drop em posições de RELATÓRIO (0) e DISPOSITIVO (última posição)
    const draggedTopic = selectedTopics[draggedIndex];
    const dropTopic = selectedTopics[dropIndex];

    // Não permitir mover RELATÓRIO ou DISPOSITIVO
    if (isSpecialTopic(draggedTopic)) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Não permitir drop na posição de RELATÓRIO ou DISPOSITIVO
    if (isSpecialTopic(dropTopic)) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newTopics = [...selectedTopics];
    const [draggedTopicItem] = newTopics.splice(draggedIndex, 1);
    newTopics.splice(dropIndex, 0, draggedTopicItem);

    setSelectedTopics(newTopics);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, selectedTopics, setSelectedTopics]);

  // Handlers para tópicos complementares
  const handleComplementaryDragStart = useCallback((e: React.DragEvent<HTMLElement>, index: number) => {
    setDraggedComplementaryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  }, []);

  const handleComplementaryDragEnd = useCallback((e: React.DragEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedComplementaryIndex(null);
    setDragOverComplementaryIndex(null);
  }, []);

  const handleComplementaryDragOver = useCallback((e: React.DragEvent<HTMLElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedComplementaryIndex !== null && index !== draggedComplementaryIndex) {
      setDragOverComplementaryIndex(index);
    }
  }, [draggedComplementaryIndex]);

  const handleComplementaryDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (e.currentTarget === e.target) {
      setDragOverComplementaryIndex(null);
    }
  }, []);

  const handleComplementaryDrop = useCallback((e: React.DragEvent<HTMLElement>, dropIndex: number) => {
    e.preventDefault();

    if (draggedComplementaryIndex === null || draggedComplementaryIndex === dropIndex) {
      setDraggedComplementaryIndex(null);
      setDragOverComplementaryIndex(null);
      return;
    }

    const updatedTopics = [...(aiIntegration.aiSettings.topicosComplementares || [])];
    const [draggedTopic] = updatedTopics.splice(draggedComplementaryIndex, 1);
    updatedTopics.splice(dropIndex, 0, draggedTopic);

    // Recalcular ordem
    const reorderedTopics = updatedTopics.map((topic, idx) => ({
      ...topic,
      ordem: idx + 1
    }));

    aiIntegration.setAiSettings({ ...aiIntegration.aiSettings, topicosComplementares: reorderedTopics });
    setDraggedComplementaryIndex(null);
    setDragOverComplementaryIndex(null);
  }, [draggedComplementaryIndex, aiIntegration.aiSettings, aiIntegration.setAiSettings]);

  return {
    // Estados
    draggedIndex,
    dragOverIndex,
    draggedComplementaryIndex,
    dragOverComplementaryIndex,
    setDraggedIndex,
    setDragOverIndex,
    setDraggedComplementaryIndex,
    setDragOverComplementaryIndex,

    // Memos
    specialTopicIds,
    customCollisionDetection,

    // Handlers principais
    handleDndDragEnd,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,

    // Handlers complementares
    handleComplementaryDragStart,
    handleComplementaryDragEnd,
    handleComplementaryDragOver,
    handleComplementaryDragLeave,
    handleComplementaryDrop,
  };
}
