/**
 * Botão de integração com Google Drive
 * Dropdown com opções: Conectar, Salvar, Carregar, Desconectar
 *
 * @version 1.35.40
 */

import React, { useState, useRef, useEffect } from 'react';
import { Cloud, CloudOff, Upload, Download, LogOut, Loader2, ChevronDown, Trash2, RefreshCw } from 'lucide-react';

export function GoogleDriveButton({
  isConnected,
  isLoading,
  userEmail,
  onConnect,
  onDisconnect,
  onSave,
  onLoadClick,
  isDarkMode
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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

  const disabledClass = `flex items-center gap-2 w-full px-3 py-2 text-sm opacity-50 cursor-not-allowed ${
    isDarkMode ? 'text-slate-400' : 'text-slate-500'
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
        <span className="hidden sm:inline">Drive</span>
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
          </div>
        </div>
      )}
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
  onRefresh,
  isDarkMode
}) {
  if (!isOpen) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes) => {
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
                    <p className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      {file.name}
                    </p>
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
    </div>
  );
}

export default GoogleDriveButton;
