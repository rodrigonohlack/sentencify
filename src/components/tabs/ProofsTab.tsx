/**
 * @file ProofsTab.tsx
 * @description Aba de Gestão de Provas
 * @version 1.38.40
 *
 * FASE 3 Etapa 3.3: Acessa stores diretamente para eliminar prop drilling.
 *
 * Seções:
 * 1. Upload de Provas (PDF + Texto)
 * 2. Lista de Provas com ProofCard
 */

import React from 'react';
import { Upload, FileText, Scale, AlertCircle } from 'lucide-react';
import { ProofCard } from '../cards';
import { useUIStore } from '../../stores/useUIStore';
import { useTopicsStore } from '../../stores/useTopicsStore';
import { useAIStore } from '../../stores/useAIStore';
import { useThemeManagement } from '../../hooks';
import type { ProofsTabProps, Proof } from '../../types';

export const ProofsTab: React.FC<ProofsTabProps> = ({
  proofManager,
  documentServices
}) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // STORE ACCESS (substituindo props)
  // ═══════════════════════════════════════════════════════════════════════════

  const openModal = useUIStore((s) => s.openModal);
  const setError = useUIStore((s) => s.setError);
  const setTextPreview = useUIStore((s) => s.setTextPreview);
  const extractedTopics = useTopicsStore((s) => s.extractedTopics);
  const aiSettings = useAIStore((s) => s.aiSettings);
  const { appTheme } = useThemeManagement();

  return (
    <div className="space-y-6">
      <div className="theme-gradient-card-50 rounded-lg p-6 border theme-border-secondary">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-blue-400 mb-2">Gestão de Provas</h3>
            <p className="text-sm theme-text-muted">
              Faça upload de documentos probatórios, analise com IA e vincule aos tópicos da decisão
            </p>
          </div>
          <Scale className="w-8 h-8 text-blue-400 opacity-50" />
        </div>

        {/* Seção de Upload */}
        <div className="space-y-4 mb-8">
          <h4 className="text-lg font-semibold theme-text-secondary flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Provas
          </h4>

          {/* Upload de PDF */}
          <div className="border-2 border-dashed theme-border-input rounded-lg p-6 hover-border-blue-500 transition-colors">
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  proofManager.handleUploadProofPdf(files);
                }
                e.target.value = '';
              }}
              className="hidden"
              id="proof-pdf-upload"
            />
            <label
              htmlFor="proof-pdf-upload"
              className="flex flex-col items-center cursor-pointer"
            >
              <Upload className="w-12 h-12 theme-text-muted mb-3" />
              <p className="theme-text-tertiary font-medium mb-1">Clique para fazer upload de PDFs</p>
              <p className="text-sm theme-text-disabled">Suporta múltiplos arquivos PDF</p>
            </label>
          </div>

          {/* Área para colar texto */}
          <div className="space-y-2">
            <button
              onClick={() => {
                proofManager.setNewProofTextData({ name: '', text: '' });
                openModal('addProofText');
              }}
              className="w-full py-3 theme-bg-secondary rounded-lg hover-slate-600 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Colar Texto como Prova
            </button>
          </div>
        </div>

        {/* Lista de Provas */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold theme-text-secondary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Provas Enviadas ({proofManager.proofFiles.length + proofManager.proofTexts.length})
          </h4>

          {proofManager.proofFiles.length === 0 && proofManager.proofTexts.length === 0 ? (
            <div className="text-center py-12 theme-text-muted border border-dashed theme-border-input rounded-lg">
              <Scale className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Nenhuma prova enviada ainda</p>
              <p className="text-sm mt-2">Faça upload de PDFs ou cole textos acima</p>
            </div>
          ) : extractedTopics.length === 0 ? (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm theme-text-amber flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> Para vincular provas a tópicos, primeiro analise os documentos na aba "Upload & Análise".
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Provas em PDF */}
              {proofManager.proofFiles.map((proof: Proof) => (
                <ProofCard
                  key={proof.id}
                  proof={proof}
                  isPdf={true}
                  proofManager={proofManager}
                  openModal={openModal}
                  setError={setError}
                  extractTextFromPDFWithMode={documentServices.extractTextFromPDFWithMode}
                  anonymizationEnabled={aiSettings?.anonymization?.enabled}
                  grokEnabled={aiSettings?.provider === 'grok'}
                  anonConfig={aiSettings?.anonymization}
                  nomesParaAnonimizar={aiSettings?.anonymization?.nomesUsuario || []}
                  editorTheme={appTheme}
                  setTextPreview={setTextPreview}
                />
              ))}

              {/* Provas em Texto */}
              {proofManager.proofTexts.map((proof: Proof) => (
                <ProofCard
                  key={proof.id}
                  proof={proof}
                  isPdf={false}
                  proofManager={proofManager}
                  openModal={openModal}
                  setError={setError}
                  extractTextFromPDFWithMode={documentServices.extractTextFromPDFWithMode}
                  anonymizationEnabled={aiSettings?.anonymization?.enabled}
                  grokEnabled={aiSettings?.provider === 'grok'}
                  anonConfig={aiSettings?.anonymization}
                  nomesParaAnonimizar={aiSettings?.anonymization?.nomesUsuario || []}
                  editorTheme={appTheme}
                  setTextPreview={setTextPreview}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProofsTab;
