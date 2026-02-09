import { motion } from 'framer-motion';
import { HelpCircle, MessageSquare, ClipboardCheck, Target, Heart, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { AnalyticsStats, MCQTestDetail, MCQUserStat, MCQScoreDistribution } from '@/hooks/useAnalyticsData';
import { MCQDetailsDialog } from './MCQDetailsDialog';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface CommunityMCQCardsProps {
  stats: AnalyticsStats;
  mcqTestDetails: MCQTestDetail[];
  mcqUserStats: MCQUserStat[];
  mcqScoreDistribution: MCQScoreDistribution[];
}

export function CommunityMCQCards({ stats, mcqTestDetails, mcqUserStats, mcqScoreDistribution }: CommunityMCQCardsProps) {
  const resolutionRate = stats.totalQuestions > 0
    ? Math.round((stats.resolvedQuestions / stats.totalQuestions) * 100)
    : 0;

  const mcqCompletionRate = stats.mcqTotalAttempts > 0
    ? Math.round((stats.mcqCompletedAttempts / stats.mcqTotalAttempts) * 100)
    : 0;

  const engagementRate = stats.totalPosts > 0
    ? Math.round((stats.totalPostLikes / stats.totalPosts) * 10) / 10
    : 0;

  const uniqueUsers = new Set(mcqUserStats.map(u => u.userId)).size;

  return (
    <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-4">
      {/* Community Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <MessageSquare className="w-4 h-4 text-blue-500" />
            </div>
            Community Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Q&A Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span>Questions Asked</span>
              </div>
              <span className="font-semibold">
                <AnimatedCounter value={stats.totalQuestions} />
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Resolution Rate</span>
              </div>
              <span className="font-semibold text-emerald-500">{resolutionRate}%</span>
            </div>
            <Progress value={resolutionRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.resolvedQuestions} of {stats.totalQuestions} questions resolved
            </p>
          </div>

          <div className="border-t border-border" />

          {/* Posts Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span>Posts Created</span>
              </div>
              <span className="font-semibold">
                <AnimatedCounter value={stats.totalPosts} />
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive" />
                <span>Avg Likes/Post</span>
              </div>
              <span className="font-semibold">{engagementRate}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MCQ Performance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <ClipboardCheck className="w-4 h-4 text-purple-500" />
              </div>
              MCQ Performance
            </div>
            <MCQDetailsDialog
              testDetails={mcqTestDetails}
              userStats={mcqUserStats}
              scoreDistribution={mcqScoreDistribution}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Test Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                <span>Published Tests</span>
              </div>
              <span className="font-semibold">
                <AnimatedCounter value={stats.mcqPublishedTests} />
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span>Total Attempts</span>
              </div>
              <span className="font-semibold">
                <AnimatedCounter value={stats.mcqTotalAttempts} />
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Unique Users</span>
              </div>
              <span className="font-semibold">
                <AnimatedCounter value={uniqueUsers} />
              </span>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Score & Completion */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Average Score</span>
              <span className="font-semibold text-primary">{stats.mcqAvgScore}%</span>
            </div>
            <Progress value={stats.mcqAvgScore} className="h-2" />

            <div className="flex items-center justify-between text-sm mt-3">
              <span>Completion Rate</span>
              <span className="font-semibold text-emerald-500">{mcqCompletionRate}%</span>
            </div>
            <Progress value={mcqCompletionRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.mcqCompletedAttempts} of {stats.mcqTotalAttempts} attempts completed
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
