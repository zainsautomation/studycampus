import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Eye } from 'lucide-react';
import { useNoteViewers } from '@/hooks/useNoteViewStats';

interface Props {
  noteId: string | null;
  noteTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteViewersSheet({ noteId, noteTitle, open, onOpenChange }: Props) {
  const { data: viewers, isLoading } = useNoteViewers(open ? noteId : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4" /> Viewers
          </SheetTitle>
          {noteTitle && (
            <p className="text-sm text-muted-foreground truncate text-left">{noteTitle}</p>
          )}
        </SheetHeader>
        <div className="mt-4 -mx-6">
          <ScrollArea className="h-[calc(100vh-160px)] px-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !viewers || viewers.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No views yet</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {viewers.length} student{viewers.length === 1 ? '' : 's'} viewed this note
                </p>
                <div className="space-y-1">
                  {viewers.map((v) => (
                    <div key={v.user_id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={v.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {(v.full_name || v.username || '?').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {v.full_name || v.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
