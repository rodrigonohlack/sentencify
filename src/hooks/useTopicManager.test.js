// Testes para useTopicManager
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTopicManager from './useTopicManager';

// Dados de teste
const createMockTopic = (title, category = 'MÉRITO') => ({
  title,
  category,
  relatorio: `Relatório de ${title}`,
  fundamentacao: `Fundamentação de ${title}`
});

describe('useTopicManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Estado Inicial', () => {
    it('deve iniciar com extractedTopics vazio', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(result.current.extractedTopics).toEqual([]);
    });

    it('deve iniciar com selectedTopics vazio', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(result.current.selectedTopics).toEqual([]);
    });

    it('deve iniciar com editingTopic null', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(result.current.editingTopic).toBeNull();
    });

    it('deve iniciar com lastEditedTopicTitle null', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(result.current.lastEditedTopicTitle).toBeNull();
    });

    it('deve iniciar com topicContextScope "current"', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(result.current.topicContextScope).toBe('current');
    });

    it('deve iniciar com savingTopic false', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(result.current.savingTopic).toBe(false);
    });

    it('deve iniciar com topicToDelete null', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(result.current.topicToDelete).toBeNull();
    });

    it('deve iniciar com topicsToMerge vazio', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(result.current.topicsToMerge).toEqual([]);
    });

    it('deve iniciar com splitNames ["", ""]', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(result.current.splitNames).toEqual(['', '']);
    });

    it('deve iniciar com newTopicData null', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(result.current.newTopicData).toBeNull();
    });
  });

  describe('Preparação de Operações', () => {
    it('deve preparar deleção via prepareDeleteTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Danos Morais');

      act(() => {
        result.current.prepareDeleteTopic(topic);
      });

      expect(result.current.topicToDelete).toEqual(topic);
    });

    it('deve preparar renomeação via prepareRenameTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Horas Extras');

      act(() => {
        result.current.prepareRenameTopic(topic);
      });

      expect(result.current.topicToRename).toEqual(topic);
      expect(result.current.newTopicName).toBe('Horas Extras');
    });

    it('deve preparar merge via prepareMergeTopics', () => {
      const { result } = renderHook(() => useTopicManager());
      const topics = [
        createMockTopic('Tópico A'),
        createMockTopic('Tópico B')
      ];

      act(() => {
        result.current.prepareMergeTopics(topics);
      });

      expect(result.current.topicsToMerge).toEqual(topics);
    });

    it('deve preparar split via prepareSplitTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Tópico Composto');

      act(() => {
        result.current.prepareSplitTopic(topic);
      });

      expect(result.current.topicToSplit).toEqual(topic);
      expect(result.current.splitNames).toEqual(['', '']);
    });

    it('deve preparar novo tópico via prepareNewTopic', () => {
      const { result } = renderHook(() => useTopicManager());

      act(() => {
        result.current.prepareNewTopic('PRELIMINAR');
      });

      expect(result.current.newTopicData).toEqual({
        title: '',
        category: 'PRELIMINAR',
        relatorio: '',
        fundamentacao: ''
      });
    });

    it('deve usar MÉRITO como categoria padrão em prepareNewTopic', () => {
      const { result } = renderHook(() => useTopicManager());

      act(() => {
        result.current.prepareNewTopic();
      });

      expect(result.current.newTopicData.category).toBe('MÉRITO');
    });
  });

  describe('Confirmação de Deleção', () => {
    it('deve deletar tópico via confirmDeleteTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      const topics = [
        createMockTopic('Tópico A'),
        createMockTopic('Tópico B'),
        createMockTopic('Tópico C')
      ];

      act(() => {
        result.current.setSelectedTopics(topics);
      });

      act(() => {
        result.current.prepareDeleteTopic(topics[1]);
      });

      act(() => {
        result.current.confirmDeleteTopic();
      });

      expect(result.current.selectedTopics).toHaveLength(2);
      expect(result.current.selectedTopics.find(t => t.title === 'Tópico B')).toBeUndefined();
      expect(result.current.topicToDelete).toBeNull();
    });

    it('não deve fazer nada se topicToDelete for null', () => {
      const { result } = renderHook(() => useTopicManager());
      const topics = [createMockTopic('Tópico A')];

      act(() => {
        result.current.setSelectedTopics(topics);
      });

      act(() => {
        result.current.confirmDeleteTopic();
      });

      expect(result.current.selectedTopics).toHaveLength(1);
    });
  });

  describe('Confirmação de Renomeação', () => {
    it('deve renomear tópico via confirmRenameTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Nome Antigo');

      act(() => {
        result.current.setSelectedTopics([topic]);
      });

      act(() => {
        result.current.prepareRenameTopic(topic);
      });

      act(() => {
        result.current.setNewTopicName('Nome Novo');
      });

      act(() => {
        result.current.confirmRenameTopic();
      });

      expect(result.current.selectedTopics[0].title).toBe('Nome Novo');
      expect(result.current.topicToRename).toBeNull();
      expect(result.current.newTopicName).toBe('');
    });

    it('não deve renomear com nome vazio', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Nome Original');

      act(() => {
        result.current.setSelectedTopics([topic]);
      });

      act(() => {
        result.current.prepareRenameTopic(topic);
      });

      act(() => {
        result.current.setNewTopicName('   ');
      });

      act(() => {
        result.current.confirmRenameTopic();
      });

      expect(result.current.selectedTopics[0].title).toBe('Nome Original');
    });
  });

  describe('Confirmação de Merge', () => {
    it('deve mesclar tópicos via confirmMergeTopics', () => {
      const { result } = renderHook(() => useTopicManager());
      const topics = [
        createMockTopic('Tópico A'),
        createMockTopic('Tópico B'),
        createMockTopic('Tópico C')
      ];

      act(() => {
        result.current.setSelectedTopics(topics);
      });

      act(() => {
        result.current.prepareMergeTopics([topics[0], topics[1]]);
      });

      act(() => {
        result.current.confirmMergeTopics('Tópicos A e B Mesclados');
      });

      expect(result.current.selectedTopics).toHaveLength(2);
      expect(result.current.selectedTopics.find(t => t.title === 'Tópicos A e B Mesclados')).toBeDefined();
      expect(result.current.selectedTopics.find(t => t.title === 'Tópico C')).toBeDefined();
      expect(result.current.topicsToMerge).toEqual([]);
    });

    it('não deve mesclar com menos de 2 tópicos', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Único');

      act(() => {
        result.current.setSelectedTopics([topic]);
        result.current.prepareMergeTopics([topic]);
      });

      act(() => {
        result.current.confirmMergeTopics('Mesclado');
      });

      expect(result.current.selectedTopics).toHaveLength(1);
      expect(result.current.selectedTopics[0].title).toBe('Único');
    });

    it('não deve mesclar sem título', () => {
      const { result } = renderHook(() => useTopicManager());
      const topics = [createMockTopic('A'), createMockTopic('B')];

      act(() => {
        result.current.setSelectedTopics(topics);
        result.current.prepareMergeTopics(topics);
      });

      act(() => {
        result.current.confirmMergeTopics('');
      });

      expect(result.current.selectedTopics).toHaveLength(2);
    });
  });

  describe('Confirmação de Split', () => {
    it('deve dividir tópico via confirmSplitTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Tópico Original', 'PRELIMINAR');

      act(() => {
        result.current.setSelectedTopics([topic]);
      });

      act(() => {
        result.current.prepareSplitTopic(topic);
      });

      act(() => {
        result.current.setSplitNames(['Parte A', 'Parte B']);
      });

      act(() => {
        result.current.confirmSplitTopic();
      });

      expect(result.current.selectedTopics).toHaveLength(2);
      expect(result.current.selectedTopics.find(t => t.title === 'Parte A')).toBeDefined();
      expect(result.current.selectedTopics.find(t => t.title === 'Parte B')).toBeDefined();
      expect(result.current.selectedTopics[0].category).toBe('PRELIMINAR');
      expect(result.current.topicToSplit).toBeNull();
    });

    it('não deve dividir sem nomes válidos', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Original');

      act(() => {
        result.current.setSelectedTopics([topic]);
        result.current.prepareSplitTopic(topic);
      });

      act(() => {
        result.current.confirmSplitTopic();
      });

      expect(result.current.selectedTopics).toHaveLength(1);
      expect(result.current.selectedTopics[0].title).toBe('Original');
    });
  });

  describe('Confirmação de Novo Tópico', () => {
    it('deve adicionar novo tópico via confirmNewTopic', () => {
      const { result } = renderHook(() => useTopicManager());

      act(() => {
        result.current.prepareNewTopic('MÉRITO');
      });

      act(() => {
        result.current.setNewTopicData({
          title: 'Novo Tópico',
          category: 'MÉRITO',
          relatorio: '',
          fundamentacao: ''
        });
      });

      act(() => {
        result.current.confirmNewTopic();
      });

      expect(result.current.selectedTopics).toHaveLength(1);
      expect(result.current.selectedTopics[0].title).toBe('Novo Tópico');
      expect(result.current.newTopicData).toBeNull();
    });

    it('não deve adicionar tópico sem título', () => {
      const { result } = renderHook(() => useTopicManager());

      act(() => {
        result.current.prepareNewTopic();
      });

      act(() => {
        result.current.confirmNewTopic();
      });

      expect(result.current.selectedTopics).toHaveLength(0);
    });
  });

  describe('Cancelar Operação', () => {
    it('deve limpar todos os estados de operação via cancelOperation', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Teste');

      act(() => {
        result.current.prepareDeleteTopic(topic);
        result.current.prepareRenameTopic(topic);
        result.current.prepareMergeTopics([topic]);
        result.current.prepareSplitTopic(topic);
        result.current.prepareNewTopic();
      });

      act(() => {
        result.current.cancelOperation();
      });

      expect(result.current.topicToDelete).toBeNull();
      expect(result.current.topicToRename).toBeNull();
      expect(result.current.newTopicName).toBe('');
      expect(result.current.topicsToMerge).toEqual([]);
      expect(result.current.topicToSplit).toBeNull();
      expect(result.current.splitNames).toEqual(['', '']);
      expect(result.current.newTopicData).toBeNull();
    });
  });

  describe('Atualização de Tópicos', () => {
    it('deve atualizar selectedTopics via updateSelectedTopics', () => {
      const { result } = renderHook(() => useTopicManager());
      const topics = [createMockTopic('A'), createMockTopic('B')];

      act(() => {
        result.current.updateSelectedTopics(topics);
      });

      expect(result.current.selectedTopics).toEqual(topics);
    });

    it('deve reordenar tópicos via reorderTopics', () => {
      const { result } = renderHook(() => useTopicManager());
      const topics = [
        createMockTopic('Primeiro'),
        createMockTopic('Segundo'),
        createMockTopic('Terceiro')
      ];

      act(() => {
        result.current.setSelectedTopics(topics);
      });

      act(() => {
        result.current.reorderTopics(0, 2);
      });

      expect(result.current.selectedTopics[0].title).toBe('Segundo');
      expect(result.current.selectedTopics[1].title).toBe('Terceiro');
      expect(result.current.selectedTopics[2].title).toBe('Primeiro');
    });

    it('deve atualizar conteúdo via updateTopicContent', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Teste');

      act(() => {
        result.current.setSelectedTopics([topic]);
      });

      act(() => {
        result.current.updateTopicContent('Teste', 'fundamentacao', 'Nova fundamentação');
      });

      expect(result.current.selectedTopics[0].fundamentacao).toBe('Nova fundamentação');
    });

    it('deve atualizar apenas o tópico correto', () => {
      const { result } = renderHook(() => useTopicManager());
      const topics = [createMockTopic('A'), createMockTopic('B')];

      act(() => {
        result.current.setSelectedTopics(topics);
      });

      act(() => {
        result.current.updateTopicContent('A', 'relatorio', 'Novo relatório');
      });

      expect(result.current.selectedTopics[0].relatorio).toBe('Novo relatório');
      expect(result.current.selectedTopics[1].relatorio).toBe('Relatório de B');
    });
  });

  describe('Persistência', () => {
    it('deve serializar estado via serializeForPersistence', () => {
      const { result } = renderHook(() => useTopicManager());
      const topics = [createMockTopic('Teste')];

      act(() => {
        result.current.setExtractedTopics(topics);
        result.current.setSelectedTopics(topics);
        result.current.setEditingTopic(topics[0]);
        result.current.setLastEditedTopicTitle('Teste');
      });

      const serialized = result.current.serializeForPersistence();

      expect(serialized.extractedTopics).toEqual(topics);
      expect(serialized.selectedTopics).toEqual(topics);
      expect(serialized.editingTopic).toEqual(topics[0]);
      expect(serialized.lastEditedTopicTitle).toBe('Teste');
    });

    it('deve restaurar estado via restoreFromPersistence', () => {
      const { result } = renderHook(() => useTopicManager());
      const savedData = {
        extractedTopics: [createMockTopic('Extraído')],
        selectedTopics: [createMockTopic('Selecionado')],
        editingTopic: createMockTopic('Editando'),
        lastEditedTopicTitle: 'Último'
      };

      act(() => {
        result.current.restoreFromPersistence(savedData);
      });

      expect(result.current.extractedTopics).toEqual(savedData.extractedTopics);
      expect(result.current.selectedTopics).toEqual(savedData.selectedTopics);
      expect(result.current.editingTopic).toEqual(savedData.editingTopic);
      expect(result.current.lastEditedTopicTitle).toBe('Último');
    });

    it('deve ignorar dados nulos no restore', () => {
      const { result } = renderHook(() => useTopicManager());

      act(() => {
        result.current.restoreFromPersistence(null);
      });

      expect(result.current.extractedTopics).toEqual([]);
      expect(result.current.selectedTopics).toEqual([]);
    });

    it('deve restaurar parcialmente', () => {
      const { result } = renderHook(() => useTopicManager());

      act(() => {
        result.current.restoreFromPersistence({
          selectedTopics: [createMockTopic('Parcial')]
        });
      });

      expect(result.current.selectedTopics).toHaveLength(1);
      expect(result.current.extractedTopics).toEqual([]);
    });
  });

  describe('Clear All', () => {
    it('deve limpar todo estado via clearAll', () => {
      const { result } = renderHook(() => useTopicManager());
      const topic = createMockTopic('Teste');

      act(() => {
        result.current.setExtractedTopics([topic]);
        result.current.setSelectedTopics([topic]);
        result.current.setEditingTopic(topic);
        result.current.setLastEditedTopicTitle('Teste');
        result.current.setSavingTopic(true);
        result.current.prepareDeleteTopic(topic);
        result.current.prepareNewTopic();
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.extractedTopics).toEqual([]);
      expect(result.current.selectedTopics).toEqual([]);
      expect(result.current.editingTopic).toBeNull();
      expect(result.current.lastEditedTopicTitle).toBeNull();
      expect(result.current.savingTopic).toBe(false);
      expect(result.current.topicToDelete).toBeNull();
      expect(result.current.newTopicData).toBeNull();
    });
  });

  describe('Estabilidade de Referências', () => {
    it('prepareDeleteTopic deve ser estável', () => {
      const { result, rerender } = renderHook(() => useTopicManager());
      const firstRef = result.current.prepareDeleteTopic;

      rerender();

      expect(result.current.prepareDeleteTopic).toBe(firstRef);
    });

    it('cancelOperation deve ser estável', () => {
      const { result, rerender } = renderHook(() => useTopicManager());
      const firstRef = result.current.cancelOperation;

      rerender();

      expect(result.current.cancelOperation).toBe(firstRef);
    });

    it('clearAll deve ser estável', () => {
      const { result, rerender } = renderHook(() => useTopicManager());
      const firstRef = result.current.clearAll;

      rerender();

      expect(result.current.clearAll).toBe(firstRef);
    });

    it('reorderTopics deve ser estável', () => {
      const { result, rerender } = renderHook(() => useTopicManager());
      const firstRef = result.current.reorderTopics;

      rerender();

      expect(result.current.reorderTopics).toBe(firstRef);
    });

    it('updateTopicContent deve ser estável', () => {
      const { result, rerender } = renderHook(() => useTopicManager());
      const firstRef = result.current.updateTopicContent;

      rerender();

      expect(result.current.updateTopicContent).toBe(firstRef);
    });
  });
});
