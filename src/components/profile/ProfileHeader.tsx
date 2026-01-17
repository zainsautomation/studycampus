import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Share2, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileHeaderProps {
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    email: string | null;
    created_at: string;
  };
  level: number;
  onEditClick: () => void;
  onProfileUpdate: (updates: Partial<ProfileHeaderProps["profile"]>) => void;
  isOwnProfile?: boolean;
}

export function ProfileHeader({
  profile,
  level,
  onEditClick,
  onProfileUpdate,
  isOwnProfile = true,
}: ProfileHeaderProps) {
  const { toast } = useToast();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    if (profile.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return profile.email?.charAt(0).toUpperCase() || "U";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split("/").slice(-2).join("/");
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      onProfileUpdate({ avatar_url: publicUrl });
      toast({ title: "Avatar updated successfully" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingCover(true);
    try {
      // Delete old cover if exists
      if (profile.cover_url) {
        const oldPath = profile.cover_url.split("/").slice(-2).join("/");
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/cover_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      onProfileUpdate({ cover_url: publicUrl });
      toast({ title: "Cover photo updated successfully" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${profile.username || profile.id}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({ title: "Profile link copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  return (
    <div className="relative">
      {/* Cover Photo */}
      <div className="relative h-44 sm:h-56 md:h-64 w-full overflow-hidden rounded-b-3xl">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-secondary/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        {isOwnProfile && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-4 right-4 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/70"
              onClick={() => coverInputRef.current?.click()}
              disabled={isUploadingCover}
            >
              {isUploadingCover ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>
          </>
        )}
      </div>

      {/* Avatar & Info */}
      <div className="px-4 sm:px-6 -mt-16 relative z-10">
        <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
          {/* Avatar */}
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative"
            >
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background shadow-xl">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || "User"} />
                <AvatarFallback className="text-2xl sm:text-3xl font-semibold bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              {isOwnProfile && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-1 right-1 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </div>

          {/* Name & Username */}
          <div className="mt-3 sm:mt-0 sm:mb-2 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold">
                {profile.full_name || "Anonymous User"}
              </h1>
              <LevelBadge level={level} size="sm" />
            </div>
            {profile.username && (
              <p className="text-muted-foreground text-sm">@{profile.username}</p>
            )}
          </div>

          {/* Action Buttons - Desktop */}
          <div className="hidden sm:flex gap-2">
            {isOwnProfile && (
              <Button onClick={onEditClick} variant="outline" size="sm">
                Edit Profile
              </Button>
            )}
            <Button onClick={handleShare} variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 text-sm text-muted-foreground max-w-lg text-center sm:text-left">
            {profile.bio}
          </p>
        )}

        {/* Action Buttons - Mobile */}
        <div className="flex sm:hidden gap-2 mt-4 justify-center">
          {isOwnProfile && (
            <Button onClick={onEditClick} variant="outline" size="sm" className="flex-1 max-w-[200px]">
              Edit Profile
            </Button>
          )}
          <Button onClick={handleShare} variant="ghost" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
