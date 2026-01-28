import { Cloud, FolderOpen, Check, X, LogIn, LogOut, Settings2, FolderTree, CheckCircle2, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

interface GoogleDriveFolder {
  id: string;
  name: string;
  path: string;
}

export interface GoogleDriveClient {
  isInitialized: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isPermanentConnection: boolean;
  connectionEmail: string | null;
  signIn: () => void;
  signOut: () => Promise<void>;
  openFolderPicker: () => Promise<GoogleDriveFolder | null>;
  createFolder: (name: string, parentId?: string) => Promise<string | null>;
}

interface GoogleDriveSettingsProps {
  googleDrive: GoogleDriveClient;
  defaultFolderId: string | null;
  defaultFolderName: string | null;
  autoOrganize: boolean;
  onSettingsChange: (settings: {
    defaultFolderId: string | null;
    defaultFolderName: string | null;
    autoOrganize: boolean;
  }) => void;
}

export function GoogleDriveSettings({
  googleDrive,
  defaultFolderId,
  defaultFolderName,
  autoOrganize,
  onSettingsChange,
}: GoogleDriveSettingsProps) {
  const { toast } = useToast();
  const [localAutoOrganize, setLocalAutoOrganize] = useState(autoOrganize);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const {
    isInitialized,
    isSignedIn,
    isLoading,
    signIn,
    signOut,
    openFolderPicker,
    createFolder,
    isConfigured,
    isPermanentConnection,
    connectionEmail,
  } = googleDrive;

  // Sync localAutoOrganize with prop changes
  useEffect(() => {
    setLocalAutoOrganize(autoOrganize);
  }, [autoOrganize]);


  const handleSelectFolder = async () => {
    const folder = await openFolderPicker();
    if (folder) {
      onSettingsChange({
        defaultFolderId: folder.id,
        defaultFolderName: folder.name,
        autoOrganize: localAutoOrganize,
      });
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const folderId = await createFolder(newFolderName.trim());
      if (folderId) {
        onSettingsChange({
          defaultFolderId: folderId,
          defaultFolderName: newFolderName.trim(),
          autoOrganize: localAutoOrganize,
        });
        setNewFolderName('');
        toast({
          title: 'Folder created',
          description: `Created folder "${newFolderName.trim()}" in Google Drive`,
        });
      }
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleAutoOrganizeChange = (checked: boolean) => {
    setLocalAutoOrganize(checked);
    onSettingsChange({
      defaultFolderId,
      defaultFolderName,
      autoOrganize: checked,
    });
  };

  const handleClearFolder = () => {
    onSettingsChange({
      defaultFolderId: null,
      defaultFolderName: null,
      autoOrganize: localAutoOrganize,
    });
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await signOut();
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!isConfigured) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/30">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Cloud className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Google Drive Not Configured</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add GOOGLE_CLIENT_ID and GOOGLE_API_KEY secrets to enable Google Drive integration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Drive Settings</CardTitle>
              <CardDescription>Configure folder and organization preferences</CardDescription>
            </div>
          </div>
          {isPermanentConnection ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Permanently Connected
            </Badge>
          ) : (
            <Badge variant={isSignedIn ? 'default' : 'secondary'}>
              {isSignedIn ? 'Connected' : 'Not Connected'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-500" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <LogIn className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div>
              {isSignedIn && connectionEmail ? (
                <>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {connectionEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPermanentConnection 
                      ? 'Permanent connection - stays connected until you disconnect' 
                      : 'Connected to Google Drive'}
                  </p>
                </>
              ) : isSignedIn ? (
                <>
                  <p className="text-sm font-medium">Connected to Google Drive</p>
                  <p className="text-xs text-muted-foreground">
                    You can upload files and manage folders
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">Connect Google Drive</p>
                  <p className="text-xs text-muted-foreground">
                    One-time setup for permanent access
                  </p>
                </>
              )}
            </div>
          </div>
          <Button
            variant={isSignedIn ? 'outline' : 'default'}
            size="sm"
            onClick={isSignedIn ? handleDisconnect : signIn}
            disabled={!isInitialized || isDisconnecting}
          >
            {isSignedIn ? (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Connect
              </>
            )}
          </Button>
        </div>

        {isSignedIn && (
          <>
            <Separator />

            {/* Default Folder Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Default Upload Folder
              </Label>
              
              {defaultFolderName ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <FolderTree className="w-5 h-5 text-primary" />
                  <span className="flex-1 font-medium text-sm">{defaultFolderName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectFolder}
                  >
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={handleClearFolder}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleSelectFolder}
                    disabled={isLoading}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Select Existing Folder
                  </Button>
                  <div className="flex gap-2 flex-1">
                    <Input
                      placeholder="New folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim() || isCreatingFolder}
                    >
                      {isCreatingFolder ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                All notes uploaded to Google Drive will be stored in this folder by default.
              </p>
            </div>

            <Separator />

            {/* Auto-organize by Subject */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Settings2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label className="cursor-pointer">Auto-organize by Subject</Label>
                  <p className="text-xs text-muted-foreground">
                    Create subfolders for each subject (e.g., /Math/, /Physics/)
                  </p>
                </div>
              </div>
              <Switch
                checked={localAutoOrganize}
                onCheckedChange={handleAutoOrganizeChange}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
