/**
 * Hook para integração com Google Drive
 * Permite salvar/restaurar projetos Sentencify no Drive do usuário
 *
 * @version 1.41.24 - Silent refresh apenas sob demanda (de clique do usuário).
 *                    Refresh proativo removido — @react-oauth/google usa popup,
 *                    não iframe, e setTimeout perde user activation no navegador.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useGoogleLogin, TokenResponse } from '@react-oauth/google';

// ============================================================================
// TYPES
// ============================================================================

export interface GoogleDriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime: string;
  createdTime?: string;
  owners?: { emailAddress: string }[];
  shared?: boolean;
}

export interface GoogleDrivePermission {
  id: string;
  emailAddress?: string;
  displayName?: string;
  role: 'owner' | 'writer' | 'reader';
  type: 'user' | 'anyone';
}

interface StoredToken {
  token: string;
  email: string;
  photo?: string;  // v1.35.54: URL da foto do perfil
  expiresAt: number;
}

interface DriveApiError {
  error?: {
    message?: string;
  };
}

export interface UseGoogleDriveReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  userEmail: string | null;
  userPhoto: string | null;  // v1.35.54: URL da foto do perfil
  connect: () => void;
  disconnect: () => void;
  saveFile: (fileName: string, content: unknown) => Promise<GoogleDriveFile>;
  listFiles: () => Promise<GoogleDriveFile[]>;
  loadFile: (fileId: string) => Promise<unknown>;
  deleteFile: (fileId: string) => Promise<boolean>;
  shareFile: (fileId: string, email: string, role?: 'reader' | 'writer') => Promise<GoogleDrivePermission>;
  getPermissions: (fileId: string) => Promise<GoogleDrivePermission[]>;
  removePermission: (fileId: string, permissionId: string) => Promise<boolean>;
  clientId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Client ID do Google Cloud (público, não é segredo)
const GOOGLE_CLIENT_ID = '435520999136-6kqer9astvll9d5qpe2liac5de3ucqka.apps.googleusercontent.com';
// v1.35.45: Adicionado drive.readonly para ver arquivos compartilhados por outros
// v1.35.54: Adicionado profile para obter foto do usuário
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly profile';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// Chave para persistir token no localStorage
// v1.35.45: Versão 2 para forçar re-auth com novo escopo (drive.readonly)
const STORAGE_KEY = 'sentencify-google-drive-token-v2';

// Margem de segurança antes de considerar o token expirado (2 minutos)
const TOKEN_EXPIRY_MARGIN_MS = 2 * 60 * 1000;

// Timeout máximo aguardando silent refresh (15 segundos)
const TOKEN_REFRESH_TIMEOUT_MS = 15 * 1000;

// v1.41.21: Código de erro tipado para expiração de sessão.
// Handlers de UI inspecionam este código para mostrar toast de reconexão.
export const SESSION_EXPIRED_CODE = 'SESSION_EXPIRED';

// Limpar token antigo (v1) se existir
if (typeof window !== 'undefined') {
  const oldKey = 'sentencify-google-drive-token';
  if (localStorage.getItem(oldKey)) {
    localStorage.removeItem(oldKey);
    console.log('[GoogleDrive] Token antigo removido (v1 → v2)');
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useGoogleDrive(): UseGoogleDriveReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);  // v1.35.54
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // v1.41.09: Mirror síncrono do token (evita stale closure nas funções de API)
  const accessTokenRef = useRef<string | null>(null);

  // v1.41.21: Operação pendente aguardando renovação de token.
  // Simplificado — sem extendForPopup, pois popup só abre por clique direto.
  const pendingTokenRef = useRef<{
    resolve: (token: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  // v1.41.09: Verificar se o token armazenado ainda é válido
  const isTokenValid = useCallback((): boolean => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    try {
      const { expiresAt } = JSON.parse(stored) as StoredToken;
      return Date.now() < expiresAt - TOKEN_EXPIRY_MARGIN_MS;
    } catch {
      return false;
    }
  }, []);

  // Callback de sucesso do OAuth (compartilhado entre login regular e silent refresh)
  const handleLoginSuccess = useCallback(async (
    tokenResponse: TokenResponse,
  ) => {
    const token = tokenResponse.access_token;
    const expiresIn = tokenResponse.expires_in || 3600; // padrão 1 hora
    const expiresAt = Date.now() + expiresIn * 1000;

    // Atualizar ref ANTES do estado (evita race condition nas operações pendentes)
    accessTokenRef.current = token;
    setIsConnected(true);
    setError(null);

    // v1.41.19: Resolver operação pendente ANTES do fetch de userInfo para cancelar
    // o timer imediatamente — sem isso, o fetch lento causava race condition
    // onde o timer disparava antes do resolve ser chamado.
    if (pendingTokenRef.current) {
      const { resolve } = pendingTokenRef.current;
      pendingTokenRef.current = null;
      resolve(token);
    }

    // Buscar email e foto do usuário (não bloqueia mais operações pendentes)
    try {
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const user = await userInfo.json();
      setUserEmail(user.email);
      setUserPhoto(user.picture || null);  // v1.35.54

      // Persistir token com expiração
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token,
        email: user.email,
        photo: user.picture,  // v1.35.54
        expiresAt,
      } as StoredToken));
    } catch (e) {
      console.error('[GoogleDrive] Erro ao buscar info do usuário:', e);
      // v1.41.19: Persistir token mesmo sem userInfo para que isTokenValid() funcione
      // nas próximas chamadas — evita ciclo de silent refresh desnecessário.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token,
        email: userEmail || 'conectado@google.com',
        expiresAt,
      } as StoredToken));
    }

  }, [userEmail]);

  // Login regular (com popup de autorização).
  // Deve ser chamado APENAS a partir de clique direto do usuário para não
  // disparar popup-blocker (useGoogleLogin abre window.open internamente).
  const googleLogin = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: (err) => {
      console.error('[GoogleDrive] Erro no login:', err);
      setError('Falha ao conectar com Google Drive');
      if (pendingTokenRef.current) {
        pendingTokenRef.current.reject(new Error('Falha ao reconectar com Google Drive'));
        pendingTokenRef.current = null;
      }
    },
    scope: SCOPES,
  });

  // v1.41.09: Silent refresh — renova token sem popup se a sessão Google estiver ativa.
  // v1.41.21: Se falhar, NÃO tenta abrir popup (navegador bloqueia popup em contexto
  // async). Em vez disso, limpa estado e rejeita operação pendente com SESSION_EXPIRED;
  // a UI captura o código e orienta o usuário a clicar no botão Drive do header.
  const googleSilentRefresh = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: () => {
      console.log('[GoogleDrive] Silent refresh falhou — sessão Google expirada');
      // Limpar estado interno inline (evita depender de disconnect, que capturaria
      // esta closure em um ciclo de deps do useCallback).
      accessTokenRef.current = null;
      setIsConnected(false);
      setUserEmail(null);
      setUserPhoto(null);
      localStorage.removeItem(STORAGE_KEY);
      if (pendingTokenRef.current) {
        const err = new Error(SESSION_EXPIRED_CODE) as Error & { code: string };
        err.code = SESSION_EXPIRED_CODE;
        pendingTokenRef.current.reject(err);
        pendingTokenRef.current = null;
      }
    },
    scope: SCOPES,
    prompt: 'none',
  });

  // v1.41.09: Obtém token válido — renova automaticamente se expirado.
  // v1.41.21: Sem fallback para popup; se silent falhar, rejeita com SESSION_EXPIRED.
  const getValidToken = useCallback((): Promise<string> => {
    // Token atual ainda válido → retornar imediatamente
    if (accessTokenRef.current && isTokenValid()) {
      return Promise.resolve(accessTokenRef.current);
    }

    // Token expirado → iniciar silent refresh e aguardar novo token
    return new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (pendingTokenRef.current) {
          pendingTokenRef.current = null;
          reject(new Error('Tempo esgotado ao renovar sessão com Google Drive. Tente reconectar.'));
        }
      }, TOKEN_REFRESH_TIMEOUT_MS);

      pendingTokenRef.current = {
        resolve: (token) => { clearTimeout(timeoutId); resolve(token); },
        reject: (err) => { clearTimeout(timeoutId); reject(err); },
      };

      console.log('[GoogleDrive] Token expirado, iniciando silent refresh...');
      googleSilentRefresh();
    });
  }, [isTokenValid, googleSilentRefresh]);

  // Conectar ao Google Drive
  const connect = useCallback(() => {
    setError(null);
    // Cancelar operação pendente antes de iniciar novo login
    if (pendingTokenRef.current) {
      pendingTokenRef.current.reject(new Error('Login cancelado'));
      pendingTokenRef.current = null;
    }
    googleLogin();
  }, [googleLogin]);

  // Desconectar (limpar token)
  const disconnect = useCallback(() => {
    accessTokenRef.current = null;
    setUserEmail(null);
    setUserPhoto(null);  // v1.35.54
    setIsConnected(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Inicialização única: restaurar token do localStorage.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { token, email, photo, expiresAt }: StoredToken = JSON.parse(stored);
        if (expiresAt && Date.now() < expiresAt - TOKEN_EXPIRY_MARGIN_MS) {
          accessTokenRef.current = token;
          setUserEmail(email);
          if (photo) setUserPhoto(photo);
          setIsConnected(true);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // v1.35.47: Obter ou criar pasta "Sentencify" no Drive
  // v1.41.09: Recebe token como parâmetro (evita duplo getValidToken nas callers)
  const getOrCreateFolder = useCallback(async (token: string): Promise<string> => {
    try {
      // Buscar pasta existente
      const query = encodeURIComponent("name='Sentencify' and mimeType='application/vnd.google-apps.folder' and trashed=false");
      const response = await fetch(
        `${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();

      if (data.files?.length > 0) {
        console.log('[GoogleDrive] Pasta Sentencify encontrada:', data.files[0].id);
        return data.files[0].id;
      }

      // Criar pasta se não existir
      const createResponse = await fetch(`${DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Sentencify',
          mimeType: 'application/vnd.google-apps.folder'
        })
      });

      const folder = await createResponse.json();
      console.log('[GoogleDrive] Pasta Sentencify criada:', folder.id);
      return folder.id;
    } catch (e) {
      console.error('[GoogleDrive] Erro ao obter/criar pasta:', e);
      throw e;
    }
  }, []);

  // Listar arquivos Sentencify no Drive
  const listFiles = useCallback(async (): Promise<GoogleDriveFile[]> => {
    setIsLoading(true);
    setError(null);

    try {
      // v1.41.09: Obtém token válido (renova se expirado)
      const token = await getValidToken();

      // v1.35.47: Obter pasta Sentencify
      const folderId = await getOrCreateFolder(token);

      // v1.35.46: Filtrar por appProperties para mostrar APENAS arquivos do Sentencify
      // v1.35.47: Filtrar também pela pasta
      // v1.35.48: Incluir arquivos compartilhados comigo (sharedWithMe)
      // v1.38.42: Incluir arquivos com nome sentencify-*.json em qualquer local do Drive
      const query = encodeURIComponent(
        `('${folderId}' in parents and appProperties has { key='sentencify' and value='true' } and trashed=false) or ` +
        `(sharedWithMe=true and appProperties has { key='sentencify' and value='true' } and trashed=false) or ` +
        `(name contains 'sentencify-' and mimeType='application/json' and trashed=false)`
      );
      // v1.35.45: Incluir owners e shared para identificar arquivos compartilhados
      const fields = encodeURIComponent('files(id,name,size,modifiedTime,createdTime,owners,shared)');

      const response = await fetch(
        `${DRIVE_API_BASE}/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao listar arquivos');
      }

      const data = await response.json();
      // v1.38.42: Deduplicar por ID (arquivo pode bater em múltiplas condições da query)
      const filesMap = new Map<string, GoogleDriveFile>();
      for (const f of (data.files || []) as GoogleDriveFile[]) {
        filesMap.set(f.id, f);
      }
      const uniqueFiles = Array.from(filesMap.values());
      console.log('[GoogleDrive] Arquivos encontrados:', uniqueFiles.length);
      return uniqueFiles;
    } catch (e) {
      console.error('[GoogleDrive] Erro ao listar:', e);
      const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(errorMessage);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken, getOrCreateFolder]);

  // Salvar arquivo no Drive
  const saveFile = useCallback(async (fileName: string, content: unknown): Promise<GoogleDriveFile> => {
    setIsLoading(true);
    setError(null);

    try {
      // v1.41.09: Obtém token válido (renova se expirado)
      const token = await getValidToken();

      // v1.35.47: Obter pasta Sentencify
      const folderId = await getOrCreateFolder(token);

      // Primeiro, verificar se já existe um arquivo com esse nome
      const existingFiles = await listFiles();
      const existing = existingFiles.find(f => f.name === fileName);

      // v1.35.46: appProperties identifica arquivos criados pelo Sentencify
      // v1.35.47: parents coloca o arquivo na pasta Sentencify
      // v1.37.98: Metadata diferente para criação vs atualização (parents não pode ir no PATCH)
      const baseMetadata = {
        name: fileName,
        mimeType: 'application/json',
        appProperties: {
          sentencify: 'true',
          version: '1'
        }
      };

      const jsonContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });

      // Para criação: incluir parents. Para atualização: NÃO incluir parents (erro 403)
      const metadata = existing ? baseMetadata : { ...baseMetadata, parents: [folderId] };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);

      let response: Response;

      if (existing) {
        // Atualizar arquivo existente (PATCH)
        response = await fetch(`${DRIVE_UPLOAD_API}/files/${existing.id}?uploadType=multipart`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
      } else {
        // Criar novo arquivo (POST)
        response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
      }

      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao salvar no Drive');
      }

      const result = await response.json();
      console.log('[GoogleDrive] Arquivo salvo:', result.name, result.id);
      return result;
    } catch (e) {
      console.error('[GoogleDrive] Erro ao salvar:', e);
      const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(errorMessage);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken, getOrCreateFolder, listFiles]);

  // Carregar arquivo do Drive
  const loadFile = useCallback(async (fileId: string): Promise<unknown> => {
    setIsLoading(true);
    setError(null);

    try {
      // v1.41.09: Obtém token válido (renova se expirado)
      const token = await getValidToken();

      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao carregar arquivo');
      }

      const content = await response.text();
      console.log('[GoogleDrive] Arquivo carregado, tamanho:', content.length);
      return JSON.parse(content);
    } catch (e) {
      console.error('[GoogleDrive] Erro ao carregar:', e);
      const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(errorMessage);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken]);

  // Deletar arquivo do Drive
  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // v1.41.09: Obtém token válido (renova se expirado)
      const token = await getValidToken();

      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok && response.status !== 204) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao deletar arquivo');
      }

      console.log('[GoogleDrive] Arquivo deletado:', fileId);
      return true;
    } catch (e) {
      console.error('[GoogleDrive] Erro ao deletar:', e);
      const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(errorMessage);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken]);

  // Compartilhar arquivo com outro usuário
  const shareFile = useCallback(async (fileId: string, email: string, role: 'reader' | 'writer' = 'reader'): Promise<GoogleDrivePermission> => {
    setIsLoading(true);
    setError(null);

    try {
      // v1.41.09: Obtém token válido (renova se expirado)
      const token = await getValidToken();

      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'user',
            role: role, // 'reader' ou 'writer'
            emailAddress: email
          })
        }
      );

      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao compartilhar arquivo');
      }

      const result = await response.json();
      console.log('[GoogleDrive] Arquivo compartilhado com:', email, 'role:', role);
      return result;
    } catch (e) {
      console.error('[GoogleDrive] Erro ao compartilhar:', e);
      const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(errorMessage);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken]);

  // v1.35.45: Buscar permissões de um arquivo (quem tem acesso)
  const getPermissions = useCallback(async (fileId: string): Promise<GoogleDrivePermission[]> => {
    try {
      // v1.41.09: Obtém token válido (renova se expirado)
      const token = await getValidToken();

      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/permissions?fields=permissions(id,emailAddress,role,displayName,type)`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao buscar permissões');
      }

      const data = await response.json();
      console.log('[GoogleDrive] Permissões do arquivo:', data.permissions?.length || 0);
      return data.permissions || [];
    } catch (e) {
      console.error('[GoogleDrive] Erro ao buscar permissões:', e);
      return []; // Retornar array vazio em caso de erro (não bloquear UI)
    }
  }, [getValidToken]);

  // v1.35.48: Remover permissão de um arquivo (revogar acesso)
  const removePermission = useCallback(async (fileId: string, permissionId: string): Promise<boolean> => {
    try {
      // v1.41.09: Obtém token válido (renova se expirado)
      const token = await getValidToken();

      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/permissions/${permissionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok && response.status !== 204) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao remover permissão');
      }

      console.log('[GoogleDrive] Permissão removida:', permissionId);
      return true;
    } catch (e) {
      console.error('[GoogleDrive] Erro ao remover permissão:', e);
      throw e;
    }
  }, [getValidToken]);

  return {
    isConnected,
    isLoading,
    error,
    userEmail,
    userPhoto,  // v1.35.54
    connect,
    disconnect,
    saveFile,
    listFiles,
    loadFile,
    deleteFile,
    shareFile,
    getPermissions,
    removePermission,
    clientId: GOOGLE_CLIENT_ID
  };
}

export { GOOGLE_CLIENT_ID };
