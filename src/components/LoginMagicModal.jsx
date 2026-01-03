/**
 * LoginMagicModal - Modal de Login via Magic Link
 * v1.34.0
 *
 * Modal glassmorphism para autenticação passwordless via email.
 * Permite solicitar magic link e verificar token da URL.
 */

import React, { useState, useEffect } from 'react';
import { Mail, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const LoginMagicModal = ({ isOpen, onClose, onRequestLink, onVerify, devLink }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | verifying | error
  const [error, setError] = useState('');
  const [sentEmail, setSentEmail] = useState('');

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setStatus('idle');
      setError('');
      setSentEmail('');
    }
  }, [isOpen]);

  // Verificar token na URL ao carregar
  useEffect(() => {
    if (!isOpen) return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setStatus('verifying');
      onVerify(token).then(result => {
        if (result.success) {
          // Limpar URL e fechar modal
          window.history.replaceState({}, '', window.location.pathname);
          onClose();
        } else {
          setStatus('error');
          setError(result.error || 'Link inválido ou expirado');
          // Limpar URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    }
  }, [isOpen, onVerify, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[LoginModal] handleSubmit called, email:', email);

    if (!email.includes('@')) {
      setError('Digite um email válido');
      return;
    }

    setStatus('sending');
    setError('');
    console.log('[LoginModal] status set to sending');

    try {
      const result = await onRequestLink(email);
      console.log('[LoginModal] onRequestLink result:', result);

      if (result.success) {
        setSentEmail(email);
        setStatus('sent');
        console.log('[LoginModal] status set to sent');
      } else {
        setStatus('error');
        setError(result.error || 'Erro ao enviar link');
        console.log('[LoginModal] status set to error:', result.error);
      }
    } catch (err) {
      console.error('[LoginModal] Exception:', err);
      setStatus('error');
      setError('Erro inesperado: ' + err.message);
    }
  };

  const handleTryAgain = () => {
    setStatus('idle');
    setError('');
    setEmail('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-br from-slate-900/95 to-slate-800/95 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        <div className="p-8">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/20">
            <Mail className="w-8 h-8 text-blue-400" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            {status === 'verifying' ? 'Verificando...' : 'Entrar com Email'}
          </h2>

          {/* Verificando */}
          {status === 'verifying' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
              <p className="text-slate-400">Validando seu link de acesso...</p>
            </div>
          )}

          {/* Formulário */}
          {status === 'idle' && (
            <>
              <p className="text-slate-400 text-center mb-6">
                Digite seu email para receber um link de acesso seguro
              </p>

              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all mb-4"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={!email}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:shadow-none"
                >
                  Enviar Link de Acesso
                </button>
              </form>

              <p className="text-slate-500 text-xs text-center mt-6">
                O link expira em 15 minutos
              </p>
            </>
          )}

          {/* Enviando */}
          {status === 'sending' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
              <p className="text-slate-400">Enviando link para {email}...</p>
            </div>
          )}

          {/* Sucesso */}
          {status === 'sent' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Link enviado!</p>
              <p className="text-slate-400 text-sm mb-6">
                Verifique sua caixa de entrada em <strong className="text-white">{sentEmail}</strong>
              </p>

              {/* Dev Link (apenas em desenvolvimento) */}
              {devLink && (
                <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-400 text-xs mb-2">Dev: Link de teste</p>
                  <a
                    href={devLink}
                    className="text-blue-400 text-xs break-all hover:underline"
                  >
                    {devLink}
                  </a>
                </div>
              )}

              <button
                onClick={handleTryAgain}
                className="flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Enviar para outro email
              </button>
            </div>
          )}

          {/* Erro */}
          {status === 'error' && (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Ops! Algo deu errado</p>
              <p className="text-slate-400 text-sm mb-6">{error}</p>

              <button
                onClick={handleTryAgain}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginMagicModal;
