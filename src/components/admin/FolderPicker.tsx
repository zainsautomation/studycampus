import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, ChevronRight, FolderPlus, ArrowLeft, Check, Loader2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Folder {
  id: string;
  name: string;
  path: string;
}

interface FolderPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (folder: Folder) => void;
  listFolders: (parentId: string) => Promise<Folder[]>;
  createFolder: (name: string, parentId: string) => Promise<string | null>;
  currentFolderId?: string | null;
  currentFolderName?: string | null;
  excludeFolderIds?: string[];
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export function FolderPicker({
  open,
  onOpenChange,
  onSelect,
  listFolders,
  createFolder,
  currentFolderId,
  currentFolderName,
  excludeFolderIds = [],
}: FolderPickerProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'My Drive' }]);
  const [currentParentId, setCurrentParentId] = useState('root');
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    if (open) {
      loadFolders('root');
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
      setCurrentParentId('root');
      setSelectedFolder(null);
    }
  }, [open]);

  const loadFolders = async (parentId: string) => {
    setIsLoading(true);
    try {
      const result = await listFolders(parentId);
      // Filter out excluded folders (e.g., default storage folder)
      const filtered = excludeFolderIds.length > 0
        ? result.filter(f => !excludeFolderIds.includes(f.id))
        : result;
      setFolders(filtered);
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (folder: Folder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentParentId(folder.id);
    loadFolders(folder.id);
    setSelectedFolder(null);
  };

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    const targetId = newBreadcrumbs[newBreadcrumbs.length - 1].id;
    setCurrentParentId(targetId);
    loadFolders(targetId);
    setSelectedFolder(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    try {
      const folderId = await createFolder(newFolderName.trim(), currentParentId);
      if (folderId) {
        setNewFolderName('');
        loadFolders(currentParentId);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelect = () => {
    if (selectedFolder) {
      onSelect(selectedFolder);
      onOpenChange(false);
    } else {
      // Select current folder
      const currentFolder = breadcrumbs[breadcrumbs.length - 1];
      onSelect({
        id: currentFolder.id,
        name: currentFolder.name,
        path: breadcrumbs.map((b) => b.name).join('/'),
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Select Folder
          </DialogTitle>
          <DialogDescription>
            Choose a folder in your Google Drive to store notes
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm overflow-x-auto pb-2">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center gap-1 flex-shrink-0">
              {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className={cn(
                  'px-2 py-1 rounded-md hover:bg-muted transition-colors',
                  index === breadcrumbs.length - 1 && 'font-medium'
                )}
              >
                {index === 0 ? (
                  <Home className="w-4 h-4" />
                ) : (
                  crumb.name
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Folder list */}
        <ScrollArea className="h-[250px] rounded-lg border border-border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No folders found</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <AnimatePresence mode="popLayout">
                {folders.map((folder) => (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <button
                      onClick={() => setSelectedFolder(selectedFolder?.id === folder.id ? null : folder)}
                      onDoubleClick={() => navigateToFolder(folder)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group',
                        selectedFolder?.id === folder.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <FolderOpen className={cn(
                        'w-5 h-5 flex-shrink-0',
                        selectedFolder?.id === folder.id ? 'text-primary-foreground' : 'text-amber-500'
                      )} />
                      <span className="flex-1 truncate text-sm font-medium">{folder.name}</span>
                      {selectedFolder?.id === folder.id && (
                        <Check className="w-4 h-4 flex-shrink-0" />
                      )}
                      <ChevronRight className={cn(
                        'w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
                        selectedFolder?.id === folder.id && 'opacity-100'
                      )} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Create new folder */}
        <div className="flex gap-2">
          <Input
            placeholder="New folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || isCreating}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FolderPlus className="w-4 h-4" />
            )}
          </Button>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect}>
            {selectedFolder ? `Select "${selectedFolder.name}"` : 'Select Current Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
