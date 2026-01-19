/**
 * @file LockedTabOverlay.tsx
 * @description Overlay para bloquear abas secundárias durante edição
 * @version 1.36.98
 *
 * Extraído de App.tsx para modularização.
 * Bloqueia abas não-primárias para evitar conflitos de edição.
 *
 * @usedBy SentencifyAI (App.tsx)
 */

import React from 'react';
import type { LockedTabOverlayProps } from '../../types';

/**
 * LockedTabOverlay - Overlay de bloqueio para abas secundárias
 *
 * Exibido quando outra aba está editando o projeto.
 * Permite assumir controle ou acessar Biblioteca de Modelos.
 *
 * @param isPrimaryTab - Se esta é a aba primária (controle)
 * @param activeTab - Aba atualmente ativa
 * @param setActiveTab - Callback para mudar de aba
 */
const LockedTabOverlay = React.memo(({ isPrimaryTab, activeTab, setActiveTab }: LockedTabOverlayProps) => {
  const handleTakeControl = React.useCallback(() => {
    const LOCK_KEY = 'sentencify-primary-tab-lock';
    const TAKEOVER_KEY = 'sentencify-tab-takeover';

    // PHASE 1: Gerar futuro tabId (mesmo formato que o hook usa)
    const futureTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // PHASE 2: Salvar em sessionStorage (sobrevive ao reload)
    sessionStorage.setItem(TAKEOVER_KEY, futureTabId);

    // PHASE 3: Escrever lock com futureTabId
    // Isso previne que Tab 1 reclame o lock antes de Tab 2 recarregar
    localStorage.setItem(LOCK_KEY, JSON.stringify({
      tabId: futureTabId,
      timestamp: Date.now(),
      takeover: true
    }));

    // v1.38.7: Reload automático (standalone não tem restrição do sandbox)
    window.location.reload();
  }, []);

  const handleGoToModels = React.useCallback(() => {
    setActiveTab('models');
  }, [setActiveTab]);

  // v1.20.3: Não mostrar overlay se for aba primária OU se estiver em abas liberadas (read-only)
  // Modelos, Jurisprudência e Legislação são acessíveis em modo secundário
  const READONLY_ALLOWED_TABS = ['models', 'jurisprudencia', 'legislacao'];
  if (isPrimaryTab || READONLY_ALLOWED_TABS.includes(activeTab)) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="locked-tab-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '2px solid #3b82f6',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.1)',
          textAlign: 'center'
        }}
      >
        {/* Ícone de Cadeado */}
        <div
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        {/* Título */}
        <h2
          id="locked-tab-title"
          style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#f1f5f9',
            marginBottom: '16px',
            letterSpacing: '-0.025em'
          }}
        >
          Aba Bloqueada
        </h2>

        {/* Mensagem */}
        <p
          style={{
            fontSize: '15px',
            color: '#94a3b8',
            lineHeight: '1.6',
            marginBottom: '12px'
          }}
        >
          Outra aba está atualmente editando este projeto. Para evitar conflitos e perda de dados,
          apenas uma aba pode editar por vez.
          <br /><br />
          <span style={{ color: '#60a5fa' }}>
            A <strong>Biblioteca de Modelos</strong> continua funcionando normalmente em todas as abas.
          </span>
        </p>

        {/* v1.38.7: Instrução simplificada (reload automático) */}
        <p
          style={{
            fontSize: '14px',
            color: '#fbbf24',
            lineHeight: '1.5',
            marginBottom: '24px',
            padding: '12px 16px',
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}
        >
          Clique em <strong>"Assumir Controle"</strong> para transferir a edição para esta aba.
          A página será recarregada automaticamente.
        </p>

        {/* Botão de Assumir Controle */}
        <button
          onClick={handleTakeControl}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: 'white',
            fontSize: '15px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease',
            letterSpacing: '0.025em'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
          }}
        >
          🔒 Assumir Controle
        </button>

        {/* v1.9.6: Botão para acessar Modelos sem assumir controle */}
        <button
          onClick={handleGoToModels}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '12px 24px',
            background: 'transparent',
            color: '#60a5fa',
            fontSize: '14px',
            fontWeight: '500',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
            e.currentTarget.style.borderColor = '#60a5fa';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#3b82f6';
          }}
        >
          📚 Ir para Biblioteca de Modelos
        </button>

        {/* Nota de Rodapé */}
        <p
          style={{
            fontSize: '13px',
            color: '#64748b',
            marginTop: '20px',
            fontStyle: 'italic'
          }}
        >
          Ao assumir o controle, a outra aba será bloqueada automaticamente.
        </p>
      </div>
    </div>
  );
});

LockedTabOverlay.displayName = 'LockedTabOverlay';

export default LockedTabOverlay;
export { LockedTabOverlay };
