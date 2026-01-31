import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, FileQuestion, Trophy, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TestCardProps {
  id: string;
  title: string;
  topicName?: string | null;
  questionCount: number;
  timeLimitMins?: number | null;
  testMode: 'practice' | 'exam';
  attemptsCount?: number;
  bestScore?: number | null;
  className?: string;
}

export function TestCard({
  id,
  title,
  topicName,
  questionCount,
  timeLimitMins,
  testMode,
  attemptsCount = 0,
  bestScore,
  className,
}: TestCardProps) {
  return (
    <Link to={`/mcq/test/${id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <Card className={cn(
          "overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300",
          className
        )}>
          <CardContent className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground line-clamp-2">{title}</h3>
                {topicName && (
                  <p className="text-sm text-muted-foreground mt-0.5">{topicName}</p>
                )}
              </div>
              <Badge 
                variant={testMode === 'exam' ? 'default' : 'secondary'}
                className={cn(
                  "shrink-0",
                  testMode === 'exam' && "bg-orange-500/90 text-white hover:bg-orange-500"
                )}
              >
                {testMode === 'exam' ? 'Exam' : 'Practice'}
              </Badge>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <FileQuestion className="w-4 h-4" />
                <span>{questionCount} questions</span>
              </div>
              {timeLimitMins && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{timeLimitMins} min</span>
                </div>
              )}
            </div>

            {/* User Stats */}
            {attemptsCount > 0 && (
              <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-sm">
                  <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{attemptsCount} attempts</span>
                </div>
                {bestScore !== null && bestScore !== undefined && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Trophy className={cn(
                      "w-3.5 h-3.5",
                      bestScore >= 80 ? "text-yellow-500" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      bestScore >= 80 ? "text-yellow-500 font-medium" : "text-muted-foreground"
                    )}>
                      Best: {bestScore.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
