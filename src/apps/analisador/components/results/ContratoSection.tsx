/**
 * @file ContratoSection.tsx
 * @description Seção de dados do contrato de trabalho
 */

import React from 'react';
import { Briefcase, AlertTriangle } from 'lucide-react';
import { AccordionItem } from '../ui';
import { safeRender } from '../../utils/safe-render';
import type { Contrato } from '../../types';

interface ContratoSectionProps {
  data: Contrato;
}

export const ContratoSection: React.FC<ContratoSectionProps> = ({ data }) => {
  const { dadosInicial, dadosContestacao, controversias } = data;

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const hasContestacao = dadosContestacao && Object.keys(dadosContestacao).length > 0;

  return (
    <AccordionItem
      title="Contrato de Trabalho"
      icon={<Briefcase className="w-5 h-5" />}
      defaultOpen
    >
      <div className="space-y-4">
        {/* Tabela Comparativa */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Campo</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Petição Inicial</th>
                {hasContestacao && (
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Contestação</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 text-slate-600">Admissão</td>
                <td className="px-4 py-3 text-slate-800">{dadosInicial.dataAdmissao || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800">{dadosContestacao?.dataAdmissao || '-'}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600">Demissão</td>
                <td className="px-4 py-3 text-slate-800">{dadosInicial.dataDemissao || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800">{dadosContestacao?.dataDemissao || '-'}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600">Função</td>
                <td className="px-4 py-3 text-slate-800">{dadosInicial.funcao || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800">{dadosContestacao?.funcao || '-'}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600">Último Salário</td>
                <td className="px-4 py-3 text-slate-800">{formatCurrency(dadosInicial.ultimoSalario)}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800">{formatCurrency(dadosContestacao?.ultimoSalario)}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600">Tipo de Contrato</td>
                <td className="px-4 py-3 text-slate-800">{dadosInicial.tipoContrato || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800">{dadosContestacao?.tipoContrato || '-'}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600">Motivo Rescisão</td>
                <td className="px-4 py-3 text-slate-800">{dadosInicial.motivoRescisao || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800">{dadosContestacao?.motivoRescisao || '-'}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600">Jornada Alegada</td>
                <td className="px-4 py-3 text-slate-800">{dadosInicial.jornadaAlegada || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800">{dadosContestacao?.jornadaAlegada || '-'}</td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Controvérsias */}
        {controversias.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h4 className="font-medium text-amber-800">Controvérsias Identificadas</h4>
            </div>
            <ul className="space-y-1">
              {controversias.map((item, idx) => (
                <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  {safeRender(item)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AccordionItem>
  );
};

export default ContratoSection;
