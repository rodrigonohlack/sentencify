/**
 * @file PreliminaresSection.tsx
 * @description Seção de preliminares e prejudiciais
 */

import React from 'react';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import { AccordionItem, Badge } from '../ui';
import { safeRender } from '../../utils/safe-render';
import type { Preliminar, Prejudiciais } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PreliminaresSectionProps {
  preliminares: Preliminar[];
  prejudiciais: Prejudiciais;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica se a prescrição tem conteúdo real (não apenas campos vazios)
 */
const hasPrescricaoContent = (prescricao: Prejudiciais['prescricao']): boolean => {
  if (!prescricao) return false;
  return Boolean(prescricao.fundamentacao?.trim() || prescricao.dataBase?.trim());
};

/**
 * Verifica se a decadência tem conteúdo real (não apenas campos vazios)
 */
const hasDecadenciaContent = (decadencia: Prejudiciais['decadencia']): boolean => {
  if (!decadencia) return false;
  return Boolean(decadencia.fundamentacao?.trim() || decadencia.prazo?.trim());
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const PreliminaresSection: React.FC<PreliminaresSectionProps> = ({
  preliminares,
  prejudiciais
}) => {
  const { prescricao, decadencia } = prejudiciais;

  // Verifica conteúdo real (não objetos vazios)
  const prescricaoHasContent = hasPrescricaoContent(prescricao);
  const decadenciaHasContent = hasDecadenciaContent(decadencia);

  return (
    <AccordionItem
      title="Preliminares e Prejudiciais"
      icon={<Shield className="w-5 h-5" />}
      defaultOpen={preliminares.length > 0 || prescricaoHasContent || decadenciaHasContent}
    >
      <div className="space-y-4">
        {/* Preliminares */}
        {preliminares.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Preliminares</h4>
            <div className="space-y-3">
              {preliminares.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{item.tipo}</span>
                    <Badge variant={item.alegadaPor === 'reclamante' ? 'info' : 'warning'}>
                      {item.alegadaPor === 'reclamante' ? 'Reclamante' : 'Reclamada'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{safeRender(item.descricao)}</p>
                  {item.fundamentacao && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 italic">
                      {safeRender(item.fundamentacao)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prescrição - só exibe se tiver conteúdo real */}
        {prescricaoHasContent && prescricao && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/40">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h4 className="font-medium text-amber-800 dark:text-amber-300">Prescrição</h4>
              <Badge variant="warning">
                {prescricao.tipo === 'quinquenal' ? 'Quinquenal' :
                 prescricao.tipo === 'bienal' ? 'Bienal' : 'Parcial'}
              </Badge>
            </div>
            {prescricao.dataBase && (
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">
                <strong>Data base:</strong> {prescricao.dataBase}
              </p>
            )}
            {prescricao.fundamentacao?.trim() && (
              <p className="text-sm text-amber-700 dark:text-amber-400">{safeRender(prescricao.fundamentacao)}</p>
            )}
          </div>
        )}

        {/* Decadência - só exibe se tiver conteúdo real */}
        {decadenciaHasContent && decadencia && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/40">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h4 className="font-medium text-red-800 dark:text-red-300">Decadência</h4>
              <Badge variant="danger">{decadencia.tipo}</Badge>
            </div>
            {decadencia.prazo?.trim() && (
              <p className="text-sm text-red-700 dark:text-red-400 mb-1">
                <strong>Prazo:</strong> {decadencia.prazo}
              </p>
            )}
            {decadencia.fundamentacao?.trim() && (
              <p className="text-sm text-red-700 dark:text-red-400">{safeRender(decadencia.fundamentacao)}</p>
            )}
          </div>
        )}

        {preliminares.length === 0 && !prescricaoHasContent && !decadenciaHasContent && (
          <p className="text-slate-500 dark:text-slate-400 text-sm italic">
            Nenhuma preliminar ou prejudicial identificada.
          </p>
        )}
      </div>
    </AccordionItem>
  );
};

export default PreliminaresSection;
