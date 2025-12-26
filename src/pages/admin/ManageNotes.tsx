import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Upload, FileText, X, Link } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface Subject { id: string; name: string; color: string; }
interface Note { id: string; title: string; description: string | null; file_url: string | null; file_name: string | null; file_type: string | null; file_size: number | null; download_count: number | null; subject_id: string | null; created_at: string; subjects: Subject | null; link_url: string | null; }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function ManageNotes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', subject_id: '', link_url: '', file_name: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [keepExistingFile, setKeepExistingFile] = useState(true);

  const fetchData = useCallback(async () => {
    const [notesRes, subjectsRes] = await Promise.all([
      supabase.from('notes').select('*, subjects(id, name, color)').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
    ]);
    setNotes(notesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFormData({ title: '', description: '', subject_id: '', link_url: '', file_name: '' });
    setSelectedFile(null);
    setEditingNote(null);
    setKeepExistingFile(true);
  };

  const handleOpenDialog = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormData({ 
        title: note.title, 
        description: note.description || '', 
        subject_id: note.subject_id || '', 
        link_url: note.link_url || '',
        file_name: note.file_name || ''
      });
      setKeepExistingFile(true);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsUploading(true);
    let fileUrl = (editingNote && keepExistingFile) ? editingNote.file_url : null;
    let fileName = (editingNote && keepExistingFile) ? (formData.file_name || editingNote.file_name) : null;
    let fileType = (editingNote && keepExistingFile) ? editingNote.file_type : null;
    let fileSize = (editingNote && keepExistingFile) ? editingNote.file_size : null;

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('notes').upload(filePath, selectedFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('notes').getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
        // Use custom file name if provided, otherwise use original file name
        fileName = formData.file_name?.trim() || selectedFile.name;
        fileType = selectedFile.type;
        fileSize = selectedFile.size;
      } else if (editingNote && keepExistingFile && formData.file_name?.trim()) {
        // Just renaming existing file
        fileName = formData.file_name.trim();
      }

      const noteData = {
        title: formData.title,
        description: formData.description || null,
        subject_id: formData.subject_id || null,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        link_url: formData.link_url || null,
        created_by: user?.id,
      };

      if (editingNote) {
        const { error } = await supabase.from('notes').update(noteData).eq('id', editingNote.id);
        if (error) throw error;
        toast({ title: 'Note updated successfully' });
      } else {
        const { error } = await supabase.from('notes').insert(noteData);
        if (error) throw error;
        toast({ title: 'Note created successfully' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Note deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Manage Notes" description="Upload and manage study materials">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={itemVariants} className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={formData.subject_id} onValueChange={(val) => setFormData({ ...formData, subject_id: val })}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>File (PDF, DOC, PPT)</Label>
                  {/* Show existing file info when editing */}
                  {editingNote?.file_name && keepExistingFile && !selectedFile && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{formData.file_name || editingNote.file_name}</span>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={() => setKeepExistingFile(false)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                      <div className="mt-2">
                        <Label htmlFor="file_name" className="text-xs">Rename file (display name)</Label>
                        <Input 
                          id="file_name"
                          value={formData.file_name} 
                          onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                          placeholder="Enter new file name"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Upload area - show when no existing file or file was removed */}
                  {(!editingNote?.file_name || !keepExistingFile || selectedFile) && (
                    <div 
                      className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-all relative ${dragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50'}`} 
                      onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    >
                      {selectedFile ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium">{selectedFile.name}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)}><X className="w-4 h-4" /></Button>
                          </div>
                          <div>
                            <Label htmlFor="new_file_name" className="text-xs">Custom display name (optional)</Label>
                            <Input 
                              id="new_file_name"
                              value={formData.file_name} 
                              onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                              placeholder={selectedFile.name}
                              className="mt-1 h-8 text-sm max-w-xs mx-auto"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])} />
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="link_url">External Link (Optional)</Label>
                  <div className="relative mt-1">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="link_url" 
                      type="url"
                      placeholder="https://example.com/resource" 
                      value={formData.link_url} 
                      onChange={(e) => setFormData({ ...formData, link_url: e.target.value })} 
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Add a link to external resources like Google Drive, YouTube, etc.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isUploading}>{isUploading ? 'Uploading...' : editingNote ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-4 font-medium">Title</th>
                      <th className="p-4 font-medium hidden md:table-cell">Subject</th>
                      <th className="p-4 font-medium hidden sm:table-cell">Downloads</th>
                      <th className="p-4 font-medium hidden lg:table-cell">Date</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {notes.map((note, index) => (
                      <motion.tr 
                        key={note.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-accent flex-shrink-0" />
                            <span className="font-medium truncate max-w-[200px]">{note.title}</span>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          {note.subjects ? (
                            <Badge variant="outline" style={{ borderColor: note.subjects.color, color: note.subjects.color }}>{note.subjects.name}</Badge>
                          ) : '-'}
                        </td>
                        <td className="p-4 hidden sm:table-cell">{note.download_count || 0}</td>
                        <td className="p-4 hidden lg:table-cell text-sm text-muted-foreground">{format(new Date(note.created_at), 'MMM dd, yyyy')}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(note)} className="hover:bg-primary/10"><Pencil className="w-4 h-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Note?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete "{note.title}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(note.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                    {notes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No notes yet. Click "Add Note" to create one.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AdminLayout>
  );
}
