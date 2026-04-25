import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, KeyRound, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface AIKey {
  id: string;
  label: string;
  api_key: string;
  is_active: boolean;
  priority: number;
  last_used_at: string | null;
  last_failed_at: string | null;
  created_at: string;
}

export default function ManageAIKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<AIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ label: '', api_key: '', priority: 0 });

  const loadKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_api_keys')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load keys');
    } else {
      setKeys(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const resetForm = () => setFormData({ label: '', api_key: '', priority: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim() || !formData.api_key.trim()) {
      toast.error('Label and API key are required');
      return;
    }
    if (!formData.api_key.trim().startsWith('sk_')) {
      toast.error('Invalid key format. Lovable AI Gateway keys must start with "sk_".');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('ai_api_keys').insert({
      label: formData.label.trim(),
      api_key: formData.api_key.trim(),
      priority: formData.priority,
      created_by: user?.id,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('API key added');
      setDialogOpen(false);
      resetForm();
      loadKeys();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this API key? This cannot be undone.')) return;
    const { error } = await supabase.from('ai_api_keys').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Key deleted');
      loadKeys();
    }
  };

  const toggleActive = async (key: AIKey) => {
    const { error } = await supabase
      .from('ai_api_keys')
      .update({ is_active: !key.is_active })
      .eq('id', key.id);
    if (error) {
      toast.error(error.message);
    } else {
      loadKeys();
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => {
    if (key.length <= 12) return '••••••••';
    return `${key.slice(0, 6)}${'•'.repeat(20)}${key.slice(-4)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-primary" />
            AI API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage backup Lovable AI keys for MCQ parsing. Keys are tried in priority order; the next key is used automatically when one runs out of credits.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Key
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <KeyRound className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">No backup keys yet. The system uses the default Lovable AI key. Add a backup so MCQ parsing keeps working when credits run out.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.id} className={!key.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0 flex-1">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      {key.label}
                      <Badge variant="outline" className="text-xs">Priority {key.priority}</Badge>
                      {key.is_active ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Disabled</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs break-all">
                      {revealedIds.has(key.id) ? key.api_key : maskKey(key.api_key)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => toggleReveal(key.id)} aria-label="Toggle visibility">
                      {revealedIds.has(key.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Switch checked={key.is_active} onCheckedChange={() => toggleActive(key)} />
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(key.id)} aria-label="Delete">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Added {formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}</span>
                  {key.last_used_at && (
                    <span className="flex items-center gap-1 text-primary">
                      <CheckCircle2 className="w-3 h-3" />
                      Used {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })}
                    </span>
                  )}
                  {key.last_failed_at && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="w-3 h-3" />
                      Failed {formatDistanceToNow(new Date(key.last_failed_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add AI API Key</DialogTitle>
            <DialogDescription>
              Add a Lovable AI Gateway key. Keys are tried in priority order (lowest first).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="e.g. Backup workspace #1"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="sk-..."
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority (lower = tried first)</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
