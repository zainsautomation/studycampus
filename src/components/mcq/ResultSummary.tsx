import { motion } from 'framer-motion';
import { Trophy, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ResultSummaryProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTakenSecs?: number;
  onRetake?: () => void;
  onViewReview?: () => void;
  showReview?: boolean;
  retakeAllowed?: boolean;
}

export function ResultSummary({
  score,
  totalQuestions,
  correctAnswers,
  timeTakenSecs,
  onRetake,
  onViewReview,
  showReview = true,
  retakeAllowed = true,
}: ResultSummaryProps) {
  const incorrectAnswers = totalQuestions - correctAnswers;
  
  const getGrade = () => {
    if (score >= 90) return { label: 'Excellent!', color: 'text-green-500', icon: '🌟' };
    if (score >= 80) return { label: 'Great Job!', color: 'text-green-400', icon: '🎉' };
    if (score >= 70) return { label: 'Good Work!', color: 'text-blue-500', icon: '👍' };
    if (score >= 60) return { label: 'Not Bad!', color: 'text-yellow-500', icon: '💪' };
    return { label: 'Keep Practicing!', color: 'text-orange-500', icon: '📚' };
  };

  const grade = getGrade();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 overflow-hidden">
        <CardContent className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mb-4"
          >
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted/30"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className={cn(
                    score >= 80 ? "text-green-500" :
                    score >= 60 ? "text-yellow-500" : "text-orange-500"
                  )}
                  initial={{ strokeDasharray: "0 352" }}
                  animate={{ strokeDasharray: `${(score / 100) * 352} 352` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{score.toFixed(0)}%</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <div className="text-4xl">{grade.icon}</div>
            <h2 className={cn("text-2xl font-bold", grade.color)}>{grade.label}</h2>
          </motion.div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-green-500/30 bg-green-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-500">{correctAnswers}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{incorrectAnswers}</p>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {timeTakenSecs !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="col-span-2"
          >
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center justify-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Time taken:</span>
                <span className="font-semibold">{formatTime(timeTakenSecs)}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col gap-3"
      >
        {showReview && onViewReview && (
          <Button onClick={onViewReview} size="lg" className="w-full">
            View Answers
          </Button>
        )}
        {retakeAllowed && onRetake && (
          <Button onClick={onRetake} variant="outline" size="lg" className="w-full gap-2">
            <RotateCcw className="w-4 h-4" />
            Retake Test
          </Button>
        )}
      </motion.div>
    </div>
  );
}
