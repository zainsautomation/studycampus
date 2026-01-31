import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Home } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ResultSummary } from '@/components/mcq/ResultSummary';
import { QuestionReview } from '@/components/mcq/QuestionReview';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useMCQAttempt, useMCQTest, useStartAttempt } from '@/hooks/useMCQAttempt';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type TabValue = 'summary' | 'review';

interface QuestionWithResponse {
  id: string;
  question_text: string;
  explanation: string | null;
  order_number: number;
  options: Array<{
    id: string;
    option_label: string;
    option_text: string;
    is_correct: boolean;
  }>;
  selectedOptionId?: string;
}

function useResultData(attemptId: string, testId: string) {
  return useQuery({
    queryKey: ['mcq-result-data', attemptId, testId],
    queryFn: async () => {
      // Get questions with options
      const { data: questions, error: questionsError } = await supabase
        .from('mcq_questions')
        .select(`
          id,
          question_text,
          explanation,
          order_number,
          mcq_options (
            id,
            option_label,
            option_text,
            is_correct,
            order_number
          )
        `)
        .eq('test_id', testId)
        .order('order_number');

      if (questionsError) throw questionsError;

      // Get user responses
      const { data: responses, error: responsesError } = await supabase
        .from('mcq_responses')
        .select('question_id, selected_option_id')
        .eq('attempt_id', attemptId);

      if (responsesError) throw responsesError;

      const responseMap = new Map(responses.map(r => [r.question_id, r.selected_option_id]));

      return questions.map(q => ({
        ...q,
        options: (q.mcq_options as any[]).sort((a, b) => a.order_number - b.order_number),
        selectedOptionId: responseMap.get(q.id) || undefined,
      })) as QuestionWithResponse[];
    },
    enabled: !!attemptId && !!testId,
  });
}

export default function MCQResult() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isRetaking, setIsRetaking] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('summary');

  const { data: attempt, isLoading: attemptLoading } = useMCQAttempt(attemptId || '');
  const { data: test } = useMCQTest(attempt?.test_id || '');
  const { data: questionsWithResponses, isLoading: dataLoading } = useResultData(
    attemptId || '',
    attempt?.test_id || ''
  );
  const startAttempt = useStartAttempt();

  const isLoading = attemptLoading || dataLoading;

  const handleRetake = async () => {
    if (!test || !attempt || !questionsWithResponses) return;

    setIsRetaking(true);
    try {
      const newAttempt = await startAttempt.mutateAsync({
        testId: test.id,
        totalQuestions: questionsWithResponses.length,
      });
      navigate(`/mcq/attempt/${newAttempt.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start new attempt');
    } finally {
      setIsRetaking(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 md:py-8 max-w-2xl mx-auto">
          <Skeleton className="h-64 rounded-xl mb-6" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!attempt || attempt.status !== 'completed') {
    return (
      <MainLayout>
        <div className="container px-4 py-6 md:py-8 max-w-2xl mx-auto text-center">
          <h1 className="text-xl font-bold mb-4">Result Not Available</h1>
          <Link to="/mcq">
            <Button>Go to MCQ Tests</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const showReview = test?.result_visibility === 'instant' || test?.result_visibility === 'delayed';

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to={`/mcq/test/${attempt.test_id}`}>
            <Button variant="ghost" size="sm" className="-ml-2 gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to Test
            </Button>
          </Link>
          <Link to="/mcq">
            <Button variant="ghost" size="sm" className="gap-1">
              <Home className="w-4 h-4" />
              All Tests
            </Button>
          </Link>
        </div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold mb-6 text-center"
        >
          {test?.title} - Results
        </motion.h1>

        {showReview ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <ResultSummary
                score={attempt.score || 0}
                totalQuestions={attempt.total_questions}
                correctAnswers={attempt.correct_answers}
                timeTakenSecs={attempt.time_taken_secs || undefined}
                onRetake={test?.retake_allowed ? handleRetake : undefined}
                retakeAllowed={test?.retake_allowed}
                showReview={showReview}
                onViewReview={() => setActiveTab('review')}
              />
            </TabsContent>

            <TabsContent value="review" className="space-y-4">
              {questionsWithResponses?.map((q, idx) => (
                <QuestionReview
                  key={q.id}
                  questionNumber={idx + 1}
                  questionText={q.question_text}
                  options={q.options}
                  selectedOptionId={q.selectedOptionId}
                  explanation={q.explanation}
                />
              ))}
            </TabsContent>
          </Tabs>
        ) : (
          <ResultSummary
            score={attempt.score || 0}
            totalQuestions={attempt.total_questions}
            correctAnswers={attempt.correct_answers}
            timeTakenSecs={attempt.time_taken_secs || undefined}
            onRetake={test?.retake_allowed ? handleRetake : undefined}
            retakeAllowed={test?.retake_allowed}
            showReview={false}
          />
        )}
      </div>
    </MainLayout>
  );
}
