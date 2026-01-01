// 🎣 CUSTOM HOOK: useModelPreview - Preview de modelos de texto
// Extraído do App.jsx para facilitar testes unitários
import React from 'react';

const useModelPreview = () => {
  const [previewingModel, setPreviewingModel] = React.useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState('');
  
  // v1.15.2: Função de inserção contextual (para GlobalEditorModal)
  // v1.33.25: Usar ref em vez de state para não causar recriação do objeto modelPreview
  const contextualInsertFnRef = React.useRef(null);
  const setContextualInsertFn = React.useCallback((fn) => {
    contextualInsertFnRef.current = fn;
  }, []);
  
  // v1.15.3: Estado para "Salvar como Novo Modelo"
  const [saveAsNewData, setSaveAsNewData] = React.useState(null);
  
  // v1.19.2: Callback para notificar quando modelo é atualizado
  const onModelUpdatedRef = React.useRef(null);

  const openPreview = React.useCallback((model) => {
    if (!model || !model.content) {
      return;
    }
    setPreviewingModel(model);
    setIsPreviewOpen(true);
  }, []);

  const closePreview = React.useCallback(() => {
    setIsPreviewOpen(false);
    setIsEditing(false);
    setEditedContent('');
    setTimeout(() => setPreviewingModel(null), 200);
  }, []);

  const startEditing = React.useCallback(() => {
    if (previewingModel) {
      setEditedContent(previewingModel.content);
      setIsEditing(true);
    }
  }, [previewingModel]);

  const cancelEditing = React.useCallback(() => {
    setIsEditing(false);
    setEditedContent('');
  }, []);

  const openSaveAsNew = React.useCallback((content, originalModel) => {
    setSaveAsNewData({
      title: '',
      content: content,
      keywords: originalModel?.keywords || '',
      category: originalModel?.category || 'Mérito'
    });
  }, []);

  const closeSaveAsNew = React.useCallback(() => {
    setSaveAsNewData(null);
  }, []);

  // Atalho Esc para fechar/cancelar edição
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isPreviewOpen) {
        if (isEditing) {
          cancelEditing();
        } else {
          closePreview();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPreviewOpen, isEditing, cancelEditing, closePreview]);

  // v1.33.22: useMemo para evitar novo objeto a cada render
  return React.useMemo(() => ({
    previewingModel,
    isPreviewOpen,
    isEditing,
    editedContent,
    openPreview,
    closePreview,
    startEditing,
    cancelEditing,
    setEditedContent,
    contextualInsertFnRef,
    setContextualInsertFn,
    saveAsNewData,
    setSaveAsNewData,
    openSaveAsNew,
    closeSaveAsNew,
    onModelUpdatedRef,
  }), [
    previewingModel, isPreviewOpen, isEditing, editedContent,
    openPreview, closePreview, startEditing, cancelEditing,
    saveAsNewData, openSaveAsNew, closeSaveAsNew
  ]);
};

export default useModelPreview;
