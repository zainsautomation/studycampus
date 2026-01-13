import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, FileText, Bookmark, ExternalLink, Copy, Check, BookOpen } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { NoteDetailsDialog } from '@/components/notes/NoteDetailsDialog';
import { useSavedNotes } from '@/hooks/useSavedNotes';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
interface Subject {
  id: string;
  name: string;
  color: string;
  description: string | null;
  icon: string | null;
}

interface Note {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  download_count: number | null;
  created_at: string;
  subjects: Subject | null;
  link_url: string | null;
  is_downloadable?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function SavedNotes() {
  const { user } = useAuth();
  const { savedNoteIds, toggleSaveNote, isNoteSaved } = useSavedNotes();
  const { downloadsEnabled } = useAppSettings();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!user || savedNoteIds.size === 0) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    const fetchSavedNotes = async () => {
      const noteIdsArray = Array.from(savedNoteIds);
      const { data, error } = await supabase
        .from('notes')
        .select('*, subjects(id, name, color, description, icon)')
        .in('id', noteIdsArray)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
      } else {
        setNotes(data || []);
      }
      setIsLoading(false);
    };

    fetchSavedNotes();
  }, [user, savedNoteIds]);

  const openDetails = (note: Note) => {
    setActiveNote(note);
    setDetailsOpen(true);
  };

  const handleCopyLink = async (note: Note) => {
    if (note.link_url) {
      await navigator.clipboard.writeText(note.link_url);
      setCopiedLinkId(note.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    }
  };

  const handleOpenLink = (note: Note) => {
    if (note.link_url) {
      window.open(note.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = async (note: Note) => {
    if (note.file_url) {
      try {
        const urlParts = note.file_url.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const pathParts = urlParts[1].split('/');
          const bucket = pathParts[0];
          const filePath = pathParts.slice(1).join('/');
          
          const { data, error } = await supabase.storage
            .from(bucket)
            .download(filePath);
          
          if (error) throw error;
          
          const url = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = url;
          a.download = note.file_name || 'download';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          const response = await fetch(note.file_url);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = note.file_name || 'download';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
        await supabase
          .from('notes')
          .update({ download_count: (note.download_count || 0) + 1 })
          .eq('id', note.id);
      } catch (error) {
        console.error('Download failed:', error);
        window.open(note.file_url, '_blank');
      }
    }
  };

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    return (
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.subjects?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Bookmark className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Saved Notes</h1>
              <p className="text-muted-foreground">
                {savedNoteIds.size} {savedNoteIds.size === 1 ? 'note' : 'notes'} saved
              </p>
            </div>
          </div>

          {savedNoteIds.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative max-w-md"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search saved notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </motion.div>
          )}

          {filteredNotes.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Bookmark className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg text-muted-foreground">
                  {searchQuery ? 'No saved notes match your search' : 'No saved notes yet'}
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {searchQuery ? 'Try a different search term' : 'Click the bookmark icon on any note to save it'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence>
                {filteredNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    variants={itemVariants}
                    layout
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className="h-full overflow-hidden group cursor-pointer"
                      onClick={() => openDetails(note)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div 
                            className="p-3 rounded-xl transition-transform group-hover:scale-110"
                            style={{ backgroundColor: note.subjects?.color ? `${note.subjects.color}15` : 'hsl(var(--muted))' }}
                          >
                            <FileText 
                              className="w-5 h-5" 
                              style={{ color: note.subjects?.color || 'hsl(var(--primary))' }}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaveNote(note.id);
                              }}
                              className="h-8 w-8 group/bookmark"
                              title="Remove from saved"
                            >
                              <Bookmark className="w-4 h-4 fill-amber-500 text-amber-500 transition-transform duration-200 group-hover/bookmark:scale-110" />
                            </Button>
                          </div>
                        </div>
                        
                        {note.subjects && (
                          <Badge 
                            variant="secondary" 
                            className="mb-2 text-xs"
                            style={{ 
                              backgroundColor: `${note.subjects.color}15`,
                              color: note.subjects.color 
                            }}
                          >
                            {note.subjects.name}
                          </Badge>
                        )}
                        
                        <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {note.title}
                        </h3>
                        {note.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {note.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), 'MMM dd, yyyy')}
                          </span>
                          <div className="flex items-center gap-1">
                            {note.link_url && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyLink(note);
                                  }}
                                  className="h-8 w-8 hover:bg-muted"
                                  title="Copy link"
                                >
                                  {copiedLinkId === note.id ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenLink(note);
                                  }}
                                  className="h-8 w-8 hover:bg-muted"
                                  title="Open link"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {note.file_url && downloadsEnabled && note.is_downloadable !== false && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(note);
                                }}
                                className="h-8 gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            {note.file_url && (!downloadsEnabled || note.is_downloadable === false) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-muted-foreground">Disabled</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{!downloadsEnabled ? 'Downloads disabled by admin' : 'Downloads disabled for this note'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>

      <NoteDetailsDialog
        note={activeNote}
        subject={activeNote?.subjects || null}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onDownload={handleDownload}
        onCopyLink={handleCopyLink}
        onOpenLink={handleOpenLink}
        copiedLinkId={copiedLinkId}
        downloadsEnabled={downloadsEnabled && activeNote?.is_downloadable !== false}
      />
    </MainLayout>
  );
}
