import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WhatsNewItem {
  id: string;
  title: string;
  created_at: string;
  type: 'note' | 'mcq' | 'announcement' | 'update';
  subtitle?: string | null;
  meta?: string | null;
}

export function useWhatsNew() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: checkedAt } = useQuery({
    queryKey: ['whats-new-checked-at', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('whats_new_checked_at')
        .eq('id', user.id)
        .maybeSingle();
      return (data?.whats_new_checked_at as string) || new Date(0).toISOString();
    },
    enabled: !!user?.id,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['whats-new', user?.id, checkedAt],
    queryFn: async () => {
      if (!user?.id || !checkedAt) return { items: [] as WhatsNewItem[], count: 0 };

      const [notesRes, mcqRes, annRes, updRes] = await Promise.all([
        supabase
          .from('notes')
          .select('id, title, created_at, subjects(name)')
          .gt('created_at', checkedAt)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('mcq_tests')
          .select('id, title, created_at, is_published, subjects(name)')
          .gt('created_at', checkedAt)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('announcements')
          .select('id, title, created_at, priority')
          .gt('created_at', checkedAt)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('updates')
          .select('id, title, created_at, event_type, event_date')
          .gt('created_at', checkedAt)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const items: WhatsNewItem[] = [
        ...(notesRes.data || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          created_at: n.created_at,
          type: 'note' as const,
          subtitle: n.subjects?.name ?? null,
        })),
        ...(mcqRes.data || []).map((m: any) => ({
          id: m.id,
          title: m.title,
          created_at: m.created_at,
          type: 'mcq' as const,
          subtitle: m.subjects?.name ?? null,
        })),
        ...(annRes.data || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          created_at: a.created_at,
          type: 'announcement' as const,
          meta: a.priority,
        })),
        ...(updRes.data || []).map((u: any) => ({
          id: u.id,
          title: u.title,
          created_at: u.created_at,
          type: 'update' as const,
          subtitle: u.event_type,
          meta: u.event_date,
        })),
      ];

      return { items, count: items.length };
    },
    enabled: !!user?.id && !!checkedAt,
    refetchInterval: 60_000,
  });

  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({ whats_new_checked_at: now })
        .eq('id', user.id);
      if (error) throw error;
      return now;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whats-new-checked-at', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['whats-new', user?.id] });
    },
  });

  return {
    items: data?.items || [],
    count: data?.count || 0,
    isLoading,
    markAsRead: markAsRead.mutate,
  };
}
