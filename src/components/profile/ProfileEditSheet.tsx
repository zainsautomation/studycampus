import { useState, useEffect } from "react";
import { Loader2, Github, Twitter, Linkedin, Globe, Eye, EyeOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    bio: string | null;
    is_public?: boolean;
    social_links?: {
      github?: string;
      twitter?: string;
      linkedin?: string;
      website?: string;
    };
  };
  onSave: (updates: {
    full_name: string;
    username: string;
    bio: string;
    is_public: boolean;
    social_links: {
      github?: string;
      twitter?: string;
      linkedin?: string;
      website?: string;
    };
  }) => void;
}

export function ProfileEditSheet({
  open,
  onOpenChange,
  profile,
}: ProfileEditSheetProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || "",
    username: profile.username || "",
    bio: profile.bio || "",
    is_public: profile.is_public !== false,
    github: profile.social_links?.github || "",
    twitter: profile.social_links?.twitter || "",
    linkedin: profile.social_links?.linkedin || "",
    website: profile.social_links?.website || "",
  });

  // Update form data when profile changes
  useEffect(() => {
    setFormData({
      full_name: profile.full_name || "",
      username: profile.username || "",
      bio: profile.bio || "",
      is_public: profile.is_public !== false,
      github: profile.social_links?.github || "",
      twitter: profile.social_links?.twitter || "",
      linkedin: profile.social_links?.linkedin || "",
      website: profile.social_links?.website || "",
    });
  }, [profile]);

  const validateUsername = (username: string) => {
    if (!username) return true;
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleSave = async () => {
    if (!validateUsername(formData.username)) {
      toast({
        title: "Invalid username",
        description: "Username must be 3-20 characters, letters, numbers, and underscores only",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const socialLinks = {
        github: formData.github || undefined,
        twitter: formData.twitter || undefined,
        linkedin: formData.linkedin || undefined,
        website: formData.website || undefined,
      };

      // Clean up undefined values
      Object.keys(socialLinks).forEach((key) => {
        if (!socialLinks[key as keyof typeof socialLinks]) {
          delete socialLinks[key as keyof typeof socialLinks];
        }
      });

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          username: formData.username || null,
          bio: formData.bio || null,
          is_public: formData.is_public,
          social_links: socialLinks,
        })
        .eq("id", profile.id);

      if (error) {
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          throw new Error("This username is already taken");
        }
        throw error;
      }

      toast({ title: "Profile updated successfully" });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>
            Update your profile information
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(85vh-180px)] pr-2">
          {/* Profile Visibility */}
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {formData.is_public ? (
                  <Eye className="h-5 w-5 text-primary" />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="is_public" className="text-sm font-medium cursor-pointer">
                    Public Profile
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {formData.is_public 
                      ? "Others can view your profile" 
                      : "Your profile is private"}
                  </p>
                </div>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_public: checked })
                }
              />
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  @
                </span>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="username"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                3-20 characters, letters, numbers, underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.bio.length}/200
              </p>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Social Links</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  value={formData.github}
                  onChange={(e) =>
                    setFormData({ ...formData, github: e.target.value })
                  }
                  placeholder="https://github.com/username"
                />
              </div>

              <div className="flex items-center gap-3">
                <Twitter className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  value={formData.twitter}
                  onChange={(e) =>
                    setFormData({ ...formData, twitter: e.target.value })
                  }
                  placeholder="https://twitter.com/username"
                />
              </div>

              <div className="flex items-center gap-3">
                <Linkedin className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  value={formData.linkedin}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedin: e.target.value })
                  }
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}