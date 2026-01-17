import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { PointsDisplay } from '@/components/gamification/PointsDisplay';
import { AchievementGrid } from '@/components/gamification/AchievementGrid';
import { useUserPoints } from '@/hooks/useUserPoints';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { ProfileEditSheet } from '@/components/profile/ProfileEditSheet';
import { SocialLinks } from '@/components/profile/SocialLinks';

interface ProfileData {
  id: string;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  email: string | null;
  created_at: string;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const { points, achievements, userAchievements, isLoading: pointsLoading, getLevelProgress, getPointsToNextLevel } = useUserPoints();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ questions: 0, answers: 0, posts: 0, requests: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        // Handle social_links safely - it could be null, undefined, or an object
        const socialLinks = profileData.social_links as Record<string, string> | null;
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          username: profileData.username,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url,
          cover_url: profileData.cover_url || null,
          email: profileData.email,
          created_at: profileData.created_at,
          social_links: socialLinks || {},
        });
      }

      // Fetch stats in parallel
      const [questionsRes, answersRes, postsRes, requestsRes] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('answers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      ]);

      setStats({
        questions: questionsRes.count || 0,
        answers: answersRes.count || 0,
        posts: postsRes.count || 0,
        requests: requestsRes.count || 0
      });

      setIsLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleProfileUpdate = (updates: Partial<ProfileData>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleEditSave = (updates: {
    full_name: string;
    username: string;
    bio: string;
    social_links: ProfileData['social_links'];
  }) => {
    setProfile(prev => prev ? {
      ...prev,
      full_name: updates.full_name || null,
      username: updates.username || null,
      bio: updates.bio || null,
      social_links: updates.social_links,
    } : null);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
          />
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
        {/* Profile Header with Cover & Avatar */}
        <ProfileHeader
          profile={profile}
          level={points?.level || 1}
          onEditClick={() => setIsEditOpen(true)}
          onProfileUpdate={handleProfileUpdate}
          isOwnProfile={true}
        />

        {/* Content */}
        <div className="container max-w-4xl px-4 sm:px-6 mt-6 space-y-6">
          {/* Social Links */}
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

          {/* Activity Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ProfileStats stats={stats} />
          </motion.div>

          {/* Points & Gamification */}
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

          {/* Achievements */}
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

          {/* Member Since */}
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

        {/* Edit Profile Sheet */}
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
