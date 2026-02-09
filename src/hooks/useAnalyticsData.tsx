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

export interface MCQTestDetail {
  id: string;
  title: string;
  attempts: number;
  uniqueUsers: number;
  avgScore: number;
  highScore: number;
  lowScore: number;
  avgTimeSecs: number;
}

export interface MCQUserStat {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  attempts: number;
  completed: number;
  avgScore: number;
  bestScore: number;
}

export interface MCQScoreDistribution {
  range: string;
  count: number;
  percentage: number;
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
  const [mcqTestDetails, setMcqTestDetails] = useState<MCQTestDetail[]>([]);
  const [mcqUserStats, setMcqUserStats] = useState<MCQUserStat[]>([]);
  const [mcqScoreDistribution, setMcqScoreDistribution] = useState<MCQScoreDistribution[]>([]);
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

      // Fetch detailed data in parallel
      const [
        topDownloadedRes,
        allBookmarksRes,
        subjectsRes,
        mcqTestsDetailRes,
        mcqAllAttemptsRes,
      ] = await Promise.all([
        supabase.from('notes').select('id, title, download_count').order('download_count', { ascending: false }).limit(5),
        supabase.from('saved_notes').select('note_id'),
        supabase.from('subjects').select('id, name, color'),
        supabase.from('mcq_tests').select('id, title').eq('is_published', true),
        supabase.from('mcq_attempts').select('id, test_id, user_id, score, status, time_taken_secs'),
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

      // Process MCQ per-test details
      if (mcqTestsDetailRes.data && mcqAllAttemptsRes.data) {
        const attempts = mcqAllAttemptsRes.data;
        const testDetails: MCQTestDetail[] = mcqTestsDetailRes.data.map(test => {
          const testAttempts = attempts.filter(a => a.test_id === test.id);
          const completedAttempts = testAttempts.filter(a => a.status === 'completed' && a.score != null);
          const scores = completedAttempts.map(a => Number(a.score || 0));
          const times = testAttempts.filter(a => a.time_taken_secs != null).map(a => a.time_taken_secs!);
          const uniqueUsers = new Set(testAttempts.map(a => a.user_id)).size;

          return {
            id: test.id,
            title: test.title,
            attempts: testAttempts.length,
            uniqueUsers,
            avgScore: scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 10) / 10 : 0,
            highScore: scores.length > 0 ? Math.max(...scores) : 0,
            lowScore: scores.length > 0 ? Math.min(...scores) : 0,
            avgTimeSecs: times.length > 0 ? Math.round(times.reduce((s, v) => s + v, 0) / times.length) : 0,
          };
        }).sort((a, b) => b.attempts - a.attempts);
        setMcqTestDetails(testDetails);

        // Process MCQ per-user stats
        const userMap: Record<string, { attempts: number; completed: number; scores: number[]; bestScore: number }> = {};
        attempts.forEach(a => {
          if (!userMap[a.user_id]) {
            userMap[a.user_id] = { attempts: 0, completed: 0, scores: [], bestScore: 0 };
          }
          userMap[a.user_id].attempts++;
          if (a.status === 'completed') {
            userMap[a.user_id].completed++;
            if (a.score != null) {
              const score = Number(a.score);
              userMap[a.user_id].scores.push(score);
              userMap[a.user_id].bestScore = Math.max(userMap[a.user_id].bestScore, score);
            }
          }
        });

        const userIds = Object.keys(userMap);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          const userStats: MCQUserStat[] = userIds.map(uid => {
            const u = userMap[uid];
            const profile = profiles?.find(p => p.id === uid);
            return {
              userId: uid,
              fullName: profile?.full_name || 'Unknown',
              avatarUrl: profile?.avatar_url || null,
              attempts: u.attempts,
              completed: u.completed,
              avgScore: u.scores.length > 0 ? Math.round(u.scores.reduce((s, v) => s + v, 0) / u.scores.length * 10) / 10 : 0,
              bestScore: u.bestScore,
            };
          }).sort((a, b) => b.avgScore - a.avgScore);
          setMcqUserStats(userStats);
        }

        // Process score distribution
        const completedAll = attempts.filter(a => a.status === 'completed' && a.score != null);
        const ranges = [
          { range: '80-100%', min: 80, max: 100 },
          { range: '60-79%', min: 60, max: 79 },
          { range: '40-59%', min: 40, max: 59 },
          { range: '0-39%', min: 0, max: 39 },
        ];
        const totalCompleted = completedAll.length;
        const distribution: MCQScoreDistribution[] = ranges.map(r => {
          const count = completedAll.filter(a => {
            const score = Number(a.score);
            return score >= r.min && score <= r.max;
          }).length;
          return {
            range: r.range,
            count,
            percentage: totalCompleted > 0 ? Math.round((count / totalCompleted) * 100) : 0,
          };
        });
        setMcqScoreDistribution(distribution);
      }

      // Process subject distribution
      if (subjectsRes.data) {
        const subjectMap: Record<string, { name: string; color: string; count: number }> = {};
        subjectsRes.data.forEach(s => {
          subjectMap[s.id] = { name: s.name, color: s.color || '#6366f1', count: 0 };
        });

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
    mcqTestDetails,
    mcqUserStats,
    mcqScoreDistribution,
    isLoading,
  };
}
