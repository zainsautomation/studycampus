import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Pin, Trash2, MoreVertical, EyeOff, Clock, ImageOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryBadge } from "./CategoryBadge";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { ImageViewerDialog } from "@/components/ui/ImageViewerDialog";
import { PostCommentSection } from "./PostCommentSection";
import { useState, useMemo } from "react";
import { useLongPress } from "@/hooks/useLongPress";
import { useNavigate } from "react-router-dom";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    likes_count: number | null;
    is_pinned: boolean | null;
    is_anonymous?: boolean | null;
    category?: string | null;
    created_at: string;
    user_id: string;
    comment_count?: number;
    profiles?: {
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
  };
  hasLiked: boolean;
  currentUserId: string | undefined;
  isAdmin: boolean;
  onLike: () => void;
  onPin?: () => void;
  onDelete: () => void;
}

// Helper to transform Google Drive URLs to thumbnail format for reliable display
function getDisplayImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com')) {
    let fileId: string | null = null;
    
    // Format: https://drive.google.com/uc?export=view&id=FILE_ID
    const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (ucMatch) {
      fileId = ucMatch[1];
    }
    
    // Format: https://drive.google.com/file/d/FILE_ID/view
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    }
    
    // Already thumbnail format - return as is
    if (url.includes('/thumbnail?id=')) {
      return url;
    }
    
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  }
  
  return url;
}

export function PostCard({
  post,
  hasLiked,
  currentUserId,
  isAdmin,
  onLike,
  onPin,
  onDelete,
}: PostCardProps) {
  const navigate = useNavigate();
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const canDelete = isAdmin || currentUserId === post.user_id;
  const isAnonymous = post.is_anonymous;
  
  // Transform Google Drive URLs to thumbnail format for display
  const displayImageUrl = useMemo(() => getDisplayImageUrl(post.image_url), [post.image_url]);
  
  // Display actual username/name from profiles
  const displayName = isAnonymous 
    ? 'Anonymous' 
    : post.profiles?.username 
      ? `@${post.profiles.username}` 
      : post.profiles?.full_name || 'User';
  
  const initials = isAnonymous 
    ? '?' 
    : post.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  // Long press for image viewing (300ms)
  const longPressHandlers = useLongPress({
    delay: 300,
    onLongPress: () => setImageViewerOpen(true),
    onClick: () => {}, // No action on quick tap
  });

  const handleUserClick = () => {
    if (!isAnonymous && post.user_id) {
      navigate(`/user/${post.user_id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="tap-highlight-transparent"
    >
      <Card 
        variant={post.is_pinned ? "elevated" : "default"} 
        className={`overflow-hidden ${post.is_pinned ? "ring-1 ring-primary/20" : ""}`}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar 
                className={`h-10 w-10 ring-2 ring-background ${!isAnonymous ? 'cursor-pointer' : ''}`}
                onClick={handleUserClick}
              >
                {!isAnonymous && post.profiles?.avatar_url && (
                  <AvatarImage src={post.profiles.avatar_url} alt={displayName} />
                )}
                <AvatarFallback className={`${isAnonymous ? "bg-muted" : "bg-primary/10 text-primary"}`}>
                  {isAnonymous ? <EyeOff className="h-4 w-4" /> : initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p 
                    className={`font-semibold text-sm ${isAnonymous ? 'text-muted-foreground italic' : 'cursor-pointer hover:underline'}`}
                    onClick={handleUserClick}
                  >
                    {displayName}
                  </p>
                  {post.is_pinned && (
                    <div className="flex items-center gap-1 text-primary text-xs">
                      <Pin className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 opacity-60" />
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  </div>
                  <CategoryBadge category={post.category} />
                </div>
              </div>
            </div>
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className="p-2 -mr-2 -mt-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && onPin && (
                    <DropdownMenuItem onClick={onPin}>
                      <Pin className="h-4 w-4 mr-2" />
                      {post.is_pinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Content */}
          <RichTextDisplay content={post.content} className="mb-3" />
          
          {/* Image */}
          {displayImageUrl && !imageError && (
            <>
              <div 
                className="relative rounded-xl overflow-hidden mb-3 cursor-pointer group select-none"
                {...longPressHandlers}
              >
                <img 
                  src={displayImageUrl} 
                  alt="Post image" 
                  className="max-h-96 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  loading="lazy"
                  onError={() => setImageError(true)}
                  draggable={false}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
              </div>
              <ImageViewerDialog 
                open={imageViewerOpen}
                onOpenChange={setImageViewerOpen}
                imageUrl={displayImageUrl}
                alt="Post image"
              />
            </>
          )}

          {/* Image error fallback */}
          {post.image_url && imageError && (
            <div className="flex items-center justify-center gap-2 p-6 mb-3 rounded-xl bg-muted/50 text-muted-foreground">
              <ImageOff className="h-5 w-5" />
              <span className="text-sm">Image unavailable</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onLike}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                hasLiked 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <motion.div
                animate={hasLiked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.25 }}
              >
                <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
              </motion.div>
              <span>{post.likes_count || 0}</span>
            </motion.button>
          </div>
          
          {/* Comment Section */}
          <PostCommentSection postId={post.id} commentCount={post.comment_count} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
