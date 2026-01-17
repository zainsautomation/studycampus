import { motion } from 'framer-motion';
import { Zap, TrendingUp, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { LevelBadge } from './LevelBadge';
import { cn } from '@/lib/utils';

interface PointsDisplayProps {
  totalPoints: number;
  weeklyPoints: number;
  level: number;
  rankTitle: string;
  streakDays: number;
  levelProgress: number;
  pointsToNextLevel: number;
  compact?: boolean;
  className?: string;
}

export function PointsDisplay({
  totalPoints,
  weeklyPoints,
  level,
  rankTitle,
  streakDays,
  levelProgress,
  pointsToNextLevel,
  compact = false,
  className,
}: PointsDisplayProps) {
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('flex items-center gap-3', className)}
      >
        <LevelBadge level={level} rankTitle={rankTitle} size="md" />
        <div className="flex items-center gap-1 text-sm">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <AnimatedCounter value={totalPoints} className="font-semibold" />
        </div>
        {streakDays > 0 && (
          <div className="flex items-center gap-1 text-sm text-orange-500">
            <Flame className="h-3.5 w-3.5" />
            <span className="font-medium">{streakDays}</span>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Your Progress</span>
            <LevelBadge level={level} rankTitle={rankTitle} size="lg" showRank />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Points */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm text-muted-foreground">Total Points</span>
            </div>
            <AnimatedCounter value={totalPoints} className="text-xl font-bold" />
          </div>

          {/* Weekly Points */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-muted-foreground">This Week</span>
            </div>
            <AnimatedCounter value={weeklyPoints} className="text-lg font-semibold text-green-600 dark:text-green-400" />
          </div>

          {/* Streak */}
          {streakDays > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/30">
                  <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-sm text-muted-foreground">Day Streak</span>
              </div>
              <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">{streakDays} days</span>
            </div>
          )}

          {/* Level Progress */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Next Level</span>
              <span className="font-medium">{pointsToNextLevel} pts to go</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
