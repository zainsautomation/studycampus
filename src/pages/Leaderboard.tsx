import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp, Users } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  weekly_points: number;
  level: number;
  rank_title: string;
  profile: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

const rankIcons = [
  { icon: Crown, className: 'text-amber-500', bgClass: 'bg-amber-100 dark:bg-amber-900/30' },
  { icon: Medal, className: 'text-slate-400', bgClass: 'bg-slate-100 dark:bg-slate-800' },
  { icon: Medal, className: 'text-amber-700', bgClass: 'bg-amber-50 dark:bg-amber-950/30' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const { leaderboardEnabled, isLoading: settingsLoading } = useAppSettings();
  const [period, setPeriod] = useState<'weekly' | 'all_time'>('all_time');

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    enabled: leaderboardEnabled,
    queryFn: async () => {
      const orderColumn = period === 'weekly' ? 'weekly_points' : 'total_points';
      
      const { data } = await supabase
        .from('user_points')
        .select('user_id, total_points, weekly_points, level, rank_title')
        .order(orderColumn, { ascending: false })
        .limit(50);

      if (!data) return [];

      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));
      
      return data.map(entry => ({
        ...entry,
        profile: profileMap.get(entry.user_id) || null
      })) as LeaderboardEntry[];
    },
  });

  const userRank = user ? leaderboard.findIndex(e => e.user_id === user.id) + 1 || null : null;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPoints = (entry: LeaderboardEntry) => {
    return period === 'weekly' ? entry.weekly_points : entry.total_points;
  };

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold">Leaderboard</h1>
                <p className="text-muted-foreground">Top contributors in the community</p>
              </div>
            </div>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <TabsList>
                <TabsTrigger value="all_time">All Time</TabsTrigger>
                <TabsTrigger value="weekly">This Week</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Current User Rank */}
          {user && userRank && userRank > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      #{userRank}
                    </div>
                    <span className="font-medium">Your current rank</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-semibold">
                      {leaderboard.find(e => e.user_id === user.id) 
                        ? getPoints(leaderboard.find(e => e.user_id === user.id)!)
                        : 0} pts
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Top 50 Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3">
                      <div className="h-6 w-6 animate-pulse rounded bg-muted" />
                      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                      <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Trophy className="mx-auto h-12 w-12 opacity-20" />
                  <p className="mt-4">No activity yet. Be the first to earn points!</p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  {leaderboard.map((entry, index) => {
                    const isCurrentUser = user?.id === entry.user_id;
                    const RankIcon = rankIcons[index]?.icon;
                    
                    return (
                      <motion.div
                        key={entry.user_id}
                        variants={itemVariants}
                        className={cn(
                          'flex items-center gap-4 rounded-lg p-3 transition-colors',
                          isCurrentUser && 'bg-primary/5 ring-1 ring-primary/20',
                          index === 0 && 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
                          index === 1 && 'bg-slate-50 dark:bg-slate-900/30',
                          index === 2 && 'bg-amber-50/50 dark:bg-amber-950/10'
                        )}
                      >
                        {/* Rank */}
                        <div className="flex w-8 items-center justify-center">
                          {RankIcon ? (
                            <div className={cn('rounded-full p-1.5', rankIcons[index].bgClass)}>
                              <RankIcon className={cn('h-5 w-5', rankIcons[index].className)} />
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={entry.profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(entry.profile?.full_name || entry.profile?.username)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name & Level */}
                        <div className="flex flex-1 items-center gap-3 overflow-hidden">
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              'truncate font-medium',
                              isCurrentUser && 'text-primary'
                            )}>
                              {entry.profile?.username || entry.profile?.full_name || 'Anonymous'}
                              {isCurrentUser && ' (You)'}
                            </p>
                            <p className="text-xs text-muted-foreground">{entry.rank_title}</p>
                          </div>
                          <LevelBadge level={entry.level} rankTitle={entry.rank_title} size="md" />
                        </div>

                        {/* Points */}
                        <div className="flex items-center gap-2 text-right">
                          <AnimatedCounter 
                            value={getPoints(entry)} 
                            className="text-lg font-bold" 
                          />
                          <span className="text-sm text-muted-foreground">pts</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}
