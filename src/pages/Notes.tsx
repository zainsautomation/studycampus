import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, FileText, ChevronRight, BookOpen, ArrowLeft, ExternalLink, Copy, Check, Bookmark } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { NoteDetailsDialog } from '@/components/notes/NoteDetailsDialog';
import { useSavedNotes } from '@/hooks/useSavedNotes';

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
  visible: { 
    opacity: 1, 
    y: 0
  }
};

export default function Notes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const { isNoteSaved, toggleSaveNote } = useSavedNotes();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

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

  useEffect(() => {
    const fetchData = async () => {
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      const { data: notesData } = await supabase
        .from('notes')
        .select('*, subjects(id, name, color, description, icon)')
        .order('created_at', { ascending: false });
      setSubjects(subjectsData || []);
      setNotes(notesData || []);
      setIsLoading(false);

      // Handle URL params for deep linking
      const subjectParam = searchParams.get('subject');
      const noteParam = searchParams.get('note');

      if (subjectParam && subjectsData) {
        const subject = subjectsData.find((s: Subject) => s.id === subjectParam);
        if (subject) {
          setSelectedSubject(subject);
        }
      }

      if (noteParam && notesData) {
        const note = notesData.find((n: Note) => n.id === noteParam);
        if (note) {
          // If no subject param but note has a subject, auto-select it
          if (!subjectParam && note.subjects) {
            const subject = subjectsData?.find((s: Subject) => s.id === note.subjects?.id);
            if (subject) {
              setSelectedSubject(subject);
            }
          }
          setActiveNote(note);
          setDetailsOpen(true);
        }
      }

      // Clear URL params after processing
      if (subjectParam || noteParam) {
        setSearchParams({}, { replace: true });
      }
    };
    fetchData();
  }, [searchParams, setSearchParams]);

  const getNotesCount = (subjectId: string) => {
    return notes.filter(note => note.subjects?.id === subjectId).length;
  };

  const filteredNotes = notes.filter(note => {
    const matchesSubject = selectedSubject && note.subjects?.id === selectedSubject.id;
    const matchesSearch = !searchQuery || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const handleDownload = async (note: Note) => {
    if (note.file_url) {
      try {
        // Extract bucket and path from the URL
        // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
        const urlParts = note.file_url.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const pathParts = urlParts[1].split('/');
          const bucket = pathParts[0];
          const filePath = pathParts.slice(1).join('/');
          
          const { data, error } = await supabase.storage
            .from(bucket)
            .download(filePath);
          
          if (error) throw error;
          
          // Create download link
          const url = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = url;
          a.download = note.file_name || 'download';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // Fallback for external URLs - force download
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
        
        // Update download count
        await supabase
          .from('notes')
          .update({ download_count: (note.download_count || 0) + 1 })
          .eq('id', note.id);
      } catch (error) {
        console.error('Download failed:', error);
        // Fallback: open in new tab
        window.open(note.file_url, '_blank');
      }
    }
  };

  const handleBack = () => {
    setSelectedSubject(null);
    setSearchQuery('');
  };

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
        <AnimatePresence mode="wait">
          {!selectedSubject ? (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <motion.h1 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl md:text-3xl font-display font-bold"
                >
                  Study Notes
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground mt-1"
                >
                  Select a subject to view notes
                </motion.p>
              </div>

              {subjects.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-lg text-muted-foreground">No subjects available yet</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Check back later for study materials</p>
                  </CardContent>
                </Card>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {subjects.map((subject) => {
                    const noteCount = getNotesCount(subject.id);
                    return (
                      <motion.div
                        key={subject.id}
                        variants={itemVariants}
                        whileHover={{ scale: 1.02, y: -4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card 
                          className="cursor-pointer overflow-hidden group transition-shadow hover:shadow-lg border-2"
                          style={{ borderColor: `${subject.color}20` }}
                          onClick={() => setSelectedSubject(subject)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div 
                                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                                style={{ backgroundColor: `${subject.color}15` }}
                              >
                                <BookOpen 
                                  className="w-7 h-7" 
                                  style={{ color: subject.color }}
                                />
                              </div>
                              <ChevronRight 
                                className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1"
                              />
                            </div>
                            <h3 
                              className="font-semibold text-lg mb-1"
                              style={{ color: subject.color }}
                            >
                              {subject.name}
                            </h3>
                            {subject.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {subject.description}
                              </p>
                            )}
                            <Badge 
                              variant="secondary" 
                              className="mt-2"
                              style={{ 
                                backgroundColor: `${subject.color}15`,
                                color: subject.color 
                              }}
                            >
                              {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                            </Badge>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="notes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBack}
                  className="gap-2 hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All Subjects
                </Button>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${selectedSubject.color}15` }}
                  >
                    <BookOpen className="w-4 h-4" style={{ color: selectedSubject.color }} />
                  </div>
                  <span className="font-medium" style={{ color: selectedSubject.color }}>
                    {selectedSubject.name}
                  </span>
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative max-w-md"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Search in ${selectedSubject.name}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </motion.div>

              {filteredNotes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card>
                    <CardContent className="py-16 text-center">
                      <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-lg text-muted-foreground">
                        {searchQuery ? 'No notes match your search' : 'No notes in this subject yet'}
                      </p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {searchQuery ? 'Try a different search term' : 'Check back later for new materials'}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {filteredNotes.map((note) => (
                    <motion.div
                      key={note.id}
                      variants={itemVariants}
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
                              style={{ backgroundColor: `${selectedSubject.color}15` }}
                            >
                              <FileText 
                                className="w-5 h-5" 
                                style={{ color: selectedSubject.color }}
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
                                className={`h-8 w-8 ${isNoteSaved(note.id) ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                                title={isNoteSaved(note.id) ? 'Remove from saved' : 'Save note'}
                              >
                                <Bookmark className={`w-4 h-4 ${isNoteSaved(note.id) ? 'fill-current' : ''}`} />
                              </Button>
                              <Badge variant="outline" className="text-xs">
                                {note.file_type?.split('/').pop()?.toUpperCase() || 'FILE'}
                              </Badge>
                            </div>
                          </div>
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
                              {note.file_url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(note);
                                  }}
                                  className="gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              <NoteDetailsDialog
                open={detailsOpen}
                onOpenChange={(open) => {
                  setDetailsOpen(open);
                  if (!open) setActiveNote(null);
                }}
                note={activeNote}
                subject={selectedSubject}
                copiedLinkId={copiedLinkId}
                onCopyLink={handleCopyLink}
                onOpenLink={handleOpenLink}
                onDownload={handleDownload}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
