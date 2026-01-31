/**
 * @file Tabs.tsx
 * @description Componente de abas reutilizável
 */

import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  children: (activeTab: string) => React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  onChange,
  children
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div>
      {/* Tab List */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 font-medium text-sm
              border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-slate-800 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {children(activeTab)}
      </div>
    </div>
  );
};

export default Tabs;
