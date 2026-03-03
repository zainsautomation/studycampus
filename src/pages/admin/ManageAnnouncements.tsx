import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Megaphone, Pin } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface Announcement { id: string; title: string; content: string; priority: string | null; is_pinned: boolean | null; created_at: string; }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function ManageAnnouncements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', priority: 'normal', is_pinned: false });

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('announcements').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    setAnnouncements(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFormData({ title: '', content: '', priority: 'normal', is_pinned: false });
    setEditingAnnouncement(null);
  };

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({ title: announcement.title, content: announcement.content, priority: announcement.priority || 'normal', is_pinned: announcement.is_pinned || false });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    try {
      const data = { ...formData, created_by: user?.id };
      if (editingAnnouncement) {
        const { error } = await supabase.from('announcements').update(data).eq('id', editingAnnouncement.id);
        if (error) throw error;
        toast({ title: 'Announcement updated' });
      } else {
        const { error } = await supabase.from('announcements').insert(data);
        if (error) throw error;
        toast({ title: 'Announcement created' });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Announcement deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getPriorityStyles = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return 'bg-urgent text-urgent-foreground';
      case 'important': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <>
      <AdminPageHeader title="Manage Announcements" description="Create and manage class announcements" />
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={itemVariants} className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />Add Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Textarea id="content" rows={4} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="is_pinned" className="cursor-pointer">Pin to top</Label>
                  <Switch id="is_pinned" checked={formData.is_pinned} onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })} />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingAnnouncement ? 'Update' : 'Create'}</Button>
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
                      <th className="p-4 font-medium hidden md:table-cell">Priority</th>
                      <th className="p-4 font-medium hidden sm:table-cell">Pinned</th>
                      <th className="p-4 font-medium hidden lg:table-cell">Date</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {announcements.map((ann, index) => (
                      <motion.tr 
                        key={ann.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Megaphone className="w-4 h-4 text-warning flex-shrink-0" />
                            <span className="font-medium truncate max-w-[200px]">{ann.title}</span>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <Badge className={getPriorityStyles(ann.priority)}>{ann.priority || 'normal'}</Badge>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          {ann.is_pinned && <Pin className="w-4 h-4 text-primary" />}
                        </td>
                        <td className="p-4 hidden lg:table-cell text-sm text-muted-foreground">{format(new Date(ann.created_at), 'MMM dd, yyyy')}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(ann)} className="hover:bg-primary/10"><Pencil className="w-4 h-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete "{ann.title}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(ann.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                    {announcements.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-muted-foreground">
                          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No announcements yet. Click "Add Announcement" to create one.</p>
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
    </>
  );
}
