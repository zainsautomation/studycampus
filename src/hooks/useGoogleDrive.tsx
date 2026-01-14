import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

interface GoogleDriveFolder {
  id: string;
  name: string;
  path: string;
}

interface UseGoogleDriveOptions {
  clientId: string | null;
  apiKey: string | null;
}

interface UploadOptions {
  file: File;
  folderId?: string;
  folderName?: string;
  subjectName?: string;
  autoOrganize?: boolean;
}

export function useGoogleDrive({ clientId, apiKey }: UseGoogleDriveOptions) {
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Load Google API scripts
  useEffect(() => {
    if (!clientId || !apiKey) return;

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

        // Initialize GIS token client
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            if (tokenResponse.access_token) {
              setAccessToken(tokenResponse.access_token);
              setIsSignedIn(true);
            }
          },
        });

        setTokenClient(client);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Google APIs:', error);
        toast({
          title: 'Google Drive Error',
          description: 'Failed to initialize Google Drive integration',
          variant: 'destructive',
        });
      }
    };

    initializeGoogleApis();
  }, [clientId, apiKey, toast]);

  // Sign in to Google
  const signIn = useCallback(() => {
    if (!tokenClient) return;
    
    if (accessToken) {
      // Already have a token, just confirm signed in
      setIsSignedIn(true);
    } else {
      // Request new token
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  }, [tokenClient, accessToken]);

  // Sign out from Google
  const signOut = useCallback(() => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        setIsSignedIn(false);
      });
    }
  }, [accessToken]);

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
      console.error('Failed to list folders:', error);
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
      console.error('Failed to create folder:', error);
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
      // First, try to find the folder
      const response = await window.gapi.client.drive.files.list({
        q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
      });

      if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
      }

      // If not found, create it
      return await createFolder(name, parentId);
    } catch (error) {
      console.error('Failed to find or create folder:', error);
      return null;
    }
  }, [isSignedIn, accessToken, createFolder]);

  // Upload a file to Google Drive
  const uploadFile = useCallback(async ({
    file,
    folderId,
    folderName,
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

      // Auto-organize: Create subject folder if needed
      if (autoOrganize && subjectName) {
        // First ensure base folder exists
        let baseFolderId = folderId;
        if (!baseFolderId) {
          baseFolderId = await findOrCreateFolder('StudyCampus Notes');
        }

        if (baseFolderId) {
          // Create subject subfolder
          const subjectFolderId = await findOrCreateFolder(subjectName, baseFolderId);
          if (subjectFolderId) {
            targetFolderId = subjectFolderId;
          }
        }
      }

      // Upload the file using multipart upload
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

      // Make the file viewable by anyone with the link
      await window.gapi.client.drive.permissions.create({
        fileId: uploadResult.id,
        resource: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Get the updated web view link
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
      console.error('Failed to upload file:', error);
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

  return {
    isInitialized,
    isSignedIn,
    isLoading,
    signIn,
    signOut,
    listFolders,
    createFolder,
    findOrCreateFolder,
    uploadFile,
    openFolderPicker,
    isConfigured: Boolean(clientId && apiKey),
  };
}
