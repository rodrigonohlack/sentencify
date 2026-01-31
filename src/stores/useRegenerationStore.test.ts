/**
 * @file useRegenerationStore.test.ts
 * @description Testes completos para o store de regeneração de relatório/dispositivo
 * @version 1.40.05
 *
 * Cobre: relatorioInstruction, regeneratingRelatorio, dispositivoInstruction,
 * regeneratingDispositivo, progressMessage, actions e selectors.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useRegenerationStore,
  selectRelatorioInstruction,
  selectRegeneratingRelatorio,
  selectDispositivoInstruction,
  selectRegeneratingDispositivo,
  selectIsRegenerating,
  selectProgressMessage,
} from './useRegenerationStore';

describe('useRegenerationStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useRegenerationStore.getState().resetAll();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      const state = useRegenerationStore.getState();

      expect(state.relatorioInstruction).toBe('');
      expect(state.regeneratingRelatorio).toBe(false);
      expect(state.dispositivoInstruction).toBe('');
      expect(state.regeneratingDispositivo).toBe(false);
      expect(state.progressMessage).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RELATÓRIO INSTRUCTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Relatório Instruction', () => {
    it('should set relatório instruction', () => {
      useRegenerationStore.getState().setRelatorioInstruction('Inclua mais detalhes sobre as alegações');

      expect(useRegenerationStore.getState().relatorioInstruction).toBe('Inclua mais detalhes sobre as alegações');
    });

    it('should update relatório instruction', () => {
      useRegenerationStore.getState().setRelatorioInstruction('Instrução inicial');
      useRegenerationStore.getState().setRelatorioInstruction('Instrução atualizada');

      expect(useRegenerationStore.getState().relatorioInstruction).toBe('Instrução atualizada');
    });

    it('should clear relatório instruction by setting empty string', () => {
      useRegenerationStore.getState().setRelatorioInstruction('Alguma instrução');
      useRegenerationStore.getState().setRelatorioInstruction('');

      expect(useRegenerationStore.getState().relatorioInstruction).toBe('');
    });

    it('should handle long instruction text', () => {
      const longInstruction = 'A'.repeat(1000);
      useRegenerationStore.getState().setRelatorioInstruction(longInstruction);

      expect(useRegenerationStore.getState().relatorioInstruction).toBe(longInstruction);
      expect(useRegenerationStore.getState().relatorioInstruction.length).toBe(1000);
    });

    it('should handle special characters in instruction', () => {
      const specialInstruction = 'Inclua "citações" e caracteres especiais: áéíóú ñ € @#$%';
      useRegenerationStore.getState().setRelatorioInstruction(specialInstruction);

      expect(useRegenerationStore.getState().relatorioInstruction).toBe(specialInstruction);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REGENERATING RELATÓRIO TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Regenerating Relatório', () => {
    it('should set regeneratingRelatorio to true', () => {
      useRegenerationStore.getState().setRegeneratingRelatorio(true);

      expect(useRegenerationStore.getState().regeneratingRelatorio).toBe(true);
    });

    it('should set regeneratingRelatorio to false', () => {
      useRegenerationStore.getState().setRegeneratingRelatorio(true);
      useRegenerationStore.getState().setRegeneratingRelatorio(false);

      expect(useRegenerationStore.getState().regeneratingRelatorio).toBe(false);
    });

    it('should toggle regeneratingRelatorio multiple times', () => {
      useRegenerationStore.getState().setRegeneratingRelatorio(true);
      expect(useRegenerationStore.getState().regeneratingRelatorio).toBe(true);

      useRegenerationStore.getState().setRegeneratingRelatorio(false);
      expect(useRegenerationStore.getState().regeneratingRelatorio).toBe(false);

      useRegenerationStore.getState().setRegeneratingRelatorio(true);
      expect(useRegenerationStore.getState().regeneratingRelatorio).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSITIVO INSTRUCTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dispositivo Instruction', () => {
    it('should set dispositivo instruction', () => {
      useRegenerationStore.getState().setDispositivoInstruction('Ajuste o formato do dispositivo');

      expect(useRegenerationStore.getState().dispositivoInstruction).toBe('Ajuste o formato do dispositivo');
    });

    it('should update dispositivo instruction', () => {
      useRegenerationStore.getState().setDispositivoInstruction('Instrução inicial');
      useRegenerationStore.getState().setDispositivoInstruction('Instrução atualizada');

      expect(useRegenerationStore.getState().dispositivoInstruction).toBe('Instrução atualizada');
    });

    it('should clear dispositivo instruction by setting empty string', () => {
      useRegenerationStore.getState().setDispositivoInstruction('Alguma instrução');
      useRegenerationStore.getState().setDispositivoInstruction('');

      expect(useRegenerationStore.getState().dispositivoInstruction).toBe('');
    });

    it('should handle multiline instruction', () => {
      const multilineInstruction = 'Linha 1\nLinha 2\nLinha 3';
      useRegenerationStore.getState().setDispositivoInstruction(multilineInstruction);

      expect(useRegenerationStore.getState().dispositivoInstruction).toBe(multilineInstruction);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REGENERATING DISPOSITIVO TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Regenerating Dispositivo', () => {
    it('should set regeneratingDispositivo to true', () => {
      useRegenerationStore.getState().setRegeneratingDispositivo(true);

      expect(useRegenerationStore.getState().regeneratingDispositivo).toBe(true);
    });

    it('should set regeneratingDispositivo to false', () => {
      useRegenerationStore.getState().setRegeneratingDispositivo(true);
      useRegenerationStore.getState().setRegeneratingDispositivo(false);

      expect(useRegenerationStore.getState().regeneratingDispositivo).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS MESSAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Progress Message', () => {
    it('should set progress message', () => {
      useRegenerationStore.getState().setProgressMessage('Gerando relatório...');

      expect(useRegenerationStore.getState().progressMessage).toBe('Gerando relatório...');
    });

    it('should update progress message', () => {
      useRegenerationStore.getState().setProgressMessage('Iniciando...');
      useRegenerationStore.getState().setProgressMessage('Processando documentos...');
      useRegenerationStore.getState().setProgressMessage('Finalizando...');

      expect(useRegenerationStore.getState().progressMessage).toBe('Finalizando...');
    });

    it('should clear progress message', () => {
      useRegenerationStore.getState().setProgressMessage('Alguma mensagem');
      useRegenerationStore.getState().setProgressMessage('');

      expect(useRegenerationStore.getState().progressMessage).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET INSTRUCTIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Reset Instructions', () => {
    it('should reset both instructions', () => {
      useRegenerationStore.getState().setRelatorioInstruction('Instrução relatório');
      useRegenerationStore.getState().setDispositivoInstruction('Instrução dispositivo');

      useRegenerationStore.getState().resetInstructions();

      const state = useRegenerationStore.getState();
      expect(state.relatorioInstruction).toBe('');
      expect(state.dispositivoInstruction).toBe('');
    });

    it('should NOT reset regenerating states', () => {
      useRegenerationStore.getState().setRelatorioInstruction('Instrução');
      useRegenerationStore.getState().setRegeneratingRelatorio(true);
      useRegenerationStore.getState().setRegeneratingDispositivo(true);

      useRegenerationStore.getState().resetInstructions();

      const state = useRegenerationStore.getState();
      expect(state.regeneratingRelatorio).toBe(true);
      expect(state.regeneratingDispositivo).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET ALL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Reset All', () => {
    it('should reset all state to initial values', () => {
      useRegenerationStore.getState().setRelatorioInstruction('Instrução relatório');
      useRegenerationStore.getState().setRegeneratingRelatorio(true);
      useRegenerationStore.getState().setDispositivoInstruction('Instrução dispositivo');
      useRegenerationStore.getState().setRegeneratingDispositivo(true);
      useRegenerationStore.getState().setProgressMessage('Em progresso');

      useRegenerationStore.getState().resetAll();

      const state = useRegenerationStore.getState();
      expect(state.relatorioInstruction).toBe('');
      expect(state.regeneratingRelatorio).toBe(false);
      expect(state.dispositivoInstruction).toBe('');
      expect(state.regeneratingDispositivo).toBe(false);
      expect(state.progressMessage).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTOR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Selectors', () => {
    it('selectRelatorioInstruction should return correct instruction', () => {
      useRegenerationStore.getState().setRelatorioInstruction('Teste');

      const instruction = selectRelatorioInstruction(useRegenerationStore.getState());
      expect(instruction).toBe('Teste');
    });

    it('selectRegeneratingRelatorio should return correct state', () => {
      useRegenerationStore.getState().setRegeneratingRelatorio(true);

      const regenerating = selectRegeneratingRelatorio(useRegenerationStore.getState());
      expect(regenerating).toBe(true);
    });

    it('selectDispositivoInstruction should return correct instruction', () => {
      useRegenerationStore.getState().setDispositivoInstruction('Teste dispositivo');

      const instruction = selectDispositivoInstruction(useRegenerationStore.getState());
      expect(instruction).toBe('Teste dispositivo');
    });

    it('selectRegeneratingDispositivo should return correct state', () => {
      useRegenerationStore.getState().setRegeneratingDispositivo(true);

      const regenerating = selectRegeneratingDispositivo(useRegenerationStore.getState());
      expect(regenerating).toBe(true);
    });

    it('selectProgressMessage should return correct message', () => {
      useRegenerationStore.getState().setProgressMessage('Processando...');

      const message = selectProgressMessage(useRegenerationStore.getState());
      expect(message).toBe('Processando...');
    });

    describe('selectIsRegenerating', () => {
      it('should return false when nothing is regenerating', () => {
        const isRegenerating = selectIsRegenerating(useRegenerationStore.getState());
        expect(isRegenerating).toBe(false);
      });

      it('should return true when only relatório is regenerating', () => {
        useRegenerationStore.getState().setRegeneratingRelatorio(true);

        const isRegenerating = selectIsRegenerating(useRegenerationStore.getState());
        expect(isRegenerating).toBe(true);
      });

      it('should return true when only dispositivo is regenerating', () => {
        useRegenerationStore.getState().setRegeneratingDispositivo(true);

        const isRegenerating = selectIsRegenerating(useRegenerationStore.getState());
        expect(isRegenerating).toBe(true);
      });

      it('should return true when both are regenerating', () => {
        useRegenerationStore.getState().setRegeneratingRelatorio(true);
        useRegenerationStore.getState().setRegeneratingDispositivo(true);

        const isRegenerating = selectIsRegenerating(useRegenerationStore.getState());
        expect(isRegenerating).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMBINED STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Combined State', () => {
    it('should handle relatório regeneration workflow', () => {
      // Set instruction
      useRegenerationStore.getState().setRelatorioInstruction('Inclua mais detalhes');
      expect(useRegenerationStore.getState().relatorioInstruction).toBe('Inclua mais detalhes');

      // Start regeneration
      useRegenerationStore.getState().setRegeneratingRelatorio(true);
      useRegenerationStore.getState().setProgressMessage('Gerando relatório...');
      expect(useRegenerationStore.getState().regeneratingRelatorio).toBe(true);
      expect(useRegenerationStore.getState().progressMessage).toBe('Gerando relatório...');

      // Complete regeneration
      useRegenerationStore.getState().setRegeneratingRelatorio(false);
      useRegenerationStore.getState().setProgressMessage('');
      expect(useRegenerationStore.getState().regeneratingRelatorio).toBe(false);
      expect(useRegenerationStore.getState().progressMessage).toBe('');
    });

    it('should handle dispositivo regeneration workflow', () => {
      // Set instruction
      useRegenerationStore.getState().setDispositivoInstruction('Ajuste o formato');
      expect(useRegenerationStore.getState().dispositivoInstruction).toBe('Ajuste o formato');

      // Start regeneration
      useRegenerationStore.getState().setRegeneratingDispositivo(true);
      useRegenerationStore.getState().setProgressMessage('Gerando dispositivo...');
      expect(useRegenerationStore.getState().regeneratingDispositivo).toBe(true);

      // Complete regeneration
      useRegenerationStore.getState().setRegeneratingDispositivo(false);
      useRegenerationStore.getState().setProgressMessage('');
      expect(useRegenerationStore.getState().regeneratingDispositivo).toBe(false);
    });

    it('should handle concurrent regenerations', () => {
      // Start both regenerations
      useRegenerationStore.getState().setRelatorioInstruction('Instrução relatório');
      useRegenerationStore.getState().setDispositivoInstruction('Instrução dispositivo');
      useRegenerationStore.getState().setRegeneratingRelatorio(true);
      useRegenerationStore.getState().setRegeneratingDispositivo(true);

      const state = useRegenerationStore.getState();
      expect(state.regeneratingRelatorio).toBe(true);
      expect(state.regeneratingDispositivo).toBe(true);
      expect(selectIsRegenerating(state)).toBe(true);

      // Complete relatório
      useRegenerationStore.getState().setRegeneratingRelatorio(false);
      expect(selectIsRegenerating(useRegenerationStore.getState())).toBe(true); // dispositivo still running

      // Complete dispositivo
      useRegenerationStore.getState().setRegeneratingDispositivo(false);
      expect(selectIsRegenerating(useRegenerationStore.getState())).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE INDEPENDENCE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('State Independence', () => {
    it('relatório state should not affect dispositivo state', () => {
      useRegenerationStore.getState().setRelatorioInstruction('Relatório instrução');
      useRegenerationStore.getState().setRegeneratingRelatorio(true);

      const state = useRegenerationStore.getState();
      expect(state.dispositivoInstruction).toBe('');
      expect(state.regeneratingDispositivo).toBe(false);
    });

    it('dispositivo state should not affect relatório state', () => {
      useRegenerationStore.getState().setDispositivoInstruction('Dispositivo instrução');
      useRegenerationStore.getState().setRegeneratingDispositivo(true);

      const state = useRegenerationStore.getState();
      expect(state.relatorioInstruction).toBe('');
      expect(state.regeneratingRelatorio).toBe(false);
    });
  });
});
