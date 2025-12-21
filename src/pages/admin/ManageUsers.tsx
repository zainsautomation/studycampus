import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Copy, Trash2, Users, Ticket, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface InviteCode { id: string; code: string; description: string | null; max_uses: number | null; current_uses: number | null; is_active: boolean | null; expires_at: string | null; created_at: string; }
interface UserWithRole { id: string; user_id: string; role: string; created_at: string; full_name: string | null; email: string | null; }

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export default function ManageUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [students, setStudents] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ code: generateCode(), description: '', max_uses: 50, expires_at: '' });
  const [showCode, setShowCode] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    const [codesRes, rolesRes] = await Promise.all([
      supabase.from('invite_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*').eq('role', 'student').order('created_at', { ascending: false }),
    ]);
    setInviteCodes(codesRes.data || []);
    
    // Fetch profiles for each student
    if (rolesRes.data && rolesRes.data.length > 0) {
      const userIds = rolesRes.data.map(r => r.user_id);
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const studentsWithProfiles = rolesRes.data.map(r => ({
        ...r,
        full_name: profilesMap.get(r.user_id)?.full_name || null,
        email: profilesMap.get(r.user_id)?.email || null,
      }));
      setStudents(studentsWithProfiles);
    } else {
      setStudents([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => setFormData({ code: generateCode(), description: '', max_uses: 50, expires_at: '' });

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('invite_codes').insert({
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        max_uses: formData.max_uses || null,
        expires_at: formData.expires_at || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: 'Invite code created' });
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const toggleCodeActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from('invite_codes').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteCode = async (id: string) => {
    try {
      const { error } = await supabase.from('invite_codes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Invite code deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Code copied to clipboard' });
  };

  return (
    <MainLayout>
      <div className="container py-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage invite codes and students</p>
          </div>

          <Tabs defaultValue="codes" className="space-y-6">
            <TabsList>
              <TabsTrigger value="codes" className="gap-2"><Ticket className="w-4 h-4" />Invite Codes</TabsTrigger>
              <TabsTrigger value="students" className="gap-2"><Users className="w-4 h-4" />Students</TabsTrigger>
            </TabsList>

            <TabsContent value="codes" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Generate Code</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Generate Invite Code</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateCode} className="space-y-4">
                      <div>
                        <Label htmlFor="code">Code</Label>
                        <div className="flex gap-2">
                          <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="font-mono" required />
                          <Button type="button" variant="outline" onClick={() => setFormData({ ...formData, code: generateCode() })}>Regenerate</Button>
                        </div>
                      </div>
                      <div><Label htmlFor="description">Description</Label><Input id="description" placeholder="e.g., Fall 2024 Class" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label htmlFor="max_uses">Max Uses</Label><Input type="number" id="max_uses" min={1} value={formData.max_uses} onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 50 })} /></div>
                        <div><Label htmlFor="expires_at">Expires</Label><Input type="date" id="expires_at" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} /></div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit">Create</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50"><tr className="text-left"><th className="p-4 font-medium">Code</th><th className="p-4 font-medium hidden md:table-cell">Description</th><th className="p-4 font-medium">Usage</th><th className="p-4 font-medium hidden sm:table-cell">Status</th><th className="p-4 font-medium text-right">Actions</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {inviteCodes.map((code) => (
                          <tr key={code.id} className="hover:bg-muted/30">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{showCode[code.id] ? code.code : '••••••••'}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCode({ ...showCode, [code.id]: !showCode[code.id] })}>{showCode[code.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(code.code)}><Copy className="w-3 h-3" /></Button>
                              </div>
                            </td>
                            <td className="p-4 hidden md:table-cell text-sm text-muted-foreground">{code.description || '-'}</td>
                            <td className="p-4"><Badge variant="outline">{code.current_uses || 0} / {code.max_uses || '∞'}</Badge></td>
                            <td className="p-4 hidden sm:table-cell">
                              <div className="flex items-center gap-2">
                                {code.is_active ? <CheckCircle className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                                <Switch checked={code.is_active || false} onCheckedChange={() => toggleCodeActive(code.id, code.is_active || false)} />
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Invite Code?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this invite code.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteCode(code.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                              </AlertDialog>
                            </td>
                          </tr>
                        ))}
                        {inviteCodes.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No invite codes yet</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Registered Students ({students.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50"><tr className="text-left"><th className="p-4 font-medium">Name</th><th className="p-4 font-medium">Email</th><th className="p-4 font-medium hidden md:table-cell">Joined</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-muted/30">
                            <td className="p-4 font-medium">{student.full_name || 'No name'}</td>
                            <td className="p-4 text-sm text-muted-foreground">{student.email || '-'}</td>
                            <td className="p-4 hidden md:table-cell text-sm text-muted-foreground">{format(new Date(student.created_at), 'MMM dd, yyyy')}</td>
                          </tr>
                        ))}
                        {students.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No students registered yet</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </MainLayout>
  );
}
