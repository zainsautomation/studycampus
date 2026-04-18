import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
 import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

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

interface ConnectionStatus {
  connected: boolean;
  email: string | null;
  expiresAt: string | null;
}

interface GoogleDriveContextValue {
  isInitialized: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isPermanentConnection: boolean;
  connectionEmail: string | null;
  signIn: () => void;
  signOut: () => Promise<void>;
  listFolders: (parentId?: string) => Promise<GoogleDriveFolder[]>;
  createFolder: (name: string, parentId?: string) => Promise<string | null>;
  findOrCreateFolder: (name: string, parentId?: string) => Promise<string | null>;
  uploadFile: (options: UploadOptions) => Promise<{ fileId: string; webViewLink: string } | null>;
  openFolderPicker: () => Promise<GoogleDriveFolder | null>;
  deleteFile: (fileId: string) => Promise<boolean>;
  refreshConnection: () => Promise<void>;
}

const GoogleDriveContext = createContext<GoogleDriveContextValue | null>(null);

export function GoogleDriveProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connectionEmail, setConnectionEmail] = useState<string | null>(null);
  const [isPermanentConnection, setIsPermanentConnection] = useState(false);

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

  const invokeWithSession = useCallback(
    async (functionName: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionToken = sessionData.session?.access_token;

      if (!sessionToken) {
        return {
          data: null,
          error: new Error('No active session'),
        };
      }

      return supabase.functions.invoke(functionName, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
    },
    []
  );

  // Fetch token from edge function (server-side OAuth)
  const fetchTokenFromServer = useCallback(async (): Promise<ConnectionStatus> => {
    try {
      const { data, error } = await invokeWithSession('google-drive-token');
      
      if (error) {
        console.log('[GoogleDrive] Token fetch error:', error.message);
        return { connected: false, email: null, expiresAt: null };
      }
      
      if (data?.error || !data?.connected) {
        console.log('[GoogleDrive] No active connection');
        return { connected: false, email: null, expiresAt: null };
      }
      
      return {
        connected: true,
        email: data.email,
        expiresAt: data.expires_at
      };
    } catch (err) {
      console.error('[GoogleDrive] Failed to fetch token:', err);
      return { connected: false, email: null, expiresAt: null };
    }
  }, []);

  // Get a valid access token (refreshes if needed via edge function)
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await invokeWithSession('google-drive-token');
      
      if (error || data?.error || !data?.access_token) {
        console.error('[GoogleDrive] Failed to get access token');
        setIsSignedIn(false);
        setIsPermanentConnection(false);
        return null;
      }
      
      const token = data.access_token;
      setAccessToken(token);
      applyTokenToGapi(token);
      return token;
    } catch (err) {
      console.error('[GoogleDrive] Error getting access token:', err);
      return null;
    }
  }, [applyTokenToGapi, invokeWithSession]);

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

    const initializeGoogleApis = async () => {
      try {
        console.log('[GoogleDrive] Starting initialization...');
        await loadGapiScript();

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

        setIsInitialized(true);
        console.log('[GoogleDrive] GAPI initialized');

        // Only check for server-side connection if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const status = await fetchTokenFromServer();
          if (status.connected) {
            console.log('[GoogleDrive] Found permanent connection:', status.email);
            setIsSignedIn(true);
            setIsPermanentConnection(true);
            setConnectionEmail(status.email);
            
            // Get the access token and apply to GAPI
            await getAccessToken();
          }
        } else {
          console.log('[GoogleDrive] User not authenticated, skipping token fetch');
        }
      } catch (error) {
        console.error('[GoogleDrive] Failed to initialize:', error);
        setIsInitialized(true); // Still mark as initialized so UI can show connect option
      }
    };

    initializeGoogleApis();
  }, [clientId, apiKey, fetchTokenFromServer, getAccessToken]);

  // Refresh connection status
  const refreshConnection = useCallback(async () => {
    const status = await fetchTokenFromServer();
    if (status.connected) {
      setIsSignedIn(true);
      setIsPermanentConnection(true);
      setConnectionEmail(status.email);
      await getAccessToken();
    } else {
      setIsSignedIn(false);
      setIsPermanentConnection(false);
      setConnectionEmail(null);
      setAccessToken(null);
      applyTokenToGapi(null);
    }
  }, [fetchTokenFromServer, getAccessToken, applyTokenToGapi]);

  // Sign in - redirect to Google OAuth with offline access
  const signIn = useCallback(() => {
    if (!clientId) {
      console.log('[GoogleDrive] Cannot sign in: clientId not configured');
      return;
    }

    console.log('[GoogleDrive] Starting server-side OAuth flow...');
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/auth/google-drive/callback`,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent to ensure we get refresh token
    });
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }, [clientId]);

  // Sign out - revoke connection via edge function
  const signOut = useCallback(async () => {
    console.log('[GoogleDrive] Disconnecting...');
    setIsLoading(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionToken = sessionData.session?.access_token;

      const { error } = await supabase.functions.invoke('google-drive-disconnect', {
        headers: sessionToken
          ? {
              Authorization: `Bearer ${sessionToken}`,
            }
          : undefined,
      });
      
      if (error) {
        console.error('[GoogleDrive] Disconnect error:', error);
        toast({
          title: 'Disconnect failed',
          description: 'Failed to disconnect Google Drive',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Disconnected',
          description: 'Google Drive has been disconnected',
        });
      }
    } catch (err) {
      console.error('[GoogleDrive] Error during disconnect:', err);
    } finally {
      setAccessToken(null);
      setIsSignedIn(false);
      setIsPermanentConnection(false);
      setConnectionEmail(null);
      applyTokenToGapi(null);
      setIsLoading(false);
    }
  }, [toast, applyTokenToGapi]);

  // List folders in a directory
  const listFolders = useCallback(async (parentId: string = 'root'): Promise<GoogleDriveFolder[]> => {
    const token = await getAccessToken();
    if (!token) return [];

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
  }, [getAccessToken]);

  // Create a new folder
  const createFolder = useCallback(async (name: string, parentId: string = 'root'): Promise<string | null> => {
    const token = await getAccessToken();
    if (!token) return null;

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
  }, [getAccessToken, toast]);

  // Find or create a folder by name
  const findOrCreateFolder = useCallback(async (name: string, parentId: string = 'root'): Promise<string | null> => {
    const token = await getAccessToken();
    if (!token) return null;

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
  }, [getAccessToken, createFolder]);

  // Upload a file to Google Drive
  const uploadFile = useCallback(async ({
    file,
    folderId,
    subjectName,
    autoOrganize = false,
  }: UploadOptions): Promise<{ fileId: string; webViewLink: string } | null> => {
    const token = await getAccessToken();
    if (!token) {
      toast({
        title: 'Not connected',
        description: 'Please connect Google Drive first',
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
            Authorization: `Bearer ${token}`,
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
  }, [getAccessToken, findOrCreateFolder, toast]);

  // Open Google Picker for folder selection
  const openFolderPicker = useCallback((): Promise<GoogleDriveFolder | null> => {
    return new Promise(async (resolve) => {
      const token = await getAccessToken();
      if (!token || !apiKey) {
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
          .setOAuthToken(token)
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
  }, [getAccessToken, apiKey]);

  // Delete a file from Google Drive
  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    const token = await getAccessToken();
    if (!token) {
      toast({
        title: 'Not connected',
        description: 'Please connect Google Drive first',
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
  }, [getAccessToken, toast]);

  const value: GoogleDriveContextValue = {
    isInitialized,
    isSignedIn,
    isLoading,
    isConfigured,
    isPermanentConnection,
    connectionEmail,
    signIn,
    signOut,
    listFolders,
    createFolder,
    findOrCreateFolder,
    uploadFile,
    openFolderPicker,
    deleteFile,
    refreshConnection,
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
 
 // Helper hook to check if user has admin role - for deferred GAPI loading
 export function useIsAdmin() {
   const { user } = useAuth();
   const [isAdmin, setIsAdmin] = useState(false);
   
   useEffect(() => {
     if (!user) {
       setIsAdmin(false);
       return;
     }
     
     const checkAdmin = async () => {
       const { data } = await supabase
         .from('user_roles')
         .select('role')
         .eq('user_id', user.id)
         .eq('role', 'admin')
         .single();
       
       setIsAdmin(!!data);
     };
     
     checkAdmin();
   }, [user]);
   
   return isAdmin;
 }
