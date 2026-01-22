/**
 * @file PreliminaresSection.tsx
 * @description Seção de preliminares e prejudiciais
 */

import React from 'react';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import { AccordionItem, Badge } from '../ui';
import type { Preliminar, Prejudiciais } from '../../types';

interface PreliminaresSectionProps {
  preliminares: Preliminar[];
  prejudiciais: Prejudiciais;
}

export const PreliminaresSection: React.FC<PreliminaresSectionProps> = ({
  preliminares,
  prejudiciais
}) => {
  const { prescricao, decadencia } = prejudiciais;

  return (
    <AccordionItem
      title="Preliminares e Prejudiciais"
      icon={<Shield className="w-5 h-5" />}
      defaultOpen={preliminares.length > 0 || !!prescricao || !!decadencia}
    >
      <div className="space-y-4">
        {/* Preliminares */}
        {preliminares.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-700 mb-3">Preliminares</h4>
            <div className="space-y-3">
              {preliminares.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800">{item.tipo}</span>
                    <Badge variant={item.alegadaPor === 'reclamante' ? 'info' : 'warning'}>
                      {item.alegadaPor === 'reclamante' ? 'Reclamante' : 'Reclamada'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{item.descricao}</p>
                  {item.fundamentacao && (
                    <p className="text-sm text-slate-500 mt-2 italic">
                      {item.fundamentacao}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prescrição */}
        {prescricao && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h4 className="font-medium text-amber-800">Prescrição</h4>
              <Badge variant="warning">
                {prescricao.tipo === 'quinquenal' ? 'Quinquenal' :
                 prescricao.tipo === 'bienal' ? 'Bienal' : 'Parcial'}
              </Badge>
            </div>
            {prescricao.dataBase && (
              <p className="text-sm text-amber-700 mb-1">
                <strong>Data base:</strong> {prescricao.dataBase}
              </p>
            )}
            <p className="text-sm text-amber-700">{prescricao.fundamentacao}</p>
          </div>
        )}

        {/* Decadência */}
        {decadencia && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h4 className="font-medium text-red-800">Decadência</h4>
              <Badge variant="danger">{decadencia.tipo}</Badge>
            </div>
            <p className="text-sm text-red-700 mb-1">
              <strong>Prazo:</strong> {decadencia.prazo}
            </p>
            <p className="text-sm text-red-700">{decadencia.fundamentacao}</p>
          </div>
        )}

        {preliminares.length === 0 && !prescricao && !decadencia && (
          <p className="text-slate-500 text-sm italic">
            Nenhuma preliminar ou prejudicial identificada.
          </p>
        )}
      </div>
    </AccordionItem>
  );
};

export default PreliminaresSection;
