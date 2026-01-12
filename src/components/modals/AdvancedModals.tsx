/**
 * @file AdvancedModals.tsx
 * @description Modais avançados (TIER 2 - médios)
 * @version 1.36.92
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 * Inclui: ShareLibraryModal, AcceptSharePage, DispositivoModal, BulkReviewModal, BulkUploadModal
 */

import React from 'react';
import {
  Share2, Eye, Edit3, RefreshCw, Mail, Check, AlertCircle, X, Users,
  Sparkles, Download, Trash2, Save, Upload, FileText, Zap, Loader2, Clock
} from 'lucide-react';
import { BaseModal, ModalInfoBox, CSS } from './BaseModal';
import { API_BASE } from '../../constants/api';
import type {
  ShareLibraryModalProps,
  AcceptSharePageProps,
  DispositivoModalProps,
  BulkReviewModalProps,
  BulkUploadModalProps,
  ShareInfo,
  Topic,
  TopicCategory,
  BulkFile,
  BulkGeneratedModel,
  BulkError
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARE LIBRARY MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modal para compartilhar biblioteca de modelos (convite por email)
 * v1.35.1: Criado
 * v1.35.23: Adicionado onRemoveSharedModels para limpar modelos ao remover acesso
 */
export const ShareLibraryModal = React.memo(({ isOpen, onClose, user, onRemoveSharedModels }: ShareLibraryModalProps) => {
  const [permission, setPermission] = React.useState('view');
  const [loading, setLoading] = React.useState(false);
  const [recipientEmail, setRecipientEmail] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [shares, setShares] = React.useState<ShareInfo[]>([]);
  const [sharedWithMe, setSharedWithMe] = React.useState<ShareInfo[]>([]);
  const [activeTab, setActiveTab] = React.useState('share'); // 'share' | 'myShares' | 'sharedWithMe'

  // Buscar compartilhamentos ao abrir
  React.useEffect(() => {
    if (!isOpen) return;
    const fetchShares = async () => {
      try {
        const token = localStorage.getItem('sentencify-auth-token');
        const [mySharesRes, sharedWithMeRes] = await Promise.all([
          fetch(`${API_BASE}/api/share/library/my-shares`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/share/library/shared-with-me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        if (mySharesRes.ok) {
          const data = await mySharesRes.json();
          setShares(data.shares || []);
        }
        if (sharedWithMeRes.ok) {
          const data = await sharedWithMeRes.json();
          setSharedWithMe(data.libraries || []);
        }
      } catch (err) {
        console.error('[Share] Fetch error:', err);
      }
    };
    fetchShares();
    setRecipientEmail('');
    setSuccessMessage('');
    setErrorMessage('');
  }, [isOpen]);

  // v1.35.1: Enviar convite por email
  const handleSendInvite = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMessage('Por favor, informe um email válido.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('sentencify-auth-token');
      const res = await fetch(`${API_BASE}/api/share/library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permission, recipientEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Convite enviado para ${recipientEmail}!`);
        setRecipientEmail('');
        // Adicionar à lista de convites
        setShares(prev => [{
          id: data.shareId,
          email: recipientEmail.toLowerCase(),
          permission: permission as 'view' | 'edit',
          recipient_email: recipientEmail.toLowerCase(),
          createdAt: new Date().toISOString(),
          recipients: []
        }, ...prev]);
      } else {
        setErrorMessage(data.error || 'Erro ao enviar convite.');
      }
    } catch (err) {
      console.error('[Share] Send invite error:', err);
      setErrorMessage('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      const token = localStorage.getItem('sentencify-auth-token');
      const res = await fetch(`${API_BASE}/api/share/library/${shareId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setShares(prev => prev.filter(s => s.id !== shareId));
      }
    } catch (err) {
      console.error('[Share] Revoke error:', err);
    }
  };

  const handleRemoveAccess = async (accessId: string) => {
    try {
      // v1.35.23: Encontrar ownerId antes de remover
      const accessToRemove = sharedWithMe.find(s => s.accessId === accessId);
      const ownerIdToRemove = accessToRemove?.ownerId;

      const token = localStorage.getItem('sentencify-auth-token');
      const res = await fetch(`${API_BASE}/api/share/library/access/${accessId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSharedWithMe(prev => prev.filter(s => s.accessId !== accessId));

        // v1.35.23: Remover modelos compartilhados desse owner da biblioteca
        if (ownerIdToRemove && onRemoveSharedModels) {
          onRemoveSharedModels(ownerIdToRemove);
        }
      }
    } catch (err) {
      console.error('[Share] Remove access error:', err);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Compartilhar Biblioteca" icon={<Share2 />} iconColor="purple" size="lg">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b theme-border-primary">
          <button
            onClick={() => setActiveTab('share')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'share' ? 'border-purple-500 text-purple-400' : 'border-transparent theme-text-tertiary hover:text-purple-400'
            }`}
          >
            Compartilhar
          </button>
          <button
            onClick={() => setActiveTab('myShares')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'myShares' ? 'border-purple-500 text-purple-400' : 'border-transparent theme-text-tertiary hover:text-purple-400'
            }`}
          >
            Meus Convites ({shares.length})
          </button>
          <button
            onClick={() => setActiveTab('sharedWithMe')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sharedWithMe' ? 'border-purple-500 text-purple-400' : 'border-transparent theme-text-tertiary hover:text-purple-400'
            }`}
          >
            Recebidos ({sharedWithMe.length})
          </button>
        </div>

        {/* Tab: Compartilhar */}
        {activeTab === 'share' && (
          <div className="space-y-4">
            <ModalInfoBox>📧 Digite o email do destinatário para enviar um convite de compartilhamento da sua biblioteca de modelos.</ModalInfoBox>

            {/* Campo de email */}
            <div>
              <label className={CSS.label}>Email do destinatário</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className={`${CSS.input} mt-2`}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendInvite()}
              />
            </div>

            {/* Permissão */}
            <div>
              <label className={CSS.label}>Permissão</label>
              <div className="flex gap-3 mt-2">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                  permission === 'view'
                    ? 'border-purple-500 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                    : 'theme-border-primary theme-bg-secondary theme-text-secondary'
                }`}>
                  <input type="radio" name="permission" value="view" checked={permission === 'view'} onChange={() => setPermission('view')} className="hidden" />
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Somente Leitura</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                  permission === 'edit'
                    ? 'border-purple-500 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                    : 'theme-border-primary theme-bg-secondary theme-text-secondary'
                }`}>
                  <input type="radio" name="permission" value="edit" checked={permission === 'edit'} onChange={() => setPermission('edit')} className="hidden" />
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm">Leitura e Escrita</span>
                </label>
              </div>
            </div>

            {/* Botão enviar */}
            <button
              onClick={handleSendInvite}
              disabled={loading || !recipientEmail}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {loading ? 'Enviando...' : 'Enviar Convite'}
            </button>

            {/* Mensagem de sucesso */}
            {successMessage && (
              <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-400 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {successMessage}
                </p>
              </div>
            )}

            {/* Mensagem de erro */}
            {errorMessage && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {errorMessage}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Meus Convites */}
        {activeTab === 'myShares' && (
          <div className="space-y-3">
            {shares.length === 0 ? (
              <p className="text-center theme-text-tertiary py-8">Nenhum convite enviado.</p>
            ) : (
              shares.map(share => (
                <div key={share.id} className="p-3 theme-bg-secondary rounded-lg border theme-border-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {/* Email do destinatário */}
                      <p className="theme-text-secondary font-medium text-sm">
                        {share.recipient_email || 'Link público'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          share.permission === 'edit'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                        }`}>
                          {share.permission === 'edit' ? 'Leitura/Escrita' : 'Somente Leitura'}
                        </span>
                        {/* Status: pendente ou aceito */}
                        {share.recipients && share.recipients.length > 0 ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                            Aceito
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
                            Pendente
                          </span>
                        )}
                        <span className="text-xs theme-text-tertiary">
                          {new Date(share.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="text-red-400 hover:text-red-300 text-xs ml-2"
                    >
                      Revogar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Compartilhados Comigo */}
        {activeTab === 'sharedWithMe' && (
          <div className="space-y-3">
            {sharedWithMe.length === 0 ? (
              <p className="text-center theme-text-tertiary py-8">Nenhuma biblioteca compartilhada com você.</p>
            ) : (
              sharedWithMe.map(lib => (
                <div key={lib.accessId} className="p-3 theme-bg-secondary rounded-lg border theme-border-primary">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="theme-text-secondary font-medium">{lib.ownerEmail}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          lib.permission === 'edit'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                        }`}>
                          {lib.permission === 'edit' ? 'Leitura/Escrita' : 'Somente Leitura'}
                        </span>
                        <span className="text-xs theme-text-tertiary">{lib.modelsCount} modelos</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAccess(lib.accessId || '')}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
});
ShareLibraryModal.displayName = 'ShareLibraryModal';

// ═══════════════════════════════════════════════════════════════════════════════
// ACCEPT SHARE PAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Página para aceitar compartilhamento de biblioteca
 * v1.35.0: Criado
 */
export const AcceptSharePage = React.memo(({ token, onAccepted, onLogin }: AcceptSharePageProps) => {
  const [loading, setLoading] = React.useState(true);
  const [shareInfo, setShareInfo] = React.useState<ShareInfo | null>(null);
  const [error, setError] = React.useState('');
  const [accepting, setAccepting] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);

  // Buscar informações do compartilhamento
  React.useEffect(() => {
    const fetchShareInfo = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/library/${token}`);
        if (res.ok) {
          const data = await res.json();
          setShareInfo(data);
        } else if (res.status === 404) {
          setError('Link de compartilhamento inválido ou expirado.');
        } else {
          setError('Erro ao carregar informações do compartilhamento.');
        }
      } catch (err) {
        console.error('[AcceptShare] Fetch error:', err);
        setError('Erro de conexão. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    fetchShareInfo();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const authToken = localStorage.getItem('sentencify-auth-token');
      const res = await fetch(`${API_BASE}/api/share/library/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (res.ok) {
        setAccepted(true);
        setTimeout(() => {
          onAccepted?.();
          window.location.href = '/'; // Redirecionar para home
        }, 2000);
      } else if (res.status === 401) {
        onLogin?.(); // Redirecionar para login
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao aceitar compartilhamento.');
      }
    } catch (err) {
      console.error('[AcceptShare] Accept error:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
        <div className="spinner-neon-ripple">
          <div className="ripple"></div>
          <div className="ripple"></div>
          <div className="ripple"></div>
          <div className="core">
            <div className="outer"></div>
            <div className="inner"></div>
          </div>
        </div>
        <span className="text-slate-400 animate-pulse">Carregando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 text-center">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Link Inválido</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 text-center">
          <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Compartilhamento Aceito!</h2>
          <p className="text-slate-400 mb-4">
            Os modelos de <span className="text-purple-400 font-medium">{typeof shareInfo?.owner === 'object' ? shareInfo?.owner?.email : shareInfo?.owner}</span> agora aparecem na sua biblioteca.
          </p>
          <p className="text-slate-500 text-sm">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Convite de Compartilhamento</h2>
          <p className="text-slate-400">
            <span className="text-purple-400 font-medium">{typeof shareInfo?.owner === 'object' ? shareInfo?.owner?.email : shareInfo?.owner}</span> quer compartilhar sua biblioteca de modelos com você.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Proprietário</span>
            <span className="text-white font-medium">{typeof shareInfo?.owner === 'object' ? shareInfo?.owner?.email : shareInfo?.owner}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Modelos</span>
            <span className="text-white font-medium">{shareInfo?.modelsCount} modelos</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Permissão</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              shareInfo?.permission === 'edit' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {shareInfo?.permission === 'edit' ? 'Leitura e Escrita' : 'Somente Leitura'}
            </span>
          </div>
        </div>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          {accepting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Aceitando...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Aceitar Compartilhamento
            </>
          )}
        </button>

        <p className="text-center text-slate-500 text-xs mt-4">
          Os modelos compartilhados aparecerão na sua aba Modelos com indicação do proprietário.
        </p>
      </div>
    </div>
  );
});
AcceptSharePage.displayName = 'AcceptSharePage';

// ═══════════════════════════════════════════════════════════════════════════════
// DISPOSITIVO MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modal para exibir e editar o dispositivo gerado pela IA
 */
export const DispositivoModal: React.FC<DispositivoModalProps> = ({
  isOpen,
  onClose,
  dispositivoText = '',
  setDispositivoText,
  copySuccess,
  setCopySuccess,
  setError,
  extractedTopics,
  setExtractedTopics,
  selectedTopics,
  setSelectedTopics,
  sanitizeHTML = (html: string) => html || ''
}) => {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // ESC handler
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleAddToTopics = React.useCallback(() => {
    const dispositivoTopic: Topic = {
      title: 'DISPOSITIVO',
      category: 'DISPOSITIVO' as TopicCategory,
      relatorio: 'Dispositivo final da sentença com todos os pedidos julgados.',
      editedContent: dispositivoText.replace(/\n/g, '<br>')
    };

    // Verificar se já existe em extractedTopics
    const existsInExtracted = extractedTopics.some((t: Topic) =>
      t.title.toUpperCase() === 'DISPOSITIVO'
    );

    if (existsInExtracted) {
      // Substituir em extractedTopics
      setExtractedTopics(extractedTopics.map((t: Topic) =>
        t.title.toUpperCase() === 'DISPOSITIVO' ? dispositivoTopic : t
      ));
    } else {
      // Adicionar em extractedTopics
      setExtractedTopics([...extractedTopics, dispositivoTopic]);
    }

    // Verificar se já existe em selectedTopics
    const existsInSelected = selectedTopics.some((t: Topic) =>
      t.title.toUpperCase() === 'DISPOSITIVO'
    );

    if (existsInSelected) {
      // Substituir em selectedTopics
      setSelectedTopics(selectedTopics.map((t: Topic) =>
        t.title.toUpperCase() === 'DISPOSITIVO' ? dispositivoTopic : t
      ));
    } else {
      // Adicionar em selectedTopics
      setSelectedTopics([...selectedTopics, dispositivoTopic]);
    }

    onClose();
  }, [dispositivoText, extractedTopics, selectedTopics, setExtractedTopics, setSelectedTopics, onClose]);

  if (!isOpen) return null;

  // Copiar como texto puro (mantém compatibilidade)
  const handleCopyDispositivo = async () => {
    try {
      await navigator.clipboard.writeText(dispositivoText);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCopySuccess(true);
      timeoutRef.current = setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      setError('Erro ao copiar dispositivo');
    }
  };

  const handleCopyFormattedDispositivo = async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.innerHTML = dispositivoText;
      document.body.appendChild(tempDiv);
      const range = document.createRange();
      range.selectNodeContents(tempDiv);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      let success = false;
      try { success = document.execCommand('copy'); } catch (e) { /* execCommand deprecated */ }
      if (selection) selection.removeAllRanges();
      document.body.removeChild(tempDiv);
      if (success) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setCopySuccess(true);
        timeoutRef.current = setTimeout(() => setCopySuccess(false), 3000);
      } else {
        await navigator.clipboard.writeText(dispositivoText);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setCopySuccess(true);
        timeoutRef.current = setTimeout(() => setCopySuccess(false), 3000);
      }
    } catch (err) {
      setError('Erro ao copiar dispositivo formatado');
    }
  };

  return (
    <div className={`${CSS.modalOverlay} overflow-auto`}>
      <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal max-w-6xl w-full max-h-[95vh] flex flex-col my-auto`}>
        {/* Header - fixo */}
        <div className={`${CSS.modalHeader} flex-shrink-0`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold theme-text-primary">Dispositivo Gerado com IA</h3>
                <p className="text-sm theme-text-muted">Revise e edite conforme necessário antes de copiar</p>
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

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* Aviso crítico sobre revisão */}
          <div className="m-6 p-4 bg-amber-500/15 border-2 border-amber-500/50 rounded-lg flex-shrink-0">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 text-2xl flex-shrink-0">⚠️</span>
              <div className="text-sm text-amber-700 dark:text-amber-100">
                <p className="font-bold text-amber-600 dark:text-amber-400 mb-2">ATENÇÃO: REVISÃO OBRIGATÓRIA</p>
                <p className="text-xs leading-relaxed">
                  Este dispositivo foi gerado por IA e pode conter erros, imprecisões ou omissões.
                  <span className="font-semibold text-amber-700 dark:text-amber-200"> É OBRIGATÓRIO que você revise minuciosamente:</span>
                </p>
                <ul className="text-xs mt-2 space-y-1 ml-4">
                  <li>✓ Nomes corretos das partes</li>
                  <li>✓ Pedidos e valores mencionados</li>
                  <li>✓ Fundamentação legal adequada</li>
                  <li>✓ Coerência com a fundamentação da sentença</li>
                  <li>✓ Ortografia e gramática</li>
                </ul>
                <p className="text-xs mt-3 text-amber-600 dark:text-amber-300/80 font-semibold border-t border-amber-500/30 pt-2">
                  Sua revisão é fundamental, na forma estabelecida pela Resolução 615/2025 do CNJ.
                </p>
              </div>
            </div>
          </div>

          {/* Área de preview HTML renderizado (read-only) */}
          <div className="px-6 pb-6">
            <style>{`
              .dispositivo-preview p {
                margin-bottom: 1rem;
              }
              .dispositivo-preview br {
                display: block;
                content: "";
                margin-top: 0.5rem;
              }
              .dispositivo-preview strong,
              .dispositivo-preview b {
                font-weight: 700;
                color: #fbbf24;
              }
              .dispositivo-preview em,
              .dispositivo-preview i {
                font-style: italic;
              }
              .dispositivo-preview u {
                text-decoration: underline;
              }
              .dispositivo-preview ul,
              .dispositivo-preview ol {
                margin-left: 1.5rem;
                margin-bottom: 1rem;
              }
              .dispositivo-preview li {
                margin-bottom: 0.5rem;
              }
            `}</style>
            <div
              className="dispositivo-preview w-full h-96 theme-bg-app border theme-border-input rounded-lg p-6 theme-text-primary text-base overflow-y-auto"
              style={{
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}
              dangerouslySetInnerHTML={{
                __html: sanitizeHTML(dispositivoText) || '<p style="color: #94a3b8; font-style: italic;">O dispositivo será gerado aqui...</p>'
              }}
            />
          </div>

          {/* Dicas - fixas, compactas */}
          <div className="px-6 pb-6 space-y-3">
            <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg flex items-start gap-2">
              <span className="text-purple-400 text-lg">📋</span>
              <div className="flex-1 text-xs theme-text-tertiary">
                <p className="font-medium theme-text-purple mb-1">Opções de Cópia:</p>
                <p className="text-xs">
                  <strong className="theme-text-secondary">Copiar Formatado:</strong> Preserva negrito, parágrafos e formatação HTML (ideal para Word/Google Docs)
                  <br />
                  <strong className="theme-text-tertiary">Copiar Texto Puro:</strong> Remove toda formatação (útil para editores de texto simples)
                </p>
              </div>
            </div>

            <div className="theme-info-box flex items-start gap-2">
              <span className="text-blue-400 text-lg">💡</span>
              <div className="flex-1 text-xs theme-text-tertiary">
                <p className="font-medium theme-text-blue mb-1">Dicas rápidas:</p>
                <p className="text-xs">
                  Revise nomes das partes • Verifique pedidos • Confira valores • Adapte ao seu estilo • Edite diretamente
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botões - fixos */}
        <div className={`${CSS.modalFooter} flex-shrink-0`}>
          <button
            onClick={handleCopyDispositivo}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium theme-bg-tertiary hover-slate-500"
            title="Copiar como texto puro (sem formatação)"
          >
            <Download className="w-5 h-5" />
            {copySuccess ? '✓ Copiado!' : 'Copiar Texto Puro'}
          </button>

          <button
            onClick={handleCopyFormattedDispositivo}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium shadow-lg hover-gradient-purple-blue bg-gradient-to-r from-purple-600 to-blue-600 text-white transition-all duration-300"
            title="Copiar com formatação (negrito, parágrafos) para Word/Google Docs"
          >
            <Download className="w-5 h-5" />
            {copySuccess ? '✓ Copiado!' : 'Copiar Formatado'}
          </button>

          <button
            onClick={handleAddToTopics}
            className="px-6 py-3 rounded-lg font-medium bg-green-600 text-white hover-green-700-from-600"
          >
            {selectedTopics.some((t: Topic) => t.title.toUpperCase() === 'DISPOSITIVO')
              ? 'Substituir Dispositivo'
              : 'Adicionar aos Tópicos'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg theme-bg-tertiary hover-slate-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BULK REVIEW MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modal para revisar modelos gerados em lote
 */
export const BulkReviewModal: React.FC<BulkReviewModalProps> = ({
  isOpen,
  onClose,
  bulkReviewModels,
  bulkFiles,
  bulkGeneratedModels,
  bulkErrors,
  onRemoveModel,
  onDiscard,
  onSave,
  sanitizeHTML = (html: string) => html || ''
}) => {
  if (!isOpen) return null;

  return (
    <div className={CSS.modalOverlay}>
      <div className={`${CSS.modalContainer} max-w-6xl w-full flex flex-col`} style={{ maxHeight: '90vh', height: 'auto' }}>
        <div className={`${CSS.modalHeader} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <h3 className="text-2xl font-bold text-green-400">Revisão de Modelos Gerados</h3>
                <p className="text-sm theme-text-muted mt-1">
                  {bulkReviewModels.length} modelo{bulkReviewModels.length !== 1 ? 's' : ''} gerado{bulkReviewModels.length !== 1 ? 's' : ''} de {bulkFiles.length} arquivo{bulkFiles.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {/* Resumo */}
          <div className="theme-info-box p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📈</span>
              <div className="flex-1">
                <p className="font-semibold theme-text-secondary mb-2">Resumo do Processamento:</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="theme-text-muted">Total de arquivos:</p>
                    <p className="text-lg font-bold theme-text-blue">{bulkFiles.length}</p>
                  </div>
                  <div>
                    <p className="theme-text-muted">Modelos na revisão:</p>
                    <p className="text-lg font-bold theme-text-green">{bulkReviewModels.length}</p>
                  </div>
                  <div>
                    <p className="theme-text-muted">Erros:</p>
                    <p className="text-lg font-bold theme-text-red">{bulkErrors.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Erros (se houver) */}
          {bulkErrors.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="font-semibold theme-text-red mb-2">⚠️ Arquivos com erro:</p>
              <div className="space-y-1 text-sm">
                {bulkErrors.map((err: BulkError, idx: number) => (
                  <div key={idx} className="theme-text-secondary">
                    • <span className="font-medium">{err.file}</span>: {err.error || 'Erro desconhecido'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Modelos */}
          <div className="space-y-4">
            {bulkReviewModels.map((model: BulkGeneratedModel, idx: number) => (
              <div
                key={idx}
                style={{ borderColor: '#475569', transition: 'border-color 0.3s ease' }}
                className="theme-bg-secondary-30 rounded-lg border p-4 hover-border-purple-alpha-50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="theme-text-muted text-sm">#{idx + 1}</span>
                      <h4 className="font-semibold theme-text-primary">{model.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded theme-bg-purple-accent theme-text-purple border border-purple-500/30">
                        {model.category}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded theme-bg-blue-accent theme-text-blue border border-blue-500/30">
                        📁 {model.sourceFile}
                      </span>
                      {model.keywords && (
                        <span className={CSS.textMuted}>
                          🏷️ {(Array.isArray(model.keywords) ? model.keywords : String(model.keywords).split(',')).slice(0, 3).join(', ')}
                        </span>
                      )}
                      {model.similarityInfo && (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          model.similarityInfo.similarity > 0.90
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          ⚠️ {Math.round(model.similarityInfo.similarity * 100)}% similar a "{model.similarityInfo.similarModel.title}"
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveModel(model.id || String(idx))}
                    className="hover-delete-topic p-2 rounded"
                    title="Remover este modelo"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Preview do conteúdo */}
                <div className="theme-bg-primary-50 rounded p-3 text-sm theme-text-tertiary">
                  <div
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(model.content).substring(0, 300) + '...' }}
                    className="line-clamp-3"
                  />
                </div>
              </div>
            ))}
          </div>

          {bulkReviewModels.length === 0 && (
            <div className="text-center py-12 theme-text-muted">
              <p className="text-lg mb-2">Nenhum modelo para revisar</p>
              <p className="text-sm">Todos os modelos foram removidos ou nenhum foi gerado.</p>
            </div>
          )}
        </div>

        <div className={`${CSS.modalFooter} flex-shrink-0`}>
          <button
            onClick={onDiscard}
            className="px-6 py-3 rounded-lg theme-bg-tertiary hover-slate-500"
          >
            Descartar Tudo
          </button>
          <button
            onClick={onSave}
            disabled={bulkReviewModels.length === 0}
            className="flex-1 px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover-gradient-green transition-all duration-300"
          >
            <Save className="w-5 h-5" />
            Salvar {bulkReviewModels.length} Modelo{bulkReviewModels.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BULK UPLOAD MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modal para upload e processamento em lote de arquivos para criar modelos
 */
export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  isProcessing,
  isReviewOpen,
  bulkFiles,
  bulkFileInputRef,
  onFileUpload,
  onRemoveFile,
  onProcess,
  currentFileIndex,
  processedFiles,
  bulkStaggerDelay,
  setBulkStaggerDelay,
  bulkCancelController,
  generatedModels,
  bulkCurrentBatch,
  bulkBatchSize = 3,
  openModal
}) => {
  if (!isOpen) return null;

  // View 1: Upload/Selection (quando NÃO está processando E NÃO está na revisão)
  if (!isProcessing && !isReviewOpen) {
    return (
      <div className="fixed inset-0 z-[90] p-4 theme-modal-overlay backdrop-blur-sm flex items-start justify-center pt-8 overflow-y-auto">
        <div className="theme-modal-container theme-border-modal theme-modal-glow animate-modal max-w-3xl w-full mb-8">
          <div className={CSS.modalHeader}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold theme-text-primary">Criar Modelos de Arquivos com IA</h3>
                  <p className="text-sm theme-text-muted">
                    Envie até 20 arquivos e deixe a IA criar modelos completos automaticamente
                  </p>
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

          <div className="p-6 space-y-6">
            {/* Área de Upload */}
            <div>
              <label className="block text-sm font-medium theme-text-tertiary mb-3">
                📤 Selecione os arquivos (PDF, DOCX, DOC ou TXT)
              </label>
              <div
                onClick={() => bulkFileInputRef.current?.click()}
                className="hover-bulk-upload-area border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
              >
                <Upload className="w-12 h-12 theme-text-disabled mx-auto mb-3" />
                <p className="theme-text-tertiary font-medium mb-1">
                  Clique para selecionar arquivos
                </p>
                <p className="text-sm theme-text-disabled">
                  PDF, DOCX, DOC, TXT - Máximo: 20 arquivos
                </p>
                <p className="text-xs theme-text-disabled mt-2">
                  ⚡ Extração de texto 100% local e rápida
                </p>
              </div>
              <input
                ref={bulkFileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt"
                onChange={onFileUpload}
                className="hidden"
              />
            </div>

            {/* Lista de Arquivos Selecionados */}
            {bulkFiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium theme-text-tertiary mb-3">
                  📋 Arquivos Selecionados ({bulkFiles.length}/20)
                </label>
                <div className="theme-bg-secondary-30 rounded-lg border theme-border-input max-h-64 overflow-y-auto">
                  {bulkFiles.map((bulkFile: BulkFile, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border-b theme-border-input/50 last:border-b-0 hover-slate-alpha-30-from-transparent"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <span className="text-sm theme-text-secondary truncate">{bulkFile.name}</span>
                        <span className="text-xs theme-text-disabled">
                          ({(bulkFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => onRemoveFile(idx)}
                        className="hover-delete-topic p-1 rounded"
                        title="Remover"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Informações */}
            <div className="theme-info-box p-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-400 text-2xl">💡</span>
                <div className="text-sm theme-text-secondary">
                  <p className="font-semibold mb-2">Como funciona:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Cada arquivo pode gerar 1 ou mais modelos</li>
                    <li>A IA identifica automaticamente os tópicos jurídicos</li>
                    <li>Você poderá revisar e editar antes de salvar</li>
                    <li>Se houver erros, o processo continua com os próximos</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* v1.5.15: Configuração de delay entre arquivos (staggered start) */}
          <div className="px-6 pb-4">
            <div className="theme-bg-secondary-50 rounded-lg border theme-border-input p-4">
              <label className={CSS.label}>
                ⚙️ Delay entre iniciar arquivos (Rate Limiting)
              </label>
              <select
                value={bulkStaggerDelay}
                onChange={(e) => setBulkStaggerDelay(Number(e.target.value))}
                className="w-full px-3 py-2 theme-bg-primary border theme-border-input rounded theme-text-secondary text-sm"
              >
                <option value={0}>Sem delay - Máxima velocidade ({bulkBatchSize} por lote)</option>
                <option value={300}>300ms - Balanceado (delay dentro do lote)</option>
                <option value={500}>500ms - Conservador (delay dentro do lote)</option>
                <option value={1000}>1s - Muito conservador (delay dentro do lote)</option>
              </select>
              <p className="text-xs theme-text-muted mt-2">
                💡 Sistema de lotes ativo ({bulkBatchSize} arquivos/lote + 1s entre lotes). Delay adicional entre iniciar os {bulkBatchSize} arquivos do lote.
              </p>
            </div>
          </div>

          <div className={CSS.modalFooter}>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-lg theme-bg-tertiary hover-slate-500"
            >
              Cancelar
            </button>
            <button
              onClick={onProcess}
              disabled={bulkFiles.length === 0}
              className="flex-1 px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover-gradient-blue-purple transition-all duration-300 text-white"
            >
              <Zap className="w-5 h-5" />
              Processar {bulkFiles.length} Arquivo{bulkFiles.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View 2: Processing (quando está processando)
  if (isProcessing) {
    return (
      <div className={CSS.modalOverlay}>
        <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal max-w-2xl w-full flex flex-col`} style={{ maxHeight: '90vh' }}>
          <div className={CSS.modalHeader}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold theme-text-primary">Processando Arquivos...</h3>
                <p className="text-sm theme-text-muted">
                  Aguarde enquanto a IA analisa os documentos
                </p>
              </div>
            </div>
          </div>

          {/* v1.5.15: Grid de cards por arquivo (processamento paralelo) */}
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            {/* Grid de status por arquivo */}
            <div className="space-y-3">
              {bulkFiles.map((bulkFile: BulkFile, index: number) => {
                const result = processedFiles.find((f: { file: string; status: string }) => f.file === bulkFile.name);
                const isComplete = result?.status === 'success';
                const isError = result?.status === 'error';

                const fileBatch = Math.floor(index / bulkBatchSize) + 1;
                const isInCurrentBatch = fileBatch === bulkCurrentBatch;
                const isWaiting = fileBatch > bulkCurrentBatch && !result;
                const isProcessingFile = isInCurrentBatch && !result;

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${
                      isComplete ? 'bg-green-900/20 border-green-500/30' :
                      isError ? 'bg-red-900/20 border-red-500/30' :
                      isProcessingFile ? 'bg-blue-900/30 border-blue-500/40' :
                      isWaiting ? 'theme-bg-secondary-30 theme-border-input/40' :
                      'theme-bg-secondary-50 theme-border-input'
                    }`}
                  >
                    {/* Ícone de status */}
                    <div className="flex-shrink-0">
                      {isComplete && <Check className="w-6 h-6 text-green-400" />}
                      {isError && <X className="w-6 h-6 text-red-400" />}
                      {isProcessingFile && (
                        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {isWaiting && <Clock className="w-6 h-6 theme-text-disabled" />}
                    </div>

                    {/* Info do arquivo */}
                    <div className="flex-grow min-w-0">
                      <p className="text-sm theme-text-secondary truncate font-medium">{bulkFile.name}</p>
                      <p className="text-xs theme-text-muted mt-1">
                        {isComplete && `✅ ${result.modelsCount} modelo${result.modelsCount !== 1 ? 's' : ''} gerado${result.modelsCount !== 1 ? 's' : ''} em ${result.duration}s`}
                        {isError && `❌ Erro: ${result.error}`}
                        {isProcessingFile && `🔄 Processando agora... (Batch ${bulkCurrentBatch}/${Math.ceil(bulkFiles.length / bulkBatchSize)})`}
                        {isWaiting && `⏳ Aguardando na fila (Batch ${fileBatch}/${Math.ceil(bulkFiles.length / bulkBatchSize)})`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumo geral */}
            <div className="theme-bg-secondary-30 border theme-border-input rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium theme-text-tertiary">
                    📊 Progresso: {processedFiles.length} de {bulkFiles.length} arquivos
                  </p>
                  {generatedModels.length > 0 && (
                    <p className="text-xs theme-text-muted mt-1">
                      ✨ {generatedModels.length} modelo{generatedModels.length !== 1 ? 's' : ''} gerado{generatedModels.length !== 1 ? 's' : ''} no total
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-400">
                    {Math.round((processedFiles.length / bulkFiles.length) * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* v1.5.15: Botão Cancelar processamento */}
          <div className="p-6 border-t theme-border-secondary">
            <button
              onClick={() => openModal('confirmBulkCancel')}
              className="w-full px-4 py-3 text-white rounded-lg flex items-center justify-center gap-2 font-medium bg-red-500 hover-red-600"
            >
              <X className="w-5 h-5" />
              Cancelar Processamento
            </button>
            <p className="text-center text-xs theme-text-disabled mt-3">
              💡 Processamento em lotes: {bulkBatchSize} arquivos por vez (evita rate limits)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
