import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { SocialLinks } from "@/components/profile/SocialLinks";
import { PointsDisplay } from "@/components/gamification/PointsDisplay";
import { AchievementGrid } from "@/components/gamification/AchievementGrid";
import { useUserPoints } from "@/hooks/useUserPoints";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ProfileData {
  id: string;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
  social_links?: {
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

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ questions: 0, answers: 0, posts: 0, requests: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  const { points, achievements, userAchievements, getLevelProgress, getPointsToNextLevel } = useUserPoints(profile?.id);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      setIsLoading(true);
      try {
        // Try to find by username first, then by id
        let query = supabase.from('profiles').select('*');
        
        // Check if it looks like a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        
        if (isUuid) {
          query = query.eq('id', userId);
        } else {
          query = query.eq('username', userId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          setIsLoading(false);
          return;
        }

        if (!data) {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        // Check if profile is public
        if (data.is_public === false) {
          setIsPrivate(true);
          setProfile({
            id: data.id,
            full_name: data.full_name,
            username: data.username,
            bio: null,
            avatar_url: data.avatar_url,
            cover_url: null,
            is_public: false,
            created_at: data.created_at,
          });
          setIsLoading(false);
          return;
        }

        setProfile({
          id: data.id,
          full_name: data.full_name,
          username: data.username,
          bio: data.bio,
          avatar_url: data.avatar_url,
          cover_url: data.cover_url,
          is_public: data.is_public ?? true,
          created_at: data.created_at,
          social_links: data.social_links as ProfileData['social_links'],
        });

        // Fetch stats
        const [questionsRes, answersRes, postsRes, requestsRes] = await Promise.all([
          supabase.from('questions').select('id', { count: 'exact', head: true }).eq('user_id', data.id),
          supabase.from('answers').select('id', { count: 'exact', head: true }).eq('user_id', data.id),
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', data.id),
          supabase.from('requests').select('id', { count: 'exact', head: true }).eq('user_id', data.id).eq('is_public', true),
        ]);

        setStats({
          questions: questionsRes.count || 0,
          answers: answersRes.count || 0,
          posts: postsRes.count || 0,
          requests: requestsRes.count || 0,
        });
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-6">This user doesn't exist or their profile has been removed.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (isPrivate) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5" />
            <CardContent className="pt-0">
              <div className="flex flex-col items-center -mt-12 text-center">
                <div className="relative mb-4">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User'}
                      className="h-24 w-24 rounded-full border-4 border-background object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full border-4 border-background bg-muted flex items-center justify-center">
                      <span className="text-2xl font-bold text-muted-foreground">
                        {profile.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                </div>
                
                <h1 className="text-xl font-bold">{profile.full_name || 'User'}</h1>
                {profile.username && (
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                )}
                
                <div className="mt-6 p-6 bg-muted/30 rounded-lg w-full max-w-sm">
                  <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-medium mb-1">This Profile is Private</h3>
                  <p className="text-sm text-muted-foreground">
                    This user has chosen to keep their profile private.
                  </p>
                </div>

                <Button variant="ghost" className="mt-6" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Profile Header - view only mode */}
        <Card className="overflow-hidden">
          {/* Cover Photo */}
          <div 
            className="h-32 sm:h-40 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent relative"
            style={profile.cover_url ? { 
              backgroundImage: `url(${profile.cover_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : undefined}
          />

          <CardContent className="pt-0">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-16">
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-background object-cover bg-background"
                  />
                ) : (
                  <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-background bg-muted flex items-center justify-center">
                    <span className="text-3xl font-bold text-muted-foreground">
                      {profile.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 pb-2">
                <h1 className="text-2xl font-bold">{profile.full_name || 'Anonymous'}</h1>
                {profile.username && (
                  <p className="text-muted-foreground">@{profile.username}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-sm text-muted-foreground">{profile.bio}</p>
            )}

            {/* Social Links */}
            {profile.social_links && Object.keys(profile.social_links).length > 0 && (
              <div className="mt-4">
                <SocialLinks links={profile.social_links} />
              </div>
            )}

            {/* Member since */}
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Member since {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <ProfileStats stats={stats} />

        {/* Gamification */}
        {points && (
          <PointsDisplay
            totalPoints={points.total_points || 0}
            weeklyPoints={points.weekly_points || 0}
            level={points.level || 1}
            rankTitle={points.rank_title || 'Freshman'}
            streakDays={points.streak_days || 0}
            levelProgress={getLevelProgress()}
            pointsToNextLevel={getPointsToNextLevel()}
          />
        )}

        {/* Achievements */}
        {achievements && achievements.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Achievements</h3>
              <AchievementGrid achievements={achievements} userAchievements={userAchievements} />
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}