import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Copy, Download, ExternalLink, Eye, FileText, ImageIcon, Cloud, Calendar, Link2 } from "lucide-react";
import { format } from "date-fns";

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

interface NoteDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  subject: Subject | null;
  copiedLinkId: string | null;
  onCopyLink: (note: Note) => Promise<void>;
  onOpenLink: (note: Note) => void;
  onDownload: (note: Note) => Promise<void>;
  onPreview?: (note: Note) => void;
  downloadsEnabled?: boolean;
}

export function NoteDetailsDialog({
  open,
  onOpenChange,
  note,
  subject,
  copiedLinkId,
  onCopyLink,
  onOpenLink,
  onDownload,
  onPreview,
  downloadsEnabled = true,
}: NoteDetailsDialogProps) {
  if (!note) return null;

  const fileType = note.file_type?.toLowerCase() || '';
  const isPDF = fileType.includes('pdf');
  const isImage = fileType.includes('image') || 
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].some(ext => 
      note.file_name?.toLowerCase().endsWith(ext) || fileType.includes(ext)
    );
  const isGoogleDrive = note.file_url?.includes('drive.google.com') || note.file_url?.includes('docs.google.com');
  const canPreview = note.file_url && (isPDF || isImage || isGoogleDrive);

  const subjectColor = subject?.color || 'hsl(var(--primary))';

  const getFileIcon = () => {
    if (isPDF) return <FileText className="w-5 h-5" />;
    if (isImage) return <ImageIcon className="w-5 h-5" />;
    if (isGoogleDrive) return <Cloud className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg mx-auto p-0 gap-0 overflow-hidden">
        {/* Subject-colored header strip */}
        <div 
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${subjectColor}, ${subjectColor}60)` }}
        />
        
        <div className="p-5 space-y-4">
          {/* Title and meta */}
          <div className="flex items-start gap-3">
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${subjectColor}12`, color: subjectColor }}
            >
              {getFileIcon()}
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <h2 className="font-display font-semibold text-lg leading-tight">{note.title}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {subject && (
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{ backgroundColor: `${subjectColor}12`, color: subjectColor }}
                  >
                    {subject.name}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {note.file_type?.split("/").pop()?.toUpperCase() || (note.link_url ? "LINK" : "NOTE")}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(note.created_at), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {note.description ? (
            <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
              <ScrollArea className="max-h-40 sm:max-h-48">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {note.description}
                </p>
              </ScrollArea>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/30 border border-dashed border-border p-4">
              <p className="text-sm text-muted-foreground text-center">No description provided.</p>
            </div>
          )}

          {/* File info */}
          {note.file_name && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{note.file_name}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
            {note.link_url && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-9"
                  onClick={() => onCopyLink(note)}
                >
                  {copiedLinkId === note.id ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{copiedLinkId === note.id ? 'Copied!' : 'Copy link'}</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 h-9"
                  onClick={() => onOpenLink(note)}
                >
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Open link</span>
                </Button>
              </>
            )}

            {canPreview && onPreview && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9"
                onClick={() => onPreview(note)}
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Preview</span>
              </Button>
            )}

            {note.file_url && downloadsEnabled && (
              <Button
                variant="default"
                size="sm"
                className="gap-2 h-9 ml-auto"
                onClick={() => onDownload(note)}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}

            {note.file_url && !downloadsEnabled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 rounded-md bg-muted/50 ml-auto">
                      <Download className="h-4 w-4" />
                      <span>Disabled</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Downloads are currently disabled by admin</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {!note.file_url && !note.link_url && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                No file or link attached
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
