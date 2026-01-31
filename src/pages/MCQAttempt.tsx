import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { QuestionDisplay } from '@/components/mcq/QuestionDisplay';
import { TestTimer } from '@/components/mcq/TestTimer';
import { TestProgress } from '@/components/mcq/TestProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  useMCQAttempt, 
  useMCQTest, 
  useMCQQuestions,
  useSaveResponse,
  useCompleteAttempt,
  useAttemptResponses 
} from '@/hooks/useMCQAttempt';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MCQAttempt() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [startTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: attempt, isLoading: attemptLoading } = useMCQAttempt(attemptId || '');
  const { data: test } = useMCQTest(attempt?.test_id || '');
  const { data: questions, isLoading: questionsLoading } = useMCQQuestions(
    attempt?.test_id || '',
    test?.shuffle_questions,
    test?.shuffle_options
  );
  const { data: savedResponses } = useAttemptResponses(attemptId || '');
  const saveResponse = useSaveResponse();
  const completeAttempt = useCompleteAttempt();

  const isLoading = attemptLoading || questionsLoading;
  const currentQuestion = questions?.[currentIndex];
  const answeredCount = Object.keys(answers).length;

  // Load saved responses
  useEffect(() => {
    if (savedResponses && savedResponses.length > 0) {
      const loadedAnswers: Record<string, string> = {};
      savedResponses.forEach(r => {
        if (r.selected_option_id) {
          loadedAnswers[r.question_id] = r.selected_option_id;
        }
      });
      setAnswers(loadedAnswers);
    }
  }, [savedResponses]);

  // Redirect if attempt is completed
  useEffect(() => {
    if (attempt?.status === 'completed') {
      navigate(`/mcq/result/${attemptId}`, { replace: true });
    }
  }, [attempt?.status, attemptId, navigate]);

  const handleSelectOption = useCallback(async (optionId: string) => {
    if (!currentQuestion || !attemptId) return;

    const isCorrect = currentQuestion.options.find(o => o.id === optionId)?.is_correct || false;

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));

    // Save to database
    try {
      await saveResponse.mutateAsync({
        attemptId,
        questionId: currentQuestion.id,
        selectedOptionId: optionId,
        isCorrect,
      });
    } catch (error) {
      console.error('Failed to save response:', error);
    }
  }, [currentQuestion, attemptId, saveResponse]);

  const handleSubmit = async () => {
    if (!attemptId || !questions) return;
    
    setIsSubmitting(true);
    try {
      // Calculate score
      let correctCount = 0;
      questions.forEach(q => {
        const selectedId = answers[q.id];
        if (selectedId) {
          const isCorrect = q.options.find(o => o.id === selectedId)?.is_correct;
          if (isCorrect) correctCount++;
        }
      });

      const score = (correctCount / questions.length) * 100;
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);

      await completeAttempt.mutateAsync({
        attemptId,
        score,
        correctAnswers: correctCount,
        timeTakenSecs: timeTaken,
      });

      toast.success('Test submitted successfully!');
      navigate(`/mcq/result/${attemptId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit test');
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const handleTimeUp = useCallback(() => {
    toast.warning('Time is up!');
    handleSubmit();
  }, []);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 max-w-2xl mx-auto">
          <Skeleton className="h-12 mb-4" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!attempt || !questions || !currentQuestion) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 max-w-2xl mx-auto text-center">
          <h1 className="text-xl font-bold">Test not found</h1>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-4 md:py-6 max-w-2xl mx-auto pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold truncate">{test?.title}</h1>
          {test?.time_limit_mins && (
            <TestTimer 
              totalSeconds={test.time_limit_mins * 60}
              onTimeUp={handleTimeUp}
            />
          )}
        </div>

        {/* Progress */}
        <TestProgress 
          current={currentIndex + 1}
          total={questions.length}
          answeredCount={answeredCount}
          className="mb-6"
        />

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 md:p-6">
                <QuestionDisplay
                  questionNumber={currentIndex + 1}
                  totalQuestions={questions.length}
                  questionText={currentQuestion.question_text}
                  options={currentQuestion.options}
                  selectedOptionId={answers[currentQuestion.id]}
                  onSelectOption={handleSelectOption}
                />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Question Navigator (dots) */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-medium transition-all",
                idx === currentIndex && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                answers[q.id] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3 p-3 bg-background/95 backdrop-blur-lg border border-border rounded-2xl shadow-lg">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            
            <div className="flex-1 text-center text-sm text-muted-foreground">
              {currentIndex + 1} / {questions.length}
            </div>

            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                className="gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setShowSubmitDialog(true)}
                variant="default"
                className="gap-1 bg-green-600 hover:bg-green-700"
              >
                <Flag className="w-4 h-4" />
                Submit
              </Button>
            )}
          </div>
        </div>

        {/* Submit Confirmation Dialog */}
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Test?</AlertDialogTitle>
              <AlertDialogDescription>
                You have answered {answeredCount} of {questions.length} questions.
                {answeredCount < questions.length && (
                  <span className="block mt-2 text-orange-500">
                    ⚠️ {questions.length - answeredCount} questions are unanswered
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Review Answers</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Test'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
