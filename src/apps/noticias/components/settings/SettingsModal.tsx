// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE - Modal de Configurações
// v1.41.0 - Modal para gerenciar fontes RSS e configurações de IA
// ═══════════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { Settings, Check, X, Building2, Globe, Brain, Rss } from 'lucide-react';
import { BaseModal, CSS } from '../../../../components/modals/BaseModal';
import { AIProviderSelector } from './AIProviderSelector';
import { ModelSelector } from './ModelSelector';
import { APIKeyInput } from './APIKeyInput';
import { useAIStore } from '../../stores';
import { AI_PROVIDERS } from '../../constants/models';
import type { NewsSource } from '../../types';

type SettingsTab = 'sources' | 'ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: NewsSource[];
  onToggleSource: (id: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
}

/**
 * Modal de configurações do app de notícias
 * Usa BaseModal padrão do projeto
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  sources,
  onToggleSource,
  onEnableAll,
  onDisableAll
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('sources');
  const provider = useAIStore((s) => s.aiSettings.provider);

  // Separar fontes por tipo
  const tribunais = useMemo(
    () => sources.filter(s => s.type === 'tribunal'),
    [sources]
  );
  const portais = useMemo(
    () => sources.filter(s => s.type === 'portal'),
    [sources]
  );

  // Contar fontes habilitadas
  const enabledCount = useMemo(
    () => sources.filter(s => s.enabled).length,
    [sources]
  );

  const footer = activeTab === 'sources' ? (
    <div className={CSS.modalFooter}>
      <button
        onClick={onDisableAll}
        className={CSS.btnSecondary}
      >
        Desabilitar todas
      </button>
      <button
        onClick={onEnableAll}
        className={CSS.btnBlue}
      >
        Habilitar todas
      </button>
      <div className="flex-1" />
      <button
        onClick={onClose}
        className={CSS.btnSecondary}
      >
        Fechar
      </button>
    </div>
  ) : (
    <div className={CSS.modalFooter}>
      <div className="flex-1" />
      <button
        onClick={onClose}
        className={CSS.btnSecondary}
      >
        Fechar
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações"
      subtitle={activeTab === 'sources'
        ? `${enabledCount} de ${sources.filter(s => s.feedUrl).length} fontes habilitadas`
        : `Provedor: ${AI_PROVIDERS[provider].name}`
      }
      icon={<Settings className="w-5 h-5 text-white" />}
      iconColor="blue"
      size="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TABS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex gap-2 p-1 theme-bg-tertiary rounded-xl">
          <button
            onClick={() => setActiveTab('sources')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'sources'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <Rss className="w-4 h-4" />
            Fontes RSS
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'ai'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <Brain className="w-4 h-4" />
            Configuração IA
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: FONTES RSS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            {/* PORTAIS JURÍDICOS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-blue-400" />
                <h3 className="font-medium theme-text-primary">Portais Jurídicos</h3>
                <span className="text-xs theme-text-muted">
                  ({portais.filter(s => s.enabled).length}/{portais.filter(s => s.feedUrl).length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {portais.map(source => (
                  <SourceToggle
                    key={source.id}
                    source={source}
                    onToggle={onToggleSource}
                  />
                ))}
              </div>
            </div>

            {/* TRIBUNAIS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-medium theme-text-primary">Tribunais</h3>
                <span className="text-xs theme-text-muted">
                  ({tribunais.filter(s => s.enabled).length}/{tribunais.filter(s => s.feedUrl).length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto pr-2">
                {tribunais.map(source => (
                  <SourceToggle
                    key={source.id}
                    source={source}
                    onToggle={onToggleSource}
                  />
                ))}
              </div>
            </div>

            {/* INFO */}
            <div className="theme-info-box p-3 rounded-lg text-xs theme-text-muted">
              <p>
                As fontes habilitadas serão usadas para buscar notícias via RSS.
                Algumas fontes podem não ter feed RSS disponível ou estar temporariamente
                indisponíveis - o sistema ignora silenciosamente essas falhas.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: CONFIGURAÇÃO IA */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* PROVEDOR */}
            <AIProviderSelector />

            {/* MODELO */}
            <ModelSelector />

            {/* API KEY DO PROVEDOR SELECIONADO */}
            <div className="p-4 theme-bg-tertiary rounded-xl space-y-4">
              <h4 className="text-sm font-medium theme-text-primary flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" />
                API Key - {AI_PROVIDERS[provider].name}
              </h4>
              <APIKeyInput
                provider={provider}
                label={`Chave API ${AI_PROVIDERS[provider].name}`}
                placeholder={getPlaceholderForProvider(provider)}
              />
            </div>

            {/* INFO */}
            <div className="theme-info-box p-3 rounded-lg text-xs theme-text-muted">
              <p>
                As API keys são compartilhadas com os outros apps do Sentencify (Analisador, Prova Oral).
                Alterar aqui atualiza em todos os apps automaticamente.
              </p>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

/**
 * Retorna placeholder adequado para cada provedor
 */
function getPlaceholderForProvider(provider: string): string {
  switch (provider) {
    case 'claude': return 'sk-ant-...';
    case 'gemini': return 'AIza...';
    case 'openai': return 'sk-...';
    case 'grok': return 'xai-...';
    default: return 'API Key...';
  }
}

/**
 * Toggle individual para fonte de notícias
 */
interface SourceToggleProps {
  source: NewsSource;
  onToggle: (id: string) => void;
}

const SourceToggle: React.FC<SourceToggleProps> = ({ source, onToggle }) => {
  const hasRss = !!source.feedUrl;

  return (
    <button
      onClick={hasRss ? () => onToggle(source.id) : undefined}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
        !hasRss
          ? 'theme-bg-tertiary border border-transparent cursor-not-allowed opacity-40'
          : source.enabled
            ? 'theme-bg-secondary border border-green-500/30'
            : 'theme-bg-tertiary border border-transparent opacity-60 hover:opacity-100'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
          !hasRss
            ? 'theme-bg-secondary border theme-border-modal'
            : source.enabled
              ? 'bg-green-500 text-white'
              : 'theme-bg-secondary border theme-border-modal'
        }`}
      >
        {!hasRss ? (
          <X className="w-3 h-3 theme-text-muted" />
        ) : source.enabled ? (
          <Check className="w-3 h-3" />
        ) : (
          <X className="w-3 h-3 theme-text-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm theme-text-primary truncate">
          {source.name}
        </p>
        <p className="text-xs theme-text-muted truncate">
          {hasRss
            ? source.websiteUrl ? new URL(source.websiteUrl).hostname : ''
            : 'RSS indisponível'
          }
        </p>
      </div>
    </button>
  );
};

export default SettingsModal;
