/**
 * @file AIAssistantComponents.tsx
 * @description Componentes de assistente de IA
 * @version 1.38.16
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 * Inclui AIAssistantBaseLegacy, AIAssistantBase, AIAssistantModal,
 * AIAssistantGlobalModal e AIAssistantModelModal.
 *
 * v1.38.12: Usa ContextScopeSelector unificado para controle granular de contexto
 * v1.38.16: Toggle bloqueado quando chat tem histórico (chatHistoryLength prop)
 */

import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { CSS } from '../modals/BaseModal';
import { ChatHistoryArea, ChatInput, InsertDropdown } from '../chat';
import { VoiceButton } from '../VoiceButton';
import { ContextScopeSelector } from '../ui/ContextScopeSelector';
import { KnowledgePackageSelector } from './KnowledgePackageSelector';
import { KnowledgePackagesManagerModal } from '../modals/KnowledgePackagesManagerModal';
import { useKnowledgePackages } from '../../hooks';
import { useAIIntegration } from '../../hooks';
import { useVoiceImprovement } from '../../hooks/useVoiceImprovement';
import { useAIStore } from '../../stores/useAIStore';
import type {
  AIAssistantBaseLegacyProps,
  AIAssistantBaseProps,
  AIAssistantModalProps,
  AIAssistantGlobalModalProps,
  AIAssistantModelModalProps,
  QuickPrompt,
  QuickPromptSubOption,
  ProofFile,
  ProofText
} from '../../types';
import { QuickPromptWithOptions } from './QuickPromptWithOptions';
import { collectProofDecisionData, buildProofDecisionPrompt } from '../../utils/proof-decision-helpers';
import { useProofsStore } from '../../stores/useProofsStore';
// v1.42.02: Web search opt-in no Assistente de Redação (Gemini only)
import { WebSearchToggle } from './WebSearchToggle';
import { providerSupportsWebSearch } from '../../utils/ai-tools/webSearch';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrai texto puro de HTML
 * @param html - String HTML para processar
 * @returns Texto plano sem tags HTML
 */
export const extractPlainText = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
};

/**
 * Verifica se uma prova é oral baseada no nome
 * @param proofName - Nome da prova
 * @returns true se for prova oral
 */
export const isOralProof = (proofName: string | undefined): boolean => {
  const keywords = ['audiência', 'audiencia', 'depoimento', 'testemunha', 'transcrição', 'transcricao', 'ata', 'oral', 'oitiva'];
  const nameLower = (proofName || '').toLowerCase();
  return keywords.some(kw => nameLower.includes(kw));
};

/**
 * Verifica se há provas orais vinculadas a um tópico
 * @param proofManager - Gerenciador de provas
 * @param topicTitle - Título do tópico
 * @returns true se houver provas orais vinculadas
 */
export const hasOralProofsForTopic = (
  proofManager: { proofTopicLinks?: Record<string, string[]>; proofFiles: ProofFile[]; proofTexts: ProofText[] } | null,
  topicTitle: string | undefined
): boolean => {
  if (!proofManager || !topicTitle) return false;
  const proofTopicLinks = proofManager.proofTopicLinks || {};
  const linkedProofIds = Object.keys(proofTopicLinks).filter(proofId =>
    proofTopicLinks[proofId]?.includes(topicTitle)
  );
  const allLinkedProofs = [
    ...(proofManager.proofFiles || []).filter((p: ProofFile) => linkedProofIds.includes(String(p.id))),
    ...(proofManager.proofTexts || []).filter((p: ProofText) => linkedProofIds.includes(String(p.id)))
  ];
  return allLinkedProofs.some(p => isOralProof(p.name));
};

// ═══════════════════════════════════════════════════════════════════════════════
// AI ASSISTANT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AIAssistantBaseLegacy - Base LEGACY para Assistentes IA (modo single-shot)
 * Usado por AIAssistantModelModal
 */
export const AIAssistantBaseLegacy = React.memo(({
  isOpen,
  onClose,
  aiInstruction,
  setAiInstruction,
  generatingAi,
  aiGeneratedText,
  onGenerateText,
  onInsertText,
  // Configurações opcionais
  title = 'Assistente de Redação IA',
  subtitle = 'Instrua a IA sobre o que você deseja escrever',
  zIndex = 60,
  placeholder = 'Ex: Escreva um parágrafo explicando por que as horas extras são devidas, considerando que havia controle de ponto irregular...',
  // Componente extra no topo do content (antes do campo de instruções)
  extraContent = null,
  // Exemplos personalizados (opcional)
  customExamples = null,
  // Controle de quais botões mostrar
  showInsertButtons = true,
  showCopyButton = true,
  sanitizeHTML = (html: string) => html || '',
}: AIAssistantBaseLegacyProps) => {
  const [copied, setCopied] = React.useState(false);

  // v1.38.5: Voice improvement com IA
  const aiSettings = useAIStore((state) => state.aiSettings);
  const { callAI } = useAIIntegration();
  const { improveText } = useVoiceImprovement({ callAI });

  const handleCopyText = React.useCallback(() => {
    // v1.25.18: Usar helper ao invés de DOM (memory leak fix)
    let plainText = extractPlainText(aiGeneratedText || '');
    plainText = plainText.replace(/\n{2,}/g, '\n').trim();
    navigator.clipboard.writeText(plainText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, [aiGeneratedText]);

  // v1.35.62: Handler para Voice-to-Text no campo de instruções
  const handleVoiceInstruction = React.useCallback((text: string) => {
    const current = aiInstruction || '';
    setAiInstruction(current + (current ? ' ' : '') + text);
  }, [aiInstruction, setAiInstruction]);

  // v1.35.64: ESC handler
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // v1.35.64: Bloquear scroll do body quando modal aberto
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Exemplos padrão
  const defaultExamples = (
    <ul className="text-xs theme-text-disabled space-y-1">
      <li>• "Escreva a fundamentação legal sobre horas extras"</li>
      <li>• "Argumente por que o vínculo empregatício deve ser reconhecido"</li>
      <li>• "Explique os requisitos para concessão de adicional de insalubridade"</li>
      <li>• "Conclua o tópico julgando procedente o pedido"</li>
      <li>• "Refute os argumentos da defesa sobre a jornada de trabalho"</li>
    </ul>
  );

  return (
    <div className={`${CSS.modalOverlay} overflow-auto`} style={{ zIndex }}>
      <div className={`${CSS.modalContainer} max-w-4xl w-full my-auto`}>
        {/* Header */}
        <div className={`${CSS.modalHeader} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs theme-text-muted mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          {/* v1.35.64: Botão X */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full theme-bg-secondary theme-hover-bg flex items-center justify-center theme-text-secondary transition-all border theme-border-modal hover:border-current"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aviso CNJ */}
        <div className="mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-amber-500">⚠️</span>
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <span className="font-semibold">Lembre-se:</span> A IA pode gerar conteúdo impreciso ou incompleto. Revise e valide todas as informações geradas.
              <span className="block mt-1 text-amber-800 dark:text-amber-300/80">Sua revisão é fundamental, na forma estabelecida pela <span className="font-semibold">Resolução 615/2025 do CNJ</span>.</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Conteúdo extra (ex: seletor de escopo) */}
          {extraContent}

          {/* Campo de Instruções */}
          <div>
            {/* v1.35.62: Label + VoiceButton */}
            <div className="flex items-center justify-between mb-2">
              <label className={CSS.label}>Sua Instrução para a IA</label>
              <VoiceButton
                onTranscript={handleVoiceInstruction}
                size="sm"
                idleText="Ditar"
                onError={(err: unknown) => console.warn('[VoiceToText]', err)}
                improveWithAI={aiSettings.voiceImprovement?.enabled}
                onImproveText={aiSettings.voiceImprovement?.enabled
                  ? (text) => improveText(text, aiSettings.voiceImprovement?.model || 'haiku')
                  : undefined
                }
              />
            </div>
            <textarea
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              className="w-full h-24 theme-bg-app border theme-border-input rounded-lg p-3 theme-text-primary resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              placeholder={placeholder}
            />
          </div>

          {/* Exemplos */}
          <div className="theme-bg-app-50 p-4 rounded-lg border theme-border-input">
            <p className="text-xs theme-text-muted mb-2">💡 Exemplos de instruções:</p>
            {customExamples || defaultExamples}
          </div>

          {/* Botão Gerar */}
          <button
            onClick={onGenerateText}
            disabled={generatingAi || !(aiInstruction || '').trim()}
            className="w-full py-3 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-white bg-gradient-to-r from-purple-600 to-blue-600 hover-gradient-purple-blue-darker transition-all duration-300"
          >
            {generatingAi ? (
              <>
                <div className={CSS.spinner}></div>
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar Texto
              </>
            )}
          </button>

          {/* Texto Gerado + Botões de Ação */}
          {aiGeneratedText && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-green-600 dark:text-green-400">
                ✓ Texto Gerado pela IA:
              </label>
              <div
                className="theme-bg-app border border-green-600/30 rounded-lg p-4 max-h-64 overflow-auto theme-text-secondary leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(aiGeneratedText) }}
              />
              <div className={`grid gap-2 ${showInsertButtons && showCopyButton ? 'grid-cols-4' : showInsertButtons ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {showInsertButtons && (
                  <>
                    <button
                      onClick={() => onInsertText('replace')}
                      className="py-2 rounded-lg text-sm bg-amber-600 hover-amber-700-from-600"
                    >
                      Substituir Tudo
                    </button>
                    <button
                      onClick={() => onInsertText('prepend')}
                      className="py-2 rounded-lg text-sm bg-blue-600 text-white hover-blue-700"
                    >
                      Adicionar no Início
                    </button>
                    <button
                      onClick={() => onInsertText('append')}
                      className="py-2 rounded-lg text-sm bg-green-600 text-white hover-green-700-from-600"
                    >
                      Adicionar no Final
                    </button>
                  </>
                )}
                {showCopyButton && (
                  <button
                    onClick={handleCopyText}
                    disabled={copied}
                    className={`py-2 rounded-lg text-sm ${copied ? 'bg-green-600' : 'theme-bg-tertiary hover-slate-500'}`}
                  >
                    {copied ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={CSS.modalFooter}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg font-medium theme-bg-tertiary hover-slate-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
});

AIAssistantBaseLegacy.displayName = 'AIAssistantBaseLegacy';

/**
 * AIAssistantBase - Base para Assistentes IA com CHAT INTERATIVO
 */
export const AIAssistantBase = React.memo(({
  isOpen,
  onClose,
  chatHistory,
  onSendMessage,
  onInsertResponse,
  generating,
  onClear,
  lastResponse,
  // Configurações opcionais
  title = 'Assistente de Redação IA',
  subtitle = null,
  zIndex = 60,
  placeholder = 'Digite sua mensagem...',
  extraContent = null,
  showInsertButtons = true,
  sanitizeHTML = (html: string) => html || '',
  quickPrompts = [],  // v1.20.0: Prompts rápidos
  topicTitle = '',    // v1.21.1: Título do tópico para substituição em quick prompts
  onQuickPromptClick = null, // v1.21.1: Handler opcional para quick prompts (permite validação)
  onSubOptionSelect = null,  // v1.40.XX: Handler para quickprompts com sub-opções
  qpError = null,     // v1.21.2: Estado de erro para mostrar no botão do quick prompt
}: AIAssistantBaseProps) => {
  // Bloquear scroll do body quando modal está aberto
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // ESC handler
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInsert = (mode: 'replace' | 'prepend' | 'append') => {
    if (lastResponse) onInsertResponse(mode);
  };

  return (
    <div className={`${CSS.modalOverlay} overflow-auto`} style={{ zIndex }}>
      <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal max-w-4xl w-full my-auto`}>
        {/* Header */}
        <div className={CSS.modalHeader}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold theme-text-primary">{title}</h3>
                {subtitle && <p className="text-sm theme-text-muted">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl theme-bg-secondary-50 theme-hover-bg transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5 theme-text-tertiary" />
            </button>
          </div>
        </div>

        {/* Content - v1.36.48: Aviso CNJ e escopo agora dentro do scroll */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Aviso CNJ */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-amber-500">⚠️</span>
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <span className="font-semibold">Lembre-se:</span> A IA pode gerar conteúdo impreciso. Revise todas as informações.
                <span className="block mt-1 text-amber-800 dark:text-amber-300/80">
                  Revisão obrigatória conforme <span className="font-semibold">Resolução 615/2025 do CNJ</span>.
                </span>
              </div>
            </div>
          </div>

          {/* Conteúdo extra (ex: seletor de escopo) */}
          {extraContent && <div>{extraContent}</div>}
          {/* Área de Chat */}
          <div className="border theme-border-input rounded-lg">
            <div className="flex items-center justify-between px-4 py-2 border-b theme-border-input theme-bg-secondary">
              <span className="text-sm font-medium theme-text-secondary">💬 Conversa</span>
              {chatHistory.length > 0 && (
                <button onClick={onClear} className="text-xs theme-text-muted hover-text-red-400">
                  Limpar
                </button>
              )}
            </div>
            <ChatHistoryArea
              history={chatHistory}
              generating={generating}
              onUseMessage={() => onInsertResponse('append')}
              showUseButtons={showInsertButtons}
              sanitizeHTML={sanitizeHTML}
            />
          </div>

          {/* v1.20.0: Prompts Rápidos */}
          {quickPrompts?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs theme-text-muted w-full mb-1">⚡ Prompts rápidos:</span>
              {quickPrompts.map((qp: QuickPrompt) => {
                const resolvedPrompt = qp.prompt.replace(/\{TOPICO\}/g, topicTitle || 'tópico atual');
                const isError = qpError?.id === qp.id;

                // v1.40.XX: QuickPrompts com sub-opções usam dropdown
                if (qp.subOptions && qp.subOptions.length > 0 && onSubOptionSelect) {
                  return (
                    <QuickPromptWithOptions
                      key={qp.id}
                      quickPrompt={qp}
                      onSelect={onSubOptionSelect}
                      disabled={generating}
                      isError={isError}
                      errorMessage={qpError?.message}
                    />
                  );
                }

                // QuickPrompts normais
                return (
                  <button
                    key={qp.id}
                    onClick={() => {
                      // v1.21.1: Se onQuickPromptClick existe, usa para validação; senão, envia direto
                      if (onQuickPromptClick) {
                        onQuickPromptClick(qp, resolvedPrompt);
                      } else {
                        onSendMessage(resolvedPrompt);
                      }
                    }}
                    disabled={generating || isError}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      isError
                        ? 'bg-red-500/20 border-red-500 text-red-400 cursor-not-allowed'
                        : 'hover-quick-prompt theme-bg-secondary text-blue-600 dark:text-blue-400 theme-border-input disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                    title={isError ? qpError.message : resolvedPrompt}
                  >
                    {isError ? <>⚠️ {qpError.message}</> : <>{qp.icon} {qp.label}</>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Input de Chat */}
          <ChatInput onSend={onSendMessage} disabled={generating} placeholder={placeholder} />

          {/* Exemplos (apenas se chat vazio) */}
          {chatHistory.length === 0 && (
            <div className="theme-bg-app-50 p-4 rounded-lg border theme-border-input">
              <p className="text-xs theme-text-muted mb-2">💡 Exemplos:</p>
              <ul className="text-xs theme-text-disabled space-y-1">
                <li>• "Escreva a fundamentação sobre horas extras"</li>
                <li>• "Argumente pelo reconhecimento do vínculo"</li>
                <li>• "Refute a defesa sobre jornada de trabalho"</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${CSS.modalFooter} justify-between`}>
          <InsertDropdown onInsert={handleInsert} disabled={!lastResponse} />
          <button onClick={onClose} className="px-6 py-2 rounded-lg font-medium theme-bg-tertiary hover-slate-500">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
});
AIAssistantBase.displayName = 'AIAssistantBase';

/**
 * AIAssistantModal - Wrapper com seletor de escopo e CHAT INTERATIVO para Editor de Tópicos
 * v1.38.12: Usa ContextScopeSelector unificado com 3 opções de escopo + toggle de documentos
 */
export const AIAssistantModal = React.memo(({
  isOpen,
  onClose,
  contextScope,
  setContextScope,
  topicTitle,
  // Props do chat
  chatHistory,
  onSendMessage,
  onInsertResponse,
  generating,
  onClear,
  lastResponse,
  sanitizeHTML = (html: string) => html || '',
  quickPrompts = [],  // v1.20.0
  proofManager = null,  // v1.21.1: Para validação de provas orais
  // v1.38.12: Novas props para controle granular de contexto
  allTopics = [],
  selectedContextTopics: externalSelectedTopics,
  setSelectedContextTopics: externalSetSelectedTopics,
  includeMainDocs: externalIncludeMainDocs,
  setIncludeMainDocs: externalSetIncludeMainDocs,
  // v1.39.06: Toggle "Incluir documentos complementares" no chat
  includeComplementaryDocs: externalIncludeComplementaryDocs,
  setIncludeComplementaryDocs: externalSetIncludeComplementaryDocs
}: AIAssistantModalProps) => {
  // v1.21.2: Estado para erro no botão do quick prompt
  const [qpError, setQpError] = React.useState<{ id: string; message: string } | null>(null);

  // v1.40.34: Pacotes de conhecimento
  const knowledgePackages = useKnowledgePackages();
  const [selectedPackageId, setSelectedPackageId] = React.useState<string | null>(null);
  const [showPackageManager, setShowPackageManager] = React.useState(false);

  // v1.38.12: Estados locais que resetam ao reabrir modal (se não fornecidos externamente)
  const [localSelectedTopics, setLocalSelectedTopics] = React.useState<string[]>([]);
  const [localIncludeMainDocs, setLocalIncludeMainDocs] = React.useState(true);
  const [localIncludeComplementaryDocs, setLocalIncludeComplementaryDocs] = React.useState(false);  // v1.39.06

  // v1.42.02: Toggle opt-in de web search (Gemini only, default OFF, não persistido entre aberturas)
  const [webSearchEnabled, setWebSearchEnabled] = React.useState(false);
  const aiSettingsForWebSearch = useAIStore((s) => s.aiSettings);
  const webSearchProvider = aiSettingsForWebSearch?.provider || 'claude';
  const webSearchAnonActive = !!aiSettingsForWebSearch?.anonymization?.enabled;
  const showWebSearchToggle = providerSupportsWebSearch(webSearchProvider);

  // Usar props externas se fornecidas, senão usar estado local
  const selectedContextTopics = externalSelectedTopics ?? localSelectedTopics;
  const setSelectedContextTopics = externalSetSelectedTopics ?? setLocalSelectedTopics;
  const includeMainDocs = externalIncludeMainDocs ?? localIncludeMainDocs;
  const setIncludeMainDocs = externalSetIncludeMainDocs ?? setLocalIncludeMainDocs;
  const includeComplementaryDocs = externalIncludeComplementaryDocs ?? localIncludeComplementaryDocs;  // v1.39.06
  const setIncludeComplementaryDocs = externalSetIncludeComplementaryDocs ?? setLocalIncludeComplementaryDocs;  // v1.39.06

  // v1.38.12: Resetar estados locais ao reabrir modal
  // v1.42.02: Também reseta webSearchEnabled → default OFF em cada abertura
  React.useEffect(() => {
    if (isOpen) {
      if (!externalSelectedTopics) setLocalSelectedTopics([]);
      if (externalIncludeMainDocs === undefined) setLocalIncludeMainDocs(true);
      if (externalIncludeComplementaryDocs === undefined) setLocalIncludeComplementaryDocs(false);  // v1.39.06
      setWebSearchEnabled(false);
    }
  }, [isOpen, externalSelectedTopics, externalIncludeMainDocs, externalIncludeComplementaryDocs]);

  // v1.38.12: Handler para quick prompts com validação - passa opções de contexto
  // v1.39.06: Inclui includeComplementaryDocs
  const handleQuickPromptClick = React.useCallback((qp: QuickPrompt, resolvedPrompt: string) => {
    const options: { proofFilter?: string; includeMainDocs?: boolean; includeComplementaryDocs?: boolean; selectedContextTopics?: string[]; webSearch?: boolean } = {
      includeMainDocs,
      includeComplementaryDocs,
      selectedContextTopics: contextScope === 'selected' ? selectedContextTopics : undefined,
      webSearch: webSearchEnabled && !webSearchAnonActive,
    };

    if (qp.proofFilter === 'oral') {
      const hasOral = hasOralProofsForTopic(proofManager, topicTitle);
      if (!hasOral) {
        // Mostrar erro no próprio botão por 3 segundos
        setQpError({ id: qp.id, message: 'Prova oral não vinculada' });
        setTimeout(() => setQpError(null), 3000);
        return;
      }
      onSendMessage(resolvedPrompt, { ...options, proofFilter: 'oral' });
    } else {
      onSendMessage(resolvedPrompt, options);
    }
  }, [proofManager, topicTitle, onSendMessage, includeMainDocs, includeComplementaryDocs, contextScope, selectedContextTopics, webSearchEnabled, webSearchAnonActive]);

  // v1.38.12: Handler para mensagens normais - passa opções de contexto
  // v1.39.06: Inclui includeComplementaryDocs
  // v1.40.34: Inclui knowledgePackage selecionado
  const selectedPackage = React.useMemo(
    () => knowledgePackages.packages.find(p => p.id === selectedPackageId) ?? null,
    [knowledgePackages.packages, selectedPackageId]
  );

  const handleSendMessage = React.useCallback((message: string, extraOptions?: { proofFilter?: string }) => {
    const options = {
      ...extraOptions,
      includeMainDocs,
      includeComplementaryDocs,
      selectedContextTopics: contextScope === 'selected' ? selectedContextTopics : undefined,
      knowledgePackage: selectedPackage,
      // v1.42.02: Propaga flag de web search (bloqueia se anonimização ativa — 2ª camada)
      webSearch: webSearchEnabled && !webSearchAnonActive,
    };
    onSendMessage(message, options);
  }, [onSendMessage, includeMainDocs, includeComplementaryDocs, contextScope, selectedContextTopics, selectedPackage, webSearchEnabled, webSearchAnonActive]);

  // v1.40.XX: Handler para quickprompts com sub-opções (ex: Decidir com Provas)
  const proofAnalysisResults = useProofsStore((s) => s.proofAnalysisResults);
  const proofConclusions = useProofsStore((s) => s.proofConclusions);

  const handleSubOptionSelect = React.useCallback((qp: QuickPrompt, subOption: QuickPromptSubOption) => {
    if (qp.specialHandler === 'proof-decision') {
      // Preparar dados de provas para coleta
      const proofData = proofManager ? {
        proofTopicLinks: proofManager.proofTopicLinks,
        proofFiles: proofManager.proofFiles,
        proofTexts: proofManager.proofTexts,
        proofAnalysisResults,
        proofConclusions
      } : null;

      const { data, proofCount, hasData } = collectProofDecisionData(
        proofData,
        topicTitle || '',
        subOption.proofDataMode
      );

      // Validações
      if (proofCount === 0) {
        setQpError({ id: qp.id, message: 'Nenhuma prova vinculada' });
        setTimeout(() => setQpError(null), 3000);
        return;
      }

      if (!hasData) {
        const errorMsg = subOption.proofDataMode === 'conclusions_only'
          ? 'Nenhuma conclusao registrada'
          : 'Sem dados de provas';
        setQpError({ id: qp.id, message: errorMsg });
        setTimeout(() => setQpError(null), 3000);
        return;
      }

      // Construir e enviar prompt
      const prompt = buildProofDecisionPrompt(topicTitle || '', data, subOption.proofDataMode);
      const options = {
        includeMainDocs,
        includeComplementaryDocs,
        selectedContextTopics: contextScope === 'selected' ? selectedContextTopics : undefined
      };
      onSendMessage(prompt, options);
    }
  }, [proofManager, topicTitle, proofAnalysisResults, proofConclusions, onSendMessage, includeMainDocs, includeComplementaryDocs, contextScope, selectedContextTopics]);

  // v1.38.12: Usa ContextScopeSelector unificado
  // v1.38.16: Passa chatHistoryLength para bloquear toggle quando chat tem histórico
  // v1.39.06: Passa includeComplementaryDocs
  // v1.40.34: Adiciona KnowledgePackageSelector acima do ContextScopeSelector
  const extraContent = (
    <>
      <KnowledgePackageSelector
        packages={knowledgePackages.packages}
        selectedPackageId={selectedPackageId}
        onSelect={setSelectedPackageId}
        disabled={chatHistory.length > 0}
        onManage={() => setShowPackageManager(true)}
      />
      <ContextScopeSelector
        contextScope={contextScope}
        setContextScope={setContextScope}
        allTopics={allTopics}
        currentTopicTitle={topicTitle || ''}
        selectedContextTopics={selectedContextTopics}
        setSelectedContextTopics={setSelectedContextTopics}
        includeMainDocs={includeMainDocs}
        setIncludeMainDocs={setIncludeMainDocs}
        includeComplementaryDocs={includeComplementaryDocs}
        setIncludeComplementaryDocs={setIncludeComplementaryDocs}
        chatHistoryLength={chatHistory.length}
        extraSlot={
          showWebSearchToggle ? (
            <WebSearchToggle
              enabled={webSearchEnabled}
              onToggle={setWebSearchEnabled}
              disabled={webSearchAnonActive}
            />
          ) : undefined
        }
      />
    </>
  );

  return (
    <>
      <AIAssistantBase
        isOpen={isOpen}
        onClose={onClose}
        chatHistory={chatHistory}
        onSendMessage={handleSendMessage}
        onInsertResponse={onInsertResponse}
        generating={generating}
        onClear={onClear}
        lastResponse={lastResponse}
        zIndex={60}
        subtitle={topicTitle ? <>Tópico: <span className="font-semibold text-purple-400">{topicTitle}</span></> : null}
        extraContent={extraContent}
        sanitizeHTML={sanitizeHTML}
        quickPrompts={quickPrompts}
        topicTitle={topicTitle}
        onQuickPromptClick={handleQuickPromptClick}
        onSubOptionSelect={handleSubOptionSelect}
        qpError={qpError}
      />
      <KnowledgePackagesManagerModal
        isOpen={showPackageManager}
        onClose={() => setShowPackageManager(false)}
        knowledgePackages={knowledgePackages}
      />
    </>
  );
});

AIAssistantModal.displayName = 'AIAssistantModal';

/**
 * AIAssistantGlobalModal - Para Editor Global com CHAT INTERATIVO
 * v1.38.12: Usa ContextScopeSelector unificado com 3 opções de escopo + toggle de documentos
 */
export const AIAssistantGlobalModal = React.memo(({
  isOpen,
  onClose,
  contextScope,
  setContextScope,
  topicTitle,
  // Props do chat
  chatHistory,
  onSendMessage,
  onInsertResponse,
  generating,
  onClear,
  lastResponse,
  sanitizeHTML = (html: string) => html || '',
  quickPrompts = [],  // v1.20.0
  proofManager = null,  // v1.21.1: Para validação de provas orais
  // v1.38.12: Novas props para controle granular de contexto
  allTopics = [],
  selectedContextTopics: externalSelectedTopics,
  setSelectedContextTopics: externalSetSelectedTopics,
  includeMainDocs: externalIncludeMainDocs,
  setIncludeMainDocs: externalSetIncludeMainDocs,
  // v1.39.06: Toggle "Incluir documentos complementares" no chat
  includeComplementaryDocs: externalIncludeComplementaryDocs,
  setIncludeComplementaryDocs: externalSetIncludeComplementaryDocs
}: AIAssistantGlobalModalProps) => {
  // v1.21.2: Estado para erro no botão do quick prompt
  const [qpError, setQpError] = React.useState<{ id: string; message: string } | null>(null);

  // v1.40.34: Pacotes de conhecimento
  const knowledgePackages = useKnowledgePackages();
  const [selectedPackageId, setSelectedPackageId] = React.useState<string | null>(null);
  const [showPackageManager, setShowPackageManager] = React.useState(false);

  // v1.38.12: Estados locais que resetam ao reabrir modal (se não fornecidos externamente)
  const [localSelectedTopics, setLocalSelectedTopics] = React.useState<string[]>([]);
  const [localIncludeMainDocs, setLocalIncludeMainDocs] = React.useState(true);
  const [localIncludeComplementaryDocs, setLocalIncludeComplementaryDocs] = React.useState(false);  // v1.39.06

  // v1.42.02: Toggle opt-in de web search (Gemini only, default OFF, não persistido entre aberturas)
  const [webSearchEnabled, setWebSearchEnabled] = React.useState(false);
  const aiSettingsForWebSearch = useAIStore((s) => s.aiSettings);
  const webSearchProvider = aiSettingsForWebSearch?.provider || 'claude';
  const webSearchAnonActive = !!aiSettingsForWebSearch?.anonymization?.enabled;
  const showWebSearchToggle = providerSupportsWebSearch(webSearchProvider);

  // Usar props externas se fornecidas, senão usar estado local
  const selectedContextTopics = externalSelectedTopics ?? localSelectedTopics;
  const setSelectedContextTopics = externalSetSelectedTopics ?? setLocalSelectedTopics;
  const includeMainDocs = externalIncludeMainDocs ?? localIncludeMainDocs;
  const setIncludeMainDocs = externalSetIncludeMainDocs ?? setLocalIncludeMainDocs;
  const includeComplementaryDocs = externalIncludeComplementaryDocs ?? localIncludeComplementaryDocs;  // v1.39.06
  const setIncludeComplementaryDocs = externalSetIncludeComplementaryDocs ?? setLocalIncludeComplementaryDocs;  // v1.39.06

  // v1.38.12: Resetar estados locais ao reabrir modal
  // v1.42.02: Também reseta webSearchEnabled → default OFF em cada abertura
  React.useEffect(() => {
    if (isOpen) {
      if (!externalSelectedTopics) setLocalSelectedTopics([]);
      if (externalIncludeMainDocs === undefined) setLocalIncludeMainDocs(true);
      if (externalIncludeComplementaryDocs === undefined) setLocalIncludeComplementaryDocs(false);  // v1.39.06
      setWebSearchEnabled(false);
    }
  }, [isOpen, externalSelectedTopics, externalIncludeMainDocs, externalIncludeComplementaryDocs]);

  // v1.38.12: Handler para quick prompts com validação - passa opções de contexto
  // v1.39.06: Inclui includeComplementaryDocs
  const handleQuickPromptClick = React.useCallback((qp: QuickPrompt, resolvedPrompt: string) => {
    const options: { proofFilter?: string; includeMainDocs?: boolean; includeComplementaryDocs?: boolean; selectedContextTopics?: string[]; webSearch?: boolean } = {
      includeMainDocs,
      includeComplementaryDocs,
      selectedContextTopics: contextScope === 'selected' ? selectedContextTopics : undefined,
      webSearch: webSearchEnabled && !webSearchAnonActive,
    };

    if (qp.proofFilter === 'oral') {
      const hasOral = hasOralProofsForTopic(proofManager, topicTitle);
      if (!hasOral) {
        // Mostrar erro no próprio botão por 3 segundos
        setQpError({ id: qp.id, message: 'Prova oral não vinculada' });
        setTimeout(() => setQpError(null), 3000);
        return;
      }
      onSendMessage(resolvedPrompt, { ...options, proofFilter: 'oral' });
    } else {
      onSendMessage(resolvedPrompt, options);
    }
  }, [proofManager, topicTitle, onSendMessage, includeMainDocs, includeComplementaryDocs, contextScope, selectedContextTopics, webSearchEnabled, webSearchAnonActive]);

  // v1.38.12: Handler para mensagens normais - passa opções de contexto
  // v1.39.06: Inclui includeComplementaryDocs
  // v1.40.34: Inclui knowledgePackage selecionado
  const selectedPackage = React.useMemo(
    () => knowledgePackages.packages.find(p => p.id === selectedPackageId) ?? null,
    [knowledgePackages.packages, selectedPackageId]
  );

  const handleSendMessage = React.useCallback((message: string, extraOptions?: { proofFilter?: string }) => {
    const options = {
      ...extraOptions,
      includeMainDocs,
      includeComplementaryDocs,
      selectedContextTopics: contextScope === 'selected' ? selectedContextTopics : undefined,
      knowledgePackage: selectedPackage,
      // v1.42.02: Propaga flag de web search (bloqueia se anonimização ativa — 2ª camada)
      webSearch: webSearchEnabled && !webSearchAnonActive,
    };
    onSendMessage(message, options);
  }, [onSendMessage, includeMainDocs, includeComplementaryDocs, contextScope, selectedContextTopics, selectedPackage, webSearchEnabled, webSearchAnonActive]);

  // v1.40.XX: Handler para quickprompts com sub-opções (ex: Decidir com Provas)
  const proofAnalysisResultsGlobal = useProofsStore((s) => s.proofAnalysisResults);
  const proofConclusionsGlobal = useProofsStore((s) => s.proofConclusions);

  const handleSubOptionSelectGlobal = React.useCallback((qp: QuickPrompt, subOption: QuickPromptSubOption) => {
    if (qp.specialHandler === 'proof-decision') {
      // Preparar dados de provas para coleta
      const proofData = proofManager ? {
        proofTopicLinks: proofManager.proofTopicLinks,
        proofFiles: proofManager.proofFiles,
        proofTexts: proofManager.proofTexts,
        proofAnalysisResults: proofAnalysisResultsGlobal,
        proofConclusions: proofConclusionsGlobal
      } : null;

      const { data, proofCount, hasData } = collectProofDecisionData(
        proofData,
        topicTitle || '',
        subOption.proofDataMode
      );

      // Validações
      if (proofCount === 0) {
        setQpError({ id: qp.id, message: 'Nenhuma prova vinculada' });
        setTimeout(() => setQpError(null), 3000);
        return;
      }

      if (!hasData) {
        const errorMsg = subOption.proofDataMode === 'conclusions_only'
          ? 'Nenhuma conclusao registrada'
          : 'Sem dados de provas';
        setQpError({ id: qp.id, message: errorMsg });
        setTimeout(() => setQpError(null), 3000);
        return;
      }

      // Construir e enviar prompt
      const prompt = buildProofDecisionPrompt(topicTitle || '', data, subOption.proofDataMode);
      const options = {
        includeMainDocs,
        includeComplementaryDocs,
        selectedContextTopics: contextScope === 'selected' ? selectedContextTopics : undefined
      };
      onSendMessage(prompt, options);
    }
  }, [proofManager, topicTitle, proofAnalysisResultsGlobal, proofConclusionsGlobal, onSendMessage, includeMainDocs, includeComplementaryDocs, contextScope, selectedContextTopics]);

  // v1.38.12: Usa ContextScopeSelector unificado
  // v1.38.16: Passa chatHistoryLength para bloquear toggle quando chat tem histórico
  // v1.39.06: Passa includeComplementaryDocs
  // v1.40.34: Adiciona KnowledgePackageSelector acima do ContextScopeSelector
  const extraContent = (
    <>
      <KnowledgePackageSelector
        packages={knowledgePackages.packages}
        selectedPackageId={selectedPackageId}
        onSelect={setSelectedPackageId}
        disabled={chatHistory.length > 0}
        onManage={() => setShowPackageManager(true)}
      />
      <ContextScopeSelector
        contextScope={contextScope}
        setContextScope={setContextScope}
        allTopics={allTopics}
        currentTopicTitle={topicTitle || ''}
        selectedContextTopics={selectedContextTopics}
        setSelectedContextTopics={setSelectedContextTopics}
        includeMainDocs={includeMainDocs}
        setIncludeMainDocs={setIncludeMainDocs}
        includeComplementaryDocs={includeComplementaryDocs}
        setIncludeComplementaryDocs={setIncludeComplementaryDocs}
        chatHistoryLength={chatHistory.length}
        extraSlot={
          showWebSearchToggle ? (
            <WebSearchToggle
              enabled={webSearchEnabled}
              onToggle={setWebSearchEnabled}
              disabled={webSearchAnonActive}
            />
          ) : undefined
        }
      />
    </>
  );

  return (
    <>
      <AIAssistantBase
        isOpen={isOpen}
        onClose={onClose}
        chatHistory={chatHistory}
        onSendMessage={handleSendMessage}
        onInsertResponse={onInsertResponse}
        generating={generating}
        onClear={onClear}
        lastResponse={lastResponse}
        zIndex={70}
        subtitle={<>Tópico: <span className="font-semibold text-purple-400">{topicTitle}</span></>}
        extraContent={extraContent}
        sanitizeHTML={sanitizeHTML}
        quickPrompts={quickPrompts}
        topicTitle={topicTitle}
        onQuickPromptClick={handleQuickPromptClick}
        onSubOptionSelect={handleSubOptionSelectGlobal}
        qpError={qpError}
      />
      <KnowledgePackagesManagerModal
        isOpen={showPackageManager}
        onClose={() => setShowPackageManager(false)}
        knowledgePackages={knowledgePackages}
      />
    </>
  );
});

AIAssistantGlobalModal.displayName = 'AIAssistantGlobalModal';

/**
 * AIAssistantModelModal - Wrapper para modelos (usa Legacy - single-shot, não chat)
 */
export const AIAssistantModelModal = React.memo(({
  isOpen,
  onClose,
  aiInstructionModel,
  setAiInstructionModel,
  generatingAiModel,
  aiGeneratedTextModel,
  onGenerateText,
  onInsertText,
  sanitizeHTML = (html: string) => html || ''
}: AIAssistantModelModalProps) => {
  // Exemplos específicos para criação de modelos
  const modelExamples = (
    <ul className="text-xs theme-text-disabled space-y-1">
      <li>• "Escreva um modelo genérico de fundamentação sobre reconhecimento de vínculo empregatício"</li>
      <li>• "Crie um parágrafo padrão explicando os requisitos da CLT para horas extras"</li>
      <li>• "Desenvolva um modelo de conclusão julgando procedente pedido de adicional de insalubridade"</li>
      <li>• "Elabore um texto padrão sobre prescrição bienal"</li>
      <li>• "Redija um modelo de fundamentação sobre rescisão indireta"</li>
    </ul>
  );

  // v1.19.0: Usa versão Legacy para manter comportamento single-shot (não chat)
  return (
    <AIAssistantBaseLegacy
      isOpen={isOpen}
      onClose={onClose}
      aiInstruction={aiInstructionModel}
      setAiInstruction={setAiInstructionModel}
      generatingAi={generatingAiModel}
      aiGeneratedText={aiGeneratedTextModel}
      onGenerateText={onGenerateText}
      onInsertText={onInsertText}
      zIndex={60}
      title="Assistente de Redação IA - Modelos"
      subtitle="Instrua a IA sobre o que você deseja escrever no modelo"
      placeholder="Ex: Escreva um modelo de fundamentação sobre horas extras que possa ser adaptado para diferentes casos..."
      customExamples={modelExamples}
      sanitizeHTML={sanitizeHTML}
    />
  );
});

AIAssistantModelModal.displayName = 'AIAssistantModelModal';
