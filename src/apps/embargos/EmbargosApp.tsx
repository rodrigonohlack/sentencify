/**
 * @file EmbargosApp.tsx
 * @description Componente raiz do subapp Embargos.
 */

import React from 'react';
import { LoginGate } from './components/auth/LoginGate';
import { ToastProvider } from './components/ui';
import { EmbargosContent } from './EmbargosContent';

const EmbargosApp: React.FC = () => {
  return (
    <ToastProvider>
      <LoginGate>
        <EmbargosContent />
      </LoginGate>
    </ToastProvider>
  );
};

export default EmbargosApp;
