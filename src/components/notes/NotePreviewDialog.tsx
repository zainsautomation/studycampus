import { useEffect, useState, useCallback } from 'react';
import { resolveNoteUrl } from '@/lib/noteFile';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Download, Maximize2, Minimize2, X, ExternalLink, FileText, ImageIcon, Cloud, Calendar,
  ChevronLeft, ChevronRight, PanelRightOpen, PanelRightClose, ZoomIn, ZoomOut, RotateCw,
  Bookmark, Copy, Check, Link2, Lock,
} from 'lucide-react';
import { PDFViewer } from './PDFViewer';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type Subject = { id: string; name: string; color: string };

type Note = {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  link_url: string | null;
  download_count?: number | null;
};

interface NotePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  subject: Subject | null;
  onDownload?: (note: Note) => Promise<void>;
  downloadsEnabled?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  position?: { index: number; total: number };
  isSaved?: boolean;
  onToggleSave?: () => void;
}

const isGoogleDriveUrl = (url: string) =>
  url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('googleapis.com');

function IconBtn({ label, onClick, children, disabled, active }: {
  label: string; onClick?: () => void; children: React.ReactNode; disabled?: boolean; active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost" size="icon" onClick={onClick} disabled={disabled} aria-label={label}
          className={cn('h-9 w-9 rounded-full', active && 'bg-muted')}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function NotePreviewDialog({
  open, onOpenChange, note, subject, onDownload, downloadsEnabled = true,
  onPrev, onNext, position, isSaved, onToggleSave,
}: NotePreviewDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setImageLoaded(false); setZoom(1); setRotation(0);
    if (!open || !note?.file_url) { setResolvedUrl(null); return; }
    let cancelled = false;
    resolveNoteUrl(note.file_url).then((u) => { if (!cancelled) setResolvedUrl(u); });
    return () => { cancelled = true; };
  }, [open, note?.id, note?.file_url]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft' && onPrev) onPrev();
    if (e.key === 'ArrowRight' && onNext) onNext();
    if (e.key.toLowerCase() === 'f') setIsFullscreen((v) => !v);
    if (e.key.toLowerCase() === 'i') setShowInfo((v) => !v);
  }, [onPrev, onNext]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, handleKey]);

  if (!note) return null;

  const fileType = note.file_type?.toLowerCase() || '';
  const isPDF = fileType.includes('pdf');
  const isImage = fileType.includes('image') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].some((ext) => note.file_name?.toLowerCase().endsWith(ext));
  const isGoogleDrive = note.file_url ? isGoogleDriveUrl(note.file_url) : false;
  const canPreview = !!note.file_url && (isPDF || isImage || isGoogleDrive);
  const subjectColor = subject?.color || 'hsl(var(--primary))';

  const FileIcon = isPDF ? FileText : isImage ? ImageIcon : isGoogleDrive ? Cloud : FileText;
  const fileLabel = isPDF ? 'PDF' : isImage ? 'Image' : isGoogleDrive ? 'Drive' : note.link_url ? 'Link' : 'File';

  const copyLink = async () => {
    const url = note.link_url || note.file_url;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const InfoPanel = (
    <div className="flex flex-col h-full">
      <div className="p-5 space-y-5 overflow-y-auto flex-1">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">About this note</p>
          {note.description ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{note.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description provided.</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-muted/30 p-3">
            <dt className="text-[11px] text-muted-foreground">Type</dt>
            <dd className="text-sm font-medium flex items-center gap-1.5 mt-0.5"><FileIcon className="w-3.5 h-3.5" />{fileLabel}</dd>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <dt className="text-[11px] text-muted-foreground">Added</dt>
            <dd className="text-sm font-medium flex items-center gap-1.5 mt-0.5"><Calendar className="w-3.5 h-3.5" />{format(new Date(note.created_at), 'MMM d, yyyy')}</dd>
          </div>
          {subject && (
            <div className="rounded-xl border bg-muted/30 p-3 col-span-2">
              <dt className="text-[11px] text-muted-foreground">Subject</dt>
              <dd className="text-sm font-medium flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subjectColor }} />
                {subject.name}
              </dd>
            </div>
          )}
          {(note.download_count ?? 0) > 0 && (
            <div className="rounded-xl border bg-muted/30 p-3 col-span-2">
              <dt className="text-[11px] text-muted-foreground">Downloads</dt>
              <dd className="text-sm font-medium mt-0.5">{note.download_count}</dd>
            </div>
          )}
        </dl>

        {note.file_name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{note.file_name}</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t space-y-2 bg-background/60">
        {note.file_url && downloadsEnabled && onDownload && (
          <Button className="w-full gap-2" onClick={() => onDownload(note)}>
            <Download className="h-4 w-4" /> Download
          </Button>
        )}
        {note.file_url && !downloadsEnabled && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground rounded-md bg-muted/50 py-2">
            <Lock className="h-4 w-4" /> Downloads disabled by admin
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {note.link_url && (
            <Button variant="outline" className="gap-2" onClick={() => window.open(note.link_url!, '_blank', 'noopener,noreferrer')}>
              <Link2 className="h-4 w-4" /> Open link
            </Button>
          )}
          {(note.link_url || isGoogleDrive) && (
            <Button variant="outline" className={cn('gap-2', !note.link_url && 'col-span-2')} onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 gap-0 overflow-hidden flex flex-col bg-background [&>button.absolute]:hidden',
          isFullscreen
            ? 'w-screen h-[100dvh] max-w-none sm:max-w-none max-h-none rounded-none sm:rounded-none'
            : 'w-full h-[94dvh] max-h-[94dvh] sm:w-[calc(100%-2rem)] sm:max-w-6xl sm:h-[90vh] sm:max-h-[90vh] sm:rounded-2xl',
        )}
      >
        <TooltipProvider delayDuration={300}>
          <DialogTitle className="sr-only">{note.title}</DialogTitle>
          <div className="h-1 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${subjectColor}, transparent)` }} />

          {/* Header */}
          <header className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b bg-background/85 backdrop-blur-md shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `color-mix(in srgb, ${subjectColor} 14%, transparent)`, color: subjectColor }}
            >
              <FileIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm sm:text-base truncate" title={note.title}>{note.title}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {subject && <span className="truncate max-w-[9rem]" style={{ color: subjectColor }}>{subject.name}</span>}
                {subject && <span>·</span>}
                <span>{fileLabel}</span>
                {position && position.total > 1 && (<><span>·</span><span>{position.index + 1} of {position.total}</span></>)}
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {position && position.total > 1 && (
                <div className="hidden sm:flex items-center mr-1 rounded-full border p-0.5">
                  <IconBtn label="Previous note (←)" onClick={onPrev} disabled={!onPrev}><ChevronLeft className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Next note (→)" onClick={onNext} disabled={!onNext}><ChevronRight className="h-4 w-4" /></IconBtn>
                </div>
              )}
              {onToggleSave && (
                <IconBtn label={isSaved ? 'Remove from saved' : 'Save note'} onClick={onToggleSave}>
                  <Bookmark className={cn('h-4 w-4', isSaved && 'fill-primary text-primary')} />
                </IconBtn>
              )}
              {canPreview && note.file_url && downloadsEnabled && onDownload && !isGoogleDrive && (
                <span className="hidden sm:inline-flex">
                  <IconBtn label="Download" onClick={() => onDownload(note)}><Download className="h-4 w-4" /></IconBtn>
                </span>
              )}
              {isGoogleDrive && (
                <IconBtn label="Open in Drive" onClick={() => window.open(note.file_url!, '_blank')}><ExternalLink className="h-4 w-4" /></IconBtn>
              )}
              <IconBtn label={showInfo ? 'Hide details (I)' : 'Show details (I)'} onClick={() => setShowInfo((v) => !v)} active={showInfo}>
                {showInfo ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </IconBtn>
              <span className="hidden sm:inline-flex">
                <IconBtn label={isFullscreen ? 'Exit full screen (F)' : 'Full screen (F)'} onClick={() => setIsFullscreen((v) => !v)}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </IconBtn>
              </span>
              <IconBtn label="Close" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></IconBtn>
            </div>
          </header>

          {/* Body */}
          <div className="flex-1 flex min-h-0 relative">
            <div className="flex-1 min-w-0 relative bg-muted/30">
              {!canPreview ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    {note.link_url ? <Link2 className="w-8 h-8 text-muted-foreground" /> : <FileText className="w-8 h-8 text-muted-foreground" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{note.link_url ? 'This note is an external link' : 'Preview not available'}</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      {note.link_url ? 'Open it in a new tab to view the material.' : 'This file type can’t be shown here. You can still download or open it.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {note.link_url && (
                      <Button className="gap-2" onClick={() => window.open(note.link_url!, '_blank', 'noopener,noreferrer')}>
                        <ExternalLink className="h-4 w-4" /> Open link
                      </Button>
                    )}
                    {note.file_url && downloadsEnabled && onDownload && (
                      <Button variant={note.link_url ? 'outline' : 'default'} className="gap-2" onClick={() => onDownload(note)}>
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    )}
                  </div>
                </div>
              ) : !resolvedUrl ? (
                <div className="h-full flex items-center justify-center">
                  <div className="space-y-3 text-center">
                    <Skeleton className="w-56 h-72 rounded-xl mx-auto" />
                    <p className="text-xs text-muted-foreground animate-pulse">Preparing preview…</p>
                  </div>
                </div>
              ) : isImage ? (
                <>
                  <div className="h-full overflow-auto flex items-center justify-center p-6">
                    {!imageLoaded && <Skeleton className="absolute w-56 h-56 rounded-xl" />}
                    <motion.img
                      key={note.id}
                      src={resolvedUrl}
                      alt={note.title}
                      onLoad={() => setImageLoaded(true)}
                      animate={{ opacity: imageLoaded ? 1 : 0, scale: zoom, rotate: rotation }}
                      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-xl select-none"
                      draggable={false}
                    />
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full border bg-background/90 backdrop-blur-md shadow-lg p-1">
                    <IconBtn label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} disabled={zoom <= 0.5}><ZoomOut className="h-4 w-4" /></IconBtn>
                    <button onClick={() => { setZoom(1); setRotation(0); }} className="text-xs font-medium tabular-nums w-12 text-center hover:text-primary" title="Reset">
                      {Math.round(zoom * 100)}%
                    </button>
                    <IconBtn label="Zoom in" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} disabled={zoom >= 3}><ZoomIn className="h-4 w-4" /></IconBtn>
                    <div className="w-px h-5 bg-border mx-0.5" />
                    <IconBtn label="Rotate" onClick={() => setRotation((r) => r + 90)}><RotateCw className="h-4 w-4" /></IconBtn>
                  </div>
                </>
              ) : (
                <PDFViewer key={note.id} fileUrl={resolvedUrl} className="h-full" />
              )}

              {/* Mobile prev/next */}
              {position && position.total > 1 && (
                <div className="sm:hidden absolute top-1/2 inset-x-1 -translate-y-1/2 flex justify-between pointer-events-none">
                  <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full shadow pointer-events-auto opacity-80" onClick={onPrev} disabled={!onPrev} aria-label="Previous note"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full shadow pointer-events-auto opacity-80" onClick={onNext} disabled={!onNext} aria-label="Next note"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
            </div>

            {/* Info panel: side rail on desktop, bottom sheet on mobile */}
            <AnimatePresence initial={false}>
              {showInfo && (
                <>
                  <motion.aside
                    key="rail"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 340, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="hidden lg:block border-l bg-background overflow-hidden shrink-0"
                  >
                    <div className="w-[340px] h-full">{InfoPanel}</div>
                  </motion.aside>
                  <motion.div
                    key="sheet"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                    className="lg:hidden absolute inset-x-0 bottom-0 max-h-[70%] rounded-t-2xl border-t bg-background shadow-2xl flex flex-col z-20"
                  >
                    <button onClick={() => setShowInfo(false)} className="py-2 flex justify-center" aria-label="Hide details">
                      <span className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                    </button>
                    <div className="min-h-0 flex-1 flex flex-col">{InfoPanel}</div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
