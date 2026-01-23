/**
 * @file IdentificacaoSection.tsx
 * @description Seção de identificação do processo
 */

import React from 'react';
import { User, Building2, FileText, Calendar, Scale, DollarSign } from 'lucide-react';
import { Badge } from '../ui';
import type { Identificacao, ValorCausa } from '../../types';

interface IdentificacaoSectionProps {
  data: Identificacao;
  valorCausa?: ValorCausa;
}

export const IdentificacaoSection: React.FC<IdentificacaoSectionProps> = ({ data, valorCausa }) => {
  const formatCurrency = (value?: number) => {
    if (value == null) return '';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const ritoLabel = {
    ordinario: 'Ordinário',
    sumarissimo: 'Sumaríssimo',
    sumario: 'Sumário'
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-5 border border-indigo-100">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Scale className="w-5 h-5 text-indigo-600" />
        Identificação do Processo
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Número do Processo */}
        {data.numeroProcesso && (
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500">Processo</p>
              <p className="font-medium text-slate-800">{data.numeroProcesso}</p>
            </div>
          </div>
        )}

        {/* Rito */}
        {data.rito && (
          <div className="flex items-start gap-3">
            <Scale className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500">Rito</p>
              <Badge variant={data.rito === 'sumarissimo' ? 'warning' : 'info'}>
                {ritoLabel[data.rito] || data.rito}
              </Badge>
            </div>
          </div>
        )}

        {/* Vara */}
        {data.vara && (
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500">Vara</p>
              <p className="font-medium text-slate-800">{data.vara}</p>
            </div>
          </div>
        )}

        {/* Data Ajuizamento */}
        {data.dataAjuizamento && (
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500">Ajuizamento</p>
              <p className="font-medium text-slate-800">{data.dataAjuizamento}</p>
            </div>
          </div>
        )}

        {/* Valor da Causa */}
        {valorCausa && valorCausa.valorTotal > 0 && (
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div>
              <p className="text-sm text-slate-500">Valor da Causa</p>
              <p className="font-medium text-slate-800">{formatCurrency(valorCausa.valorTotal)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Partes */}
      <div className="mt-4 pt-4 border-t border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reclamantes */}
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 text-emerald-500 mt-0.5" />
          <div>
            <p className="text-sm text-slate-500">Reclamante(s)</p>
            {data.reclamantes.map((nome, idx) => (
              <p key={idx} className="font-medium text-slate-800">{nome}</p>
            ))}
          </div>
        </div>

        {/* Reclamadas */}
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm text-slate-500">Reclamada(s)</p>
            {data.reclamadas.map((nome, idx) => (
              <p key={idx} className="font-medium text-slate-800">{nome}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentificacaoSection;
