/**
 * @file DepoentesTab.tsx
 * @description Tab de depoentes identificados
 */

import React from 'react';
import { User, Users, Info } from 'lucide-react';
import { Card, CardContent, Badge } from '../ui';
import { getQualificacaoStyle, getQualificacaoLabel } from '../../constants';
import type { Depoente } from '../../types';

interface DepoentesTabProps {
  depoentes: Depoente[];
}

export const DepoentesTab: React.FC<DepoentesTabProps> = ({ depoentes }) => {
  if (!depoentes || depoentes.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Nenhum depoente identificado na análise.
        </p>
      </div>
    );
  }

  // Agrupar por qualificação
  const grouped = {
    autor: depoentes.filter(d => d.qualificacao === 'autor'),
    preposto: depoentes.filter(d => d.qualificacao === 'preposto'),
    'testemunha-autor': depoentes.filter(d => d.qualificacao === 'testemunha-autor'),
    'testemunha-re': depoentes.filter(d => d.qualificacao === 'testemunha-re'),
  };

  return (
    <div className="space-y-6">
      {/* Partes */}
      {(grouped.autor.length > 0 || grouped.preposto.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">
            Partes
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {[...grouped.autor, ...grouped.preposto].map((depoente) => (
              <DeponenteCard key={depoente.id} depoente={depoente} />
            ))}
          </div>
        </div>
      )}

      {/* Testemunhas do Autor */}
      {grouped['testemunha-autor'].length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">
            Testemunhas do Autor
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {grouped['testemunha-autor'].map((depoente) => (
              <DeponenteCard key={depoente.id} depoente={depoente} />
            ))}
          </div>
        </div>
      )}

      {/* Testemunhas da Ré */}
      {grouped['testemunha-re'].length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">
            Testemunhas da Ré
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {grouped['testemunha-re'].map((depoente) => (
              <DeponenteCard key={depoente.id} depoente={depoente} />
            ))}
          </div>
        </div>
      )}

      {/* Resumo */}
      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Info className="w-4 h-4" />
            <span>
              Total de {depoentes.length} depoente{depoentes.length !== 1 ? 's' : ''} identificado{depoentes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const DeponenteCard: React.FC<{ depoente: Depoente }> = ({ depoente }) => {
  const style = getQualificacaoStyle(depoente.qualificacao);

  return (
    <Card>
      <CardContent>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${style.bg}`}>
            <User className={`w-5 h-5 ${style.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-800 dark:text-slate-100 truncate">
              {depoente.nome}
            </h4>
            <Badge className={`mt-1 ${style.bg} ${style.text}`}>
              {getQualificacaoLabel(depoente.qualificacao)}
            </Badge>
            {depoente.relacaoComPartes && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {depoente.relacaoComPartes}
              </p>
            )}
            {depoente.observacoes && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">
                {depoente.observacoes}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DepoentesTab;
