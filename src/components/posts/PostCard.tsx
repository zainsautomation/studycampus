import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Pin, Trash2, MoreVertical, EyeOff, Clock } from "lucide-react";
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
import { useState } from "react";

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

export function PostCard({
  post,
  hasLiked,
  currentUserId,
  isAdmin,
  onLike,
  onPin,
  onDelete,
}: PostCardProps) {
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const canDelete = isAdmin || currentUserId === post.user_id;
  const isAnonymous = post.is_anonymous;
  
  // Display actual username/name from profiles
  const displayName = isAnonymous 
    ? 'Anonymous' 
    : post.profiles?.username 
      ? `@${post.profiles.username}` 
      : post.profiles?.full_name || 'User';
  
  const initials = isAnonymous 
    ? '?' 
    : post.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

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
              <Avatar className="h-10 w-10 ring-2 ring-background">
                {!isAnonymous && post.profiles?.avatar_url && (
                  <AvatarImage src={post.profiles.avatar_url} alt={displayName} />
                )}
                <AvatarFallback className={`${isAnonymous ? "bg-muted" : "bg-primary/10 text-primary"}`}>
                  {isAnonymous ? <EyeOff className="h-4 w-4" /> : initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm ${isAnonymous ? 'text-muted-foreground italic' : ''}`}>
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
          {post.image_url && (
            <>
              <div 
                className="relative rounded-xl overflow-hidden mb-3 cursor-pointer group"
                onClick={() => setImageViewerOpen(true)}
              >
                <img 
                  src={post.image_url} 
                  alt="Post image" 
                  className="max-h-96 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              </div>
              <ImageViewerDialog 
                open={imageViewerOpen}
                onOpenChange={setImageViewerOpen}
                imageUrl={post.image_url}
                alt="Post image"
              />
            </>
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
