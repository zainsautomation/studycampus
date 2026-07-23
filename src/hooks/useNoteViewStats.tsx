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
        .select('user_id, viewed_at, profiles(full_name, username, avatar_url)')
        .eq('note_id', noteId)
        .order('viewed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        user_id: row.user_id,
        viewed_at: row.viewed_at,
        full_name: row.profiles?.full_name ?? null,
        username: row.profiles?.username ?? null,
        avatar_url: row.profiles?.avatar_url ?? null,
      })) as NoteViewer[];
    },
    enabled: !!noteId,
  });
}
