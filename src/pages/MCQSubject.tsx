import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TestCard } from '@/components/mcq/TestCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

function useSubjectTests(subjectId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mcq-subject-tests', subjectId, user?.id],
    queryFn: async () => {
      // Get subject info
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name, color')
        .eq('id', subjectId)
        .single();

      if (subjectError) throw subjectError;

      // Get tests for this subject
      const { data: tests, error: testsError } = await supabase
        .from('mcq_tests')
        .select(`
          id,
          title,
          topic_name,
          time_limit_mins,
          test_mode,
          mcq_questions (id)
        `)
        .eq('subject_id', subjectId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      // Get user's attempts if logged in
      let userAttempts: Record<string, { count: number; bestScore: number | null }> = {};
      if (user) {
        const { data: attempts } = await supabase
          .from('mcq_attempts')
          .select('test_id, score, status')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        attempts?.forEach(a => {
          if (!userAttempts[a.test_id]) {
            userAttempts[a.test_id] = { count: 0, bestScore: null };
          }
          userAttempts[a.test_id].count++;
          if (a.score !== null) {
            if (userAttempts[a.test_id].bestScore === null || a.score > userAttempts[a.test_id].bestScore) {
              userAttempts[a.test_id].bestScore = a.score;
            }
          }
        });
      }

      return {
        subject,
        tests: tests.map(t => ({
          id: t.id,
          title: t.title,
          topicName: t.topic_name,
          questionCount: t.mcq_questions?.length || 0,
          timeLimitMins: t.time_limit_mins,
          testMode: t.test_mode as 'practice' | 'exam',
          attemptsCount: userAttempts[t.id]?.count || 0,
          bestScore: userAttempts[t.id]?.bestScore ?? null,
        })),
      };
    },
    enabled: !!subjectId,
  });
}

export default function MCQSubject() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { data, isLoading } = useSubjectTests(subjectId || '');

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 max-w-4xl mx-auto">
        {/* Back Button */}
        <Link to="/mcq">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Subjects
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <>
              <h1 className="text-2xl font-bold">{data?.subject.name}</h1>
              <p className="text-muted-foreground mt-1">
                {data?.tests.length || 0} {data?.tests.length === 1 ? 'test' : 'tests'} available
              </p>
            </>
          )}
        </motion.div>

        {/* Tests List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : data?.tests && data.tests.length > 0 ? (
          <div className="space-y-4">
            {data.tests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TestCard {...test} />
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Tests Yet</h3>
              <p className="text-muted-foreground">
                No tests available for this subject
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
