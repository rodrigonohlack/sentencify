/**
 * @file AnalisesTab.tsx
 * @description Aba de análises probatórias detalhadas (Fase 3)
 * Exibe cards expansíveis com alegação, defesa, prova oral, fundamentação e conclusão
 */

import React, { useState } from 'react';
import { Scale, ChevronDown, ChevronUp, User, Quote, FileText, Gavel } from 'lucide-react';
import { Card, CardContent, Badge } from '../ui';
import { getStatusStyle, getStatusLabel } from '../../constants';
import type { ProvaOralResult, AnaliseTemaPedido, StatusAnalise } from '../../types';

interface AnalisesTabProps {
  resultado: ProvaOralResult;
}

/** Renderiza markdown básico para HTML */
function renderMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-slate-800 dark:text-slate-100 mt-4 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2">$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
}

/** Card expansível de análise */
const AnaliseCard: React.FC<{
  analise: AnaliseTemaPedido;
  index: number;
  defaultExpanded: boolean;
}> = ({ analise, index, defaultExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Suporta novo formato (status) e antigo (conclusao como StatusAnalise)
  const statusValue = (analise.status || analise.conclusao) as StatusAnalise;
  const statusStyle = getStatusStyle(statusValue);

  // Prova oral do novo formato
  const provaOral = analise.provaOral || [];

  return (
    <Card className="overflow-hidden">
      {/* Header clicável */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-semibold">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
              {analise.titulo || analise.tema}
            </h3>
            {provaOral.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {provaOral.length} depoente{provaOral.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge className={`${statusStyle.bg} ${statusStyle.text}`}>
            {getStatusLabel(statusValue)}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Conteúdo expansível */}
      {isExpanded && (
        <CardContent className="pt-0 space-y-6 border-t border-slate-200 dark:border-slate-700">
          {/* Alegação do Autor */}
          {analise.alegacaoAutor && (
            <Section
              title="Alegação do Autor"
              icon={<User className="w-4 h-4" />}
              color="blue"
            >
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {analise.alegacaoAutor}
              </p>
            </Section>
          )}

          {/* Defesa da Ré */}
          {analise.defesaRe && (
            <Section
              title="Defesa da Ré"
              icon={<Gavel className="w-4 h-4" />}
              color="purple"
            >
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {analise.defesaRe}
              </p>
            </Section>
          )}

          {/* Prova Oral */}
          {provaOral.length > 0 && (
            <Section
              title="Prova Oral"
              icon={<Quote className="w-4 h-4" />}
              color="cyan"
            >
              <div className="space-y-3">
                {provaOral.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border-l-3 border-cyan-400"
                  >
                    <p className="font-medium text-sm text-slate-800 dark:text-slate-100 mb-1">
                      {item.deponente}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                      {item.textoCorrente || item.conteudo}
                      {item.timestamp && !item.textoCorrente && (
                        <span className="ml-2 text-xs text-slate-400 font-mono">
                          ({item.timestamp})
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Fundamentação */}
          {analise.fundamentacao && (
            <Section
              title="Fundamentação"
              icon={<FileText className="w-4 h-4" />}
              color="amber"
            >
              <div
                className="text-sm text-slate-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${renderMarkdown(analise.fundamentacao)}</p>` }}
              />
            </Section>
          )}

          {/* Conclusão */}
          {analise.conclusao && typeof analise.conclusao === 'string' && analise.conclusao.length > 20 && (
            <Section
              title="Conclusão"
              icon={<Scale className="w-4 h-4" />}
              color="emerald"
            >
              <div className={`p-3 rounded-lg ${statusStyle.bg} border ${statusStyle.border}`}>
                <p className={`text-sm font-medium ${statusStyle.text}`}>
                  {analise.conclusao}
                </p>
              </div>
            </Section>
          )}
        </CardContent>
      )}
    </Card>
  );
};

/** Seção com título e ícone */
const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'cyan' | 'amber' | 'emerald';
  children: React.ReactNode;
}> = ({ title, icon, color, children }) => {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`p-1.5 rounded ${colorClasses[color]}`}>
          {icon}
        </span>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
};

export const AnalisesTab: React.FC<AnalisesTabProps> = ({ resultado }) => {
  const { analises } = resultado;

  if (!analises || analises.length === 0) {
    return (
      <div className="text-center py-12">
        <Scale className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Nenhuma análise probatória disponível.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
          Execute a análise para ver os resultados detalhados por tema.
        </p>
      </div>
    );
  }

  // Estatísticas
  const getStatus = (a: AnaliseTemaPedido): StatusAnalise =>
    (a.status || a.conclusao) as StatusAnalise;

  const stats = {
    favoravelAutor: analises.filter(a => getStatus(a) === 'favoravel-autor').length,
    favoravelRe: analises.filter(a => getStatus(a) === 'favoravel-re').length,
    parcial: analises.filter(a => getStatus(a) === 'parcial').length,
    inconclusivo: analises.filter(a => getStatus(a) === 'inconclusivo').length,
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBadge
          label="Favorável Autor"
          value={stats.favoravelAutor}
          color="emerald"
        />
        <StatBadge
          label="Favorável Ré"
          value={stats.favoravelRe}
          color="red"
        />
        <StatBadge
          label="Prova Dividida"
          value={stats.parcial}
          color="amber"
        />
        <StatBadge
          label="Inconclusivo"
          value={stats.inconclusivo}
          color="slate"
        />
      </div>

      {/* Cards de análise */}
      <div className="space-y-4">
        {analises.map((analise, index) => (
          <AnaliseCard
            key={index}
            analise={analise}
            index={index}
            defaultExpanded={index === 0}
          />
        ))}
      </div>
    </div>
  );
};

/** Badge de estatística */
const StatBadge: React.FC<{
  label: string;
  value: number;
  color: 'emerald' | 'red' | 'amber' | 'slate';
}> = ({ label, value, color }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    slate: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
  };

  return (
    <div className={`p-3 rounded-xl border ${colorClasses[color]} text-center`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
    </div>
  );
};

export default AnalisesTab;
