/**
 * Hook para integração com Google Drive
 *
 * @version 1.42.00 - OAuth Authorization Code Flow via backend.
 *   - `connect()` redireciona para consentimento Google (não usa popup).
 *   - Refresh token armazenado criptografado no SQLite do servidor.
 *   - A cada ação, o backend devolve access token válido (faz refresh
 *     server-to-server se necessário), eliminando popup-blockers.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE } from '../constants/api';

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
  userPhoto: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  saveFile: (fileName: string, content: unknown) => Promise<GoogleDriveFile>;
  listFiles: () => Promise<GoogleDriveFile[]>;
  loadFile: (fileId: string) => Promise<unknown>;
  deleteFile: (fileId: string) => Promise<boolean>;
  shareFile: (fileId: string, email: string, role?: 'reader' | 'writer') => Promise<GoogleDrivePermission>;
  getPermissions: (fileId: string) => Promise<GoogleDrivePermission[]>;
  removePermission: (fileId: string, permissionId: string) => Promise<boolean>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const AUTH_KEY = 'sentencify-auth-token';

// v1.42.00: Erro tipado para quando a conexão Google Drive foi revogada e
// o usuário precisa reconectar. Handlers de UI podem capturar para mostrar
// aviso direcionado ao botão "Conectar".
export const SESSION_EXPIRED_CODE = 'GDRIVE_NOT_CONNECTED';

// Limpar token antigo do Implicit Flow (incompatível com v1.42.00)
if (typeof window !== 'undefined') {
  const oldV1 = 'sentencify-google-drive-token';
  const oldV2 = 'sentencify-google-drive-token-v2';
  if (localStorage.getItem(oldV1)) localStorage.removeItem(oldV1);
  if (localStorage.getItem(oldV2)) localStorage.removeItem(oldV2);
}

// ============================================================================
// AUTH HELPER — JWT do magic link (não confundir com token do Google)
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useGoogleDrive(): UseGoogleDriveReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cache do access token em memória — evita round-trip ao backend a cada chamada
  // durante a mesma sessão. `expiresAt` vem do backend.
  const accessTokenRef = useRef<{ token: string; expiresAt: number } | null>(null);

  // ────────────────────────────────────────────────────────────────────────
  // STATUS — busca estado de conexão ao montar
  // ────────────────────────────────────────────────────────────────────────

  const refreshStatus = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/google-drive/status`, {
        headers: getAuthHeaders(),
      });
      if (!resp.ok) {
        // 401 = não autenticado no app; trate como desconectado
        setIsConnected(false);
        return;
      }
      const data = await resp.json();
      if (data.connected) {
        setIsConnected(true);
        setUserEmail(data.email || null);
        setUserPhoto(data.photo || null);
      } else {
        setIsConnected(false);
        setUserEmail(null);
        setUserPhoto(null);
        accessTokenRef.current = null;
      }
    } catch (e) {
      console.warn('[GoogleDrive] Erro ao buscar status:', e);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // ────────────────────────────────────────────────────────────────────────
  // GET ACCESS TOKEN — pega token válido do backend (com refresh automático)
  // ────────────────────────────────────────────────────────────────────────

  const getValidToken = useCallback(async (): Promise<string> => {
    // Cache em memória: se ainda válido com margem de 2 min, usa
    const cached = accessTokenRef.current;
    if (cached && Date.now() < cached.expiresAt - 2 * 60 * 1000) {
      return cached.token;
    }

    const resp = await fetch(`${API_BASE}/api/google-drive/access-token`, {
      headers: getAuthHeaders(),
    });

    if (resp.status === 404 || resp.status === 401) {
      // Não conectado ou refresh token revogado
      const data = await resp.json().catch(() => ({}));
      setIsConnected(false);
      setUserEmail(null);
      setUserPhoto(null);
      accessTokenRef.current = null;
      const err = new Error(SESSION_EXPIRED_CODE) as Error & { code: string };
      err.code = data.code || SESSION_EXPIRED_CODE;
      throw err;
    }

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || `Erro ao obter token (HTTP ${resp.status})`);
    }

    const data = await resp.json();
    accessTokenRef.current = {
      token: data.access_token,
      expiresAt: data.expires_at,
    };
    return data.access_token;
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // CONNECT — redirect para consentimento Google
  // ────────────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/google-drive/auth-url`, {
        headers: getAuthHeaders(),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao iniciar conexão com Google Drive');
      }
      const { url } = await resp.json();
      // Redirect — o Google redireciona de volta para
      // /api/google-drive/callback, que persiste tokens no SQLite e volta
      // para a home com ?drive=connected
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    }
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // DISCONNECT
  // ────────────────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/google-drive/disconnect`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (e) {
      console.warn('[GoogleDrive] Erro ao desconectar (seguindo):', e);
    }
    accessTokenRef.current = null;
    setIsConnected(false);
    setUserEmail(null);
    setUserPhoto(null);
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // DRIVE API — chamadas usam o token obtido do backend
  // ────────────────────────────────────────────────────────────────────────

  // v1.35.47: Obter ou criar pasta "Sentencify" no Drive
  const getOrCreateFolder = useCallback(async (token: string): Promise<string> => {
    const query = encodeURIComponent("name='Sentencify' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    const response = await fetch(
      `${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (data.files?.length > 0) {
      return data.files[0].id;
    }
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
    return folder.id;
  }, []);

  const listFiles = useCallback(async (): Promise<GoogleDriveFile[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const folderId = await getOrCreateFolder(token);

      const query = encodeURIComponent(
        `('${folderId}' in parents and appProperties has { key='sentencify' and value='true' } and trashed=false) or ` +
        `(sharedWithMe=true and appProperties has { key='sentencify' and value='true' } and trashed=false) or ` +
        `(name contains 'sentencify-' and mimeType='application/json' and trashed=false)`
      );
      const fields = encodeURIComponent('files(id,name,size,modifiedTime,createdTime,owners,shared)');

      const response = await fetch(
        `${DRIVE_API_BASE}/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao listar arquivos');
      }
      const data = await response.json();
      const filesMap = new Map<string, GoogleDriveFile>();
      for (const f of (data.files || []) as GoogleDriveFile[]) {
        filesMap.set(f.id, f);
      }
      return Array.from(filesMap.values());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken, getOrCreateFolder]);

  const saveFile = useCallback(async (fileName: string, content: unknown): Promise<GoogleDriveFile> => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const folderId = await getOrCreateFolder(token);
      const existingFiles = await listFiles();
      const existing = existingFiles.find(f => f.name === fileName);

      const baseMetadata = {
        name: fileName,
        mimeType: 'application/json',
        appProperties: { sentencify: 'true', version: '1' }
      };
      const jsonContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const metadata = existing ? baseMetadata : { ...baseMetadata, parents: [folderId] };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);

      let response: Response;
      if (existing) {
        response = await fetch(`${DRIVE_UPLOAD_API}/files/${existing.id}?uploadType=multipart`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      } else {
        response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      }
      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao salvar no Drive');
      }
      return response.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken, getOrCreateFolder, listFiles]);

  const loadFile = useCallback(async (fileId: string): Promise<unknown> => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao carregar arquivo');
      }
      const text = await response.text();
      return JSON.parse(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken]);

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok && response.status !== 204) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao deletar arquivo');
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken]);

  const shareFile = useCallback(async (
    fileId: string,
    email: string,
    role: 'reader' | 'writer' = 'reader'
  ): Promise<GoogleDrivePermission> => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type: 'user', role, emailAddress: email })
        }
      );
      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao compartilhar arquivo');
      }
      return response.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken]);

  const getPermissions = useCallback(async (fileId: string): Promise<GoogleDrivePermission[]> => {
    try {
      const token = await getValidToken();
      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/permissions?fields=permissions(id,emailAddress,role,displayName,type)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao buscar permissões');
      }
      const data = await response.json();
      return data.permissions || [];
    } catch (e) {
      console.error('[GoogleDrive] Erro ao buscar permissões:', e);
      return [];
    }
  }, [getValidToken]);

  const removePermission = useCallback(async (fileId: string, permissionId: string): Promise<boolean> => {
    try {
      const token = await getValidToken();
      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/permissions/${permissionId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok && response.status !== 204) {
        const errorData: DriveApiError = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao remover permissão');
      }
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
    userPhoto,
    connect,
    disconnect,
    saveFile,
    listFiles,
    loadFile,
    deleteFile,
    shareFile,
    getPermissions,
    removePermission,
  };
}
