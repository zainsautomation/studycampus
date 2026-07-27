import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useNoteViewStats() {
  return useQuery({
    queryKey: ['note-view-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('note_views')
        .select('note_id');
      if (error) throw error;
      const counts = new Map<string, number>();
      (data || []).forEach((row: any) => {
        counts.set(row.note_id, (counts.get(row.note_id) || 0) + 1);
      });
      return counts;
    },
    staleTime: 60_000,
  });
}

export interface NoteViewer {
  user_id: string;
  viewed_at: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function useNoteViewers(noteId: string | null) {
  return useQuery({
    queryKey: ['note-viewers', noteId],
    queryFn: async () => {
      if (!noteId) return [] as NoteViewer[];
      const { data, error } = await supabase
        .from('note_views')
        .select('user_id, viewed_at')
        .eq('note_id', noteId)
        .order('viewed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = data || [];
      if (rows.length === 0) return [] as NoteViewer[];

      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)));
      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds);
      if (pErr) throw pErr;
      const map = new Map<string, any>();
      (profs || []).forEach((p: any) => map.set(p.id, p));

      return rows.map((row: any) => {
        const p = map.get(row.user_id);
        return {
          user_id: row.user_id,
          viewed_at: row.viewed_at,
          full_name: p?.full_name ?? null,
          username: p?.username ?? null,
          avatar_url: p?.avatar_url ?? null,
        };
      }) as NoteViewer[];
    },
    enabled: !!noteId,
  });
}
