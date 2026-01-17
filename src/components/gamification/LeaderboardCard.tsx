import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LevelBadge } from './LevelBadge';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { cn } from '@/lib/utils';
import { useUserPoints } from '@/hooks/useUserPoints';
import { useAuth } from '@/hooks/useAuth';

interface LeaderboardCardProps {
  limit?: number;
  showTabs?: boolean;
  className?: string;
}

const rankIcons = [
  { icon: Crown, className: 'text-amber-500' },
  { icon: Medal, className: 'text-slate-400' },
  { icon: Medal, className: 'text-amber-700' },
];

export function LeaderboardCard({ limit = 5, showTabs = true, className }: LeaderboardCardProps) {
  const { user } = useAuth();
  const { leaderboard, fetchLeaderboard, isLoading } = useUserPoints();
  const [period, setPeriod] = useState<'weekly' | 'all_time'>('all_time');

  useEffect(() => {
    fetchLeaderboard(period, limit);
  }, [period, limit]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-amber-500" />
            Leaderboard
          </CardTitle>
          {showTabs && (
            <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <TabsList className="h-8">
                <TabsTrigger value="all_time" className="text-xs px-2">All Time</TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs px-2">This Week</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No activity yet. Be the first!
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = user?.id === entry.user_id;
              const RankIcon = rankIcons[index]?.icon;
              
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg p-2 transition-colors',
                    isCurrentUser && 'bg-primary/5 ring-1 ring-primary/20',
                    index === 0 && 'bg-amber-50/50 dark:bg-amber-950/20'
                  )}
                >
                  {/* Rank */}
                  <div className="flex w-6 items-center justify-center">
                    {RankIcon ? (
                      <RankIcon className={cn('h-5 w-5', rankIcons[index].className)} />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={entry.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(entry.profile?.full_name || entry.profile?.username)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name & Level */}
                  <div className="flex flex-1 items-center gap-2 overflow-hidden">
                    <span className={cn(
                      'truncate text-sm font-medium',
                      isCurrentUser && 'text-primary'
                    )}>
                      {entry.profile?.username || entry.profile?.full_name || 'Anonymous'}
                      {isCurrentUser && ' (You)'}
                    </span>
                    <LevelBadge level={entry.level} rankTitle={entry.rank_title} size="sm" />
                  </div>

                  {/* Points */}
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    <AnimatedCounter 
                      value={entry.total_points} 
                      className="text-sm font-semibold" 
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
