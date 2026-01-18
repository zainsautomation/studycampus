import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2, Send, EyeOff, ImagePlus, X } from "lucide-react";
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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function PostForm({ onSubmit, isSubmitting, anonymousEnabled = false }: PostFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { postImagesStorageType, postImagesGoogleDriveFolderId } = useAppSettings();
  const { isSignedIn, uploadFile, signIn } = useGoogleDriveContext();
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

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, GIF, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    // Check if Google Drive is configured and use it
    if (postImagesStorageType === 'google_drive') {
      if (!isSignedIn) {
        toast({
          title: "Google Drive not connected",
          description: "Please ask an admin to connect Google Drive in settings.",
          variant: "destructive",
        });
        return null;
      }

      try {
        const result = await uploadFile({
          file,
          folderId: postImagesGoogleDriveFolderId || undefined,
        });
        
        if (result?.webViewLink) {
          // Convert view link to direct image link
          const fileId = result.webViewLink.match(/\/d\/(.+?)\//)?.[1];
          if (fileId) {
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
          }
          return result.webViewLink;
        }
        return null;
      } catch (error) {
        console.error('Google Drive upload error:', error);
        throw error;
      }
    }
    
    // Default: Upload to Supabase storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(data.path);

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
      } catch (error) {
        toast({
          title: "Failed to upload image",
          description: "Please try again.",
          variant: "destructive",
        });
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

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit}>
          {/* Compact header - always visible */}
          <div 
            className={`flex items-center gap-3 p-4 ${!isExpanded ? 'cursor-text' : ''}`}
            onClick={() => !isExpanded && setIsExpanded(true)}
          >
            <Avatar className="h-10 w-10 ring-2 ring-background shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {!isExpanded ? (
              <div className="flex-1 px-4 py-2.5 rounded-full bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors">
                What's on your mind?
              </div>
            ) : (
              <div className="flex-1 text-sm font-medium">
                Create a post
              </div>
            )}
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Share something with your classmates..."
                  />

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-48 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      {/* Image upload button */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES.join(',')}
                        onChange={handleImageSelect}
                        className="hidden"
                        id="image-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                      >
                        <ImagePlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Image</span>
                      </Button>

                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="w-[130px] h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discussion">Discussion</SelectItem>
                          <SelectItem value="study_group">Study Group</SelectItem>
                          <SelectItem value="help">Help</SelectItem>
                          <SelectItem value="meme">Meme</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {anonymousEnabled && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="anonymous"
                            checked={isAnonymous}
                            onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                          />
                          <Label htmlFor="anonymous" className="text-xs font-normal flex items-center gap-1 cursor-pointer">
                            <EyeOff className="h-3 w-3" />
                            Anonymous
                          </Label>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setIsExpanded(false);
                          setContent("");
                          removeImage();
                        }}
                        disabled={isProcessing}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={!canSubmit}>
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1.5" />
                            Post
                          </>
                        )}
                      </Button>
                    </div>
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