import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Copy, Download, ExternalLink, Eye, FileText } from "lucide-react";

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
  const canPreview = note.file_url && (isPDF || isImage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display pr-6">{note.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {subject && (
              <Badge
                variant="secondary"
                style={{ backgroundColor: `${subject.color}15`, color: subject.color }}
              >
                {subject.name}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {note.file_type?.split("/").pop()?.toUpperCase() || (note.link_url ? "LINK" : "NOTE")}
            </Badge>
          </div>

          {note.description ? (
            <ScrollArea className="max-h-48 sm:max-h-56 pr-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {note.description}
              </p>
            </ScrollArea>
          ) : (
            <div className="rounded-md border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">No description provided.</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            {note.link_url && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => onCopyLink(note)}
                >
                  {copiedLinkId === note.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Copy link</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={() => onOpenLink(note)}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Open link</span>
                </Button>
              </>
            )}

            {canPreview && onPreview && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
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
                className="gap-2"
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 rounded-md bg-muted/50">
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
