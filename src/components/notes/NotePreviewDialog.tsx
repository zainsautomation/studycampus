import { useEffect, useState } from 'react';
import { resolveNoteUrl } from '@/lib/noteFile';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Maximize2, Minimize2, X, ExternalLink, FileText, ImageIcon, Cloud, Calendar } from 'lucide-react';
import { PDFViewer } from './PDFViewer';
import { format } from 'date-fns';

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !note?.file_url) { setResolvedUrl(null); return; }
    let cancelled = false;
    resolveNoteUrl(note.file_url).then((u) => { if (!cancelled) setResolvedUrl(u); });
    return () => { cancelled = true; };
  }, [open, note?.file_url]);

  if (!note) return null;

  const fileType = note.file_type?.toLowerCase() || '';
  const isPDF = fileType.includes('pdf');
  const isImage = fileType.includes('image') || 
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].some(ext => 
      note.file_name?.toLowerCase().endsWith(ext) || fileType.includes(ext)
    );

  const isGoogleDrive = note.file_url ? isGoogleDriveUrl(note.file_url) : false;
  const canPreview = note.file_url && (isPDF || isImage || isGoogleDrive);

  const subjectColor = subject?.color || 'hsl(var(--primary))';

  const getFileIcon = () => {
    if (isPDF) return <FileText className="w-4 h-4" />;
    if (isImage) return <ImageIcon className="w-4 h-4" />;
    if (isGoogleDrive) return <Cloud className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getFileLabel = () => {
    if (isPDF) return 'PDF';
    if (isImage) return 'IMAGE';
    if (isGoogleDrive) return 'DRIVE';
    return 'FILE';
  };

  if (!canPreview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{note.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Preview is not available for this file type.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              {note.file_url && downloadsEnabled && onDownload && (
                <Button onClick={() => onDownload(note)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
              {note.file_url && (
                <Button 
                  variant="outline" 
                  onClick={() => window.open(note.file_url!, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`p-0 gap-0 overflow-hidden ${
          isFullscreen 
            ? 'w-screen h-screen max-w-none max-h-none rounded-none' 
            : 'w-[calc(100%-2rem)] max-w-4xl h-[85vh]'
        }`}
      >
        {/* Gradient accent bar */}
        <div 
          className="h-1 w-full flex-shrink-0"
          style={{ background: `linear-gradient(90deg, ${subjectColor}, ${subjectColor}80, ${subjectColor}40)` }}
        />

        {/* Header with frosted glass */}
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${subjectColor}15` }}
            >
              {getFileIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm sm:text-base truncate">{note.title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {subject && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-5 px-1.5"
                    style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}
                  >
                    {subject.name}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
                  {getFileIcon()}
                  {getFileLabel()}
                </Badge>
                <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(note.created_at), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {downloadsEnabled && onDownload && !isGoogleDrive && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDownload(note)}
                className="gap-1.5 h-8 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}
            {isGoogleDrive && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(note.file_url!, '_blank')}
                className="gap-1.5 h-8 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open in Drive</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8"
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
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
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {(isPDF || (isGoogleDrive && !isImage)) && resolvedUrl && (
            <PDFViewer fileUrl={resolvedUrl} className="h-full" />
          )}
          {isImage && resolvedUrl && (
            <div className="h-full overflow-auto flex items-center justify-center p-4 bg-muted/10">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="space-y-3 text-center">
                    <Skeleton className="w-48 h-48 rounded-xl mx-auto" />
                    <p className="text-xs text-muted-foreground animate-pulse">Loading image…</p>
                  </div>
                </div>
              )}
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: imageLoaded ? 1 : 0, scale: imageLoaded ? 1 : 0.95 }}
                transition={{ duration: 0.3 }}
                src={resolvedUrl}
                alt={note.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                onLoad={() => setImageLoaded(true)}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
