import { useState, useEffect } from "react";
import { Loader2, Github, Twitter, Linkedin, Globe, Eye, EyeOff, User, AtSign, FileText, Link2, AlertCircle, CheckCircle2 } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";

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

const URL_PATTERNS: Record<string, { pattern: RegExp; example: string }> = {
  github: {
    pattern: /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/,
    example: "https://github.com/username",
  },
  twitter: {
    pattern: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/,
    example: "https://twitter.com/username",
  },
  linkedin: {
    pattern: /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/,
    example: "https://linkedin.com/in/username",
  },
  website: {
    pattern: /^https?:\/\/.+\..+$/,
    example: "https://yourwebsite.com",
  },
};

function validateUrl(key: string, value: string): string | null {
  if (!value.trim()) return null; // empty is valid
  const rule = URL_PATTERNS[key];
  if (!rule) return null;
  if (!rule.pattern.test(value.trim())) {
    return `Invalid URL. Example: ${rule.example}`;
  }
  return null;
}

export function ProfileEditSheet({
  open,
  onOpenChange,
  profile,
}: ProfileEditSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [errors, setErrors] = useState<Record<string, string | null>>({});

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
    setErrors({});
  }, [profile, open]);

  const validateUsername = (username: string) => {
    if (!username) return true;
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  };

  const handleSocialChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    const err = validateUrl(key, value);
    setErrors((prev) => ({ ...prev, [key]: err }));
  };

  const handleSave = async () => {
    // Validate username
    if (!validateUsername(formData.username)) {
      toast({
        title: "Invalid username",
        description: "Username must be 3-20 characters, letters, numbers, and underscores only",
        variant: "destructive",
      });
      return;
    }

    // Validate full name
    if (!formData.full_name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    // Validate all social links
    const socialKeys = ["github", "twitter", "linkedin", "website"] as const;
    const newErrors: Record<string, string | null> = {};
    let hasErrors = false;
    for (const key of socialKeys) {
      const err = validateUrl(key, formData[key]);
      newErrors[key] = err;
      if (err) hasErrors = true;
    }
    setErrors(newErrors);

    if (hasErrors) {
      toast({
        title: "Invalid social links",
        description: "Please fix the highlighted URLs before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const socialLinks: Record<string, string> = {};
      for (const key of socialKeys) {
        const val = formData[key].trim();
        if (val) socialLinks[key] = val;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name.trim(),
          username: formData.username.trim() || null,
          bio: formData.bio.trim() || null,
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

      queryClient.invalidateQueries({ queryKey: ["profile"] });
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

  const socialFields = [
    { key: "github", icon: Github, placeholder: "https://github.com/username", label: "GitHub" },
    { key: "twitter", icon: Twitter, placeholder: "https://twitter.com/username", label: "X / Twitter" },
    { key: "linkedin", icon: Linkedin, placeholder: "https://linkedin.com/in/username", label: "LinkedIn" },
    { key: "website", icon: Globe, placeholder: "https://yourwebsite.com", label: "Website" },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-hidden">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg font-display">Edit Profile</SheetTitle>
          <SheetDescription>
            Update your profile information
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5 overflow-y-auto max-h-[calc(85vh-180px)] pr-1 pb-4">
          {/* Profile Visibility */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${formData.is_public ? 'bg-primary/10' : 'bg-muted/50'} transition-colors`}>
                  {formData.is_public ? (
                    <Eye className="h-4 w-4 text-primary" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Label htmlFor="is_public" className="text-sm font-medium cursor-pointer">
                    Public Profile
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formData.is_public
                      ? "Others can view your profile"
                      : "Your profile is hidden"}
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

          {/* Basic Info Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Basic Information</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-xs font-medium">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Your full name"
                maxLength={50}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
                  }
                  placeholder="username"
                  className="pl-7 h-10"
                  maxLength={20}
                />
                {formData.username && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validateUsername(formData.username) ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                3-20 characters, letters, numbers, underscores only
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-xs font-medium">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={200}
                className="resize-none"
              />
              <p className={`text-[11px] text-right ${formData.bio.length >= 180 ? 'text-warning' : 'text-muted-foreground'}`}>
                {formData.bio.length}/200
              </p>
            </div>
          </div>

          {/* Social Links Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Link2 className="h-4 w-4" />
              <span>Social Links</span>
            </div>

            <div className="space-y-3">
              {socialFields.map(({ key, icon: Icon, placeholder, label }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                      errors[key] 
                        ? 'bg-destructive/10' 
                        : formData[key as keyof typeof formData] 
                          ? 'bg-primary/10' 
                          : 'bg-muted/50'
                    }`}>
                      <Icon className={`h-4 w-4 transition-colors ${
                        errors[key] 
                          ? 'text-destructive' 
                          : formData[key as keyof typeof formData] 
                            ? 'text-primary' 
                            : 'text-muted-foreground'
                      }`} />
                    </div>
                    <Input
                      value={formData[key as keyof typeof formData] as string}
                      onChange={(e) => handleSocialChange(key, e.target.value)}
                      placeholder={placeholder}
                      className={`h-10 ${errors[key] ? 'border-destructive/50 focus-visible:ring-destructive/30' : ''}`}
                      maxLength={200}
                    />
                  </div>
                  {errors[key] && (
                    <p className="text-[11px] text-destructive ml-11 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors[key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-sm border-t border-border/60">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-11 font-medium"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}