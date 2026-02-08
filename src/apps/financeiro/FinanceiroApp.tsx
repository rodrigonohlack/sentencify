// ═══════════════════════════════════════════════════════════════════════════
// FINANCEIRO (GER_DESPESAS) - App Principal
// v1.42.0 - Gerenciamento de despesas pessoais integrado ao Sentencify
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { LoginGate } from './components/auth/LoginGate';
import { ThemeStyles } from '../../styles';
import { useUIStore } from './stores/useUIStore';
import ToastContainer from './components/ui/Toast';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import CSVImportPage from './pages/CSVImportPage';
import RecurringPage from './pages/RecurringPage';
import SettingsPage from './pages/SettingsPage';

// ═══════════════════════════════════════════════════════════════════════════
// GLASSMORPHISM STYLES
// ═══════════════════════════════════════════════════════════════════════════

const FinanceiroStyles: React.FC = () => (
  <style>{`
    .fin-app {
      --glass: rgba(255,255,255,0.55);
      --glass-border: rgba(255,255,255,0.7);
      --glass-sidebar: rgba(255,255,255,0.25);
      --accent: #6366f1;
      --accent-soft: #818cf8;
      --text: #1e1b4b;
      --text-secondary: #4338ca;
      --text-muted: #7c7caa;
      --success: #059669;
      --danger: #dc2626;
      font-family: 'Outfit', system-ui, sans-serif;
    }

    .fin-app .gradient-text {
      background: linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .fin-app .glass-card {
      background: rgba(255,255,255,0.55);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.7);
      border-radius: 20px;
      padding: 24px;
      transition: all 0.3s ease;
    }

    .fin-app .glass-card:hover {
      background: rgba(255,255,255,0.65);
      box-shadow: 0 8px 32px rgba(99,102,241,0.08);
    }

    .fin-bg {
      background: linear-gradient(135deg, #e0e7ff 0%, #ede9fe 25%, #fce7f3 50%, #e0f2fe 75%, #ecfdf5 100%);
      background-attachment: fixed;
      min-height: 100vh;
    }

    .fin-bg::before {
      content: '';
      position: fixed;
      top: -200px;
      right: -200px;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);
      pointer-events: none;
    }

    .fin-bg::after {
      content: '';
      position: fixed;
      bottom: -200px;
      left: -200px;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%);
      pointer-events: none;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .fin-app .animate-slide-up {
      animation: slideUp 0.5s ease both;
    }
  `}</style>
);

// ═══════════════════════════════════════════════════════════════════════════
// APP CONTENT (authenticated)
// ═══════════════════════════════════════════════════════════════════════════

const FinanceiroAppContent: React.FC = () => {
  const currentPage = useUIStore((s) => s.currentPage);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'expenses': return <ExpensesPage />;
      case 'import': return <CSVImportPage />;
      case 'recurring': return <RecurringPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="fin-app fin-bg">
      <Sidebar />

      {/* Main content area */}
      <main className="ml-[292px] p-8 min-h-screen">
        {renderPage()}
      </main>

      <ToastContainer />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACAO COM GATE DE AUTENTICACAO
// ═══════════════════════════════════════════════════════════════════════════

export const FinanceiroApp: React.FC = () => (
  <>
    <ThemeStyles />
    <FinanceiroStyles />
    <LoginGate>
      <FinanceiroAppContent />
    </LoginGate>
  </>
);

export default FinanceiroApp;
