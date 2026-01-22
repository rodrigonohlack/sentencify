/**
 * @file Accordion.tsx
 * @description Componente de accordion/expansível
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  children,
  defaultOpen = false,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left font-medium text-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-indigo-600">{icon}</span>}
          <span>{title}</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-4 py-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {children}
    </div>
  );
};

export default Accordion;
