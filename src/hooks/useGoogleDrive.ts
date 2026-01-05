/**
 * Hook para integração com Google Drive
 * Permite salvar/restaurar projetos Sentencify no Drive do usuário
 *
 * @version 1.35.50 - Migrado para TypeScript
 */

import { useState, useCallback, useEffect } from 'react';
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
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// Chave para persistir token no localStorage
// v1.35.45: Versão 2 para forçar re-auth com novo escopo (drive.readonly)
const STORAGE_KEY = 'sentencify-google-drive-token-v2';

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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Restaurar token do localStorage ao inicializar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { token, email, expiresAt }: StoredToken = JSON.parse(stored);
        // Verificar se o token ainda é válido (com margem de 5 min)
        if (expiresAt && Date.now() < expiresAt - 5 * 60 * 1000) {
          setAccessToken(token);
          setUserEmail(email);
          setIsConnected(true);
        } else {
          // Token expirado, limpar
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Callback de sucesso do OAuth
  const handleLoginSuccess = useCallback(async (tokenResponse: TokenResponse) => {
    const token = tokenResponse.access_token;
    const expiresIn = tokenResponse.expires_in || 3600; // padrão 1 hora

    setAccessToken(token);
    setIsConnected(true);
    setError(null);

    // Buscar email do usuário
    try {
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const user = await userInfo.json();
      setUserEmail(user.email);

      // Persistir token com expiração
      const storedData: StoredToken = {
        token,
        email: user.email,
        expiresAt: Date.now() + expiresIn * 1000
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
    } catch (e) {
      console.error('[GoogleDrive] Erro ao buscar info do usuário:', e);
    }
  }, []);

  // Hook do Google OAuth
  const googleLogin = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: (error) => {
      console.error('[GoogleDrive] Erro no login:', error);
      setError('Falha ao conectar com Google Drive');
    },
    scope: SCOPES,
  });

  // Conectar ao Google Drive
  const connect = useCallback(() => {
    setError(null);
    googleLogin();
  }, [googleLogin]);

  // Desconectar (limpar token)
  const disconnect = useCallback(() => {
    setAccessToken(null);
    setUserEmail(null);
    setIsConnected(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // v1.35.47: Obter ou criar pasta "Sentencify" no Drive
  const getOrCreateFolder = useCallback(async (): Promise<string> => {
    if (!accessToken) {
      throw new Error('Não conectado ao Google Drive');
    }

    try {
      // Buscar pasta existente
      const query = encodeURIComponent("name='Sentencify' and mimeType='application/vnd.google-apps.folder' and trashed=false");
      const response = await fetch(
        `${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
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
          Authorization: `Bearer ${accessToken}`,
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
  }, [accessToken]);

  // Listar arquivos Sentencify no Drive
  const listFiles = useCallback(async (): Promise<GoogleDriveFile[]> => {
    if (!accessToken) {
      throw new Error('Não conectado ao Google Drive');
    }

    setIsLoading(true);
    setError(null);

    try {
      // v1.35.47: Obter pasta Sentencify
      const folderId = await getOrCreateFolder();

      // v1.35.46: Filtrar por appProperties para mostrar APENAS arquivos do Sentencify
      // v1.35.47: Filtrar também pela pasta
      // v1.35.48: Incluir arquivos compartilhados comigo (sharedWithMe)
      const query = encodeURIComponent(
        `('${folderId}' in parents and appProperties has { key='sentencify' and value='true' } and trashed=false) or ` +
        `(sharedWithMe=true and appProperties has { key='sentencify' and value='true' } and trashed=false)`
      );
      // v1.35.45: Incluir owners e shared para identificar arquivos compartilhados
      const fields = encodeURIComponent('files(id,name,size,modifiedTime,createdTime,owners,shared)');

      const response = await fetch(
        `${DRIVE_API_BASE}/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=50`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao listar arquivos');
      }

      const data = await response.json();
      console.log('[GoogleDrive] Arquivos encontrados:', data.files?.length || 0);
      return data.files || [];
    } catch (e) {
      console.error('[GoogleDrive] Erro ao listar:', e);
      const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(errorMessage);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, getOrCreateFolder]);

  // Salvar arquivo no Drive
  const saveFile = useCallback(async (fileName: string, content: unknown): Promise<GoogleDriveFile> => {
    if (!accessToken) {
      throw new Error('Não conectado ao Google Drive');
    }

    setIsLoading(true);
    setError(null);

    try {
      // v1.35.47: Obter pasta Sentencify
      const folderId = await getOrCreateFolder();

      // Primeiro, verificar se já existe um arquivo com esse nome
      const existingFiles = await listFiles();
      const existing = existingFiles.find(f => f.name === fileName);

      // v1.35.46: appProperties identifica arquivos criados pelo Sentencify
      // v1.35.47: parents coloca o arquivo na pasta Sentencify
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [folderId],
        appProperties: {
          sentencify: 'true',
          version: '1'
        }
      };

      const jsonContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);

      let response: Response;

      if (existing) {
        // Atualizar arquivo existente (PATCH)
        response = await fetch(`${DRIVE_UPLOAD_API}/files/${existing.id}?uploadType=multipart`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          body: formData
        });
      } else {
        // Criar novo arquivo (POST)
        response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`
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
  }, [accessToken, getOrCreateFolder, listFiles]);

  // Carregar arquivo do Drive
  const loadFile = useCallback(async (fileId: string): Promise<unknown> => {
    if (!accessToken) {
      throw new Error('Não conectado ao Google Drive');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
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
  }, [accessToken]);

  // Deletar arquivo do Drive
  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    if (!accessToken) {
      throw new Error('Não conectado ao Google Drive');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`
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
  }, [accessToken]);

  // Compartilhar arquivo com outro usuário
  const shareFile = useCallback(async (fileId: string, email: string, role: 'reader' | 'writer' = 'reader'): Promise<GoogleDrivePermission> => {
    if (!accessToken) {
      throw new Error('Não conectado ao Google Drive');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
  }, [accessToken]);

  // v1.35.45: Buscar permissões de um arquivo (quem tem acesso)
  const getPermissions = useCallback(async (fileId: string): Promise<GoogleDrivePermission[]> => {
    if (!accessToken) {
      throw new Error('Não conectado ao Google Drive');
    }

    try {
      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/permissions?fields=permissions(id,emailAddress,role,displayName,type)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
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
  }, [accessToken]);

  // v1.35.48: Remover permissão de um arquivo (revogar acesso)
  const removePermission = useCallback(async (fileId: string, permissionId: string): Promise<boolean> => {
    if (!accessToken) {
      throw new Error('Não conectado ao Google Drive');
    }

    try {
      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/permissions/${permissionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`
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
  }, [accessToken]);

  return {
    isConnected,
    isLoading,
    error,
    userEmail,
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
