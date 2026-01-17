import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AchievementCard } from './AchievementCard';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points_reward: number;
  criteria_type: string;
  criteria_value: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  achievement: Achievement;
}

interface AchievementGridProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  compact?: boolean;
  className?: string;
}

export function AchievementGrid({
  achievements,
  userAchievements,
  compact = false,
  className,
}: AchievementGridProps) {
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  const earnedIds = new Set(userAchievements.map(ua => ua.achievement_id));
  
  const getEarnedAt = (achievementId: string) => {
    const ua = userAchievements.find(u => u.achievement_id === achievementId);
    return ua?.earned_at || null;
  };

  const filteredAchievements = achievements.filter(achievement => {
    const isEarned = earnedIds.has(achievement.id);
    if (filter === 'earned') return isEarned;
    if (filter === 'locked') return !isEarned;
    return true;
  });

  const earnedCount = userAchievements.length;
  const totalCount = achievements.length;

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <Trophy className="h-4 w-4 text-amber-500" />
            Achievements
          </h3>
          <span className="text-sm text-muted-foreground">
            {earnedCount}/{totalCount}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {achievements.slice(0, 8).map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <AchievementCard
                name={achievement.name}
                description={achievement.description}
                icon={achievement.icon}
                category={achievement.category}
                pointsReward={achievement.points_reward}
                earnedAt={getEarnedAt(achievement.id)}
                compact
              />
            </motion.div>
          ))}
          {achievements.length > 8 && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              +{achievements.length - 8}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-amber-500" />
            Achievements
          </h3>
          <p className="text-sm text-muted-foreground">
            {earnedCount} of {totalCount} unlocked
          </p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="earned">Earned</TabsTrigger>
            <TabsTrigger value="locked">Locked</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <AchievementCard
              name={achievement.name}
              description={achievement.description}
              icon={achievement.icon}
              category={achievement.category}
              pointsReward={achievement.points_reward}
              earnedAt={getEarnedAt(achievement.id)}
            />
          </motion.div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          {filter === 'earned' 
            ? "You haven't earned any achievements yet. Keep participating!"
            : filter === 'locked'
            ? "You've unlocked all achievements! Amazing!"
            : "No achievements available."}
        </div>
      )}
    </div>
  );
}
