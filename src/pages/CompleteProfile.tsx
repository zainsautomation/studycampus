import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, User, KeyRound, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(80),
  inviteCode: z.string().min(4, 'Please enter a valid invite code'),
});

export default function CompleteProfile() {
  const { user, isLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // Redirect away if not signed in or already onboarded
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, onboarding_complete')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.onboarding_complete) {
        navigate('/dashboard', { replace: true });
        return;
      }
      if (data?.full_name) setFullName(data.full_name);
      setChecking(false);
    })();
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = schema.safeParse({ fullName, inviteCode });
    if (!parsed.success) {
      toast({ title: 'Validation Error', description: parsed.error.errors[0].message, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Validate invite code via edge function
      const { data: validateData, error: validateError } = await supabase.functions.invoke('validate-invite-code', {
        body: { code: inviteCode },
      });
      if (validateError || !validateData?.valid) {
        toast({
          title: 'Invalid invite code',
          description: validateData?.error || 'Please check your invite code and try again.',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      // Increment usage
      await supabase.functions.invoke('use-invite-code', {
        body: { codeId: validateData.codeId, currentUses: validateData.currentUses },
      });

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), onboarding_complete: true })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({ title: 'Welcome aboard!', description: 'Your account is ready.' });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold">Complete your account</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            One more step — enter your invite code to join the class.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="inviteCode"
                  placeholder="Enter class invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Get the invite code from your class admin</p>
            </div>

            <Button type="submit" className="w-full gradient-primary hover:opacity-90" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Continue
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={async () => {
                await signOut();
                navigate('/auth', { replace: true });
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
