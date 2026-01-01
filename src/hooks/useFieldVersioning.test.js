// Testes unitários para useFieldVersioning
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import useFieldVersioning from './useFieldVersioning';

describe('useFieldVersioning', () => {
  beforeEach(() => {
    // Limpar IndexedDB antes de cada teste
    indexedDB.deleteDatabase('sentencify-versions');
  });

  it('deve retornar funções saveVersion, getVersions e restoreVersion', () => {
    const { result } = renderHook(() => useFieldVersioning());
    
    expect(typeof result.current.saveVersion).toBe('function');
    expect(typeof result.current.getVersions).toBe('function');
    expect(typeof result.current.restoreVersion).toBe('function');
  });

  it('deve salvar uma versão no IndexedDB', async () => {
    const { result } = renderHook(() => useFieldVersioning());
    
    await act(async () => {
      await result.current.saveVersion('DANOS MORAIS', '<p>Fundamentação inicial</p>');
    });

    const versions = await result.current.getVersions('DANOS MORAIS');
    expect(versions).toHaveLength(1);
    expect(versions[0].content).toBe('<p>Fundamentação inicial</p>');
    expect(versions[0].topicTitle).toBe('DANOS MORAIS');
  });

  it('não deve salvar se topicTitle for vazio', async () => {
    const { result } = renderHook(() => useFieldVersioning());
    
    await act(async () => {
      await result.current.saveVersion('', '<p>Conteúdo</p>');
    });

    const versions = await result.current.getVersions('');
    expect(versions).toHaveLength(0);
  });

  it('não deve salvar se content for vazio', async () => {
    const { result } = renderHook(() => useFieldVersioning());
    
    await act(async () => {
      await result.current.saveVersion('DANOS MORAIS', '');
    });

    const versions = await result.current.getVersions('DANOS MORAIS');
    expect(versions).toHaveLength(0);
  });

  it('não deve duplicar versão se conteúdo for igual ao último', async () => {
    const { result } = renderHook(() => useFieldVersioning());
    const content = '<p>Mesmo conteúdo</p>';
    
    await act(async () => {
      await result.current.saveVersion('DANOS MORAIS', content);
      await result.current.saveVersion('DANOS MORAIS', content); // Mesmo conteúdo
    });

    const versions = await result.current.getVersions('DANOS MORAIS');
    expect(versions).toHaveLength(1); // Apenas 1, não 2
  });

  it('deve salvar múltiplas versões com conteúdos diferentes', async () => {
    const { result } = renderHook(() => useFieldVersioning());
    
    await act(async () => {
      await result.current.saveVersion('HORAS EXTRAS', '<p>Versão 1</p>');
      await result.current.saveVersion('HORAS EXTRAS', '<p>Versão 2</p>');
      await result.current.saveVersion('HORAS EXTRAS', '<p>Versão 3</p>');
    });

    const versions = await result.current.getVersions('HORAS EXTRAS');
    expect(versions).toHaveLength(3);
  });

  it('deve retornar versões ordenadas por timestamp (mais recente primeiro)', async () => {
    const { result } = renderHook(() => useFieldVersioning());
    
    await act(async () => {
      await result.current.saveVersion('AVISO PRÉVIO', '<p>Primeira</p>');
      await new Promise(r => setTimeout(r, 10)); // Pequeno delay
      await result.current.saveVersion('AVISO PRÉVIO', '<p>Segunda</p>');
      await new Promise(r => setTimeout(r, 10));
      await result.current.saveVersion('AVISO PRÉVIO', '<p>Terceira</p>');
    });

    const versions = await result.current.getVersions('AVISO PRÉVIO');
    expect(versions[0].content).toBe('<p>Terceira</p>'); // Mais recente
    expect(versions[2].content).toBe('<p>Primeira</p>'); // Mais antiga
  });

  it('deve restaurar versão e salvar atual antes', async () => {
    const { result } = renderHook(() => useFieldVersioning());
    
    await act(async () => {
      await result.current.saveVersion('FGTS', '<p>Versão antiga</p>');
    });

    const versionsAntes = await result.current.getVersions('FGTS');
    const versionId = versionsAntes[0].id;

    let restored;
    await act(async () => {
      restored = await result.current.restoreVersion(
        versionId, 
        '<p>Versão atual que será salva</p>', 
        'FGTS'
      );
    });

    expect(restored).toBe('<p>Versão antiga</p>');
    
    // Deve ter salvado a versão atual antes de restaurar
    const versionsDepois = await result.current.getVersions('FGTS');
    expect(versionsDepois).toHaveLength(2);
  });

  it('deve criar preview sem HTML (stripHtml)', async () => {
    const { result } = renderHook(() => useFieldVersioning());
    const htmlContent = '<p><strong>Texto</strong> com <em>formatação</em></p>';
    
    await act(async () => {
      await result.current.saveVersion('FÉRIAS', htmlContent);
    });

    const versions = await result.current.getVersions('FÉRIAS');
    expect(versions[0].preview).toBe('Texto com formatação');
  });

  it('deve limitar preview a 100 caracteres', async () => {
    const { result } = renderHook(() => useFieldVersioning());
    const longContent = '<p>' + 'A'.repeat(200) + '</p>';
    
    await act(async () => {
      await result.current.saveVersion('MULTA', longContent);
    });

    const versions = await result.current.getVersions('MULTA');
    expect(versions[0].preview.length).toBe(100);
  });

  // v1.33.22: Teste crítico - useMemo deve manter identidade estável
  it('useMemo deve manter identidade estável do objeto retornado', () => {
    const { result, rerender } = renderHook(() => useFieldVersioning());
    
    const primeiroObjeto = result.current;
    
    rerender();
    
    // As funções devem ter a mesma identidade (não recriadas)
    expect(result.current.saveVersion).toBe(primeiroObjeto.saveVersion);
    expect(result.current.getVersions).toBe(primeiroObjeto.getVersions);
    expect(result.current.restoreVersion).toBe(primeiroObjeto.restoreVersion);
  });

  it('deve retornar array vazio para tópico inexistente', async () => {
    const { result } = renderHook(() => useFieldVersioning());
    
    const versions = await result.current.getVersions('TOPICO_INEXISTENTE');
    expect(versions).toEqual([]);
  });
});
