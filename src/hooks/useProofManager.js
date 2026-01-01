// 🎣 CUSTOM HOOK: useProofManager - Sistema de Provas
// Versão simplificada extraída do App.jsx para testes
import React from 'react';

const useProofManager = () => {
  // 📊 ESTADOS CORE DE DADOS
  const [proofFiles, setProofFiles] = React.useState([]);
  const [proofTexts, setProofTexts] = React.useState([]);
  const [proofUsePdfMode, setProofUsePdfMode] = React.useState({});
  const [extractedProofTexts, setExtractedProofTexts] = React.useState({});
  const [proofExtractionFailed, setProofExtractionFailed] = React.useState({});
  const [proofTopicLinks, setProofTopicLinks] = React.useState({});
  const [proofAnalysisResults, setProofAnalysisResults] = React.useState({});
  const [proofConclusions, setProofConclusions] = React.useState({});
  const [proofProcessingModes, setProofProcessingModes] = React.useState({});
  const [proofSendFullContent, setProofSendFullContent] = React.useState({});

  // Estados pendentes (anonimização)
  const [pendingProofText, setPendingProofText] = React.useState(null);
  const [pendingExtraction, setPendingExtraction] = React.useState(null);
  const [pendingChatMessage, setPendingChatMessage] = React.useState(null);

  // 🎛️ ESTADOS DE UI/CONTROLE
  const [analyzingProofIds, setAnalyzingProofIds] = React.useState(new Set());
  const [showProofPanel, setShowProofPanel] = React.useState(true);
  const [newProofTextData, setNewProofTextData] = React.useState({ name: '', text: '' });
  const [proofToDelete, setProofToDelete] = React.useState(null);
  const [proofToLink, setProofToLink] = React.useState(null);
  const [proofToAnalyze, setProofToAnalyze] = React.useState(null);
  const [proofAnalysisCustomInstructions, setProofAnalysisCustomInstructions] = React.useState('');
  const [useOnlyMiniRelatorios, setUseOnlyMiniRelatorios] = React.useState(false);
  const [includeLinkedTopicsInFree, setIncludeLinkedTopicsInFree] = React.useState(false);

  // Funções de controle de análise
  const addAnalyzingProof = React.useCallback((id) => {
    setAnalyzingProofIds(prev => new Set([...prev, id]));
  }, []);

  const removeAnalyzingProof = React.useCallback((id) => {
    setAnalyzingProofIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isAnalyzingProof = React.useCallback((id) => {
    return analyzingProofIds.has(id);
  }, [analyzingProofIds]);

  const clearAnalyzingProofs = React.useCallback(() => {
    setAnalyzingProofIds(new Set());
  }, []);

  // 📊 HELPERS COMPUTADOS
  const totalProofs = proofFiles.length + proofTexts.length;
  const hasProofs = totalProofs > 0;

  // 🔧 Helpers utilitários
  const removeObjectKey = React.useCallback((setter, keyToRemove) => {
    setter(prev => {
      const { [keyToRemove]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const removeById = React.useCallback((arr, id) => arr.filter(item => item.id !== id), []);

  // 🔧 HANDLERS

  // Handler: Upload de provas em PDF (versão simplificada sem IndexedDB)
  const handleUploadProofPdf = React.useCallback(async (files) => {
    const filesArray = Array.isArray(files) ? files : Array.from(files || []);

    for (const file of filesArray) {
      const id = Date.now() + Math.random();
      const newProof = {
        id,
        file,
        name: file.name,
        type: 'pdf',
        size: file.size,
        uploadDate: new Date().toISOString()
      };

      setProofFiles(prev => [...prev, newProof]);
      setProofUsePdfMode(prev => ({ ...prev, [id]: true }));
      setProofProcessingModes(prev => ({ ...prev, [id]: 'pdfjs' }));
    }
  }, []);

  // Handler: Adicionar prova em texto
  const handleAddProofText = React.useCallback(() => {
    if (!newProofTextData.name.trim() || !newProofTextData.text.trim()) {
      return false;
    }

    const id = Date.now() + Math.random();
    const newProof = {
      id,
      text: newProofTextData.text,
      name: newProofTextData.name,
      uploadDate: new Date().toISOString()
    };

    setProofTexts(prev => [...prev, newProof]);
    setNewProofTextData({ name: '', text: '' });
    return true;
  }, [newProofTextData]);

  // Handler: Deletar prova
  const handleDeleteProof = React.useCallback((proof) => {
    if (proof.isPdf || proof.type === 'pdf') {
      setProofFiles(prev => removeById(prev, proof.id));
    } else {
      setProofTexts(prev => removeById(prev, proof.id));
    }
    removeObjectKey(setProofUsePdfMode, proof.id);
    removeObjectKey(setExtractedProofTexts, proof.id);
    removeObjectKey(setProofExtractionFailed, proof.id);
    removeObjectKey(setProofTopicLinks, proof.id);
    removeObjectKey(setProofAnalysisResults, proof.id);
    removeObjectKey(setProofConclusions, proof.id);
    removeObjectKey(setProofProcessingModes, proof.id);
  }, [removeObjectKey, removeById]);

  const handleToggleProofMode = React.useCallback((proofId, usePdf) => {
    setProofUsePdfMode(prev => ({ ...prev, [proofId]: usePdf }));
  }, []);

  const handleLinkProof = React.useCallback((proofId, topicTitles) => {
    setProofTopicLinks(prev => ({ ...prev, [proofId]: topicTitles }));
  }, []);

  const handleUnlinkProof = React.useCallback((proofId, topicTitle) => {
    setProofTopicLinks(prev => {
      const currentLinks = prev[proofId] || [];
      const newLinks = currentLinks.filter(t => t !== topicTitle);
      if (newLinks.length === 0) {
        const { [proofId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [proofId]: newLinks };
    });
  }, []);

  const handleSaveProofConclusion = React.useCallback((proofId, conclusion) => {
    if (conclusion && conclusion.trim()) {
      setProofConclusions(prev => ({ ...prev, [proofId]: conclusion }));
    } else {
      setProofConclusions(prev => {
        const { [proofId]: _, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  // Persistência
  const serializeForPersistence = React.useCallback(() => {
    return {
      proofFiles,
      proofTexts,
      proofUsePdfMode,
      extractedProofTexts,
      proofExtractionFailed,
      proofTopicLinks,
      proofAnalysisResults,
      proofConclusions,
      proofProcessingModes,
      proofSendFullContent
    };
  }, [proofFiles, proofTexts, proofUsePdfMode, extractedProofTexts, proofExtractionFailed, proofTopicLinks, proofAnalysisResults, proofConclusions, proofProcessingModes, proofSendFullContent]);

  const restoreFromPersistence = React.useCallback((data) => {
    if (!data) return;
    if (data.proofFiles) setProofFiles(data.proofFiles);
    if (data.proofTexts) setProofTexts(data.proofTexts);
    if (data.proofUsePdfMode) setProofUsePdfMode(data.proofUsePdfMode);
    if (data.extractedProofTexts) setExtractedProofTexts(data.extractedProofTexts);
    if (data.proofExtractionFailed) setProofExtractionFailed(data.proofExtractionFailed);
    if (data.proofTopicLinks) setProofTopicLinks(data.proofTopicLinks);
    if (data.proofAnalysisResults) setProofAnalysisResults(data.proofAnalysisResults);
    if (data.proofConclusions) setProofConclusions(data.proofConclusions);
    if (data.proofProcessingModes) setProofProcessingModes(data.proofProcessingModes);
    if (data.proofSendFullContent) setProofSendFullContent(data.proofSendFullContent);
  }, []);

  const resetAll = React.useCallback(() => {
    setProofFiles([]);
    setProofTexts([]);
    setProofUsePdfMode({});
    setExtractedProofTexts({});
    setProofExtractionFailed({});
    setProofTopicLinks({});
    setProofAnalysisResults({});
    setProofConclusions({});
    setProofProcessingModes({});
    setProofSendFullContent({});
    clearAnalyzingProofs();
    setShowProofPanel(true);
    setNewProofTextData({ name: '', text: '' });
    setProofToDelete(null);
    setProofToLink(null);
    setProofToAnalyze(null);
    setProofAnalysisCustomInstructions('');
    setUseOnlyMiniRelatorios(false);
  }, [clearAnalyzingProofs]);

  return {
    // Estados Core
    proofFiles, proofTexts, proofUsePdfMode, extractedProofTexts,
    proofExtractionFailed, proofTopicLinks, proofAnalysisResults,
    proofConclusions, proofProcessingModes, proofSendFullContent,
    pendingProofText, pendingExtraction, pendingChatMessage,

    // Estados UI
    analyzingProofIds, showProofPanel, newProofTextData,
    proofToDelete, proofToLink, proofToAnalyze,
    proofAnalysisCustomInstructions, useOnlyMiniRelatorios, includeLinkedTopicsInFree,

    // Setters Core
    setProofFiles, setProofTexts, setProofUsePdfMode, setExtractedProofTexts,
    setProofExtractionFailed, setProofTopicLinks, setProofAnalysisResults,
    setProofConclusions, setProofProcessingModes, setProofSendFullContent,
    setPendingProofText, setPendingExtraction, setPendingChatMessage,

    // Setters UI
    setShowProofPanel, setNewProofTextData, setProofToDelete,
    setProofToLink, setProofToAnalyze, setProofAnalysisCustomInstructions,
    setUseOnlyMiniRelatorios, setIncludeLinkedTopicsInFree,

    // Funções de análise
    addAnalyzingProof, removeAnalyzingProof, isAnalyzingProof, clearAnalyzingProofs,

    // Helpers
    totalProofs, hasProofs,

    // Handlers
    handleUploadProofPdf, handleAddProofText, handleDeleteProof,
    handleToggleProofMode, handleLinkProof, handleUnlinkProof, handleSaveProofConclusion,

    // Persistência
    serializeForPersistence, restoreFromPersistence, resetAll
  };
};

export default useProofManager;
