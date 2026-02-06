import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TopNote {
  id: string;
  title: string;
  download_count: number;
  bookmark_count: number;
}

export interface SubjectDistribution {
  name: string;
  count: number;
  color: string;
}

export interface AnalyticsStats {
  totalNotes: number;
  totalDownloads: number;
  totalBookmarks: number;
  totalStudents: number;
  totalQuestions: number;
  resolvedQuestions: number;
  totalPosts: number;
  totalPostLikes: number;
  mcqPublishedTests: number;
  mcqTotalAttempts: number;
  mcqCompletedAttempts: number;
  mcqAvgScore: number;
}

export function useAnalyticsData() {
  const [stats, setStats] = useState<AnalyticsStats>({
    totalNotes: 0,
    totalDownloads: 0,
    totalBookmarks: 0,
    totalStudents: 0,
    totalQuestions: 0,
    resolvedQuestions: 0,
    totalPosts: 0,
    totalPostLikes: 0,
    mcqPublishedTests: 0,
    mcqTotalAttempts: 0,
    mcqCompletedAttempts: 0,
    mcqAvgScore: 0,
  });
  const [topDownloadedNotes, setTopDownloadedNotes] = useState<TopNote[]>([]);
  const [topBookmarkedNotes, setTopBookmarkedNotes] = useState<TopNote[]>([]);
  const [subjectDistribution, setSubjectDistribution] = useState<SubjectDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Fetch all counts in parallel
      const [
        notesRes,
        bookmarksRes,
        studentsRes,
        questionsRes,
        resolvedRes,
        postsRes,
        postLikesRes,
        mcqTestsRes,
        mcqAttemptsRes,
        mcqCompletedRes,
      ] = await Promise.all([
        supabase.from('notes').select('id, download_count'),
        supabase.from('saved_notes').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('is_resolved', true),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('post_likes').select('id', { count: 'exact', head: true }),
        supabase.from('mcq_tests').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('mcq_attempts').select('id', { count: 'exact', head: true }),
        supabase.from('mcq_attempts').select('id, score', { count: 'exact' }).eq('status', 'completed'),
      ]);

      const totalDownloads = notesRes.data?.reduce((sum, note) => sum + (note.download_count || 0), 0) || 0;

      // Calculate average MCQ score
      const completedScores = mcqCompletedRes.data?.filter(a => a.score != null) || [];
      const mcqAvgScore = completedScores.length > 0
        ? completedScores.reduce((sum, a) => sum + Number(a.score || 0), 0) / completedScores.length
        : 0;

      setStats({
        totalNotes: notesRes.data?.length || 0,
        totalDownloads,
        totalBookmarks: bookmarksRes.count || 0,
        totalStudents: studentsRes.count || 0,
        totalQuestions: questionsRes.count || 0,
        resolvedQuestions: resolvedRes.count || 0,
        totalPosts: postsRes.count || 0,
        totalPostLikes: postLikesRes.count || 0,
        mcqPublishedTests: mcqTestsRes.count || 0,
        mcqTotalAttempts: mcqAttemptsRes.count || 0,
        mcqCompletedAttempts: mcqCompletedRes.count || 0,
        mcqAvgScore: Math.round(mcqAvgScore * 10) / 10,
      });

      // Fetch top downloaded notes & bookmark data in parallel
      const [topDownloadedRes, allBookmarksRes, subjectsRes] = await Promise.all([
        supabase.from('notes').select('id, title, download_count').order('download_count', { ascending: false }).limit(5),
        supabase.from('saved_notes').select('note_id'),
        supabase.from('subjects').select('id, name, color'),
      ]);

      // Process top downloaded
      const notesWithBookmarks: TopNote[] = [];
      if (topDownloadedRes.data) {
        for (const note of topDownloadedRes.data) {
          const { count } = await supabase
            .from('saved_notes')
            .select('id', { count: 'exact', head: true })
            .eq('note_id', note.id);
          notesWithBookmarks.push({
            ...note,
            download_count: note.download_count || 0,
            bookmark_count: count || 0,
          });
        }
      }
      setTopDownloadedNotes(notesWithBookmarks);

      // Process top bookmarked
      if (allBookmarksRes.data) {
        const countMap: Record<string, number> = {};
        allBookmarksRes.data.forEach(b => {
          countMap[b.note_id] = (countMap[b.note_id] || 0) + 1;
        });
        const sortedNoteIds = Object.entries(countMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([id]) => id);

        if (sortedNoteIds.length > 0) {
          const { data: bookmarkedNotes } = await supabase
            .from('notes')
            .select('id, title, download_count')
            .in('id', sortedNoteIds);

          if (bookmarkedNotes) {
            const topBookmarked = sortedNoteIds.map(id => {
              const note = bookmarkedNotes.find(n => n.id === id);
              return {
                id,
                title: note?.title || 'Unknown',
                download_count: note?.download_count || 0,
                bookmark_count: countMap[id],
              };
            });
            setTopBookmarkedNotes(topBookmarked);
          }
        }
      }

      // Process subject distribution
      if (subjectsRes.data && notesRes.data) {
        const subjectMap: Record<string, { name: string; color: string; count: number }> = {};
        subjectsRes.data.forEach(s => {
          subjectMap[s.id] = { name: s.name, color: s.color || '#6366f1', count: 0 };
        });
        notesRes.data.forEach(note => {
          // We need subject_id - re-query with it
        });

        // Fetch notes with subject_id for distribution
        const { data: notesWithSubjects } = await supabase
          .from('notes')
          .select('subject_id');

        if (notesWithSubjects) {
          let uncategorized = 0;
          notesWithSubjects.forEach(n => {
            if (n.subject_id && subjectMap[n.subject_id]) {
              subjectMap[n.subject_id].count++;
            } else {
              uncategorized++;
            }
          });

          const distribution = Object.values(subjectMap)
            .filter(s => s.count > 0)
            .sort((a, b) => b.count - a.count);

          if (uncategorized > 0) {
            distribution.push({ name: 'Uncategorized', color: '#94a3b8', count: uncategorized });
          }
          setSubjectDistribution(distribution);
        }
      }

      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  return {
    stats,
    topDownloadedNotes,
    topBookmarkedNotes,
    subjectDistribution,
    isLoading,
  };
}
