/**
 * Botão de integração com Google Drive + Salvar/Carregar Local
 * Dropdown unificado para gerenciamento de projetos (nuvem e local)
 *
 * @version 1.35.51 - Consolidação dos botões Salvar/Carregar
 */

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Cloud, CloudOff, Upload, Download, LogOut, Loader2, ChevronDown, Trash2, RefreshCw, Share2, X, Users, FileDown, FileUp, FolderOpen } from 'lucide-react';
import { GoogleDriveFile, GoogleDrivePermission } from '../hooks/useGoogleDrive';

// ============================================================================
// TYPES
// ============================================================================

interface GoogleDriveButtonProps {
  isConnected: boolean;
  isLoading: boolean;
  userEmail: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSave: () => void;
  onLoadClick: () => void;
  // v1.35.51: Props para salvar/carregar local
  onSaveLocal: () => void;
  onLoadLocal: (e: ChangeEvent<HTMLInputElement>) => void;
  isDarkMode: boolean;
}

interface DriveFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: GoogleDriveFile[];
  isLoading: boolean;
  onLoad: (file: GoogleDriveFile) => void;
  onDelete: (file: GoogleDriveFile) => void;
  onShare: (fileId: string, email: string, role: string) => Promise<void>;
  onGetPermissions: (fileId: string) => Promise<GoogleDrivePermission[]>;
  onRemovePermission: (fileId: string, permissionId: string) => Promise<boolean>;
  onRefresh: () => void;
  userEmail: string | null;
  isDarkMode: boolean;
}

// ============================================================================
// COMPONENTS
// ============================================================================

export function GoogleDriveButton({
  isConnected,
  isLoading,
  userEmail,
  onConnect,
  onDisconnect,
  onSave,
  onLoadClick,
  onSaveLocal,
  onLoadLocal,
  isDarkMode
}: GoogleDriveButtonProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonClass = `flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
    isDarkMode
      ? 'bg-slate-700 hover:bg-slate-600 text-white'
      : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
  } ${isLoading ? 'opacity-50 cursor-wait' : ''}`;

  const dropdownClass = `absolute right-0 mt-1 w-56 rounded-lg shadow-lg border z-50 ${
    isDarkMode
      ? 'bg-slate-800 border-slate-600'
      : 'bg-white border-slate-200'
  }`;

  const itemClass = `flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
    isDarkMode
      ? 'hover:bg-slate-700 text-slate-200'
      : 'hover:bg-slate-100 text-slate-700'
  }`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
        disabled={isLoading}
        title={isConnected ? `Conectado: ${userEmail}` : 'Google Drive'}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isConnected ? (
          <Cloud className="w-4 h-4 text-green-500" />
        ) : (
          <CloudOff className="w-4 h-4 text-slate-400" />
        )}
        <span className="hidden sm:inline">Projeto</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={dropdownClass}>
          {/* Status de conexão */}
          <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className={`text-xs truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {userEmail || 'Conectado'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Desconectado
                </span>
              </div>
            )}
          </div>

          <div className="py-1">
            {!isConnected ? (
              // Não conectado: mostrar botão de conectar
              <button
                onClick={() => {
                  onConnect();
                  setIsOpen(false);
                }}
                className={itemClass}
              >
                <Cloud className="w-4 h-4 text-blue-500" />
                <span>Conectar Google Drive</span>
              </button>
            ) : (
              // Conectado: mostrar opções
              <>
                <button
                  onClick={() => {
                    onSave();
                    setIsOpen(false);
                  }}
                  className={itemClass}
                  disabled={isLoading}
                >
                  <Upload className="w-4 h-4 text-green-500" />
                  <span>Salvar no Drive</span>
                </button>

                <button
                  onClick={() => {
                    onLoadClick();
                    setIsOpen(false);
                  }}
                  className={itemClass}
                  disabled={isLoading}
                >
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>Carregar do Drive</span>
                </button>

                <div className={`border-t my-1 ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}></div>

                <button
                  onClick={() => {
                    onDisconnect();
                    setIsOpen(false);
                  }}
                  className={`${itemClass} text-red-500`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Desconectar</span>
                </button>
              </>
            )}

            {/* v1.35.51: Seção Local */}
            <div className={`border-t mt-1 pt-1 ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
              <div className={`px-3 py-1 text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <FolderOpen className="w-3 h-3 inline mr-1" />
                Local
              </div>
              <button
                onClick={() => {
                  onSaveLocal();
                  setIsOpen(false);
                }}
                className={itemClass}
              >
                <FileDown className="w-4 h-4 text-green-500" />
                <span>Salvar Arquivo</span>
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className={itemClass}
              >
                <FileUp className="w-4 h-4 text-blue-500" />
                <span>Carregar Arquivo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v1.35.51: Input hidden para carregar arquivo local */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={(e) => {
          onLoadLocal(e);
          setIsOpen(false);
          // Limpar o input para permitir carregar o mesmo arquivo novamente
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        className="hidden"
      />
    </div>
  );
}

/**
 * Modal para listar e selecionar arquivos do Google Drive
 */
export function DriveFilesModal({
  isOpen,
  onClose,
  files,
  isLoading,
  onLoad,
  onDelete,
  onShare,
  onGetPermissions,
  onRemovePermission,
  onRefresh,
  userEmail,
  isDarkMode
}: DriveFilesModalProps): React.ReactElement | null {
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareFile, setShareFile] = useState<GoogleDriveFile | null>(null);
  const [shareEmail, setShareEmail] = useState<string>('');
  const [shareLoading, setShareLoading] = useState<boolean>(false);

  // v1.35.45: Modal para ver permissões
  const [permissionsModalOpen, setPermissionsModalOpen] = useState<boolean>(false);
  const [permissionsFile, setPermissionsFile] = useState<GoogleDriveFile | null>(null);
  const [permissions, setPermissions] = useState<GoogleDrivePermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState<boolean>(false);

  // Verifica se o arquivo é de outro usuário
  const isFromOther = (file: GoogleDriveFile): boolean => {
    if (!file.owners || file.owners.length === 0) return false;
    return file.owners[0].emailAddress !== userEmail;
  };

  // Buscar permissões de um arquivo
  const handleViewPermissions = async (file: GoogleDriveFile): Promise<void> => {
    setPermissionsFile(file);
    setPermissionsModalOpen(true);
    setPermissionsLoading(true);
    try {
      const perms = await onGetPermissions(file.id);
      setPermissions(perms);
    } catch {
      setPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

  // v1.35.48: Remover permissão (revogar acesso)
  const handleRemovePermission = async (permissionId: string): Promise<void> => {
    if (!permissionsFile || !onRemovePermission) return;

    setPermissionsLoading(true);
    try {
      await onRemovePermission(permissionsFile.id, permissionId);
      // Atualizar lista de permissões
      const perms = await onGetPermissions(permissionsFile.id);
      setPermissions(perms);
    } catch (e) {
      console.error('Erro ao remover permissão:', e);
    } finally {
      setPermissionsLoading(false);
    }
  };

  if (!isOpen) return null;

  // v1.35.49: Sempre usa 'reader' pois permissão de escrita é irrelevante
  // (ao salvar, o usuário cria uma cópia no próprio Drive)
  const handleShare = async (): Promise<void> => {
    if (!shareEmail.trim() || !shareFile) return;

    setShareLoading(true);
    try {
      await onShare(shareFile.id, shareEmail.trim(), 'reader');
      setShareModalOpen(false);
      setShareEmail('');
      setShareFile(null);
    } catch {
      // Erro já tratado no hook
    } finally {
      setShareLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: string | undefined): string => {
    if (!bytes) return '-';
    const kb = parseInt(bytes) / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl max-h-[80vh] mx-4 rounded-xl shadow-2xl overflow-hidden ${
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isDarkMode ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Projetos no Google Drive
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className={`p-1.5 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
              disabled={isLoading}
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''} ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`} />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <span className="text-xl leading-none">&times;</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
          ) : files.length === 0 ? (
            <div className={`text-center py-12 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <CloudOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum projeto Sentencify encontrado no Drive</p>
              <p className="text-sm mt-1">Salve um projeto para vê-lo aqui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isDarkMode
                      ? 'border-slate-700 hover:bg-slate-700/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        {file.name}
                      </p>
                      {/* v1.35.45: Badges de compartilhamento */}
                      {isFromOther(file) && file.owners && (
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          isDarkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                        }`}>
                          De: {file.owners[0].emailAddress.split('@')[0]}
                        </span>
                      )}
                      {!isFromOther(file) && file.shared && (
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                        }`}>
                          Compartilhado
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-3 text-xs mt-1 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <span>{formatDate(file.modifiedTime)}</span>
                      <span>{formatSize(file.size)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onLoad(file)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Carregar
                    </button>
                    {/* v1.35.45: Botão ver permissões (só para dono) */}
                    {!isFromOther(file) && file.shared && (
                      <button
                        onClick={() => handleViewPermissions(file)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDarkMode
                            ? 'hover:bg-green-900/30 text-green-400'
                            : 'hover:bg-green-50 text-green-600'
                        }`}
                        title="Ver quem tem acesso"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                    )}
                    {/* Compartilhar (só para dono) */}
                    {!isFromOther(file) && (
                      <button
                        onClick={() => {
                          setShareFile(file);
                          setShareEmail('');
                          setShareModalOpen(true);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDarkMode
                            ? 'hover:bg-blue-900/30 text-blue-400'
                            : 'hover:bg-blue-50 text-blue-500'
                        }`}
                        title="Compartilhar"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                    {/* Excluir (só para dono) */}
                    {!isFromOther(file) && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir "${file.name}" do Google Drive?`)) {
                            onDelete(file);
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDarkMode
                            ? 'hover:bg-red-900/30 text-red-400'
                            : 'hover:bg-red-50 text-red-500'
                        }`}
                        title="Excluir do Drive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${
          isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
        }`}>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {files.length} arquivo(s) encontrado(s)
          </p>
        </div>
      </div>

      {/* Modal de Compartilhamento */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShareModalOpen(false)}
          />
          <div className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl p-6 ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-500" />
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  Compartilhar
                </h3>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className={`text-sm mb-4 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {shareFile?.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email do destinatário
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {/* v1.35.49: Nota explicativa sobre comportamento do compartilhamento */}
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  O destinatário poderá visualizar e carregar uma cópia do projeto.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShareModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleShare}
                  disabled={!shareEmail.trim() || shareLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {shareLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  Compartilhar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* v1.35.45: Modal de Permissões */}
      {permissionsModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPermissionsModalOpen(false)}
          />
          <div className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl p-6 ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  Quem tem acesso
                </h3>
              </div>
              <button
                onClick={() => setPermissionsModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className={`text-sm mb-4 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {permissionsFile?.name}
            </p>

            {permissionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className={`w-6 h-6 animate-spin ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              </div>
            ) : permissions.length === 0 ? (
              <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Nenhuma permissão encontrada
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {permissions.map((perm) => (
                  <div
                    key={perm.id}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        {perm.emailAddress || perm.displayName || 'Usuário desconhecido'}
                      </p>
                      {perm.type === 'anyone' && (
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Qualquer pessoa com o link
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        perm.role === 'owner'
                          ? isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
                          : perm.role === 'writer'
                            ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                            : isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {perm.role === 'owner' ? 'Proprietário' : perm.role === 'writer' ? 'Editor' : 'Leitor'}
                      </span>
                      {/* v1.35.48: Botão remover (só para não-owners) */}
                      {perm.role !== 'owner' && (
                        <button
                          onClick={() => handleRemovePermission(perm.id)}
                          disabled={permissionsLoading}
                          className={`p-1 rounded transition-colors ${
                            isDarkMode
                              ? 'hover:bg-red-900/30 text-red-400'
                              : 'hover:bg-red-50 text-red-500'
                          } disabled:opacity-50`}
                          title="Remover acesso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setPermissionsModalOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoogleDriveButton;
