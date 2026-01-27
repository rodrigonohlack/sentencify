/**
 * @file IdentificacaoSection.tsx
 * @description Seção de identificação do processo
 */

import React, { useMemo } from 'react';
import { User, Building2, FileText, Calendar, Scale, DollarSign } from 'lucide-react';
import { Badge } from '../ui';
import { safeRender } from '../../utils/safe-render';
import type { Identificacao, ValorCausa, RitoType } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES - Salário Mínimo 2026
// ═══════════════════════════════════════════════════════════════════════════

const SALARIO_MINIMO_2026 = 1621.00;
const LIMITE_SUMARIO = 2 * SALARIO_MINIMO_2026;        // R$ 3.242,00
const LIMITE_SUMARISSIMO = 40 * SALARIO_MINIMO_2026;   // R$ 64.840,00

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

  // Usa o campo temEntePublico retornado pela IA (que analisa o contexto completo)
  const hasEntePublico = data.temEntePublico === true;

  /**
   * Calcula o motivo do rito baseado no valor da causa e partes
   */
  const calcularMotivo = (valor?: number): string => {
    if (hasEntePublico) return 'ente público';
    if (!valor || valor <= 0) return 'valor não informado';
    if (valor <= LIMITE_SUMARIO) return 'até 2 SM';
    if (valor <= LIMITE_SUMARISSIMO) return 'até 40 SM';
    return 'acima de 40 SM';
  };

  /**
   * Calcula o rito processual baseado no valor da causa e partes
   * SEMPRE calcula - regras são objetivas (CLT Art. 852-A e Lei 5.584/70)
   * Não confia no rito retornado pela IA pois pode estar incorreto
   */
  const ritoCalculado = useMemo((): { rito: RitoType; motivo: string } => {
    const valor = valorCausa?.valorTotal;
    const motivo = calcularMotivo(valor);

    // Se tem ente público, é sempre ordinário (CLT Art. 852-A, parágrafo único)
    if (hasEntePublico) {
      return { rito: 'ordinario', motivo };
    }

    // Se não tem valor, assume ordinário
    if (!valor || valor <= 0) {
      return { rito: 'ordinario', motivo };
    }

    // Até 2 salários mínimos: Sumário (Lei 5.584/70)
    if (valor <= LIMITE_SUMARIO) {
      return { rito: 'sumario', motivo };
    }

    // Até 40 salários mínimos: Sumaríssimo (CLT Art. 852-A)
    if (valor <= LIMITE_SUMARISSIMO) {
      return { rito: 'sumarissimo', motivo };
    }

    // Acima de 40 salários mínimos: Ordinário
    return { rito: 'ordinario', motivo };
  }, [valorCausa?.valorTotal, hasEntePublico]);

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
          <Scale className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mt-0.5" />
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Rito</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={ritoBadgeVariant}>
                {ritoLabel[ritoCalculado.rito]}
              </Badge>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                ({ritoCalculado.motivo})
              </span>
            </div>
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
