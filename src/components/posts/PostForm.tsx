import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2, Send, EyeOff, ImagePlus, X, MessageSquare, Users, HelpCircle, Smile } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useToast } from "@/hooks/use-toast";
import { useGoogleDriveContext } from "@/contexts/GoogleDriveContext";

interface PostFormProps {
  onSubmit: (content: string, isAnonymous: boolean, category?: string, imageUrl?: string) => void;
  isSubmitting: boolean;
  anonymousEnabled?: boolean;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const categoryOptions = [
  { value: 'discussion', label: 'Discussion', icon: <MessageSquare className="h-4 w-4" />, color: '#3b82f6' },
  { value: 'study_group', label: 'Study Group', icon: <Users className="h-4 w-4" />, color: '#22c55e' },
  { value: 'help', label: 'Help', icon: <HelpCircle className="h-4 w-4" />, color: '#f97316' },
  { value: 'meme', label: 'Meme', icon: <Smile className="h-4 w-4" />, color: '#d946ef' },
];

export function PostForm({ onSubmit, isSubmitting, anonymousEnabled = false }: PostFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { postImagesStorageType, postImagesGoogleDriveFolderId } = useAppSettings();
  const { isSignedIn, uploadFile } = useGoogleDriveContext();
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState("discussion");
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please select a JPEG, PNG, GIF, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast({ title: "File too large", description: "Please select an image under 5MB.", variant: "destructive" });
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    if (postImagesStorageType === 'google_drive') {
      if (!isSignedIn) {
        toast({ title: "Google Drive not connected", description: "Please ask an admin to connect Google Drive.", variant: "destructive" });
        return null;
      }
      try {
        const result = await uploadFile({ file, folderId: postImagesGoogleDriveFolderId || undefined });
        if (result?.webViewLink) {
          const fileId = result.webViewLink.match(/\/d\/(.+?)\//)?.[1];
          if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
          return result.webViewLink;
        }
        return null;
      } catch (error) {
        console.error('Google Drive upload error:', error);
        throw error;
      }
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('post-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from('post-images').getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (!plainText && !selectedImage) return;
    let imageUrl: string | undefined;
    if (selectedImage) {
      setIsUploadingImage(true);
      try {
        imageUrl = (await uploadImage(selectedImage)) ?? undefined;
      } catch {
        toast({ title: "Failed to upload image", description: "Please try again.", variant: "destructive" });
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }
    onSubmit(content, isAnonymous, category, imageUrl);
    setContent("");
    setIsAnonymous(false);
    setIsExpanded(false);
    removeImage();
  };

  const plainText = content.replace(/<[^>]*>/g, '').trim();
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const isProcessing = isSubmitting || isUploadingImage;
  const canSubmit = (plainText || selectedImage) && !isProcessing;
  const selectedCat = categoryOptions.find(c => c.value === category) || categoryOptions[0];

  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit}>
          {/* Collapsed / Header */}
          <div
            className={`flex items-center gap-3 p-3 ${!isExpanded ? 'cursor-text' : ''}`}
            onClick={() => !isExpanded && setIsExpanded(true)}
          >
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
            </Avatar>
            
            {!isExpanded ? (
              <div className="flex-1 px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors">
                What's on your mind?
              </div>
            ) : (
              <div className="flex-1 text-sm font-medium">Create a post</div>
            )}
          </div>

          {/* Expanded */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 space-y-3">
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Share something with your classmates..."
                  />

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative rounded-xl overflow-hidden bg-muted/30" style={{ aspectRatio: '16/10' }}>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground shadow-sm hover:bg-background transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  
                  {/* Toolbar */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES.join(',')}
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>

                    {/* Category dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <span style={{ color: selectedCat.color }}>{selectedCat.icon}</span>
                          <span className="hidden sm:inline text-xs">{selectedCat.label}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        {categoryOptions.map((cat) => (
                          <DropdownMenuItem
                            key={cat.value}
                            onClick={() => setCategory(cat.value)}
                            className="gap-2"
                          >
                            <span style={{ color: cat.color }}>{cat.icon}</span>
                            {cat.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {anonymousEnabled && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <Checkbox
                          id="anonymous"
                          checked={isAnonymous}
                          onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                          className="h-3.5 w-3.5"
                        />
                        <Label htmlFor="anonymous" className="text-[11px] font-normal flex items-center gap-1 cursor-pointer text-muted-foreground">
                          <EyeOff className="h-3 w-3" />
                          <span className="hidden sm:inline">Anon</span>
                        </Label>
                      </div>
                    )}

                    <div className="flex-1" />

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-2"
                      onClick={() => { setIsExpanded(false); setContent(""); removeImage(); }}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="h-8 gap-1 px-3" disabled={!canSubmit}>
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">Post</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </CardContent>
    </Card>
  );
}
