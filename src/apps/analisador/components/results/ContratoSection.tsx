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
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Campo</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Petição Inicial</th>
                {hasContestacao && (
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Contestação</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              <tr>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Admissão</td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosInicial.dataAdmissao) || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosContestacao?.dataAdmissao) || '-'}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Demissão</td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosInicial.dataDemissao) || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosContestacao?.dataDemissao) || '-'}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Função</td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosInicial.funcao) || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosContestacao?.funcao) || '-'}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Último Salário</td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{formatCurrency(dadosInicial.ultimoSalario)}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{formatCurrency(dadosContestacao?.ultimoSalario)}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Tipo de Contrato</td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosInicial.tipoContrato) || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosContestacao?.tipoContrato) || '-'}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Motivo Rescisão</td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosInicial.motivoRescisao) || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosContestacao?.motivoRescisao) || '-'}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Jornada Alegada</td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosInicial.jornadaAlegada) || '-'}</td>
                {hasContestacao && (
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{safeRender(dadosContestacao?.jornadaAlegada) || '-'}</td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Controvérsias */}
        {controversias.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h4 className="font-medium text-amber-800 dark:text-amber-300">Controvérsias Identificadas</h4>
            </div>
            <ul className="space-y-1">
              {controversias.map((item, idx) => (
                <li key={idx} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <span className="text-amber-400 dark:text-amber-500">•</span>
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
