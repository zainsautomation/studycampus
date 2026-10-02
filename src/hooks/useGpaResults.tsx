import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Semester, StudentDetails } from '@/lib/gpa';

export interface GpaResult {
  id: string;
  user_id: string;
  title: string;
  student_details: StudentDetails;
  semesters: Semester[];
  cgpa: number;
  total_credits: number;
  created_at: string;
  updated_at: string;
}

const table = () => (supabase as any).from('gpa_results');

export function useGpaResults() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['gpa-results', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await table().select('*').eq('user_id', user!.id).order('updated_at', { ascending: false });
      if (error) throw error;
      return data as GpaResult[];
    },
  });
}

export function useSaveGpaResult() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: { id?: string; title: string; student_details: StudentDetails; semesters: Semester[]; cgpa: number; total_credits: number }) => {
      if (!user) throw new Error('Please sign in');
      const payload = { ...r, user_id: user.id };
      delete (payload as any).id;
      const q = r.id ? table().update(payload).eq('id', r.id) : table().insert(payload);
      const { data, error } = await q.select().single();
      if (error) throw error;
      return data as GpaResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gpa-results', user?.id] }),
  });
}

export function useDeleteGpaResult() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await table().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gpa-results', user?.id] }),
  });
}
