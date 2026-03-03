import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flag, Clock } from 'lucide-react';
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
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [startTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref to track current answers for stale closure fix
  const answersRef = useRef<Record<string, string>>({});
  const questionsRef = useRef<any[] | null>(null);
  const startTimeRef = useRef(startTime);

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

  // Keep refs updated
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    questionsRef.current = questions || null;
  }, [questions]);

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

  const performSubmit = useCallback(async () => {
    if (!attemptId) return;
    
    const currentAnswers = answersRef.current;
    const currentQuestions = questionsRef.current;
    
    if (!currentQuestions) return;
    
    setIsSubmitting(true);
    try {
      // Calculate score using refs for fresh data
      let correctCount = 0;
      currentQuestions.forEach(q => {
        const selectedId = currentAnswers[q.id];
        if (selectedId) {
          const isCorrect = q.options.find((o: any) => o.id === selectedId)?.is_correct;
          if (isCorrect) correctCount++;
        }
      });

      const score = (correctCount / currentQuestions.length) * 100;
      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

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
      setShowTimeUpDialog(false);
    }
  }, [attemptId, completeAttempt, navigate]);

  const handleSubmit = async () => {
    await performSubmit();
  };

  const handleTimeUp = useCallback(() => {
    // Check test mode: exam auto-submits, practice shows dialog
    if (test?.test_mode === 'exam') {
      toast.warning('Time is up! Submitting your test...');
      performSubmit();
    } else {
      // Practice mode - show dialog with options
      setTimerPaused(true);
      setShowTimeUpDialog(true);
    }
  }, [test?.test_mode, performSubmit]);

  const handleContinuePractice = () => {
    setShowTimeUpDialog(false);
    // Timer stays paused, user can continue at their own pace
    toast.info('You can continue reviewing and answering questions.');
  };

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
          {test?.time_limit_mins && !timerPaused && (
            <TestTimer 
              totalSeconds={test.time_limit_mins * 60}
              onTimeUp={handleTimeUp}
            />
          )}
          {timerPaused && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-600 rounded-full text-sm font-medium">
              <Clock className="w-4 h-4" />
              Time Up
            </div>
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

        {/* Navigation - fixed bottom bar with question dots */}
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 z-30">
          <div className="max-w-2xl mx-auto bg-background/95 backdrop-blur-lg border border-border rounded-2xl shadow-lg overflow-hidden">
            {/* Question Navigator (dots) */}
            <div className="flex flex-wrap justify-center gap-1.5 px-3 pt-3 pb-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "w-7 h-7 rounded-full text-xs font-medium transition-all",
                    idx === currentIndex && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                    answers[q.id] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            {/* Prev / Next buttons */}
            <div className="flex items-center gap-3 p-3 pt-1">
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

        {/* Time Up Dialog (Practice Mode Only) */}
        <AlertDialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Time's Up!
              </AlertDialogTitle>
              <AlertDialogDescription>
                Your allotted time has ended. Since this is practice mode, you can choose to continue reviewing or submit your answers now.
                <span className="block mt-3 text-sm">
                  You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleContinuePractice} disabled={isSubmitting}>
                Continue Practicing
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Now'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
