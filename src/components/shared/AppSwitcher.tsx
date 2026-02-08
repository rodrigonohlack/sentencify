/**
 * @file AppSwitcher.tsx
 * @description Dropdown de navegação entre os sub-apps do Sentencify
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Scale, FileSearch, Mic, Newspaper, Calculator, Wallet, ChevronDown } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

type AppId = 'sentencify' | 'analisador' | 'prova-oral' | 'noticias' | 'seguro-desemprego' | 'financeiro';

interface AppDefinition {
  id: AppId;
  label: string;
  href: string;
  icon: React.ReactNode;
  colors: {
    bg: string;
    text: string;
    border: string;
    hoverBg: string;
  };
}

interface AppSwitcherProps {
  /** App atual (será excluído da lista de links) */
  currentApp: AppId;
  /** Classes CSS adicionais para o botão trigger */
  className?: string;
  /** Conteúdo do botão trigger (ícone + texto) */
  children: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFINIÇÕES DOS APPS
// ═══════════════════════════════════════════════════════════════════════════

const APPS: AppDefinition[] = [
  {
    id: 'sentencify',
    label: 'Sentencify',
    href: '/',
    icon: <Scale className="w-4 h-4" />,
    colors: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-500/20 dark:border-indigo-400/20',
      hoverBg: 'hover:bg-indigo-500/20 dark:hover:bg-indigo-500/25',
    },
  },
  {
    id: 'analisador',
    label: 'Analisador',
    href: '/analise',
    icon: <FileSearch className="w-4 h-4" />,
    colors: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/15',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/20 dark:border-blue-400/20',
      hoverBg: 'hover:bg-blue-500/20 dark:hover:bg-blue-500/25',
    },
  },
  {
    id: 'prova-oral',
    label: 'Prova Oral',
    href: '/prova-oral',
    icon: <Mic className="w-4 h-4" />,
    colors: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/15',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-500/20 dark:border-purple-400/20',
      hoverBg: 'hover:bg-purple-500/20 dark:hover:bg-purple-500/25',
    },
  },
  {
    id: 'noticias',
    label: 'Notícias',
    href: '/noticias',
    icon: <Newspaper className="w-4 h-4" />,
    colors: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
      text: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-500/20 dark:border-cyan-400/20',
      hoverBg: 'hover:bg-cyan-500/20 dark:hover:bg-cyan-500/25',
    },
  },
  {
    id: 'seguro-desemprego',
    label: 'Seguro-Desemprego',
    href: '/seguro-desemprego.html',
    icon: <Calculator className="w-4 h-4" />,
    colors: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20 dark:border-emerald-400/20',
      hoverBg: 'hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25',
    },
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    href: '/financeiro',
    icon: <Wallet className="w-4 h-4" />,
    colors: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/15',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-500/20 dark:border-violet-400/20',
      hoverBg: 'hover:bg-violet-500/20 dark:hover:bg-violet-500/25',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export const AppSwitcher: React.FC<AppSwitcherProps> = ({
  currentApp,
  className,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Fechar com Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  const otherApps = APPS.filter(app => app.id !== currentApp);

  return (
    <div className="relative" ref={containerRef}>
      {/* Botão trigger — mantém o visual original de cada app */}
      <button
        onClick={toggle}
        className={className}
        title="Navegar entre apps"
      >
        {children}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={`
            absolute top-full right-0 mt-2 min-w-[180px]
            bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg
            rounded-xl shadow-xl border border-slate-200/80 dark:border-slate-700/80
            p-2 z-50
            animate-in fade-in slide-in-from-top-1 duration-150
          `}
        >
          <div className="flex flex-col gap-1">
            {otherApps.map(app => (
              <a
                key={app.id}
                href={app.href}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-lg
                  border transition-all duration-150
                  ${app.colors.bg} ${app.colors.text} ${app.colors.border} ${app.colors.hoverBg}
                `}
                onClick={() => setIsOpen(false)}
              >
                {app.icon}
                <span className="text-sm font-medium">{app.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
