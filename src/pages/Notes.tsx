import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, FileText, Filter } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Subject { id: string; name: string; color: string; }
interface Note { id: string; title: string; description: string; file_url: string; file_name: string; file_type: string; download_count: number; created_at: string; subjects: Subject | null; }

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: subjectsData } = await supabase.from('subjects').select('*').order('name');
      const { data: notesData } = await supabase.from('notes').select('*, subjects(id, name, color)').order('created_at', { ascending: false });
      setSubjects(subjectsData || []);
      setNotes(notesData || []);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const filteredNotes = notes.filter(note => {
    const matchesSubject = !selectedSubject || note.subjects?.id === selectedSubject;
    const matchesSearch = !searchQuery || note.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const handleDownload = async (note: Note) => {
    if (note.file_url) {
      window.open(note.file_url, '_blank');
      await supabase.from('notes').update({ download_count: (note.download_count || 0) + 1 }).eq('id', note.id);
    }
  };

  return (
    <MainLayout>
      <div className="container py-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Study Notes</h1>
            <p className="text-muted-foreground mt-1">Access all your class materials</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <Button variant={selectedSubject === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedSubject(null)}>All</Button>
              {subjects.map((subject) => (
                <Button key={subject.id} variant={selectedSubject === subject.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedSubject(subject.id)} style={selectedSubject === subject.id ? { backgroundColor: subject.color } : { borderColor: subject.color, color: subject.color }}>{subject.name}</Button>
              ))}
            </div>
          </div>
          {filteredNotes.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No notes found</p></CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <motion.div key={note.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-accent/10"><FileText className="w-5 h-5 text-accent" /></div>
                        {note.subjects && <Badge variant="outline" style={{ borderColor: note.subjects.color, color: note.subjects.color }}>{note.subjects.name}</Badge>}
                      </div>
                      <h3 className="font-semibold mb-1 line-clamp-2">{note.title}</h3>
                      {note.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{note.description}</p>}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">{format(new Date(note.created_at), 'MMM dd, yyyy')}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(note)} disabled={!note.file_url}><Download className="w-4 h-4 mr-1" />Download</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
