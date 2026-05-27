# Import de JSON no subapp Prova Oral + skill geradora — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar import de JSON no subapp Prova Oral (validador + modal + botão) e criar a skill `analise-prova-oral-json` que gera esse JSON.

**Architecture:** Espelha o par já existente no Analisador. Um validador puro (`import-validation.ts`) é a especificação executável do contrato `ProvaOralResult`/`SavedProvaOralAnalysis`; um modal (`ImportJsonModal`) faz upload→validação→`createAnalysis`→`loadAnalysis`; a skill gera JSON que satisfaz esse mesmo contrato, reaproveitando a metodologia da skill `analise-prova-oral`.

**Tech Stack:** React + TypeScript, Zustand, Vitest, Tailwind (temas claro/escuro via `dark:`). Skill em Markdown no Claude Code.

**Spec:** `docs/superpowers/specs/2026-05-26-prova-oral-import-json-design.md`

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---------|------|------------------|
| `src/apps/prova-oral/utils/import-validation.ts` | Criar | Validar/normalizar JSON → payload `{resultado, transcricao, sinteseProcesso}` |
| `src/apps/prova-oral/utils/import-validation.test.ts` | Criar | Testes unitários do validador |
| `src/apps/prova-oral/components/input/ImportJsonModal.tsx` | Criar | UI de upload + preview + disparo do import |
| `src/apps/prova-oral/components/input/index.ts` | Modificar | Exportar `ImportJsonModal` |
| `src/apps/prova-oral/components/input/InputForm.tsx` | Modificar | Botão "Importar JSON" no card de Transcrição |
| `src/constants/app-version.ts` | Modificar | Bump APP_VERSION → 1.47.0 |
| `package.json` | Modificar | Bump version → 1.47.0 |
| `CLAUDE.md` | Modificar | Bump versão (linha 7) |
| `src/constants/changelog.js` | Modificar | Entrada da v1.47.0 |
| `~/.claude/skills/analise-prova-oral-json/references/json-schema.md` | Criar | Schema anotado do `ProvaOralResult` |
| `~/.claude/skills/analise-prova-oral-json/SKILL.md` | Criar | Skill geradora de JSON |

> **Nota de ambiente:** o subapp tem um `utils/` próprio? Não — criar a pasta `src/apps/prova-oral/utils/` é parte da Task 1.

---

## Task 1: Validador `import-validation.ts` (TDD)

**Files:**
- Create: `src/apps/prova-oral/utils/import-validation.ts`
- Test: `src/apps/prova-oral/utils/import-validation.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/apps/prova-oral/utils/import-validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateProvaOralImport } from './import-validation';

const validResultado = {
  processo: { numero: '0001', reclamante: 'A', reclamada: 'B', vara: '1ª VT' },
  depoentes: [{ id: 'dep-1', nome: 'Fulano', qualificacao: 'autor' }],
  sinteses: [{ deponenteId: 'dep-1', conteudo: [{ texto: 'afirmou X', timestamp: '1m 10s' }] }],
  analises: [{ titulo: 'Horas extras', conclusao: 'Procedente', status: 'favoravel-autor' }],
  contradicoes: [],
  confissoes: [],
  credibilidade: [{ deponenteId: 'dep-1', pontuacao: 4 }],
};

describe('validateProvaOralImport', () => {
  it('aceita JSON wrapped (SavedProvaOralAnalysis) e extrai transcricao/sinteseProcesso', () => {
    const wrapped = {
      id: 'x', createdAt: '', updatedAt: '',
      transcricao: 'texto bruto', sinteseProcesso: 'sintese da inicial',
      resultado: validResultado,
    };
    const r = validateProvaOralImport(wrapped);
    expect(r.valid).toBe(true);
    expect(r.payload?.transcricao).toBe('texto bruto');
    expect(r.payload?.sinteseProcesso).toBe('sintese da inicial');
    expect(r.payload?.resultado.depoentes).toHaveLength(1);
  });

  it('aceita ProvaOralResult cru e avisa transcrição vazia', () => {
    const r = validateProvaOralImport(validResultado);
    expect(r.valid).toBe(true);
    expect(r.payload?.transcricao).toBe('');
    expect(r.warnings.some((w) => w.includes('transcrição'))).toBe(true);
  });

  it('garante os 6 arrays nucleares mesmo se ausentes', () => {
    const r = validateProvaOralImport({
      processo: {}, depoentes: [{ id: 'd1', nome: 'X', qualificacao: 'preposto' }],
    });
    expect(r.valid).toBe(true);
    expect(r.payload?.resultado.sinteses).toEqual([]);
    expect(r.payload?.resultado.analises).toEqual([]);
    expect(r.payload?.resultado.contradicoes).toEqual([]);
    expect(r.payload?.resultado.confissoes).toEqual([]);
    expect(r.payload?.resultado.credibilidade).toEqual([]);
  });

  it('rejeita quando depoentes não é array', () => {
    const r = validateProvaOralImport({ ...validResultado, depoentes: 'nope' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('depoentes'))).toBe(true);
  });

  it('rejeita qualificacao fora do enum', () => {
    const r = validateProvaOralImport({
      ...validResultado,
      depoentes: [{ id: 'd1', nome: 'X', qualificacao: 'juiz' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('depoentes[0]'))).toBe(true);
  });

  it('rejeita status de análise fora do enum', () => {
    const r = validateProvaOralImport({
      ...validResultado,
      analises: [{ titulo: 'T', conclusao: 'C', status: 'talvez' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('analises[0]'))).toBe(true);
  });

  it('aceita mas avisa deponenteId órfão em sinteses', () => {
    const r = validateProvaOralImport({
      ...validResultado,
      sinteses: [{ deponenteId: 'inexistente', conteudo: [] }],
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes('inexistente'))).toBe(true);
  });

  it('rejeita entrada que não é objeto', () => {
    expect(validateProvaOralImport(42).valid).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/apps/prova-oral/utils/import-validation.test.ts`
Expected: FAIL — "Failed to resolve import './import-validation'" (arquivo não existe ainda).

- [ ] **Step 3: Implementar o validador**

Criar `src/apps/prova-oral/utils/import-validation.ts`:

```ts
/**
 * @file import-validation.ts
 * @description Validador para JSON de import de análises de prova oral.
 * @version 1.47.0
 *
 * Espelha o validador do Analisador
 * (src/apps/analisador/utils/import-validation.ts), adaptado ao shape
 * ProvaOralResult / SavedProvaOralAnalysis. Aceita tanto o formato "wrapped"
 * (SavedProvaOralAnalysis, com `resultado`/`transcricao`/`sinteseProcesso`)
 * quanto o ProvaOralResult cru. Estrito nos campos que o renderizador usa
 * (enums + arrays nucleares + vínculo deponenteId↔id); tolerante no resto.
 */

import type {
  ProvaOralResult,
  Depoente,
  Sintese,
  SinteseConteudoItem,
  AnaliseTemaPedido,
  Contradicao,
  Confissao,
  AvaliacaoCredibilidade,
  ProcessoInfo,
  Qualificacao,
  StatusAnalise,
  Relevancia,
  CoerenciaInterna,
  InteresseLitigio,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ProvaOralValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  payload?: ProvaOralImportPayload;
}

export interface ProvaOralImportPayload {
  resultado: ProvaOralResult;
  transcricao: string;
  sinteseProcesso: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && !isNaN(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const QUALIFICACAO = new Set(['autor', 'preposto', 'testemunha-autor', 'testemunha-re']);
const STATUS = new Set(['favoravel-autor', 'favoravel-re', 'parcial', 'inconclusivo']);
const RELEVANCIA = new Set(['alta', 'media', 'baixa']);
const COERENCIA = new Set(['alta', 'media', 'comprometida']);
const INTERESSE = new Set(['baixo', 'alerta', 'alto']);
const TIPO_CONTRADICAO = new Set(['interna', 'externa']);
const TIPO_CONFISSAO = new Set(['autor', 'preposto']);

// ═══════════════════════════════════════════════════════════════════════════
// VALIDADORES DE SUB-ESTRUTURAS
// ═══════════════════════════════════════════════════════════════════════════

function validateProcesso(raw: unknown, warnings: string[]): ProcessoInfo {
  if (!isObject(raw)) {
    warnings.push('processo: ausente ou inválido, usando vazio');
    return {};
  }
  const out: ProcessoInfo = {};
  if (isString(raw.numero)) out.numero = raw.numero;
  if (isString(raw.numeroProcesso)) out.numeroProcesso = raw.numeroProcesso;
  if (isString(raw.reclamante)) out.reclamante = raw.reclamante;
  if (isString(raw.reclamada)) out.reclamada = raw.reclamada;
  if (isString(raw.vara)) out.vara = raw.vara;
  return out;
}

function validateDepoentes(raw: unknown, errors: string[]): Depoente[] {
  if (!Array.isArray(raw)) {
    errors.push('depoentes: deve ser array');
    return [];
  }
  const out: Depoente[] = [];
  raw.forEach((d, i) => {
    if (!isObject(d) || !isString(d.id) || !isString(d.nome) || !QUALIFICACAO.has(d.qualificacao as string)) {
      errors.push(
        `depoentes[${i}]: faltam/invalidos campos (id, nome, qualificacao∈{autor,preposto,testemunha-autor,testemunha-re})`
      );
      return;
    }
    const dep: Depoente = { id: d.id, nome: d.nome, qualificacao: d.qualificacao as Qualificacao };
    if (isString(d.funcao)) dep.funcao = d.funcao;
    if (isString(d.periodo)) dep.periodo = d.periodo;
    if (isString(d.relacaoComPartes)) dep.relacaoComPartes = d.relacaoComPartes;
    if (isString(d.observacoes)) dep.observacoes = d.observacoes;
    out.push(dep);
  });
  return out;
}

function validateSinteses(
  raw: unknown,
  depIds: Set<string>,
  errors: string[],
  warnings: string[]
): Sintese[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    errors.push('sinteses: deve ser array');
    return [];
  }
  const out: Sintese[] = [];
  raw.forEach((s, i) => {
    if (!isObject(s) || !isString(s.deponenteId)) {
      errors.push(`sinteses[${i}]: deponenteId deve ser string`);
      return;
    }
    if (!depIds.has(s.deponenteId)) {
      warnings.push(`sinteses[${i}].deponenteId "${s.deponenteId}" não consta em depoentes[]`);
    }
    const conteudo: SinteseConteudoItem[] = [];
    if (Array.isArray(s.conteudo)) {
      s.conteudo.forEach((c) => {
        if (isObject(c) && isString(c.texto) && isString(c.timestamp)) {
          conteudo.push({ texto: c.texto, timestamp: c.timestamp });
        }
      });
    }
    out.push({ deponenteId: s.deponenteId, conteudo });
  });
  return out;
}

function validateAnalises(raw: unknown, errors: string[]): AnaliseTemaPedido[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    errors.push('analises: deve ser array');
    return [];
  }
  const out: AnaliseTemaPedido[] = [];
  raw.forEach((a, i) => {
    if (!isObject(a) || !isString(a.titulo) || !isString(a.conclusao) || !STATUS.has(a.status as string)) {
      errors.push(
        `analises[${i}]: faltam/invalidos campos (titulo, conclusao, status∈{favoravel-autor,favoravel-re,parcial,inconclusivo})`
      );
      return;
    }
    const an: AnaliseTemaPedido = {
      titulo: a.titulo,
      conclusao: a.conclusao,
      status: a.status as StatusAnalise,
    };
    if (isString(a.alegacaoAutor)) an.alegacaoAutor = a.alegacaoAutor;
    if (isString(a.defesaRe)) an.defesaRe = a.defesaRe;
    if (Array.isArray(a.provaOral)) {
      an.provaOral = a.provaOral
        .filter((p): p is Record<string, unknown> => isObject(p) && isString(p.deponente) && isString(p.textoCorrente))
        .map((p) => ({ deponente: p.deponente as string, textoCorrente: p.textoCorrente as string }));
    }
    out.push(an);
  });
  return out;
}

function validateContradicoes(raw: unknown, errors: string[]): Contradicao[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    errors.push('contradicoes: deve ser array');
    return [];
  }
  const out: Contradicao[] = [];
  raw.forEach((c, i) => {
    if (
      !isObject(c) ||
      !TIPO_CONTRADICAO.has(c.tipo as string) ||
      !RELEVANCIA.has(c.relevancia as string) ||
      !isString(c.depoente) ||
      !isString(c.descricao)
    ) {
      errors.push(
        `contradicoes[${i}]: faltam/invalidos campos (tipo∈{interna,externa}, relevancia∈{alta,media,baixa}, depoente, descricao)`
      );
      return;
    }
    const item: Contradicao = {
      tipo: c.tipo as 'interna' | 'externa',
      relevancia: c.relevancia as Relevancia,
      depoente: c.depoente,
      descricao: c.descricao,
    };
    if (Array.isArray(c.timestamps) && c.timestamps.every(isString)) item.timestamps = c.timestamps as string[];
    if (isString(c.analise)) item.analise = c.analise;
    out.push(item);
  });
  return out;
}

function validateConfissoes(raw: unknown, errors: string[]): Confissao[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    errors.push('confissoes: deve ser array');
    return [];
  }
  const out: Confissao[] = [];
  raw.forEach((c, i) => {
    if (!isObject(c) || !TIPO_CONFISSAO.has(c.tipo as string) || !isString(c.tema) || !isString(c.trecho)) {
      errors.push(`confissoes[${i}]: faltam/invalidos campos (tipo∈{autor,preposto}, tema, trecho)`);
      return;
    }
    const item: Confissao = {
      tipo: c.tipo as 'autor' | 'preposto',
      tema: c.tema,
      trecho: c.trecho,
    };
    if (isString(c.timestamp)) item.timestamp = c.timestamp;
    if (isString(c.implicacao)) item.implicacao = c.implicacao;
    if (RELEVANCIA.has(c.gravidade as string)) item.gravidade = c.gravidade as Relevancia;
    out.push(item);
  });
  return out;
}

function validateCredibilidade(
  raw: unknown,
  depIds: Set<string>,
  errors: string[],
  warnings: string[]
): AvaliacaoCredibilidade[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    errors.push('credibilidade: deve ser array');
    return [];
  }
  const out: AvaliacaoCredibilidade[] = [];
  raw.forEach((c, i) => {
    if (!isObject(c) || !isString(c.deponenteId)) {
      errors.push(`credibilidade[${i}]: deponenteId deve ser string`);
      return;
    }
    if (!depIds.has(c.deponenteId)) {
      warnings.push(`credibilidade[${i}].deponenteId "${c.deponenteId}" não consta em depoentes[]`);
    }
    const item: AvaliacaoCredibilidade = { deponenteId: c.deponenteId };
    if (isNumber(c.pontuacao)) item.pontuacao = c.pontuacao;
    if (isString(c.avaliacaoGeral)) item.avaliacaoGeral = c.avaliacaoGeral;
    if (isObject(c.criterios)) {
      const cr = c.criterios;
      item.criterios = {
        conhecimentoDireto: isBoolean(cr.conhecimentoDireto) ? cr.conhecimentoDireto : false,
        contemporaneidade: (RELEVANCIA.has(cr.contemporaneidade as string) ? cr.contemporaneidade : 'media') as Relevancia,
        coerenciaInterna: (COERENCIA.has(cr.coerenciaInterna as string) ? cr.coerenciaInterna : 'media') as CoerenciaInterna,
        interesseLitigio: (INTERESSE.has(cr.interesseLitigio as string) ? cr.interesseLitigio : 'baixo') as InteresseLitigio,
      };
    }
    out.push(item);
  });
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida e normaliza um objeto que representa uma análise de prova oral
 * importada. Aceita SavedProvaOralAnalysis (com `resultado` aninhado) ou
 * ProvaOralResult cru. Retorna errors/warnings e payload pronto para
 * createAnalysis se válido.
 */
export function validateProvaOralImport(raw: unknown): ProvaOralValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(raw)) {
    return { valid: false, errors: ['Entrada não é objeto JSON'], warnings: [] };
  }

  const isWrapped = isObject(raw.resultado);
  const result: Record<string, unknown> = isWrapped
    ? (raw.resultado as Record<string, unknown>)
    : raw;

  const processo = validateProcesso(result.processo, warnings);
  const depoentes = validateDepoentes(result.depoentes, errors);
  const depIds = new Set(depoentes.map((d) => d.id));
  const sinteses = validateSinteses(result.sinteses, depIds, errors, warnings);
  const analises = validateAnalises(result.analises, errors);
  const contradicoes = validateContradicoes(result.contradicoes, errors);
  const confissoes = validateConfissoes(result.confissoes, errors);
  const credibilidade = validateCredibilidade(result.credibilidade, depIds, errors, warnings);

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const resultado: ProvaOralResult = {
    processo,
    depoentes,
    sinteses,
    analises,
    contradicoes,
    confissoes,
    credibilidade,
  };
  if (Array.isArray(result.sintesesCondensadas)) {
    resultado.sintesesCondensadas = result.sintesesCondensadas as ProvaOralResult['sintesesCondensadas'];
  }
  if (Array.isArray(result.sintesesPorTema)) {
    resultado.sintesesPorTema = result.sintesesPorTema as ProvaOralResult['sintesesPorTema'];
  }
  if (Array.isArray(result.highlights)) {
    resultado.highlights = result.highlights as ProvaOralResult['highlights'];
  }

  let transcricao = '';
  let sinteseProcesso = '';
  if (isWrapped) {
    if (isString(raw.transcricao)) transcricao = raw.transcricao;
    if (isString(raw.sinteseProcesso)) sinteseProcesso = raw.sinteseProcesso;
  }
  if (!transcricao) warnings.push('transcrição ausente no JSON; importada vazia');

  return { valid: true, errors: [], warnings, payload: { resultado, transcricao, sinteseProcesso } };
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

Run: `npx vitest run src/apps/prova-oral/utils/import-validation.test.ts`
Expected: PASS — 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/apps/prova-oral/utils/import-validation.ts src/apps/prova-oral/utils/import-validation.test.ts
git commit -m "feat(prova-oral): validador de import de JSON

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Modal `ImportJsonModal.tsx`

**Files:**
- Create: `src/apps/prova-oral/components/input/ImportJsonModal.tsx`
- Modify: `src/apps/prova-oral/components/input/index.ts`

- [ ] **Step 1: Criar o componente**

Criar `src/apps/prova-oral/components/input/ImportJsonModal.tsx`:

```tsx
/**
 * @file ImportJsonModal.tsx
 * @description Modal para importar uma análise de prova oral a partir de JSON
 * (tipicamente gerado pela skill analise-prova-oral-json). Valida, cria a
 * análise via API e carrega na tela. v1.47.0
 */

import React, { useCallback, useState } from 'react';
import { FileJson, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Modal, Button, useToast } from '../ui';
import { useProvaOralAPI } from '../../hooks';
import { useProvaOralStore } from '../../stores';
import {
  validateProvaOralImport,
  type ProvaOralValidationResult,
} from '../../utils/import-validation';

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado após import bem-sucedido (ex.: comutar para a tela de resultados). */
  onSuccess?: () => void;
}

interface ParsedJson {
  filename: string;
  result?: ProvaOralValidationResult;
  /** Erro de parsing ou de cardinalidade. */
  error?: string;
}

async function parseSingleJson(file: File): Promise<ParsedJson> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    return { filename: file.name, error: 'Arquivo não é .json' };
  }
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return { filename: file.name, error: 'Arquivo não contém nenhuma análise' };
      }
      if (parsed.length > 1) {
        return {
          filename: file.name,
          error: `Arquivo contém ${parsed.length} análises; a importação aceita apenas uma`,
        };
      }
      return { filename: file.name, result: validateProvaOralImport(parsed[0]) };
    }
    return { filename: file.name, result: validateProvaOralImport(parsed) };
  } catch (err) {
    return { filename: file.name, error: err instanceof Error ? err.message : 'Erro ao parsear JSON' };
  }
}

export const ImportJsonModal: React.FC<ImportJsonModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const { createAnalysis } = useProvaOralAPI();
  const loadAnalysis = useProvaOralStore((s) => s.loadAnalysis);

  const [parsed, setParsed] = useState<ParsedJson | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setParsed(await parseSingleJson(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
      e.target.value = '';
    },
    [handleFile]
  );

  const reset = useCallback(() => setParsed(null), []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleImport = useCallback(async () => {
    const payload = parsed?.result?.payload;
    if (!payload) return;
    setIsImporting(true);
    try {
      const { resultado, transcricao, sinteseProcesso } = payload;
      const id = await createAnalysis({ resultado, transcricao, sinteseProcesso });
      if (!id) {
        showToast('error', 'Falha ao salvar a análise importada. Tente novamente.');
        return;
      }
      loadAnalysis(id, transcricao, sinteseProcesso, resultado);
      showToast('success', 'Análise importada do JSON');
      reset();
      onSuccess?.();
      onClose();
    } finally {
      setIsImporting(false);
    }
  }, [parsed, createAnalysis, loadAnalysis, showToast, reset, onSuccess, onClose]);

  const result = parsed?.result;
  const canImport = result?.valid === true && !isImporting;
  const proc = result?.payload?.resultado.processo;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar análise (JSON)"
      subtitle="Importe uma análise gerada fora do app (ex.: pela skill analise-prova-oral-json)"
      icon={<FileJson className="w-5 h-5" />}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!canImport}
            icon={isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          >
            {isImporting ? 'Importando...' : 'Importar análise'}
          </Button>
        </>
      }
    >
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => document.getElementById('prova-oral-import-json-input')?.click()}
        className={`p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500'
        }`}
      >
        <FileJson className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Arraste um arquivo .json ou clique para selecionar
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Uma análise por arquivo</p>
        <input
          id="prova-oral-import-json-input"
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleInputChange}
          disabled={isImporting}
        />
      </div>

      {/* Erro de parsing / cardinalidade */}
      {parsed?.error && (
        <div className="mt-4 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{parsed.error}</p>
        </div>
      )}

      {/* Erros de validação */}
      {result && !result.valid && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">JSON inválido:</p>
          <ul className="text-sm text-red-700 dark:text-red-400 list-disc pl-5 space-y-1">
            {result.errors.slice(0, 6).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {result.errors.length > 6 && <li>… e mais {result.errors.length - 6}</li>}
          </ul>
        </div>
      )}

      {/* Preview de sucesso */}
      {result?.valid && (
        <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-medium">{parsed?.filename} — pronto para importar</p>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {proc?.numero || proc?.numeroProcesso || 'Processo não identificado'} —{' '}
            {proc?.reclamante || '—'} × {proc?.reclamada || '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            {result.payload!.resultado.depoentes.length} depoente(s),{' '}
            {result.payload!.resultado.analises.length} tema(s)
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-2 text-xs text-amber-600 dark:text-amber-400 list-disc pl-5 space-y-0.5">
              {result.warnings.slice(0, 4).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ImportJsonModal;
```

- [ ] **Step 2: Exportar no barrel**

Modificar `src/apps/prova-oral/components/input/index.ts` — adicionar a linha após o export do `AnalysisSelectorModal`:

```ts
export { ImportJsonModal } from './ImportJsonModal';
```

Resultado final do arquivo:

```ts
/**
 * @file index.ts
 * @description Exportação de componentes de input
 */

export { InputForm } from './InputForm';
export { AnalysisSelectorModal } from './AnalysisSelectorModal';
export { ImportJsonModal } from './ImportJsonModal';
```

- [ ] **Step 3: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `ImportJsonModal`/`import-validation`.

- [ ] **Step 4: Commit**

```bash
git add src/apps/prova-oral/components/input/ImportJsonModal.tsx src/apps/prova-oral/components/input/index.ts
git commit -m "feat(prova-oral): modal de import de JSON

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Botão no `InputForm.tsx`

**Files:**
- Modify: `src/apps/prova-oral/components/input/InputForm.tsx`

- [ ] **Step 1: Importar ícone e modal**

Em `src/apps/prova-oral/components/input/InputForm.tsx`, adicionar `FileJson` ao import de `lucide-react` (que hoje importa `Mic, FileText, Play, Trash2, Import, Loader2, AlertCircle, Lightbulb`):

```tsx
import {
  Mic,
  FileText,
  Play,
  Trash2,
  Import,
  Loader2,
  AlertCircle,
  Lightbulb,
  FileJson,
} from 'lucide-react';
```

E adicionar o import do modal logo após o import do `AnalysisSelectorModal`:

```tsx
import { ImportJsonModal } from './ImportJsonModal';
```

- [ ] **Step 2: Adicionar estado**

Logo após `const [showImportModal, setShowImportModal] = useState(false);`, adicionar:

```tsx
const [showImportJsonModal, setShowImportJsonModal] = useState(false);
```

- [ ] **Step 3: Adicionar botão no header do card de Transcrição**

Substituir o `CardHeader` do card de Transcrição. Trocar este bloco:

```tsx
          <CardHeader>
            <CardTitle icon={<Mic className="w-5 h-5" />}>
              Transcrição da Audiência
            </CardTitle>
          </CardHeader>
```

por:

```tsx
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle icon={<Mic className="w-5 h-5" />}>
              Transcrição da Audiência
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImportJsonModal(true)}
              disabled={isAnalyzing}
              icon={<FileJson className="w-4 h-4" />}
            >
              Importar JSON
            </Button>
          </CardHeader>
```

- [ ] **Step 4: Montar o modal**

Logo após o `<AnalysisSelectorModal ... />` (antes do `<StreamingModal ... />`), adicionar:

```tsx
      {/* Modal de Importação de JSON */}
      <ImportJsonModal
        isOpen={showImportJsonModal}
        onClose={() => setShowImportJsonModal(false)}
        onSuccess={() => {
          setShowImportJsonModal(false);
          onAnalysisComplete?.();
        }}
      />
```

- [ ] **Step 5: Checar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/apps/prova-oral/components/input/InputForm.tsx
git commit -m "feat(prova-oral): botão Importar JSON no formulário de entrada

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Versionamento + changelog (v1.47.0)

**Files:**
- Modify: `src/constants/app-version.ts`
- Modify: `package.json:3`
- Modify: `CLAUDE.md:7`
- Modify: `src/constants/changelog.js`

- [ ] **Step 1: Bump `app-version.ts`**

Trocar em `src/constants/app-version.ts`:

```ts
export const APP_VERSION = '1.46.0';
```

por:

```ts
export const APP_VERSION = '1.47.0';
```

- [ ] **Step 2: Bump `package.json`**

Trocar a linha 3 `"version": "1.46.0",` por `"version": "1.47.0",`.

- [ ] **Step 3: Bump `CLAUDE.md`**

Trocar na linha 7 `**Version**: 1.46.0` por `**Version**: 1.47.0`.

- [ ] **Step 4: Entrada no changelog**

Em `src/constants/changelog.js`, inserir como **primeiro** elemento do array `CHANGELOG` (logo após `export const CHANGELOG = [`), mantendo o shape `{ version, feature }` das entradas existentes:

```js
  {
    version: '1.47.0',
    feature: 'feat(prova-oral-import): importação de análise de prova oral via JSON. O subapp Prova Oral ganha um botão "Importar JSON" no card de Transcrição que abre um modal de upload (arrastar/selecionar um arquivo .json). O JSON — tipicamente gerado pela nova skill analise-prova-oral-json do Claude Code — é validado por validateProvaOralImport (espelha o validador do Analisador): estrito nos enums (qualificacao, status de análise, relevância, tipo de contradição/confissão, critérios de credibilidade) e nos arrays que as abas iteram, tolerante no resto. Aceita tanto o formato wrapped (SavedProvaOralAnalysis, com resultado/transcricao/sinteseProcesso) quanto o ProvaOralResult cru; aceita objeto único ou array de exatamente uma análise (0 ou >1 são rejeitados com mensagem clara). Ao importar, cria a análise via createAnalysis (POST /api/prova-oral) — aparece no histórico — e a carrega na tela via loadAnalysis, mantendo o auto-save de highlights. Avisos não-bloqueantes (transcrição ausente, deponenteId órfão) aparecem em âmbar no preview.',
  },
```

- [ ] **Step 5: Build de tipos + suite de testes**

Run: `npx tsc --noEmit && npx vitest run src/apps/prova-oral/utils/import-validation.test.ts`
Expected: sem erros de tipo; testes do validador PASS.

- [ ] **Step 6: Commit**

```bash
git add src/constants/app-version.ts package.json CLAUDE.md src/constants/changelog.js
git commit -m "chore(release): v1.47.0 — import de JSON na prova oral

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Skill — `references/json-schema.md`

**Files:**
- Create: `~/.claude/skills/analise-prova-oral-json/references/json-schema.md`

- [ ] **Step 1: Criar o diretório**

Run: `mkdir -p ~/.claude/skills/analise-prova-oral-json/references`
Expected: sem saída (sucesso).

- [ ] **Step 2: Escrever o schema anotado**

Criar `~/.claude/skills/analise-prova-oral-json/references/json-schema.md` com o conteúdo:

````markdown
# Schema JSON — análise de prova oral (subapp Prova Oral)

Cópia anotada de `src/apps/prova-oral/types/prova-oral.types.ts`. O import do
app (`validateProvaOralImport`) só lê `resultado`, `transcricao` e
`sinteseProcesso`; `id`/`createdAt`/`updatedAt` são regenerados pela API.

## Envelope (SavedProvaOralAnalysis)

```json
{
  "transcricao": "<texto bruto da audiência fornecido>",
  "sinteseProcesso": "<síntese da inicial/contestação, ou string vazia>",
  "resultado": { /* ProvaOralResult — ver abaixo */ }
}
```

> Gravar como objeto único (não array). O app também aceita array de exatamente
> 1 elemento.

## ProvaOralResult

| Campo | Obrigatório | Tipo / regra |
|-------|-------------|--------------|
| `processo` | recomendado | `{ numero?, reclamante?, reclamada?, vara? }` (strings) |
| `depoentes[]` | **sim** | cada item exige `id` (string estável), `nome` (string), `qualificacao` ∈ `autor`/`preposto`/`testemunha-autor`/`testemunha-re` |
| `sinteses[]` | sim (pode `[]`) | cada item: `deponenteId` (= `depoentes[].id`), `conteudo[]` de `{ texto, timestamp }` |
| `sintesesCondensadas[]` | opcional | `{ deponente, qualificacao, textoCorrente }` |
| `sintesesPorTema[]` | opcional | `{ tema, declaracoes[]:{ deponente, qualificacao, textoCorrente } }` |
| `analises[]` | sim (pode `[]`) | cada item: `titulo`, `conclusao`, `status` ∈ `favoravel-autor`/`favoravel-re`/`parcial`/`inconclusivo`; opcionais `alegacaoAutor`, `defesaRe`, `provaOral[]:{ deponente, textoCorrente }` |
| `contradicoes[]` | sim (pode `[]`) | cada item: `tipo` ∈ `interna`/`externa`, `relevancia` ∈ `alta`/`media`/`baixa`, `depoente`, `descricao`; opcionais `timestamps[]`, `analise` |
| `confissoes[]` | sim (pode `[]`) | cada item: `tipo` ∈ `autor`/`preposto`, `tema`, `trecho`; opcionais `timestamp`, `implicacao`, `gravidade` ∈ `alta`/`media`/`baixa` |
| `credibilidade[]` | sim (pode `[]`) | cada item: `deponenteId` (= `depoentes[].id`); opcionais `pontuacao` (1-5), `avaliacaoGeral`, `criterios:{ conhecimentoDireto:bool, contemporaneidade∈alta/media/baixa, coerenciaInterna∈alta/media/comprometida, interesseLitigio∈baixo/alerta/alto }` |
| `highlights[]` | opcional | normalmente `[]` (marcações são criadas no app) |

## Convenções

- **`id` dos depoentes:** estável e referenciável — usar `dep-1`, `dep-2`, … Os
  mesmos ids devem aparecer em `sinteses[].deponenteId` e
  `credibilidade[].deponenteId` (senão o app não vincula e gera warning).
- **Timestamp:** formato `Xm YYs` (ex.: `1m 10s`), conforme a skill
  `analise-prova-oral`. Em `analises[].provaOral[].textoCorrente`, os timestamps
  vão inline: `"afirmou X (1m 10s); negou Y (2m 29s)"`.
- **JSON estrito:** sem comentários, sem vírgula trailing, sem `undefined`.

## Exemplo mínimo válido

```json
{
  "transcricao": "JUIZ: ... DEPOENTE (autor): ...",
  "sinteseProcesso": "Reclamante alega horas extras...",
  "resultado": {
    "processo": { "numero": "0000123-45.2026.5.08.0120", "reclamante": "Fulano", "reclamada": "Empresa X", "vara": "1ª VT" },
    "depoentes": [
      { "id": "dep-1", "nome": "Fulano de Tal", "qualificacao": "autor" },
      { "id": "dep-2", "nome": "Preposto", "qualificacao": "preposto" }
    ],
    "sinteses": [
      { "deponenteId": "dep-1", "conteudo": [{ "texto": "afirmou que trabalhava até as 20h", "timestamp": "1m 10s" }] }
    ],
    "analises": [
      { "titulo": "Horas extras", "alegacaoAutor": "...", "defesaRe": "...", "provaOral": [{ "deponente": "Fulano (autor)", "textoCorrente": "afirmou X (1m 10s)" }], "conclusao": "...", "status": "favoravel-autor" }
    ],
    "contradicoes": [],
    "confissoes": [],
    "credibilidade": [
      { "deponenteId": "dep-1", "pontuacao": 4, "avaliacaoGeral": "..." }
    ]
  }
}
```
````

- [ ] **Step 3: Commit**

```bash
git -C ~/.claude/skills add analise-prova-oral-json/references/json-schema.md 2>/dev/null || true
```

> **Nota:** `~/.claude/skills/` pode não ser um repositório git. Se o comando
> acima falhar, apenas confirme que o arquivo existe com
> `ls ~/.claude/skills/analise-prova-oral-json/references/` e siga em frente —
> skills não vivem no repo do projeto.

---

## Task 6: Skill — `SKILL.md`

**Files:**
- Create: `~/.claude/skills/analise-prova-oral-json/SKILL.md`

- [ ] **Step 1: Escrever o SKILL.md**

Criar `~/.claude/skills/analise-prova-oral-json/SKILL.md`:

````markdown
---
name: analise-prova-oral-json
description: Use when o usuário fornecer transcrição(ões) de audiência trabalhista e pedir para gerar um JSON importável no subapp Prova Oral do sentencify (em vez do relatório em texto). Aplicável a "analise esta prova oral e gere JSON para importar", "transcrição → JSON do sentencify", "quero importar essa audiência no app de prova oral". Para relatório em markdown (sem JSON), use a skill analise-prova-oral.
---

# Análise de Prova Oral → JSON (subapp Prova Oral)

Skill que executa a análise de prova oral de **uma audiência** e grava um
arquivo `.json` conforme o schema `SavedProvaOralAnalysis`/`ProvaOralResult` do
subapp **Prova Oral** do sentencify
(`/home/nohlack/sentencify/src/apps/prova-oral/`). O arquivo é importado no app
pelo botão **"Importar JSON"** no card de Transcrição (v1.47.0+), que valida,
cria a análise e a abre na tela.

**Uma audiência por execução** — não há orquestração de subagentes (diferente
da `analise-paralela-processos`).

## Quando usar

- Usuário tem transcrição de audiência e quer popular o app Prova Oral.
- Usuário pede explicitamente JSON/import, não relatório.

## Quando NÃO usar

- Relatório em markdown para leitura → `analise-prova-oral`.
- Transcrever áudios primeiro → `transcrever-e-analisar-prova-oral`.
- Análise de inicial/contestação (prepauta) → `analise-inicial-contestacao`.

## Pré-requisitos

- App Prova Oral com versão ≥ 1.47.0 (botão "Importar JSON").
- Transcrição com timestamps. Opcional: síntese da inicial e da contestação.

## Metodologia

### Etapa 1 — Aplicar a skill `analise-prova-oral`

**Fonte única das regras:** invoque/aplique integralmente a skill
`analise-prova-oral` para a análise de mérito — formato ata das sínteses,
contradições internas/externas, confissões, credibilidade, valoração
(confissão × prova dividida, testemunha única, art. 829 CLT) e o **checklist de
autocontrole**. Esta skill **não** redefine essas regras; só as referencia.
Não inventar informações fora das transcrições/documentos fornecidos.

### Etapa 2 — Mapear para o schema JSON

Ler `references/json-schema.md` (ao lado deste arquivo) e produzir um
`SavedProvaOralAnalysis`:

- `transcricao`: o texto bruto da transcrição fornecida.
- `sinteseProcesso`: o texto da síntese inicial/contestação (ou `""`).
- `resultado.processo`: `{ numero, reclamante, reclamada, vara }` quando houver.
- `resultado.depoentes[]`: `id` **estável** (`dep-1`, `dep-2`, …), `nome`,
  `qualificacao` (enum). Reusar esses ids em `sinteses[].deponenteId` e
  `credibilidade[].deponenteId`.
- `resultado.sinteses[]`: `conteudo[]` de `{ texto, timestamp }`, timestamp
  `Xm YYs`.
- `resultado.sintesesCondensadas[]` e `sintesesPorTema[]`: texto corrido.
- `resultado.analises[]`: `titulo`, `alegacaoAutor`, `defesaRe`, `provaOral[]`
  (timestamps inline em `textoCorrente`), `conclusao`, `status` (enum).
- `resultado.contradicoes[]`, `confissoes[]`, `credibilidade[]` com os enums
  corretos.

### Etapa 3 — Gravar e validar

1. Definir caminho de saída: ao lado dos arquivos de entrada, ou pasta indicada
   pelo usuário. Nome: `{numero_processo_ou_descricao}.json`.
2. Gravar o JSON (UTF-8, estrito).
3. **Validar** com o snippet abaixo (espelha `validateProvaOralImport`). Não
   considerar pronto enquanto houver `✗`.

```bash
node -e '
const fs = require("fs");
const p = process.argv[1];
const raw = JSON.parse(fs.readFileSync(p, "utf8"));
const r = (raw && typeof raw.resultado === "object" && raw.resultado) ? raw.resultado : raw;
const isStr = v => typeof v === "string";
const has = (set, v) => set.has(v);
const QUAL = new Set(["autor","preposto","testemunha-autor","testemunha-re"]);
const STATUS = new Set(["favoravel-autor","favoravel-re","parcial","inconclusivo"]);
const REL = new Set(["alta","media","baixa"]);
const TC = new Set(["interna","externa"]);
const TF = new Set(["autor","preposto"]);
const errs = [];
const ids = new Set();
if (!Array.isArray(r.depoentes)) errs.push("depoentes: deve ser array");
else r.depoentes.forEach((d,i) => {
  if (!d || !isStr(d.id) || !isStr(d.nome) || !has(QUAL, d.qualificacao)) errs.push("depoentes["+i+"]: id/nome/qualificacao");
  else ids.add(d.id);
});
(r.sinteses||[]).forEach((s,i) => {
  if (!s || !isStr(s.deponenteId)) errs.push("sinteses["+i+"].deponenteId");
  else if (!ids.has(s.deponenteId)) console.log("  ! aviso: sinteses["+i+"].deponenteId orfao: "+s.deponenteId);
});
(r.analises||[]).forEach((a,i) => {
  if (!a || !isStr(a.titulo) || !isStr(a.conclusao) || !has(STATUS, a.status)) errs.push("analises["+i+"]: titulo/conclusao/status");
});
(r.contradicoes||[]).forEach((c,i) => {
  if (!c || !has(TC, c.tipo) || !has(REL, c.relevancia) || !isStr(c.depoente) || !isStr(c.descricao)) errs.push("contradicoes["+i+"]");
});
(r.confissoes||[]).forEach((c,i) => {
  if (!c || !has(TF, c.tipo) || !isStr(c.tema) || !isStr(c.trecho)) errs.push("confissoes["+i+"]");
});
(r.credibilidade||[]).forEach((c,i) => {
  if (!c || !isStr(c.deponenteId)) errs.push("credibilidade["+i+"].deponenteId");
  else if (!ids.has(c.deponenteId)) console.log("  ! aviso: credibilidade["+i+"].deponenteId orfao: "+c.deponenteId);
});
if (errs.length) { console.log("✗ "+p); errs.forEach(e=>console.log("    "+e)); process.exit(1); }
else console.log("✓ "+p+" ("+(r.depoentes||[]).length+" depoentes, "+(r.analises||[]).length+" temas)");
' "{CAMINHO_DO_JSON}"
```

### Etapa 4 — Reportar ao usuário

Informar o caminho do `.json` e instruir: abrir o subapp **Prova Oral** →
card de Transcrição → **"Importar JSON"** → arrastar o arquivo → revisar o
preview de validação → **"Importar análise"**. A análise é salva no histórico e
abre na tela.

## Red flags

- Não inventar partes, datas ou declarações ausentes da transcrição.
- `id` dos depoentes deve casar entre `depoentes`, `sinteses` e `credibilidade`.
- JSON estrito (sem comentários/trailing comma). Validar antes de entregar.
- Não emitir relatório markdown aqui — o produto é o `.json`.
````

- [ ] **Step 2: Verificar que a skill é descoberta**

Run: `ls ~/.claude/skills/analise-prova-oral-json/`
Expected: `SKILL.md  references` listados.

- [ ] **Step 3: (Opcional) Confirmar referência**

Run: `ls ~/.claude/skills/analise-prova-oral-json/references/`
Expected: `json-schema.md`.

---

## Verificação final (após todas as tasks)

- [ ] `npx tsc --noEmit` — sem erros.
- [ ] `npx vitest run src/apps/prova-oral/utils/import-validation.test.ts` — PASS.
- [ ] Teste manual ponta-a-ponta: rodar a skill `analise-prova-oral-json` numa
  transcrição real → importar o `.json` no subapp → conferir que as abas
  (depoentes, sínteses, contradições, confissões, credibilidade, análises)
  renderizam e que a análise consta no histórico.
- [ ] Caso de borda: importar um `ProvaOralResult` cru (sem envelope) → import
  funciona com `transcricao`/`sinteseProcesso` vazias + warning.

## Notas de coerência (auto-review)

- Assinaturas usadas: `validateProvaOralImport(raw) → ProvaOralValidationResult`
  (com `payload: ProvaOralImportPayload`), `createAnalysis({resultado,
  transcricao, sinteseProcesso}) → Promise<string|null>`,
  `loadAnalysis(id, transcricao, sinteseProcesso, resultado)`,
  `useToast() → { showToast(type, message) }`. Todas conferidas contra o código
  existente.
- A skill (Etapa 3) valida com os mesmos enums e o mesmo vínculo
  `deponenteId`↔`id` do validador do app (Task 1) — contrato único.
````
