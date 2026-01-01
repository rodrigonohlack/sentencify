// Testes unitários para useModelPreview
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useModelPreview from './useModelPreview';

describe('useModelPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('deve iniciar com estado fechado', () => {
    const { result } = renderHook(() => useModelPreview());
    
    expect(result.current.isPreviewOpen).toBe(false);
    expect(result.current.previewingModel).toBe(null);
    expect(result.current.isEditing).toBe(false);
  });

  it('deve abrir preview com modelo válido', () => {
    const { result } = renderHook(() => useModelPreview());
    const modelo = { id: 1, title: 'Teste', content: '<p>Conteúdo</p>' };

    act(() => {
      result.current.openPreview(modelo);
    });

    expect(result.current.isPreviewOpen).toBe(true);
    expect(result.current.previewingModel).toEqual(modelo);
  });

  it('não deve abrir preview com modelo inválido (sem content)', () => {
    const { result } = renderHook(() => useModelPreview());
    const modeloInvalido = { id: 1, title: 'Teste' }; // sem content

    act(() => {
      result.current.openPreview(modeloInvalido);
    });

    expect(result.current.isPreviewOpen).toBe(false);
    expect(result.current.previewingModel).toBe(null);
  });

  it('não deve abrir preview com null', () => {
    const { result } = renderHook(() => useModelPreview());

    act(() => {
      result.current.openPreview(null);
    });

    expect(result.current.isPreviewOpen).toBe(false);
  });

  it('deve fechar preview e limpar estado', () => {
    const { result } = renderHook(() => useModelPreview());
    const modelo = { id: 1, title: 'Teste', content: '<p>Conteúdo</p>' };

    act(() => {
      result.current.openPreview(modelo);
    });

    act(() => {
      result.current.closePreview();
    });

    expect(result.current.isPreviewOpen).toBe(false);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.editedContent).toBe('');

    // Após o timeout, previewingModel deve ser null
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.previewingModel).toBe(null);
  });

  it('deve entrar em modo de edição', () => {
    const { result } = renderHook(() => useModelPreview());
    const modelo = { id: 1, title: 'Teste', content: '<p>Conteúdo editável</p>' };

    act(() => {
      result.current.openPreview(modelo);
    });

    act(() => {
      result.current.startEditing();
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.editedContent).toBe('<p>Conteúdo editável</p>');
  });

  it('deve cancelar edição', () => {
    const { result } = renderHook(() => useModelPreview());
    const modelo = { id: 1, title: 'Teste', content: '<p>Conteúdo</p>' };

    act(() => {
      result.current.openPreview(modelo);
      result.current.startEditing();
    });

    act(() => {
      result.current.cancelEditing();
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.editedContent).toBe('');
  });

  // v1.33.25: Teste crítico - contextualInsertFn como ref não deve causar re-render
  it('setContextualInsertFn deve usar ref (não causar mudança no objeto retornado)', () => {
    const { result, rerender } = renderHook(() => useModelPreview());
    
    const primeiroObjeto = result.current;
    
    act(() => {
      result.current.setContextualInsertFn(() => console.log('insert'));
    });

    rerender();
    
    // O objeto retornado pelo useMemo NÃO deve mudar quando setContextualInsertFn é chamado
    // (isso era o bug v1.33.25 - usava state em vez de ref)
    expect(result.current.contextualInsertFnRef).toBe(primeiroObjeto.contextualInsertFnRef);
  });

  it('contextualInsertFnRef deve armazenar a função corretamente', () => {
    const { result } = renderHook(() => useModelPreview());
    const mockFn = vi.fn();

    act(() => {
      result.current.setContextualInsertFn(mockFn);
    });

    expect(result.current.contextualInsertFnRef.current).toBe(mockFn);
    
    // Chamar a função armazenada
    result.current.contextualInsertFnRef.current('teste');
    expect(mockFn).toHaveBeenCalledWith('teste');
  });

  it('deve abrir SaveAsNew modal', () => {
    const { result } = renderHook(() => useModelPreview());
    const originalModel = { category: 'Preliminar', keywords: 'teste, modelo' };

    act(() => {
      result.current.openSaveAsNew('<p>Novo conteúdo</p>', originalModel);
    });

    expect(result.current.saveAsNewData).toEqual({
      title: '',
      content: '<p>Novo conteúdo</p>',
      keywords: 'teste, modelo',
      category: 'Preliminar'
    });
  });

  it('deve fechar SaveAsNew modal', () => {
    const { result } = renderHook(() => useModelPreview());

    act(() => {
      result.current.openSaveAsNew('<p>Conteúdo</p>', {});
    });

    act(() => {
      result.current.closeSaveAsNew();
    });

    expect(result.current.saveAsNewData).toBe(null);
  });

  it('deve usar categoria padrão "Mérito" quando não especificada', () => {
    const { result } = renderHook(() => useModelPreview());

    act(() => {
      result.current.openSaveAsNew('<p>Conteúdo</p>', null);
    });

    expect(result.current.saveAsNewData.category).toBe('Mérito');
  });
});
