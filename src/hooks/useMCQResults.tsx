import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AttemptWithDetails = {
  id: string;
  test_id: string;
  user_id: string;
  status: string;
  score: number | null;
  correct_answers: number;
  total_questions: number;
  time_taken_secs: number | null;
  started_at: string;
  completed_at: string | null;
  test_title: string;
  student_name: string | null;
  student_avatar: string | null;
  student_email: string | null;
};

export type MCQResultsFilters = {
  testId: string;
  studentSearch: string;
  status: 'all' | 'completed' | 'in_progress';
  sortBy: 'score_desc' | 'score_asc' | 'date_desc' | 'date_asc' | 'name_asc';
};

export function useMCQResults() {
  const [filters, setFilters] = useState<MCQResultsFilters>({
    testId: 'all',
    studentSearch: '',
    status: 'all',
    sortBy: 'date_desc',
  });

  // Fetch all tests for the dropdown
  const { data: tests = [] } = useQuery({
    queryKey: ['admin-mcq-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcq_tests')
        .select('id, title, is_published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all attempts with test info
  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['admin-mcq-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcq_attempts')
        .select(`
          id, test_id, user_id, status, score, correct_answers, total_questions,
          time_taken_secs, started_at, completed_at,
          mcq_tests!inner(title)
        `)
        .order('started_at', { ascending: false });
      if (error) throw error;

      // Get unique user IDs and fetch profiles separately
      const userIds = [...new Set((data || []).map((a: any) => a.user_id))];
      const profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        // Fetch in batches of 50 to avoid query limits
        for (let i = 0; i < userIds.length; i += 50) {
          const batch = userIds.slice(i, i + 50);
          const [{ data: profiles }, { data: emails }] = await Promise.all([
            supabase.from('profiles').select('id, full_name, avatar_url').in('id', batch),
            supabase.rpc('get_user_emails_admin', { _user_ids: batch }),
          ]);
          const emailMap = new Map((emails as Array<{ id: string; email: string | null }> | null)?.map(e => [e.id, e.email]) || []);
          (profiles || []).forEach((p: any) => { profilesMap[p.id] = { ...p, email: emailMap.get(p.id) || null }; });
        }
      }

      return (data || []).map((a: any) => {
        const profile = profilesMap[a.user_id];
        return {
          id: a.id,
          test_id: a.test_id,
          user_id: a.user_id,
          status: a.status,
          score: a.score,
          correct_answers: a.correct_answers,
          total_questions: a.total_questions,
          time_taken_secs: a.time_taken_secs,
          started_at: a.started_at,
          completed_at: a.completed_at,
          test_title: a.mcq_tests?.title || 'Unknown Test',
          student_name: profile?.full_name || 'Unknown',
          student_avatar: profile?.avatar_url || null,
          student_email: profile?.email || null,
        };
      }) as AttemptWithDetails[];
    },
  });

  // Client-side filtering and sorting
  const filteredResults = useMemo(() => {
    let results = [...attempts];

    if (filters.testId !== 'all') {
      results = results.filter(r => r.test_id === filters.testId);
    }
    if (filters.status !== 'all') {
      results = results.filter(r => r.status === filters.status);
    }
    if (filters.studentSearch.trim()) {
      const q = filters.studentSearch.toLowerCase();
      results = results.filter(r =>
        r.student_name?.toLowerCase().includes(q) ||
        r.student_email?.toLowerCase().includes(q)
      );
    }

    // Sort
    results.sort((a, b) => {
      switch (filters.sortBy) {
        case 'score_desc': return (b.score ?? 0) - (a.score ?? 0);
        case 'score_asc': return (a.score ?? 0) - (b.score ?? 0);
        case 'date_asc': return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        case 'name_asc': return (a.student_name || '').localeCompare(b.student_name || '');
        default: return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      }
    });

    return results;
  }, [attempts, filters]);

  // Summary stats
  const summary = useMemo(() => {
    const total = filteredResults.length;
    const completed = filteredResults.filter(r => r.status === 'completed');
    const avgScore = completed.length > 0
      ? completed.reduce((sum, r) => sum + (r.score ?? 0), 0) / completed.length
      : 0;
    const completionRate = total > 0 ? (completed.length / total) * 100 : 0;
    return { total, completedCount: completed.length, avgScore, completionRate };
  }, [filteredResults]);

  return { filters, setFilters, tests, filteredResults, isLoading, summary };
}
