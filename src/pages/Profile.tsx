import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { PointsDisplay } from '@/components/gamification/PointsDisplay';
import { AchievementGrid } from '@/components/gamification/AchievementGrid';
import { useUserPoints } from '@/hooks/useUserPoints';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { ProfileEditSheet } from '@/components/profile/ProfileEditSheet';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { useQuery } from '@tanstack/react-query';

interface ProfileData {
  id: string;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  email: string | null;
  created_at: string;
  is_public?: boolean;
  show_on_leaderboard?: boolean;
  social_links: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

interface Stats {
  questions: number;
  answers: number;
  posts: number;
  requests: number;
}

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { points, achievements, userAchievements, isLoading: pointsLoading, getLevelProgress, getPointsToNextLevel } = useUserPoints();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: profileData, isLoading, isPending } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const [profileRes, questionsRes, answersRes, postsRes, requestsRes, emailRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, username, bio, avatar_url, cover_url, created_at, is_public, show_on_leaderboard, social_links').eq('id', user!.id).single(),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('answers').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.rpc('get_my_email'),
      ]);

      const pd = profileRes.data;
      if (!pd) return null;

      const socialLinks = pd.social_links as Record<string, string> | null;
      const profile: ProfileData = {
        id: pd.id,
        full_name: pd.full_name,
        username: pd.username,
        bio: pd.bio,
        avatar_url: pd.avatar_url,
        cover_url: pd.cover_url || null,
        email: (emailRes.data as string | null) ?? null,
        created_at: pd.created_at,
        is_public: (pd as any).is_public !== false,
        show_on_leaderboard: (pd as any).show_on_leaderboard !== false,
        social_links: socialLinks || {},
      };

      const stats: Stats = {
        questions: questionsRes.count || 0,
        answers: answersRes.count || 0,
        posts: postsRes.count || 0,
        requests: requestsRes.count || 0,
      };

      return { profile, stats };
    },
    enabled: !!user,
  });

  const profile = profileData?.profile || null;
  const stats = profileData?.stats || { questions: 0, answers: 0, posts: 0, requests: 0 };

  const handleProfileUpdate = (updates: Partial<ProfileData>) => {
    // This is for optimistic avatar/cover updates - won't affect cached query
  };

  const handleEditSave = (updates: {
    full_name: string;
    username: string;
    bio: string;
    social_links: ProfileData['social_links'];
  }) => {
    // Profile edit sheet handles its own save - page will get fresh data from cache invalidation
  };

  if (isLoading || authLoading || (isPending && !!user)) {
    return (
      <MainLayout>
        <div className="min-h-screen pb-24">
          <div className="h-32 bg-muted" />
          <div className="container max-w-4xl px-4 sm:px-6 mt-6 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-40 rounded-lg" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen pb-24">
        <ProfileHeader
          profile={profile}
          level={points?.level || 1}
          onEditClick={() => setIsEditOpen(true)}
          onProfileUpdate={handleProfileUpdate}
          isOwnProfile={true}
        />

        <div className="container max-w-4xl px-4 sm:px-6 mt-6 space-y-6">
          {Object.keys(profile.social_links || {}).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex justify-center sm:justify-start"
            >
              <SocialLinks links={profile.social_links} />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ProfileStats stats={stats} />
          </motion.div>

          {points && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <PointsDisplay
                totalPoints={points.total_points}
                weeklyPoints={points.weekly_points}
                level={points.level}
                rankTitle={points.rank_title}
                streakDays={points.streak_days}
                levelProgress={getLevelProgress()}
                pointsToNextLevel={getPointsToNextLevel()}
              />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="pt-6">
                <AchievementGrid
                  achievements={achievements}
                  userAchievements={userAchievements}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4"
          >
            <Calendar className="h-4 w-4" />
            <span>
              Member since {profile.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'Unknown'}
            </span>
          </motion.div>
        </div>

        <ProfileEditSheet
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          profile={profile}
          onSave={handleEditSave}
        />
      </div>
    </MainLayout>
  );
}
