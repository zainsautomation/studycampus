import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface NoteView {
  id: string;
  note_id: string;
  viewed_at: string;
  notes: {
    id: string;
    title: string;
    description: string | null;
    file_name: string | null;
    subject_id: string | null;
    subjects: { name: string; color: string } | null;
  } | null;
}

export function useRecentlyViewed(limit = 4) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: recentlyViewed, isLoading } = useQuery({
    queryKey: ['recently-viewed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('note_views')
        .select(`
          id,
          note_id,
          viewed_at,
          notes(id, title, description, file_name, subject_id, subjects(name, color))
        `)
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as NoteView[]).filter(v => v.notes !== null);
    },
    enabled: !!user?.id,
  });

  const trackView = useMutation({
    mutationFn: async (noteId: string) => {
      if (!user?.id) return;
      
      // Upsert: update viewed_at if exists, insert if not
      const { error } = await supabase
        .from('note_views')
        .upsert(
          { user_id: user.id, note_id: noteId, viewed_at: new Date().toISOString() },
          { onConflict: 'user_id,note_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recently-viewed', user?.id] });
    },
  });

  return {
    recentlyViewed: recentlyViewed || [],
    isLoading,
    trackView: trackView.mutate,
  };
}
