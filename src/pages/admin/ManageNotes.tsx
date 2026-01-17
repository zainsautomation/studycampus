import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Upload, FileText, X, Link, Download, Cloud, Database, Settings2, FolderOpen, Tag } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useGoogleDriveContext } from '@/contexts/GoogleDriveContext';
import { StorageSelector, StorageType } from '@/components/admin/StorageSelector';
import { GoogleDriveSettings } from '@/components/admin/GoogleDriveSettings';
import { FolderPicker } from '@/components/admin/FolderPicker';
import { TagManager } from '@/components/notes/TagManager';
import { TagSelector } from '@/components/notes/TagSelector';

interface Subject { id: string; name: string; color: string; }
interface Note { 
  id: string; 
  title: string; 
  description: string | null; 
  file_url: string | null; 
  file_name: string | null; 
  file_type: string | null; 
  file_size: number | null; 
  download_count: number | null; 
  subject_id: string | null; 
  created_at: string; 
  subjects: Subject | null; 
  link_url: string | null; 
  is_downloadable: boolean;
  storage_type: StorageType;
  google_drive_folder_id: string | null;
}

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
  const { 
    downloadsEnabled, 
    updateSetting,
    defaultStorageType,
    googleDriveDefaultFolderId,
    googleDriveDefaultFolderName,
    googleDriveAutoOrganize,
  } = useAppSettings();
  
  // Use shared Google Drive context instead of local hook
  const googleDrive = useGoogleDriveContext();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    subject_id: '', 
    link_url: '', 
    file_name: '', 
    is_downloadable: true,
    storage_type: 'supabase' as StorageType,
    custom_folder_id: null as string | null,
    custom_folder_name: null as string | null,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [keepExistingFile, setKeepExistingFile] = useState(true);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'settings'>('notes');
  const handleToggleDownloads = () => {
    updateSetting.mutate({ key: 'downloads_enabled', value: !downloadsEnabled });
  };

  const fetchData = useCallback(async () => {
    const [notesRes, subjectsRes] = await Promise.all([
      supabase.from('notes').select('*, subjects(id, name, color)').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
    ]);
    setNotes((notesRes.data || []).map(n => ({ 
      ...n, 
      is_downloadable: n.is_downloadable ?? true,
      storage_type: (n.storage_type as StorageType) || 'supabase',
      google_drive_folder_id: n.google_drive_folder_id || null,
    })));
    setSubjects(subjectsRes.data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Set default storage type when opening dialog
  useEffect(() => {
    if (isDialogOpen && !editingNote) {
      setFormData(prev => ({
        ...prev,
        storage_type: defaultStorageType,
        custom_folder_id: googleDriveDefaultFolderId,
        custom_folder_name: googleDriveDefaultFolderName,
      }));
    }
  }, [isDialogOpen, editingNote, defaultStorageType, googleDriveDefaultFolderId, googleDriveDefaultFolderName]);

  const resetForm = () => {
    setFormData({ 
      title: '', 
      description: '', 
      subject_id: '', 
      link_url: '', 
      file_name: '', 
      is_downloadable: true,
      storage_type: defaultStorageType,
      custom_folder_id: googleDriveDefaultFolderId,
      custom_folder_name: googleDriveDefaultFolderName,
    });
    setSelectedFile(null);
    setEditingNote(null);
    setKeepExistingFile(true);
    setSelectedTagIds([]);
  };

  const handleOpenDialog = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormData({ 
        title: note.title, 
        description: note.description || '', 
        subject_id: note.subject_id || '', 
        link_url: note.link_url || '',
        file_name: note.file_name || '',
        is_downloadable: note.is_downloadable ?? true,
        storage_type: note.storage_type || 'supabase',
        custom_folder_id: note.google_drive_folder_id,
        custom_folder_name: null,
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
    let googleDriveFolderId = formData.custom_folder_id;

    try {
      if (selectedFile) {
        if (formData.storage_type === 'google_drive') {
          // Upload to Google Drive
          const subjectName = formData.subject_id 
            ? subjects.find(s => s.id === formData.subject_id)?.name 
            : undefined;

          const result = await googleDrive.uploadFile({
            file: selectedFile,
            folderId: formData.custom_folder_id || googleDriveDefaultFolderId || undefined,
            subjectName,
            autoOrganize: googleDriveAutoOrganize,
          });

          if (result) {
            fileUrl = result.webViewLink;
            fileName = formData.file_name?.trim() || selectedFile.name;
            fileType = selectedFile.type;
            fileSize = selectedFile.size;
          } else {
            throw new Error('Failed to upload to Google Drive');
          }
        } else {
          // Upload to Supabase Storage
          const fileExt = selectedFile.name.split('.').pop();
          const filePath = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage.from('notes').upload(filePath, selectedFile);
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('notes').getPublicUrl(filePath);
          fileUrl = urlData.publicUrl;
          fileName = formData.file_name?.trim() || selectedFile.name;
          fileType = selectedFile.type;
          fileSize = selectedFile.size;
        }
      } else if (editingNote && keepExistingFile && formData.file_name?.trim()) {
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
        is_downloadable: formData.is_downloadable,
        storage_type: formData.storage_type,
        google_drive_folder_id: formData.storage_type === 'google_drive' ? googleDriveFolderId : null,
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

  const handleToggleNoteDownloadable = async (noteId: string, isDownloadable: boolean) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_downloadable: isDownloadable })
        .eq('id', noteId);
      
      if (error) throw error;
      
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_downloadable: isDownloadable } : n));
      toast({ title: `Downloads ${isDownloadable ? 'enabled' : 'disabled'} for this note` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleGoogleDriveSettingsChange = (settings: {
    defaultFolderId: string | null;
    defaultFolderName: string | null;
    autoOrganize: boolean;
  }) => {
    updateSetting.mutate({ key: 'google_drive_default_folder_id', value: settings.defaultFolderId });
    updateSetting.mutate({ key: 'google_drive_default_folder_name', value: settings.defaultFolderName });
    updateSetting.mutate({ key: 'google_drive_auto_organize_by_subject', value: settings.autoOrganize });
  };

  const handleDefaultStorageChange = (value: StorageType) => {
    updateSetting.mutate({ key: 'default_storage_type', value });
  };

  return (
    <AdminLayout title="Manage Notes" description="Upload and manage study materials">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        {/* Tabs for Notes and Settings */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'notes' | 'settings')} className="w-full">
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList>
              <TabsTrigger value="notes" className="gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings2 className="w-4 h-4" />
                Storage Settings
              </TabsTrigger>
            </TabsList>

            {activeTab === 'notes' && (
              <div className="flex items-center gap-3">
                {/* Downloads Toggle */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium hidden sm:inline">Downloads</span>
                  <Switch
                    checked={downloadsEnabled}
                    onCheckedChange={handleToggleDownloads}
                    aria-label="Toggle downloads"
                  />
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog()} className="gap-2">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add Note</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[85vh] overflow-y-auto mx-auto">
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

                      {/* Storage Type Selector */}
                      <StorageSelector
                        value={formData.storage_type}
                        onChange={(value) => setFormData({ ...formData, storage_type: value })}
                        googleDriveConfigured={googleDrive.isConfigured}
                        googleDriveSignedIn={googleDrive.isSignedIn}
                      />

                      {/* Custom Folder for Google Drive */}
                      {formData.storage_type === 'google_drive' && googleDrive.isSignedIn && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" />
                            Upload Folder
                          </Label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 p-3 rounded-lg bg-muted/50 border border-border text-sm">
                              {formData.custom_folder_name || googleDriveDefaultFolderName || 'Default folder (My Drive)'}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFolderPickerOpen(true)}
                            >
                              Change
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {googleDriveAutoOrganize 
                              ? 'Subject subfolders will be created automatically' 
                              : 'Files will be uploaded directly to this folder'}
                          </p>
                        </div>
                      )}

                      <div>
                        <Label>File (PDF, DOC, PPT)</Label>
                        {editingNote?.file_name && keepExistingFile && !selectedFile && (
                          <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{formData.file_name || editingNote.file_name}</span>
                                {editingNote.storage_type === 'google_drive' && (
                                  <Badge variant="secondary" className="flex-shrink-0">
                                    <Cloud className="w-3 h-3 mr-1" />
                                    Drive
                                  </Badge>
                                )}
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
                                {/* Show storage indicator */}
                                <div className="flex justify-center">
                                  <Badge variant="outline" className="gap-1">
                                    {formData.storage_type === 'google_drive' ? (
                                      <>
                                        <Cloud className="w-3 h-3" />
                                        Uploading to Google Drive
                                      </>
                                    ) : (
                                      <>
                                        <Database className="w-3 h-3" />
                                        Uploading to Supabase
                                      </>
                                    )}
                                  </Badge>
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
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                        <Switch
                          id="is_downloadable"
                          checked={formData.is_downloadable}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_downloadable: checked })}
                        />
                        <Label htmlFor="is_downloadable" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium">Allow Download</span>
                          <p className="text-xs text-muted-foreground">When enabled, users can download this note's file</p>
                        </Label>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isUploading}>
                          {isUploading ? 'Uploading...' : editingNote ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </motion.div>

          {/* Notes Tab Content */}
          <TabsContent value="notes" className="mt-6">
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="p-4 font-medium">Title</th>
                          <th className="p-4 font-medium hidden md:table-cell">Subject</th>
                          <th className="p-4 font-medium hidden lg:table-cell">Storage</th>
                          <th className="p-4 font-medium hidden sm:table-cell">Downloads</th>
                          <th className="p-4 font-medium hidden lg:table-cell">Date</th>
                          <th className="p-4 font-medium hidden sm:table-cell text-center">DL</th>
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
                            <td className="p-4 hidden lg:table-cell">
                              <Badge variant="secondary" className="gap-1">
                                {note.storage_type === 'google_drive' ? (
                                  <>
                                    <Cloud className="w-3 h-3" />
                                    Drive
                                  </>
                                ) : (
                                  <>
                                    <Database className="w-3 h-3" />
                                    Supabase
                                  </>
                                )}
                              </Badge>
                            </td>
                            <td className="p-4 hidden sm:table-cell">{note.download_count || 0}</td>
                            <td className="p-4 hidden lg:table-cell text-sm text-muted-foreground">{format(new Date(note.created_at), 'MMM dd, yyyy')}</td>
                            <td className="p-4 hidden sm:table-cell text-center">
                              <Switch
                                checked={note.is_downloadable}
                                onCheckedChange={(checked) => handleToggleNoteDownloadable(note.id, checked)}
                                className="mx-auto"
                                title={note.is_downloadable ? 'Downloads enabled' : 'Downloads disabled'}
                              />
                            </td>
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
                            <td colSpan={7} className="p-12 text-center text-muted-foreground">
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
          </TabsContent>

          {/* Settings Tab Content */}
          <TabsContent value="settings" className="mt-6 space-y-6">
            <motion.div variants={itemVariants}>
              {/* Default Storage Type */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Default Storage
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Choose where new notes will be stored by default
                      </p>
                    </div>
                    <StorageSelector
                      value={defaultStorageType}
                      onChange={handleDefaultStorageChange}
                      googleDriveConfigured={googleDrive.isConfigured}
                      googleDriveSignedIn={googleDrive.isSignedIn}
                      showLabel={false}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Google Drive Settings */}
              <GoogleDriveSettings
                googleDrive={googleDrive}
                defaultFolderId={googleDriveDefaultFolderId}
                defaultFolderName={googleDriveDefaultFolderName}
                autoOrganize={googleDriveAutoOrganize}
                onSettingsChange={handleGoogleDriveSettingsChange}
              />
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Folder Picker Dialog */}
        <FolderPicker
          open={folderPickerOpen}
          onOpenChange={setFolderPickerOpen}
          onSelect={(folder) => {
            setFormData(prev => ({
              ...prev,
              custom_folder_id: folder.id,
              custom_folder_name: folder.name,
            }));
          }}
          listFolders={googleDrive.listFolders}
          createFolder={googleDrive.createFolder}
          currentFolderId={formData.custom_folder_id}
          currentFolderName={formData.custom_folder_name}
        />
      </motion.div>
    </AdminLayout>
  );
}
