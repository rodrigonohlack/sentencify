/**
 * @file GlobalEditorSection.tsx
 * @description Seção de editor global para tópico individual
 * @version 1.36.97
 *
 * Extraído de App.tsx para modularização.
 * Usado no GlobalEditorModal para edição de cada tópico.
 *
 * @usedBy GlobalEditorModal
 */

import React from 'react';
import { ChevronDown, Scale, Sparkles } from 'lucide-react';
import { FieldEditor, InlineFormattingToolbar } from './FieldEditor';
import { VoiceButton } from '../VoiceButton';
import { VersionSelect } from '../version';
import { useAIStore } from '../../stores/useAIStore';
import { useAIIntegration } from '../../hooks';
import { useVoiceImprovement } from '../../hooks/useVoiceImprovement';
import type { GlobalEditorSectionProps, FieldEditorRef } from '../../types';

/**
 * GlobalEditorSection - Seção de edição de um tópico no editor global
 *
 * @param topic - Tópico sendo editado
 * @param topicIndex - Índice do tópico na lista
 * @param onFieldChange - Callback para mudança de campo
 * @param onFieldFocus - Callback para foco no campo
 * @param onSlashCommand - Callback para comando slash
 * @param quillReady - Se Quill está pronto
 * @param quillError - Erro do Quill (se houver)
 * @param editorTheme - Tema do editor ('dark' ou 'light')
 * @param onOpenAIAssistant - Callback para abrir assistente IA
 * @param onOpenProofsModal - Callback para abrir modal de provas
 * @param onOpenJurisModal - Callback para abrir modal de jurisprudência
 * @param onOpenFactsComparison - Callback para abrir confronto de fatos
 * @param linkedProofsCount - Quantidade de provas vinculadas
 * @param isCollapsed - Se seção está colapsada
 * @param onToggleCollapse - Callback para toggle collapse
 * @param versioning - Sistema de versionamento
 */
const GlobalEditorSection: React.FC<GlobalEditorSectionProps> = ({
  topic,
  topicIndex,
  onFieldChange,
  onFieldFocus,
  onSlashCommand,
  quillReady,
  quillError,
  editorTheme = 'dark',
  onOpenAIAssistant = null,
  onOpenProofsModal = null,
  onOpenJurisModal = null,
  onOpenFactsComparison = null,
  linkedProofsCount = 0,
  isCollapsed = false,
  onToggleCollapse = null,
  versioning = null
}) => {
  const titleUpper = topic.title.toUpperCase();
  const isRelatorio = titleUpper === 'RELATÓRIO';
  const isDispositivo = titleUpper === 'DISPOSITIVO';

  // v1.20.4: Ref para toolbar inline no campo Decisão
  const fundamentacaoEditorRef = React.useRef<FieldEditorRef | null>(null);

  // v1.37.88: Voice improvement com IA
  // v1.37.90: Usa callAI do useAIIntegration para tracking de tokens
  const aiSettings = useAIStore((state) => state.aiSettings);
  const { callAI } = useAIIntegration();
  const { improveText } = useVoiceImprovement({ callAI });

  return (
    <div className="global-editor-section mb-6 border theme-border-secondary rounded-lg overflow-hidden">
      {/* Header fixo do tópico - CLICÁVEL PARA COLAPSAR */}
      <div
        className="px-4 py-3 theme-bg-tertiary border-b theme-border-secondary flex items-center gap-3 cursor-pointer select-none"
        onClick={() => onToggleCollapse?.(topicIndex)}
      >
        <ChevronDown className={`w-4 h-4 theme-text-secondary transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
        <span className="font-bold theme-text-primary text-lg">{topic.title}</span>
        {!isRelatorio && !isDispositivo && topic.category && (
          <span className="px-2 py-0.5 text-xs rounded theme-bg-purple-accent theme-text-purple border border-purple-500/30">
            {topic.category}
          </span>
        )}
        {/* v1.12.14: Botão Provas Vinculadas - apenas se houver provas */}
        {!isRelatorio && !isDispositivo && linkedProofsCount > 0 && onOpenProofsModal && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenProofsModal(topicIndex); }}
            className="ml-auto hover-green-700 px-2 py-1 text-white text-xs rounded flex items-center gap-1 bg-green-600"
            title="Ver Provas Vinculadas"
          >
            <Scale className="w-3 h-3" />
            Provas ({linkedProofsCount})
          </button>
        )}
      </div>

      {/* Editores dos campos - COLAPSÁVEL */}
      {!isCollapsed && (
        <div className="p-4 space-y-4 theme-bg-secondary">
          {isRelatorio ? (
            // RELATÓRIO: apenas editedRelatorio
            <FieldEditor
              label="Relatório"
              fieldType="relatorio"
              content={topic.editedRelatorio || topic.relatorio || ''}
              onChange={(html: string) => onFieldChange(topicIndex, 'editedRelatorio', html)}
              onFocus={() => onFieldFocus?.(topicIndex, 'relatorio', null)}
              onSlashCommand={onSlashCommand}
              quillReady={quillReady}
              quillError={quillError}
              minHeight="200px"
              editorTheme={editorTheme}
            />
          ) : isDispositivo ? (
            // DISPOSITIVO: apenas editedContent
            <FieldEditor
              label="Dispositivo"
              fieldType="dispositivo"
              content={topic.editedContent || ''}
              onChange={(html: string) => onFieldChange(topicIndex, 'editedContent', html)}
              onFocus={() => onFieldFocus?.(topicIndex, 'dispositivo', null)}
              onSlashCommand={onSlashCommand}
              quillReady={quillReady}
              quillError={quillError}
              minHeight="200px"
              editorTheme={editorTheme}
            />
          ) : (
            // Tópico normal: mini-relatório + decisão
            <>
              <FieldEditor
                label="Mini-Relatório"
                fieldType="relatorio"
                content={topic.editedRelatorio || topic.relatorio || ''}
                onChange={(html: string) => onFieldChange(topicIndex, 'editedRelatorio', html)}
                onFocus={() => onFieldFocus?.(topicIndex, 'relatorio', null)}
                onSlashCommand={onSlashCommand}
                quillReady={quillReady}
                quillError={quillError}
                minHeight="100px"
                editorTheme={editorTheme}
              />
              {/* v1.20.4: Wrapper com toolbar + botões Jurisprudência/AI na linha do label */}
              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className="flex items-center gap-0">
                    <span className="text-xs font-medium theme-text-secondary uppercase tracking-wide flex-shrink-0">Decisão</span>
                    {/* v1.20.4: Toolbar de formatação inline - próxima ao label */}
                    <div className="ml-8">
                      <InlineFormattingToolbar editorRef={fundamentacaoEditorRef} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {versioning && (
                      <VersionSelect
                        topicTitle={topic.title}
                        versioning={versioning}
                        currentContent={topic.editedFundamentacao || topic.fundamentacao || ''}
                        onRestore={(content: string) => onFieldChange(topicIndex, 'editedFundamentacao', content)}
                      />
                    )}
                    {onOpenJurisModal && (
                      <button
                        onClick={() => onOpenJurisModal(topicIndex)}
                        className="hover-blue-700 px-2 py-1 text-white text-xs rounded flex items-center gap-1 bg-blue-600"
                        title="Buscar Jurisprudência"
                      >
                        <Scale className="w-3 h-3" />
                        Jurisprudência
                      </button>
                    )}
                    {onOpenAIAssistant && (
                      <button
                        onClick={() => onOpenAIAssistant(topicIndex)}
                        className="hover-purple-700 px-2 py-1 text-white text-xs rounded flex items-center gap-1 bg-purple-600"
                        title="Assistente de Redação IA"
                      >
                        <Sparkles className="w-3 h-3" />
                        Assistente IA
                      </button>
                    )}
                    {/* v1.36.12: Botão Confronto de Fatos */}
                    {onOpenFactsComparison && (
                      <button
                        onClick={() => onOpenFactsComparison(topicIndex)}
                        className="hover:bg-amber-700 px-2 py-1 text-white text-xs rounded flex items-center gap-1 bg-amber-600"
                        title="Confronto de Fatos (Inicial vs Contestação)"
                      >
                        <Scale className="w-3 h-3" />
                        Confronto
                      </button>
                    )}
                    {/* v1.35.65: VoiceButton ao lado do Assistente IA */}
                    {/* v1.37.88: Adicionado suporte a melhoria com IA */}
                    <VoiceButton
                      onTranscript={(text: string) => {
                        // Inserir texto no editor de fundamentação via ref
                        if (fundamentacaoEditorRef.current) {
                          const current = topic.editedFundamentacao || topic.fundamentacao || '';
                          onFieldChange(topicIndex, 'editedFundamentacao', current + (current ? ' ' : '') + text);
                        }
                      }}
                      size="sm"
                      onError={(err: unknown) => console.warn('[VoiceToText]', err)}
                      improveWithAI={aiSettings.voiceImprovement?.enabled}
                      onImproveText={aiSettings.voiceImprovement?.enabled
                        ? (text) => improveText(text, aiSettings.voiceImprovement?.model || 'haiku')
                        : undefined
                      }
                    />
                  </div>
                </div>
                <FieldEditor
                  ref={fundamentacaoEditorRef}
                  label=""
                  fieldType="fundamentacao"
                  content={topic.editedFundamentacao || topic.fundamentacao || ''}
                  onChange={(html: string) => onFieldChange(topicIndex, 'editedFundamentacao', html)}
                  onFocus={() => onFieldFocus?.(topicIndex, 'fundamentacao', topic)}
                  onBlur={(html: string) => versioning?.saveVersion(topic.title, html)}
                  onSlashCommand={onSlashCommand}
                  quillReady={quillReady}
                  quillError={quillError}
                  minHeight="150px"
                  editorTheme={editorTheme}
                  hideVoiceButton={true}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalEditorSection;
export { GlobalEditorSection };
