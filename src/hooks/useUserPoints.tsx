import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  weekly_points: number;
  level: number;
  rank_title: string;
  streak_days: number;
  last_activity_date: string | null;
}

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

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  level: number;
  rank_title: string;
  profile: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export function useUserPoints(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!targetUserId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch user points
        const { data: pointsData } = await supabase
          .from('user_points')
          .select('*')
          .eq('user_id', targetUserId)
          .single();
        
        setPoints(pointsData);

        // Fetch all achievements
        const { data: achievementsData } = await supabase
          .from('achievements')
          .select('*')
          .order('category', { ascending: true });
        
        setAchievements(achievementsData || []);

        // Fetch user's earned achievements
        const { data: userAchievementsData } = await supabase
          .from('user_achievements')
          .select(`
            id,
            achievement_id,
            earned_at,
            achievement:achievements(*)
          `)
          .eq('user_id', targetUserId);
        
        setUserAchievements(userAchievementsData as unknown as UserAchievement[] || []);

      } catch (error) {
        console.error('Error fetching user points:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [targetUserId]);

  const fetchLeaderboard = async (type: 'weekly' | 'all_time' = 'all_time', limit = 10) => {
    const orderColumn = type === 'weekly' ? 'weekly_points' : 'total_points';
    
    const { data } = await supabase
      .from('user_points')
      .select(`
        user_id,
        total_points,
        weekly_points,
        level,
        rank_title
      `)
      .order(orderColumn, { ascending: false })
      .limit(limit);

    if (data) {
      // Fetch profiles for leaderboard users
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));
      
      const leaderboardData = data.map(entry => ({
        ...entry,
        total_points: type === 'weekly' ? entry.weekly_points : entry.total_points,
        profile: profileMap.get(entry.user_id) || null
      }));
      
      setLeaderboard(leaderboardData);
    }
    
    return data;
  };

  const getPointsToNextLevel = () => {
    if (!points) return 0;
    const currentLevelPoints = (points.level - 1) ** 2 * 100;
    const nextLevelPoints = points.level ** 2 * 100;
    return nextLevelPoints - points.total_points;
  };

  const getLevelProgress = () => {
    if (!points) return 0;
    const currentLevelPoints = (points.level - 1) ** 2 * 100;
    const nextLevelPoints = points.level ** 2 * 100;
    const levelRange = nextLevelPoints - currentLevelPoints;
    const progressInLevel = points.total_points - currentLevelPoints;
    return Math.min(100, (progressInLevel / levelRange) * 100);
  };

  const isAchievementEarned = (achievementKey: string) => {
    return userAchievements.some(ua => ua.achievement?.key === achievementKey);
  };

  return {
    points,
    achievements,
    userAchievements,
    leaderboard,
    isLoading,
    fetchLeaderboard,
    getPointsToNextLevel,
    getLevelProgress,
    isAchievementEarned
  };
}
