/**
 * @file IdentificacaoSection.tsx
 * @description Seção de identificação do processo
 */

import React, { useMemo } from 'react';
import { User, Building2, FileText, Calendar, Scale, DollarSign, Calculator } from 'lucide-react';
import { Badge } from '../ui';
import { safeRender } from '../../utils/safe-render';
import type { Identificacao, ValorCausa, RitoType } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES - Salário Mínimo 2026
// ═══════════════════════════════════════════════════════════════════════════

const SALARIO_MINIMO_2026 = 1621.00;
const LIMITE_SUMARIO = 2 * SALARIO_MINIMO_2026;        // R$ 3.242,00
const LIMITE_SUMARISSIMO = 40 * SALARIO_MINIMO_2026;   // R$ 64.840,00

// Palavras-chave para identificar entes públicos
const ENTES_PUBLICOS_KEYWORDS = [
  'união', 'estado', 'município', 'municipio', 'prefeitura',
  'autarquia', 'fundação', 'fundacao', 'empresa pública', 'empresa publica',
  'sociedade de economia mista', 'inss', 'ibge', 'incra', 'anatel',
  'anvisa', 'anac', 'antaq', 'aneel', 'ans', 'funasa', 'fiocruz',
  'banco central', 'caixa econômica', 'caixa economica', 'correios',
  'ect', 'ebct', 'petrobras', 'eletrobras', 'furnas'
];

interface IdentificacaoSectionProps {
  data: Identificacao;
  valorCausa?: ValorCausa;
}

export const IdentificacaoSection: React.FC<IdentificacaoSectionProps> = ({ data, valorCausa }) => {
  const formatCurrency = (value?: number) => {
    if (value == null) return '';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const ritoLabel: Record<RitoType, string> = {
    ordinario: 'Ordinário',
    sumarissimo: 'Sumaríssimo',
    sumario: 'Sumário'
  };

  /**
   * Verifica se alguma reclamada é ente da administração pública
   */
  const hasEntePublico = useMemo(() => {
    return data.reclamadas.some(reclamada => {
      const nome = reclamada.toLowerCase();
      return ENTES_PUBLICOS_KEYWORDS.some(keyword => nome.includes(keyword));
    });
  }, [data.reclamadas]);

  /**
   * Calcula o rito processual baseado no valor da causa e partes
   * CLT Art. 852-A (sumaríssimo) e Art. 2º Lei 5.584/70 (sumário)
   */
  const ritoCalculado = useMemo((): { rito: RitoType; calculado: boolean; motivo?: string } => {
    // Se já veio o rito da IA, usa ele
    if (data.rito) {
      return { rito: data.rito, calculado: false };
    }

    const valor = valorCausa?.valorTotal;

    // Se tem ente público, é sempre ordinário (CLT Art. 852-A, parágrafo único)
    if (hasEntePublico) {
      return {
        rito: 'ordinario',
        calculado: true,
        motivo: 'Ente da administração pública no polo passivo'
      };
    }

    // Se não tem valor, não pode calcular
    if (!valor || valor <= 0) {
      return { rito: 'ordinario', calculado: true, motivo: 'Valor da causa não informado' };
    }

    // Até 2 salários mínimos: Sumário (Lei 5.584/70)
    if (valor <= LIMITE_SUMARIO) {
      return {
        rito: 'sumario',
        calculado: true,
        motivo: `Valor até 2 SM (${formatCurrency(LIMITE_SUMARIO)})`
      };
    }

    // Até 40 salários mínimos: Sumaríssimo (CLT Art. 852-A)
    if (valor <= LIMITE_SUMARISSIMO) {
      return {
        rito: 'sumarissimo',
        calculado: true,
        motivo: `Valor até 40 SM (${formatCurrency(LIMITE_SUMARISSIMO)})`
      };
    }

    // Acima de 40 salários mínimos: Ordinário
    return {
      rito: 'ordinario',
      calculado: true,
      motivo: `Valor acima de 40 SM (${formatCurrency(LIMITE_SUMARISSIMO)})`
    };
  }, [data.rito, valorCausa?.valorTotal, hasEntePublico]);

  const ritoBadgeVariant = ritoCalculado.rito === 'sumarissimo' ? 'warning' :
                          ritoCalculado.rito === 'sumario' ? 'success' : 'info';

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800/40">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
        <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Identificação do Processo
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Número do Processo */}
        {data.numeroProcesso && (
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Processo</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{safeRender(data.numeroProcesso)}</p>
            </div>
          </div>
        )}

        {/* Rito - Sempre exibe (da IA ou calculado) */}
        <div className="flex items-start gap-3">
          {ritoCalculado.calculado ? (
            <Calculator className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mt-0.5" />
          ) : (
            <Scale className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mt-0.5" />
          )}
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Rito{ritoCalculado.calculado && ' (calculado)'}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant={ritoBadgeVariant}>
                {ritoLabel[ritoCalculado.rito]}
              </Badge>
            </div>
            {ritoCalculado.calculado && ritoCalculado.motivo && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {ritoCalculado.motivo}
              </p>
            )}
          </div>
        </div>

        {/* Vara */}
        {data.vara && (
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Vara</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{safeRender(data.vara)}</p>
            </div>
          </div>
        )}

        {/* Data Ajuizamento */}
        {data.dataAjuizamento && (
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ajuizamento</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{safeRender(data.dataAjuizamento)}</p>
            </div>
          </div>
        )}

        {/* Valor da Causa */}
        {valorCausa && valorCausa.valorTotal > 0 && (
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Valor da Causa</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(valorCausa.valorTotal)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Partes */}
      <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-800/40 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reclamantes */}
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 text-emerald-500 mt-0.5" />
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Reclamante(s)</p>
            {data.reclamantes.map((nome, idx) => (
              <p key={idx} className="font-medium text-slate-800 dark:text-slate-200">{safeRender(nome)}</p>
            ))}
          </div>
        </div>

        {/* Reclamadas */}
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Reclamada(s)</p>
            {data.reclamadas.map((nome, idx) => (
              <p key={idx} className="font-medium text-slate-800 dark:text-slate-200">{safeRender(nome)}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentificacaoSection;
