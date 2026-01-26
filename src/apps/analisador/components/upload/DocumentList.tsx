/**
 * @file DocumentList.tsx
 * @description Lista de documentos com drag-and-drop usando @dnd-kit
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { Plus, Upload, FileText } from 'lucide-react';
import { DocumentCard } from './DocumentCard';
import type { DocumentFile } from '../../types';

interface DocumentListProps {
  documents: DocumentFile[];
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
  onAdd: (file: File) => Promise<void>;
  title: string;
  icon?: React.ReactNode;
  emptyMessage: string;
  disabled?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onReorder,
  onRemove,
  onAdd,
  title,
  icon,
  emptyMessage,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isFileHover, setIsFileHover] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Mínimo de 8px antes de iniciar drag
      }
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setIsDragging(false);

    if (!over || active.id === over.id) return;

    const oldIndex = documents.findIndex((d) => d.id === active.id);
    const newIndex = documents.findIndex((d) => d.id === over.id);

    const reordered = arrayMove(documents, oldIndex, newIndex);
    onReorder(reordered.map((d) => d.id));
  }, [documents, onReorder]);

  const handleMoveUp = useCallback((id: string) => {
    const index = documents.findIndex((d) => d.id === id);
    if (index <= 0) return;

    const reordered = arrayMove(documents, index, index - 1);
    onReorder(reordered.map((d) => d.id));
  }, [documents, onReorder]);

  const handleMoveDown = useCallback((id: string) => {
    const index = documents.findIndex((d) => d.id === id);
    if (index < 0 || index >= documents.length - 1) return;

    const reordered = arrayMove(documents, index, index + 1);
    onReorder(reordered.map((d) => d.id));
  }, [documents, onReorder]);

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    // Verificar se é um arquivo sendo arrastado (não um item da lista)
    if (e.dataTransfer.types.includes('Files')) {
      setIsFileHover(true);
    }
  }, [disabled]);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsFileHover(false);
  }, []);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileHover(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          await onAdd(file);
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
        }
      }
    }
  }, [onAdd, disabled]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        await onAdd(file);
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
      }
    }
    e.target.value = '';
  }, [onAdd]);

  const handleAddClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const activeDocument = activeId ? documents.find((d) => d.id === activeId) : null;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-slate-700 dark:text-slate-200">{title}</h3>
          {documents.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {documents.length}
            </span>
          )}
        </div>
        <button
          onClick={handleAddClick}
          disabled={disabled}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${disabled
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
              : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50'
            }
          `}
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Lista de documentos ou área de drop */}
      <div
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        className={`
          min-h-[100px] rounded-lg border-2 border-dashed transition-colors
          ${isFileHover
            ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20'
            : documents.length === 0
              ? 'border-slate-200 dark:border-slate-700'
              : 'border-transparent'
          }
        `}
      >
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
              <Upload className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Arraste PDFs aqui ou clique em "Adicionar"
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={documents.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {documents.map((doc, index) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    index={index}
                    total={documents.length}
                    onRemove={onRemove}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    disabled={disabled || isDragging}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Overlay durante drag */}
            <DragOverlay>
              {activeDocument && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-indigo-400 bg-white dark:bg-slate-800 shadow-xl">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                    {activeDocument.name}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default DocumentList;
