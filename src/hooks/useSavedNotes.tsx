import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useSavedNotes() {
  const { user } = useAuth();
  const [savedNoteIds, setSavedNoteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch saved notes on mount
  useEffect(() => {
    if (!user) {
      setSavedNoteIds(new Set());
      setIsLoading(false);
      return;
    }

    const fetchSavedNotes = async () => {
      const { data, error } = await supabase
        .from('saved_notes')
        .select('note_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching saved notes:', error);
      } else {
        setSavedNoteIds(new Set(data?.map(item => item.note_id) || []));
      }
      setIsLoading(false);
    };

    fetchSavedNotes();
  }, [user]);

  const isNoteSaved = useCallback((noteId: string) => {
    return savedNoteIds.has(noteId);
  }, [savedNoteIds]);

  const toggleSaveNote = useCallback(async (noteId: string) => {
    if (!user) {
      toast.error('Please sign in to save notes');
      return;
    }

    const isSaved = savedNoteIds.has(noteId);

    if (isSaved) {
      // Unsave the note
      const { error } = await supabase
        .from('saved_notes')
        .delete()
        .eq('user_id', user.id)
        .eq('note_id', noteId);

      if (error) {
        toast.error('Failed to unsave note');
        console.error('Error unsaving note:', error);
      } else {
        setSavedNoteIds(prev => {
          const next = new Set(prev);
          next.delete(noteId);
          return next;
        });
        toast.success('Note removed from saved');
      }
    } else {
      // Save the note
      const { error } = await supabase
        .from('saved_notes')
        .insert({ user_id: user.id, note_id: noteId });

      if (error) {
        toast.error('Failed to save note');
        console.error('Error saving note:', error);
      } else {
        setSavedNoteIds(prev => new Set(prev).add(noteId));
        toast.success('Note saved!');
      }
    }
  }, [user, savedNoteIds]);

  return {
    savedNoteIds,
    isNoteSaved,
    toggleSaveNote,
    isLoading,
    savedCount: savedNoteIds.size
  };
}
