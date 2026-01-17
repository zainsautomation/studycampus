import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Maximize2, Minimize2, X, ExternalLink, AlertCircle } from 'lucide-react';
import { PDFViewer } from './PDFViewer';

type Subject = {
  id: string;
  name: string;
  color: string;
};

type Note = {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  link_url: string | null;
};

interface NotePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  subject: Subject | null;
  onDownload?: (note: Note) => Promise<void>;
  downloadsEnabled?: boolean;
}

// Helper to detect Google Drive URLs
const isGoogleDriveUrl = (url: string): boolean => {
  return url.includes('drive.google.com') || 
         url.includes('docs.google.com') ||
         url.includes('googleapis.com');
};

export function NotePreviewDialog({
  open,
  onOpenChange,
  note,
  subject,
  onDownload,
  downloadsEnabled = true,
}: NotePreviewDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!note) return null;

  const fileType = note.file_type?.toLowerCase() || '';
  const isPDF = fileType.includes('pdf');
  const isImage = fileType.includes('image') || 
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].some(ext => 
      note.file_name?.toLowerCase().endsWith(ext) || fileType.includes(ext)
    );

  const isGoogleDrive = note.file_url ? isGoogleDriveUrl(note.file_url) : false;
  
  // Google Drive files can be previewed using embed
  const canPreview = note.file_url && (isPDF || isImage || isGoogleDrive);

  if (!canPreview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display pr-6">{note.title}</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Preview is not available for this file type.
            </p>
            <div className="flex justify-center gap-2">
              {note.file_url && downloadsEnabled && onDownload && (
                <Button onClick={() => onDownload(note)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download File
                </Button>
              )}
              {note.file_url && (
                <Button 
                  variant="outline" 
                  onClick={() => window.open(note.file_url!, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // For Google Drive that's not PDF or Image, show special handling
  const showGoogleDriveEmbed = isGoogleDrive && !isPDF && !isImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`p-0 gap-0 overflow-hidden ${
          isFullscreen 
            ? 'w-screen h-screen max-w-none max-h-none rounded-none' 
            : 'w-[calc(100%-2rem)] max-w-4xl h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0">
              <h2 className="font-display font-semibold truncate">{note.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                {subject && (
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{ backgroundColor: `${subject.color}15`, color: subject.color }}
                  >
                    {subject.name}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {isPDF ? 'PDF' : isImage ? 'IMAGE' : isGoogleDrive ? 'DRIVE' : 'FILE'}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {downloadsEnabled && onDownload && !isGoogleDrive && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDownload(note)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}
            {isGoogleDrive && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(note.file_url!, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Open in Drive</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {(isPDF || (isGoogleDrive && !isImage)) && note.file_url && (
            <PDFViewer fileUrl={note.file_url} className="h-full" />
          )}
          {isImage && note.file_url && (
            <div className="h-full overflow-auto flex items-center justify-center p-4 bg-muted/20">
              <img
                src={note.file_url}
                alt={note.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
