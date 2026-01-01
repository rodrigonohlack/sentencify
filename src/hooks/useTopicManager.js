// 🎣 CUSTOM HOOK: useTopicManager - Gerenciador de Tópicos
// Versão simplificada extraída do App.jsx para testes
import React from 'react';

const useTopicManager = () => {
  // 📊 ESTADOS (12)

  // Tópicos Principais (2)
  const [extractedTopics, setExtractedTopics] = React.useState([]);
  const [selectedTopics, setSelectedTopics] = React.useState([]);

  // Estado de Edição (3)
  const [editingTopic, setEditingTopic] = React.useState(null);
  const [lastEditedTopicTitle, setLastEditedTopicTitle] = React.useState(null);
  const [topicContextScope, setTopicContextScope] = React.useState('current');

  // Estados de UI/Progresso (1)
  const [savingTopic, setSavingTopic] = React.useState(false);

  // Estados de Manipulação de Tópicos (7)
  // Deleção
  const [topicToDelete, setTopicToDelete] = React.useState(null);

  // Renomeação
  const [topicToRename, setTopicToRename] = React.useState(null);
  const [newTopicName, setNewTopicName] = React.useState('');

  // Merge (mesclagem)
  const [topicsToMerge, setTopicsToMerge] = React.useState([]);

  // Split (divisão)
  const [topicToSplit, setTopicToSplit] = React.useState(null);
  const [splitNames, setSplitNames] = React.useState(['', '']);

  // Novo tópico
  const [newTopicData, setNewTopicData] = React.useState(null);

  // 🛠️ HANDLERS DE UI E PREPARAÇÃO (5)

  const prepareDeleteTopic = React.useCallback((topic) => {
    setTopicToDelete(topic);
  }, []);

  const prepareRenameTopic = React.useCallback((topic) => {
    setTopicToRename(topic);
    setNewTopicName(topic.title);
  }, []);

  const prepareMergeTopics = React.useCallback((topics) => {
    setTopicsToMerge(topics);
  }, []);

  const prepareSplitTopic = React.useCallback((topic) => {
    setTopicToSplit(topic);
    setSplitNames(['', '']);
  }, []);

  const prepareNewTopic = React.useCallback((category = 'MÉRITO') => {
    setNewTopicData({
      title: '',
      category: category,
      relatorio: '',
      fundamentacao: ''
    });
  }, []);

  // ✅ HANDLERS DE CONFIRMAÇÃO E OPERAÇÕES (3)

  const confirmDeleteTopic = React.useCallback(() => {
    if (!topicToDelete) return;

    setSelectedTopics(prev =>
      prev.filter(t => t.title !== topicToDelete.title)
    );
    setTopicToDelete(null);
  }, [topicToDelete]);

  const confirmRenameTopic = React.useCallback(() => {
    if (!topicToRename || !newTopicName.trim()) return;

    setSelectedTopics(prev =>
      prev.map(t =>
        t.title === topicToRename.title
          ? { ...t, title: newTopicName.trim() }
          : t
      )
    );
    setTopicToRename(null);
    setNewTopicName('');
  }, [topicToRename, newTopicName]);

  const confirmMergeTopics = React.useCallback((mergedTitle) => {
    if (topicsToMerge.length < 2 || !mergedTitle?.trim()) return;

    const titlesToMerge = topicsToMerge.map(t => t.title);
    const mergedContent = topicsToMerge
      .map(t => `[${t.title}]\n${t.relatorio || ''}\n${t.fundamentacao || ''}`)
      .join('\n\n---\n\n');

    setSelectedTopics(prev => {
      // Remove os tópicos a serem mesclados
      const filtered = prev.filter(t => !titlesToMerge.includes(t.title));
      // Adiciona o tópico mesclado
      return [...filtered, {
        title: mergedTitle.trim(),
        category: topicsToMerge[0].category,
        relatorio: mergedContent,
        fundamentacao: ''
      }];
    });

    setTopicsToMerge([]);
  }, [topicsToMerge]);

  const confirmSplitTopic = React.useCallback(() => {
    if (!topicToSplit || !splitNames[0]?.trim() || !splitNames[1]?.trim()) return;

    setSelectedTopics(prev => {
      // Remove o tópico original
      const filtered = prev.filter(t => t.title !== topicToSplit.title);
      // Adiciona os dois novos tópicos
      return [...filtered,
        {
          title: splitNames[0].trim(),
          category: topicToSplit.category,
          relatorio: '',
          fundamentacao: ''
        },
        {
          title: splitNames[1].trim(),
          category: topicToSplit.category,
          relatorio: '',
          fundamentacao: ''
        }
      ];
    });

    setTopicToSplit(null);
    setSplitNames(['', '']);
  }, [topicToSplit, splitNames]);

  const confirmNewTopic = React.useCallback(() => {
    if (!newTopicData || !newTopicData.title?.trim()) return;

    setSelectedTopics(prev => [...prev, {
      ...newTopicData,
      title: newTopicData.title.trim()
    }]);

    setNewTopicData(null);
  }, [newTopicData]);

  const cancelOperation = React.useCallback(() => {
    setTopicToDelete(null);
    setTopicToRename(null);
    setNewTopicName('');
    setTopicsToMerge([]);
    setTopicToSplit(null);
    setSplitNames(['', '']);
    setNewTopicData(null);
  }, []);

  const updateSelectedTopics = React.useCallback((topics) => {
    setSelectedTopics(topics);
  }, []);

  // Reordenar tópicos
  const reorderTopics = React.useCallback((fromIndex, toIndex) => {
    setSelectedTopics(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  // Atualizar conteúdo de um tópico
  const updateTopicContent = React.useCallback((title, field, value) => {
    setSelectedTopics(prev =>
      prev.map(t =>
        t.title === title
          ? { ...t, [field]: value }
          : t
      )
    );
  }, []);

  // 💾 MÉTODOS DE PERSISTÊNCIA (3)

  const serializeForPersistence = React.useCallback(() => {
    return {
      extractedTopics,
      selectedTopics,
      editingTopic,
      lastEditedTopicTitle
    };
  }, [extractedTopics, selectedTopics, editingTopic, lastEditedTopicTitle]);

  const restoreFromPersistence = React.useCallback((data) => {
    if (!data) return;

    if (data.extractedTopics) setExtractedTopics(data.extractedTopics);
    if (data.selectedTopics) setSelectedTopics(data.selectedTopics);
    if (data.editingTopic) setEditingTopic(data.editingTopic);
    if (data.lastEditedTopicTitle) setLastEditedTopicTitle(data.lastEditedTopicTitle);
  }, []);

  const clearAll = React.useCallback(() => {
    setExtractedTopics([]);
    setSelectedTopics([]);
    setEditingTopic(null);
    setLastEditedTopicTitle(null);
    setSavingTopic(false);
    setTopicToDelete(null);
    setTopicToRename(null);
    setNewTopicName('');
    setTopicsToMerge([]);
    setTopicToSplit(null);
    setSplitNames(['', '']);
    setNewTopicData(null);
  }, []);

  // 🎁 RETORNO DO HOOK
  return {
    // Estados Tópicos (2)
    extractedTopics,
    selectedTopics,

    // Estados Edição (3)
    editingTopic,
    lastEditedTopicTitle,
    topicContextScope,

    // Estados UI (1)
    savingTopic,

    // Estados Manipulação (7)
    topicToDelete,
    topicToRename,
    newTopicName,
    topicsToMerge,
    topicToSplit,
    splitNames,
    newTopicData,

    // Setters Tópicos (2)
    setExtractedTopics,
    setSelectedTopics,

    // Setters Edição (3)
    setEditingTopic,
    setLastEditedTopicTitle,
    setTopicContextScope,

    // Setters UI (1)
    setSavingTopic,

    // Setters Manipulação (7)
    setTopicToDelete,
    setTopicToRename,
    setNewTopicName,
    setTopicsToMerge,
    setTopicToSplit,
    setSplitNames,
    setNewTopicData,

    // Handlers de UI/Preparação (5)
    prepareDeleteTopic,
    prepareRenameTopic,
    prepareMergeTopics,
    prepareSplitTopic,
    prepareNewTopic,

    // Handlers de Confirmação (6)
    confirmDeleteTopic,
    confirmRenameTopic,
    confirmMergeTopics,
    confirmSplitTopic,
    confirmNewTopic,
    cancelOperation,

    // Handlers de Atualização (3)
    updateSelectedTopics,
    reorderTopics,
    updateTopicContent,

    // Métodos de Persistência (3)
    serializeForPersistence,
    restoreFromPersistence,
    clearAll
  };
};

export default useTopicManager;
