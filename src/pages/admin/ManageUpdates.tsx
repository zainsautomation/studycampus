import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
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

interface Update { id: string; title: string; description: string | null; event_date: string; event_time: string | null; event_type: string | null; created_at: string; }

export default function ManageUpdates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', event_date: '', event_time: '', event_type: 'general' });

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('updates').select('*').order('event_date', { ascending: true });
    setUpdates(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFormData({ title: '', description: '', event_date: '', event_time: '', event_type: 'general' });
    setEditingUpdate(null);
  };

  const handleOpenDialog = (update?: Update) => {
    if (update) {
      setEditingUpdate(update);
      setFormData({ title: update.title, description: update.description || '', event_date: update.event_date, event_time: update.event_time || '', event_type: update.event_type || 'general' });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.event_date) return;

    try {
      const data = { 
        title: formData.title, 
        description: formData.description || null, 
        event_date: formData.event_date, 
        event_time: formData.event_time || null, 
        event_type: formData.event_type,
        created_by: user?.id 
      };
      if (editingUpdate) {
        const { error } = await supabase.from('updates').update(data).eq('id', editingUpdate.id);
        if (error) throw error;
        toast({ title: 'Event updated' });
      } else {
        const { error } = await supabase.from('updates').insert(data);
        if (error) throw error;
        toast({ title: 'Event created' });
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
      const { error } = await supabase.from('updates').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Event deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getTypeStyles = (type: string | null) => {
    switch (type) {
      case 'exam': return 'bg-urgent/10 text-urgent border-urgent/20';
      case 'assignment': return 'bg-warning/10 text-warning border-warning/20';
      case 'holiday': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <MainLayout>
      <div className="container py-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Manage Events</h1>
              <p className="text-muted-foreground mt-1">Schedule exams, assignments, and events</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" />Add Event</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingUpdate ? 'Edit Event' : 'New Event'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div><Label htmlFor="title">Title *</Label><Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
                  <div><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label htmlFor="event_date">Date *</Label><Input type="date" id="event_date" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} required /></div>
                    <div><Label htmlFor="event_time">Time</Label><Input type="time" id="event_time" value={formData.event_time} onChange={(e) => setFormData({ ...formData, event_time: e.target.value })} /></div>
                  </div>
                  <div><Label>Event Type</Label>
                    <Select value={formData.event_type} onValueChange={(val) => setFormData({ ...formData, event_type: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="assignment">Assignment</SelectItem>
                        <SelectItem value="holiday">Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">{editingUpdate ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50"><tr className="text-left"><th className="p-4 font-medium">Title</th><th className="p-4 font-medium">Date</th><th className="p-4 font-medium hidden md:table-cell">Type</th><th className="p-4 font-medium hidden sm:table-cell">Time</th><th className="p-4 font-medium text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {updates.map((update) => (
                      <tr key={update.id} className="hover:bg-muted/30">
                        <td className="p-4"><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary flex-shrink-0" /><span className="font-medium truncate max-w-[200px]">{update.title}</span></div></td>
                        <td className="p-4 text-sm">{format(new Date(update.event_date), 'MMM dd, yyyy')}</td>
                        <td className="p-4 hidden md:table-cell"><Badge variant="outline" className={getTypeStyles(update.event_type)}>{update.event_type || 'general'}</Badge></td>
                        <td className="p-4 hidden sm:table-cell text-sm text-muted-foreground">{update.event_time || '-'}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(update)}><Pencil className="w-4 h-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Event?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{update.title}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(update.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {updates.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No events yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}
