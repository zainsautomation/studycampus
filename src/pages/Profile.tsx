import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, AtSign, FileText, Camera, Save, Loader2, HelpCircle, MessageSquare, GitPullRequest } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { PointsDisplay } from '@/components/gamification/PointsDisplay';
import { AchievementGrid } from '@/components/gamification/AchievementGrid';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { useUserPoints } from '@/hooks/useUserPoints';

interface ProfileData {
  full_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
}

interface Stats {
  questions: number;
  answers: number;
  posts: number;
  requests: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { points, achievements, userAchievements, isLoading: pointsLoading, getLevelProgress, getPointsToNextLevel } = useUserPoints();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ questions: 0, answers: 0, posts: 0, requests: 0 });
  
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: ''
  });

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
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          username: profileData.username || '',
          bio: profileData.bio || ''
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image smaller than 2MB', variant: 'destructive' });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('notes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('notes').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      toast({ title: 'Avatar updated successfully' });
    } catch (error: any) {
      toast({ title: 'Error uploading avatar', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const validateUsername = (username: string): boolean => {
    if (!username) return true; // Empty is allowed
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate username format
    const usernameToSave = formData.username.toLowerCase().trim();
    if (usernameToSave && !validateUsername(usernameToSave)) {
      toast({ 
        title: 'Invalid username', 
        description: 'Username must be 3-20 characters, lowercase letters, numbers and underscores only', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim() || null,
          username: usernameToSave || null,
          bio: formData.bio.trim() || null
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Username taken', description: 'This username is already in use', variant: 'destructive' });
        } else {
          throw error;
        }
      } else {
        toast({ title: 'Profile updated successfully' });
        setProfile(prev => prev ? {
          ...prev,
          full_name: formData.full_name.trim() || null,
          username: usernameToSave || null,
          bio: formData.bio.trim() || null
        } : null);
      }
    } catch (error: any) {
      toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 md:py-8 max-w-5xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-bold">My Profile</h1>
                {points && (
                  <LevelBadge level={points.level} rankTitle={points.rank_title} size="lg" showRank />
                )}
              </div>
              <p className="text-muted-foreground">Manage your account settings</p>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={profile?.avatar_url || ''} />
                        <AvatarFallback className="text-xl bg-primary/10 text-primary">
                          {getInitials(profile?.full_name || null, profile?.email || null)}
                        </AvatarFallback>
                      </Avatar>
                      <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors">
                        {isUploadingAvatar ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Camera className="w-3.5 h-3.5" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          disabled={isUploadingAvatar}
                        />
                      </label>
                    </div>
                    <div>
                      <p className="font-medium">{profile?.full_name || 'No name set'}</p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.username ? `@${profile.username}` : 'No username set'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        value={profile?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username" className="flex items-center gap-2">
                        <AtSign className="w-4 h-4" />
                        Username
                      </Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                        placeholder="Choose a unique username"
                      />
                      <p className="text-xs text-muted-foreground">
                        3-20 characters, lowercase letters, numbers and underscores only
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell us a bit about yourself..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats Sidebar */}
            <motion.div variants={itemVariants} className="space-y-4">
              {/* Points Display */}
              {points && (
                <PointsDisplay
                  totalPoints={points.total_points}
                  weeklyPoints={points.weekly_points}
                  level={points.level}
                  rankTitle={points.rank_title}
                  streakDays={points.streak_days}
                  levelProgress={getLevelProgress()}
                  pointsToNextLevel={getPointsToNextLevel()}
                />
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Activity Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Questions</span>
                    </div>
                    <span className="font-semibold">{stats.questions}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Answers</span>
                    </div>
                    <span className="font-semibold">{stats.answers}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Posts</span>
                    </div>
                    <span className="font-semibold">{stats.posts}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <GitPullRequest className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">Requests</span>
                    </div>
                    <span className="font-semibold">{stats.requests}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Member since</p>
                    <p className="font-medium">
                      {profile?.created_at ? format(new Date(profile.created_at), 'MMMM dd, yyyy') : 'Unknown'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Achievements Section */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="pt-6">
                <AchievementGrid
                  achievements={achievements}
                  userAchievements={userAchievements}
                />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
