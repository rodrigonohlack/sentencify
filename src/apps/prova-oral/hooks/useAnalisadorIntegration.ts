/**
 * @file useAnalisadorIntegration.ts
 * @description Hook para integração com o Analisador de Prepauta
 * Permite carregar análises existentes e converter para síntese de texto
 */

import { useCallback, useState } from 'react';
import { useAuthMagicLink } from '../../../hooks';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DO ANALISADOR (simplificados)
// ═══════════════════════════════════════════════════════════════════════════

interface AnalisadorAnalysis {
  id: string;
  numeroProcesso: string | null;
  reclamante: string | null;
  reclamadas: string[];
  resultado: {
    identificacao?: {
      numeroProcesso?: string;
      reclamantes?: string[];
      reclamadas?: string[];
      vara?: string;
    };
    contrato?: {
      dadosInicial?: {
        dataAdmissao?: string;
        dataDemissao?: string;
        funcao?: string;
        ultimoSalario?: number;
        tipoContrato?: string;
        motivoRescisao?: string;
        jornadaAlegada?: string;
      };
      dadosContestacao?: {
        dataAdmissao?: string;
        dataDemissao?: string;
        funcao?: string;
        ultimoSalario?: number;
        jornadaAlegada?: string;
      };
    };
    pedidos?: Array<{
      numero: number;
      tema: string;
      descricao?: string;
      fatosReclamante?: string;
      defesaReclamada?: string;
      controversia?: boolean;
    }>;
    preliminares?: Array<{
      tipo: string;
      descricao: string;
      alegadaPor: 'reclamante' | 'reclamada';
      fundamentacao?: string;
    }>;
  };
  createdAt: string;
}

interface ListAnalysesResponse {
  analyses: AnalisadorAnalysis[];
  count: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formata valor monetário
 */
function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return 'não informado';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data
 */
function formatDate(date: string | undefined): string {
  if (!date) return 'não informada';
  // Se já está em formato legível (contém "/"), retornar direto
  if (date.includes('/')) return date;
  try {
    return new Date(date).toLocaleDateString('pt-BR');
  } catch {
    return date;
  }
}

/**
 * Converte uma análise do Analisador para texto de síntese
 */
export function convertAnalysisToSintese(analysis: AnalisadorAnalysis): string {
  const { resultado } = analysis;
  const { identificacao, contrato, pedidos, preliminares } = resultado;

  const lines: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════
  // IDENTIFICAÇÃO
  // ═══════════════════════════════════════════════════════════════════════

  lines.push('## IDENTIFICAÇÃO DO PROCESSO');
  lines.push('');

  if (identificacao?.numeroProcesso || analysis.numeroProcesso) {
    lines.push(`**Processo:** ${identificacao?.numeroProcesso || analysis.numeroProcesso}`);
  }

  const reclamante = identificacao?.reclamantes?.[0] || analysis.reclamante;
  if (reclamante) {
    lines.push(`**Reclamante:** ${reclamante}`);
  }

  const reclamadas = identificacao?.reclamadas || analysis.reclamadas;
  if (reclamadas?.length) {
    lines.push(`**Reclamada(s):** ${reclamadas.join(', ')}`);
  }

  if (identificacao?.vara) {
    lines.push(`**Vara:** ${identificacao.vara}`);
  }

  lines.push('');

  // ═══════════════════════════════════════════════════════════════════════
  // PRELIMINARES
  // ═══════════════════════════════════════════════════════════════════════

  if (preliminares?.length) {
    lines.push('## PRELIMINARES');
    lines.push('');

    for (const preliminar of preliminares) {
      const alegadaPor = preliminar.alegadaPor === 'reclamante'
        ? 'Alegada pelo Reclamante'
        : 'Alegada pela Reclamada';

      lines.push(`### ${preliminar.tipo}`);
      lines.push(`**${alegadaPor}**`);
      lines.push('');
      lines.push(preliminar.descricao);

      if (preliminar.fundamentacao) {
        lines.push('');
        lines.push(`**Fundamentação:** ${preliminar.fundamentacao}`);
      }
      lines.push('');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONTRATO
  // ═══════════════════════════════════════════════════════════════════════

  if (contrato?.dadosInicial) {
    const dados = contrato.dadosInicial;
    lines.push('## DADOS DO CONTRATO');
    lines.push('');

    if (dados.dataAdmissao) {
      lines.push(`**Admissão:** ${formatDate(dados.dataAdmissao)}`);
    }
    if (dados.dataDemissao) {
      lines.push(`**Demissão:** ${formatDate(dados.dataDemissao)}`);
    }
    if (dados.funcao) {
      lines.push(`**Função:** ${dados.funcao}`);
    }
    if (dados.ultimoSalario) {
      lines.push(`**Último Salário:** ${formatCurrency(dados.ultimoSalario)}`);
    }
    if (dados.tipoContrato) {
      lines.push(`**Tipo de Contrato:** ${dados.tipoContrato}`);
    }
    if (dados.motivoRescisao) {
      lines.push(`**Motivo da Rescisão:** ${dados.motivoRescisao}`);
    }
    if (dados.jornadaAlegada) {
      lines.push(`**Jornada Alegada pelo Autor:** ${dados.jornadaAlegada}`);
    }

    // Dados da contestação se divergentes
    if (contrato.dadosContestacao?.jornadaAlegada &&
        contrato.dadosContestacao.jornadaAlegada !== dados.jornadaAlegada) {
      lines.push(`**Jornada Alegada pela Ré:** ${contrato.dadosContestacao.jornadaAlegada}`);
    }

    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PEDIDOS
  // ═══════════════════════════════════════════════════════════════════════

  if (pedidos?.length) {
    lines.push('## PEDIDOS');
    lines.push('');

    for (const pedido of pedidos) {
      lines.push(`### ${pedido.numero}. ${pedido.tema}`);
      lines.push('');

      if (pedido.descricao) {
        lines.push(`**Descrição:** ${pedido.descricao}`);
        lines.push('');
      }

      if (pedido.fatosReclamante) {
        lines.push(`**Alegação do Autor:** ${pedido.fatosReclamante}`);
        lines.push('');
      }

      if (pedido.defesaReclamada) {
        lines.push(`**Defesa da Ré:** ${pedido.defesaReclamada}`);
        lines.push('');
      }

      if (pedido.controversia !== undefined) {
        lines.push(`**Controverso:** ${pedido.controversia ? 'Sim' : 'Não'}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export interface UseAnalisadorIntegrationReturn {
  analyses: AnalisadorAnalysis[];
  isLoading: boolean;
  error: string | null;
  fetchAnalyses: () => Promise<AnalisadorAnalysis[]>;
  convertToSintese: (analysis: AnalisadorAnalysis) => string;
}

export function useAnalisadorIntegration(): UseAnalisadorIntegrationReturn {
  const { authFetch, isAuthenticated } = useAuthMagicLink();
  const [analyses, setAnalyses] = useState<AnalisadorAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async (): Promise<AnalisadorAnalysis[]> => {
    if (!isAuthenticated) {
      setError('Usuário não autenticado');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await authFetch('/api/analyses');

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao buscar análises do Analisador');
      }

      const data: ListAnalysesResponse = await res.json();
      setAnalyses(data.analyses);
      return data.analyses;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authFetch]);

  const convertToSintese = useCallback((analysis: AnalisadorAnalysis): string => {
    return convertAnalysisToSintese(analysis);
  }, []);

  return {
    analyses,
    isLoading,
    error,
    fetchAnalyses,
    convertToSintese,
  };
}

export default useAnalisadorIntegration;
