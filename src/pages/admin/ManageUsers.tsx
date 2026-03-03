import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Copy, Trash2, Users, Ticket, CheckCircle, XCircle, Eye, EyeOff, Search, Calendar } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
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

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

// Loading skeleton for the page
function ManageUsersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 rounded-xl border border-border/50 bg-card space-y-2">
            <ShimmerSkeleton className="h-4 w-16" variant="text" />
            <ShimmerSkeleton className="h-7 w-10" variant="text" />
          </div>
        ))}
      </div>
      {/* Tabs skeleton */}
      <ShimmerSkeleton className="h-10 w-64 mx-auto rounded-lg" />
      {/* Cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 rounded-xl border border-border/50 bg-card space-y-3">
            <div className="flex items-center gap-3">
              <ShimmerSkeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <ShimmerSkeleton className="h-4 w-32" variant="text" />
                <ShimmerSkeleton className="h-3 w-48" variant="text" />
              </div>
              <ShimmerSkeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  const [codeSearch, setCodeSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const fetchData = useCallback(async () => {
    const [codesRes, rolesRes] = await Promise.all([
      supabase.from('invite_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*').eq('role', 'student').order('created_at', { ascending: false }),
    ]);
    setInviteCodes(codesRes.data || []);

    if (rolesRes.data && rolesRes.data.length > 0) {
      const userIds = rolesRes.data.map(r => r.user_id);
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      setStudents(rolesRes.data.map(r => ({
        ...r,
        full_name: profilesMap.get(r.user_id)?.full_name || null,
        email: profilesMap.get(r.user_id)?.email || null,
      })));
    } else {
      setStudents([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => setFormData({ code: generateCode(), description: '', max_uses: 50, expires_at: '' });

  // Computed stats
  const activeCodes = useMemo(() => inviteCodes.filter(c => c.is_active).length, [inviteCodes]);
  const totalUses = useMemo(() => inviteCodes.reduce((sum, c) => sum + (c.current_uses || 0), 0), [inviteCodes]);

  // Filtered lists
  const filteredCodes = useMemo(() => {
    if (!codeSearch) return inviteCodes;
    const q = codeSearch.toLowerCase();
    return inviteCodes.filter(c => c.code.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }, [inviteCodes, codeSearch]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
  }, [students, studentSearch]);

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

  if (isLoading) {
    return (
      <>
        <AdminPageHeader title="User Management" description="Manage invite codes and students" />
        <ManageUsersSkeleton />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader title="User Management" description="Manage invite codes and students" />
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

        {/* Stat Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 md:gap-4">
          <Card variant="flat" className="p-4">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Students</p>
                <p className="text-xl font-bold">{students.length}</p>
              </div>
            </div>
          </Card>
          <Card variant="flat" className="p-4">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <Ticket className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Codes</p>
                <p className="text-xl font-bold">{activeCodes}</p>
              </div>
            </div>
          </Card>
          <Card variant="flat" className="p-4">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <CheckCircle className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Uses</p>
                <p className="text-xl font-bold">{totalUses}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="codes" className="space-y-5">
            <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2">
              <TabsTrigger value="codes" className="gap-2"><Ticket className="w-4 h-4" />Invite Codes</TabsTrigger>
              <TabsTrigger value="students" className="gap-2"><Users className="w-4 h-4" />Students</TabsTrigger>
            </TabsList>

            {/* === INVITE CODES TAB === */}
            <TabsContent value="codes" className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search codes..." value={codeSearch} onChange={e => setCodeSearch(e.target.value)} className="pl-9" />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" />Generate Code</Button>
                  </DialogTrigger>
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
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" placeholder="e.g., Fall 2024 Class" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="max_uses">Max Uses</Label>
                          <Input type="number" id="max_uses" min={1} value={formData.max_uses} onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 50 })} />
                        </div>
                        <div>
                          <Label htmlFor="expires_at">Expires</Label>
                          <Input type="date" id="expires_at" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit">Create</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Invite Code Cards */}
              <div className="space-y-3">
                {filteredCodes.map((code, index) => {
                  const usagePercent = code.max_uses ? Math.min(((code.current_uses || 0) / code.max_uses) * 100, 100) : 0;
                  const isFull = code.current_uses != null && code.max_uses != null && code.current_uses >= code.max_uses;

                  return (
                    <motion.div
                      key={code.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card variant="default" className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col gap-3">
                          {/* Top row: code + status + actions */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-semibold text-sm">
                                  {showCode[code.id] ? code.code : '••••••••'}
                                </span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCode({ ...showCode, [code.id]: !showCode[code.id] })}>
                                  {showCode[code.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(code.code)}>
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              {code.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">{code.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1.5">
                                {code.is_active
                                  ? <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">Active</Badge>
                                  : <Badge variant="outline" className="text-xs border-destructive/30 text-destructive bg-destructive/5">Inactive</Badge>
                                }
                                <Switch checked={code.is_active || false} onCheckedChange={() => toggleCodeActive(code.id, code.is_active || false)} className="scale-90" />
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Invite Code?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete this invite code.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteCode(code.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {/* Usage progress bar */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Usage</span>
                              <span className={isFull ? 'text-destructive font-medium' : ''}>
                                {code.current_uses || 0} / {code.max_uses || '∞'}
                              </span>
                            </div>
                            {code.max_uses && (
                              <Progress
                                value={usagePercent}
                                className={`h-1.5 ${isFull ? '[&>div]:bg-destructive' : ''}`}
                              />
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}

                {filteredCodes.length === 0 && (
                  <div className="py-16 text-center">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Ticket className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground mb-1">
                      {codeSearch ? 'No codes found' : 'No invite codes yet'}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {codeSearch ? 'Try a different search term' : 'Generate your first invite code to get started'}
                    </p>
                    {!codeSearch && (
                      <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />Generate Code
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* === STUDENTS TAB === */}
            <TabsContent value="students" className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search students by name or email..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="pl-9" />
              </div>

              {/* Student Cards */}
              <div className="space-y-2">
                {filteredStudents.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card variant="default" className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">{getInitials(student.full_name)}</span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{student.full_name || 'No name'}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.email || 'No email'}</p>
                        </div>
                        {/* Date */}
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(student.created_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="py-16 text-center">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground mb-1">
                      {studentSearch ? 'No students found' : 'No students registered yet'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {studentSearch ? 'Try a different search term' : 'Share an invite code to get students on board'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </>
  );
}
