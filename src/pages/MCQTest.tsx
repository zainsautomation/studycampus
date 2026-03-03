import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, FileQuestion, Trophy, Play, Lock, History, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMCQTest, useMCQQuestions, useUserAttempts, useStartAttempt } from '@/hooks/useMCQAttempt';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function MCQTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);

  const { data: test, isLoading: testLoading } = useMCQTest(testId || '');
  const { data: questions, isLoading: questionsLoading } = useMCQQuestions(testId || '');
  const { data: attempts, isLoading: attemptsLoading } = useUserAttempts(testId || '');
  const startAttempt = useStartAttempt();

  const isLoading = testLoading || questionsLoading || authLoading;
  const completedAttempts = attempts?.filter(a => a.status === 'completed') || [];
  const bestScore = completedAttempts.length > 0 
    ? Math.max(...completedAttempts.map(a => a.score || 0))
    : null;
  const inProgressAttempt = attempts?.find(a => a.status === 'in_progress');

  const handleStartTest = async () => {
    if (!user) {
      toast.error('Please log in to take the test');
      navigate('/auth');
      return;
    }

    if (!test || !questions) return;

    // Check if retakes are allowed
    if (!test.retake_allowed && completedAttempts.length > 0) {
      toast.error('Retakes are not allowed for this test');
      return;
    }

    // Check for in-progress attempt
    if (inProgressAttempt) {
      navigate(`/mcq/attempt/${inProgressAttempt.id}`);
      return;
    }

    setIsStarting(true);
    try {
      const attempt = await startAttempt.mutateAsync({
        testId: test.id,
        totalQuestions: questions.length,
      });
      navigate(`/mcq/attempt/${attempt.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start test');
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 md:py-8 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!test) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 md:py-8 max-w-2xl mx-auto text-center">
          <FileQuestion className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Test Not Found</h1>
          <p className="text-muted-foreground mb-6">This test may have been removed or unpublished.</p>
          <Link to="/mcq">
            <Button>Back to MCQ Tests</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const canRetake = test.retake_allowed || completedAttempts.length === 0;

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 max-w-2xl mx-auto">
        {/* Back Button */}
        <Link to={test.subject_id ? `/mcq/subject/${test.subject_id}` : '/mcq'}>
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>

        {/* Test Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{test.title}</CardTitle>
                  {test.topic_name && (
                    <p className="text-muted-foreground mt-1">{test.topic_name}</p>
                  )}
                </div>
                <Badge 
                  variant={test.test_mode === 'exam' ? 'default' : 'secondary'}
                  className={cn(
                    test.test_mode === 'exam' && "bg-orange-500/90 text-white"
                  )}
                >
                  {test.test_mode === 'exam' ? 'Exam' : 'Practice'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Test Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <FileQuestion className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="font-semibold">{questions?.length || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time Limit</p>
                    <p className="font-semibold">
                      {test.time_limit_mins ? `${test.time_limit_mins} min` : 'No limit'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {test.description && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-sm text-muted-foreground">{test.description}</p>
                </div>
              )}

              {/* User Stats */}
              {user && completedAttempts.length > 0 && (
                <>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <Trophy className={cn(
                      "w-8 h-8",
                      bestScore && bestScore >= 80 ? "text-yellow-500" : "text-primary"
                    )} />
                    <div>
                      <p className="text-sm text-muted-foreground">Your Best Score</p>
                      <p className="text-2xl font-bold text-primary">{bestScore?.toFixed(0)}%</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-sm text-muted-foreground">Attempts</p>
                      <p className="font-semibold">{completedAttempts.length}</p>
                    </div>
                  </div>

                  {/* Recent Attempts History - Collapsible */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowAttempts(!showAttempts)}
                      className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <History className="w-4 h-4" />
                        <span>Recent Attempts ({completedAttempts.length})</span>
                      </div>
                      <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        showAttempts && "rotate-180"
                      )} />
                    </button>
                    
                    {showAttempts && (
                      <div className="space-y-2 pl-1">
                        {completedAttempts.slice(0, 3).map((attempt, index) => (
                          <Link key={attempt.id} to={`/mcq/result/${attempt.id}`}>
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center",
                                  (attempt.score || 0) >= 80 
                                    ? "bg-green-500/20 text-green-500" 
                                    : (attempt.score || 0) >= 60 
                                      ? "bg-yellow-500/20 text-yellow-500" 
                                      : "bg-red-500/20 text-red-500"
                                )}>
                                  {(attempt.score || 0) >= 60 ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">
                                    {attempt.score?.toFixed(0)}% 
                                    <span className="text-muted-foreground font-normal ml-2">
                                      ({attempt.correct_answers}/{attempt.total_questions} correct)
                                    </span>
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(attempt.completed_at!), 'MMM d, yyyy • h:mm a')}
                                  </p>
                                </div>
                              </div>
                              {attempt.time_taken_secs && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.floor(attempt.time_taken_secs / 60)}m {attempt.time_taken_secs % 60}s
                                </Badge>
                              )}
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Start Button */}
              <Button 
                onClick={handleStartTest}
                disabled={isStarting || !canRetake}
                size="lg"
                className="w-full gap-2"
              >
                {!user ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Log in to Start
                  </>
                ) : !canRetake ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Retakes Not Allowed
                  </>
                ) : inProgressAttempt ? (
                  <>
                    <Play className="w-4 h-4" />
                    Continue Test
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {completedAttempts.length > 0 ? 'Retake Test' : 'Start Test'}
                  </>
                )}
              </Button>

              {/* Info Badges */}
              <div className="flex flex-wrap gap-2 justify-center">
                {test.shuffle_questions && (
                  <Badge variant="outline">Questions shuffled</Badge>
                )}
                {test.shuffle_options && (
                  <Badge variant="outline">Options shuffled</Badge>
                )}
                {test.result_visibility === 'instant' && (
                  <Badge variant="outline">Instant results</Badge>
                )}
                {test.result_visibility === 'delayed' && (
                  <Badge variant="outline">
                    {(test as any).results_revealed ? 'Answers available' : 'Answers revealed later'}
                  </Badge>
                )}
                {test.result_visibility === 'hidden' && (
                  <Badge variant="outline">Answers hidden</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}
