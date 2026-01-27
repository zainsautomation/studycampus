import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const TOKEN_STORAGE_KEY = 'google_drive_access_token';
const TOKEN_EXPIRY_KEY = 'google_drive_token_expiry';

// Get Google credentials from environment
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || null;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || null;

interface GoogleDriveFolder {
  id: string;
  name: string;
  path: string;
}

interface UploadOptions {
  file: File;
  folderId?: string;
  folderName?: string;
  subjectName?: string;
  autoOrganize?: boolean;
}

interface GoogleDriveContextValue {
  isInitialized: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isTokenExpiringSoon: boolean;
  lastRefreshFailed: boolean;
  signIn: () => void;
  signOut: () => void;
  listFolders: (parentId?: string) => Promise<GoogleDriveFolder[]>;
  createFolder: (name: string, parentId?: string) => Promise<string | null>;
  findOrCreateFolder: (name: string, parentId?: string) => Promise<string | null>;
  uploadFile: (options: UploadOptions) => Promise<{ fileId: string; webViewLink: string } | null>;
  openFolderPicker: () => Promise<GoogleDriveFolder | null>;
  deleteFile: (fileId: string) => Promise<boolean>;
}

const GoogleDriveContext = createContext<GoogleDriveContextValue | null>(null);

export function GoogleDriveProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTokenExpiringSoon, setIsTokenExpiringSoon] = useState(false);
  const [lastRefreshFailed, setLastRefreshFailed] = useState(false);

  const clientId = GOOGLE_CLIENT_ID;
  const apiKey = GOOGLE_API_KEY;
  const isConfigured = Boolean(clientId && apiKey);

  const applyTokenToGapi = useCallback((token: string | null) => {
    try {
      if (!window.gapi?.client) return;
      window.gapi.client.setToken(token ? { access_token: token } : null);
    } catch {
      // ignore
    }
  }, []);

  // Helper to save token to localStorage
  const saveTokenToStorage = useCallback((token: string, expiresIn: number) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    const expiryTime = Date.now() + expiresIn * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    console.log('[GoogleDrive] Token saved to localStorage, expires in', expiresIn, 'seconds');
  }, []);

  // Helper to get token from localStorage
  const getTokenFromStorage = useCallback((): string | null => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (!token || !expiry) return null;

    // Check if token is expired (with 5 min buffer)
    if (Date.now() > parseInt(expiry) - 300000) {
      console.log('[GoogleDrive] Stored token expired, clearing...');
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return null;
    }

    return token;
  }, []);

  // Clear token from localStorage
  const clearTokenFromStorage = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }, []);

  // Check for stored token immediately on mount (before async init)
  useEffect(() => {
    const storedToken = getTokenFromStorage();
    if (storedToken) {
      console.log('[GoogleDrive] Found stored token on mount, setting signed in state');
      setAccessToken(storedToken);
      setIsSignedIn(true);
    }
  }, [getTokenFromStorage]);

  // Load Google API scripts
  useEffect(() => {
    if (!clientId || !apiKey) {
      console.log('[GoogleDrive] Missing clientId or apiKey, skipping initialization');
      return;
    }

    const loadGapiScript = () => {
      return new Promise<void>((resolve) => {
        if (window.gapi) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    const loadGisScript = () => {
      return new Promise<void>((resolve) => {
        if (window.google?.accounts) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    const initializeGoogleApis = async () => {
      try {
        console.log('[GoogleDrive] Starting initialization...');
        await Promise.all([loadGapiScript(), loadGisScript()]);

        // Initialize GAPI client
        await new Promise<void>((resolve) => {
          window.gapi.load('client', async () => {
            await window.gapi.client.init({
              apiKey: apiKey,
              discoveryDocs: [DISCOVERY_DOC],
            });
            resolve();
          });
        });

        // Apply stored token to GAPI if we have one
        const storedToken = getTokenFromStorage();
        if (storedToken) {
          console.log('[GoogleDrive] Applying stored token to GAPI client');
          applyTokenToGapi(storedToken);
          setAccessToken(storedToken);
          setIsSignedIn(true);
        }

        // Initialize GIS token client
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            console.log('[GoogleDrive] Token callback received:', tokenResponse?.error || 'success');

            if (tokenResponse?.error) {
              console.log('[GoogleDrive] Token error:', tokenResponse.error);
              return;
            }

            if (tokenResponse.access_token) {
              console.log('[GoogleDrive] Got new access token, saving...');
              setAccessToken(tokenResponse.access_token);
              setIsSignedIn(true);
              applyTokenToGapi(tokenResponse.access_token);
              saveTokenToStorage(tokenResponse.access_token, tokenResponse.expires_in || 3600);
            }
          },
        });

        setTokenClient(client);
        setIsInitialized(true);
        console.log('[GoogleDrive] Initialization complete, isSignedIn:', !!storedToken);
      } catch (error) {
        console.error('[GoogleDrive] Failed to initialize:', error);
        toast({
          title: 'Google Drive Error',
          description: 'Failed to initialize Google Drive integration',
          variant: 'destructive',
        });
      }
    };

    initializeGoogleApis();
  }, [clientId, apiKey, toast, getTokenFromStorage, saveTokenToStorage, applyTokenToGapi]);

  // Attempt silent token refresh
  const attemptSilentRefresh = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!tokenClient) {
        resolve(false);
        return;
      }
      
      console.log('[GoogleDrive] Attempting silent token refresh...');
      
      // Create a temporary callback override for silent refresh
      const originalCallback = tokenClient.callback;
      
      tokenClient.callback = (tokenResponse: any) => {
        // Restore original callback
        tokenClient.callback = originalCallback;
        
        if (tokenResponse?.error) {
          console.log('[GoogleDrive] Silent refresh failed:', tokenResponse.error);
          resolve(false);
          return;
        }
        
        if (tokenResponse.access_token) {
          console.log('[GoogleDrive] Silent refresh successful');
          setAccessToken(tokenResponse.access_token);
          setIsSignedIn(true);
          applyTokenToGapi(tokenResponse.access_token);
          saveTokenToStorage(tokenResponse.access_token, tokenResponse.expires_in || 3600);
          resolve(true);
        } else {
          resolve(false);
        }
      };
      
      // Try to get token without user interaction
      tokenClient.requestAccessToken({ prompt: '' });
    });
  }, [tokenClient, applyTokenToGapi, saveTokenToStorage]);

  // Sign in to Google
  const signIn = useCallback(() => {
    if (!tokenClient) {
      console.log('[GoogleDrive] Cannot sign in: tokenClient not ready');
      return;
    }

    if (accessToken) {
      console.log('[GoogleDrive] Already have token, confirming signed in');
      setIsSignedIn(true);
      applyTokenToGapi(accessToken);
      return;
    }

    console.log('[GoogleDrive] Requesting new access token with consent');
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }, [tokenClient, accessToken, applyTokenToGapi]);

  // Periodic token check and refresh
  useEffect(() => {
    if (!isInitialized || !tokenClient) return;
    
    const checkAndRefreshToken = async () => {
      const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
      if (!expiry) {
        setIsTokenExpiringSoon(false);
        return;
      }
      
      const expiryTime = parseInt(expiry);
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;
      
      // Update expiring soon state (less than 10 minutes)
      setIsTokenExpiringSoon(timeUntilExpiry < 600000 && timeUntilExpiry > 0);
      
      // If token expires in less than 10 minutes, try to refresh
      if (timeUntilExpiry < 600000 && timeUntilExpiry > 0) {
        console.log('[GoogleDrive] Token expiring soon, attempting refresh...');
        const success = await attemptSilentRefresh();
        if (!success) {
          console.log('[GoogleDrive] Silent refresh failed, user may need to re-authenticate');
          setLastRefreshFailed(true);
        } else {
          setLastRefreshFailed(false);
          setIsTokenExpiringSoon(false);
        }
      }
    };
    
    // Check immediately on mount
    checkAndRefreshToken();
    
    // Check every minute for more responsive status updates
    const interval = setInterval(checkAndRefreshToken, 60000);
    
    return () => clearInterval(interval);
  }, [isInitialized, tokenClient, attemptSilentRefresh]);

  // Sign out from Google
  const signOut = useCallback(() => {
    if (accessToken) {
      console.log('[GoogleDrive] Signing out...');
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        setIsSignedIn(false);
        applyTokenToGapi(null);
        clearTokenFromStorage();
        console.log('[GoogleDrive] Signed out successfully');
      });
    }
  }, [accessToken, clearTokenFromStorage, applyTokenToGapi]);

  // List folders in a directory
  const listFolders = useCallback(async (parentId: string = 'root'): Promise<GoogleDriveFolder[]> => {
    if (!isSignedIn || !accessToken) return [];

    try {
      const response = await window.gapi.client.drive.files.list({
        q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        orderBy: 'name',
      });

      return (response.result.files || []).map((file: any) => ({
        id: file.id,
        name: file.name,
        path: file.name,
      }));
    } catch (error) {
      console.error('[GoogleDrive] Failed to list folders:', error);
      return [];
    }
  }, [isSignedIn, accessToken]);

  // Create a new folder
  const createFolder = useCallback(async (name: string, parentId: string = 'root'): Promise<string | null> => {
    if (!isSignedIn || !accessToken) return null;

    try {
      const response = await window.gapi.client.drive.files.create({
        resource: {
          name: name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id',
      });

      return response.result.id;
    } catch (error) {
      console.error('[GoogleDrive] Failed to create folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder in Google Drive',
        variant: 'destructive',
      });
      return null;
    }
  }, [isSignedIn, accessToken, toast]);

  // Find or create a folder by name
  const findOrCreateFolder = useCallback(async (name: string, parentId: string = 'root'): Promise<string | null> => {
    if (!isSignedIn || !accessToken) return null;

    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
      });

      if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
      }

      return await createFolder(name, parentId);
    } catch (error) {
      console.error('[GoogleDrive] Failed to find or create folder:', error);
      return null;
    }
  }, [isSignedIn, accessToken, createFolder]);

  // Upload a file to Google Drive
  const uploadFile = useCallback(async ({
    file,
    folderId,
    subjectName,
    autoOrganize = false,
  }: UploadOptions): Promise<{ fileId: string; webViewLink: string } | null> => {
    if (!isSignedIn || !accessToken) {
      toast({
        title: 'Not signed in',
        description: 'Please sign in to Google Drive first',
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);

    try {
      let targetFolderId = folderId || 'root';

      if (autoOrganize && subjectName) {
        let baseFolderId = folderId;
        if (!baseFolderId) {
          baseFolderId = await findOrCreateFolder('StudyCampus Notes');
        }

        if (baseFolderId) {
          const subjectFolderId = await findOrCreateFolder(subjectName, baseFolderId);
          if (subjectFolderId) {
            targetFolderId = subjectFolderId;
          }
        }
      }

      const metadata = {
        name: file.name,
        parents: [targetFolderId],
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const uploadResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: form,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadResult = await uploadResponse.json();

      await window.gapi.client.drive.permissions.create({
        fileId: uploadResult.id,
        resource: {
          role: 'reader',
          type: 'anyone',
        },
      });

      const fileResponse = await window.gapi.client.drive.files.get({
        fileId: uploadResult.id,
        fields: 'webViewLink',
      });

      toast({
        title: 'File uploaded',
        description: 'File successfully uploaded to Google Drive',
      });

      return {
        fileId: uploadResult.id,
        webViewLink: fileResponse.result.webViewLink,
      };
    } catch (error) {
      console.error('[GoogleDrive] Failed to upload file:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file to Google Drive',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, accessToken, findOrCreateFolder, toast]);

  // Open Google Picker for folder selection
  const openFolderPicker = useCallback((): Promise<GoogleDriveFolder | null> => {
    return new Promise((resolve) => {
      if (!isSignedIn || !accessToken || !apiKey) {
        resolve(null);
        return;
      }

      const loadPicker = () => {
        return new Promise<void>((res) => {
          if (window.google?.picker) {
            res();
            return;
          }
          window.gapi.load('picker', () => res());
        });
      };

      loadPicker().then(() => {
        const picker = new window.google.picker.PickerBuilder()
          .addView(new window.google.picker.DocsView()
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true)
            .setMimeTypes('application/vnd.google-apps.folder'))
          .setOAuthToken(accessToken)
          .setDeveloperKey(apiKey)
          .setCallback((data: any) => {
            if (data.action === 'picked' && data.docs && data.docs[0]) {
              resolve({
                id: data.docs[0].id,
                name: data.docs[0].name,
                path: data.docs[0].name,
              });
            } else if (data.action === 'cancel') {
              resolve(null);
            }
          })
          .build();

        picker.setVisible(true);
      });
    });
  }, [isSignedIn, accessToken, apiKey]);

  // Delete a file from Google Drive
  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    if (!isSignedIn || !accessToken) {
      toast({
        title: 'Not signed in',
        description: 'Please sign in to Google Drive first',
        variant: 'destructive',
      });
      return false;
    }

    try {
      await window.gapi.client.drive.files.delete({
        fileId: fileId,
      });
      return true;
    } catch (error) {
      console.error('[GoogleDrive] Failed to delete file:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete file from Google Drive',
        variant: 'destructive',
      });
      return false;
    }
  }, [isSignedIn, accessToken, toast]);

  const value: GoogleDriveContextValue = {
    isInitialized,
    isSignedIn,
    isLoading,
    isConfigured,
    isTokenExpiringSoon,
    lastRefreshFailed,
    signIn,
    signOut,
    listFolders,
    createFolder,
    findOrCreateFolder,
    uploadFile,
    openFolderPicker,
    deleteFile,
  };

  return (
    <GoogleDriveContext.Provider value={value}>
      {children}
    </GoogleDriveContext.Provider>
  );
}

export function useGoogleDriveContext() {
  const context = useContext(GoogleDriveContext);
  if (!context) {
    throw new Error('useGoogleDriveContext must be used within a GoogleDriveProvider');
  }
  return context;
}
