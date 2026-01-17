import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Pin, Trash2, MoreVertical, EyeOff } from "lucide-react";
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

interface PostCardProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    likes_count: number;
    is_pinned: boolean;
    is_anonymous?: boolean;
    category?: string | null;
    created_at: string;
    user_id: string;
    profiles?: { full_name: string | null; avatar_url: string | null; username?: string | null } | null;
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
  const canDelete = isAdmin || currentUserId === post.user_id;
  const isAnonymous = post.is_anonymous;
  
  const displayName = isAnonymous 
    ? 'Anonymous' 
    : post.profiles?.username 
      ? `@${post.profiles.username}` 
      : post.profiles?.full_name || 'User';
  
  const initials = isAnonymous 
    ? '?' 
    : post.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="tap-highlight-transparent"
    >
      <Card variant={post.is_pinned ? "elevated" : "default"} className={post.is_pinned ? "ring-1 ring-primary/20" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {!isAnonymous && <AvatarImage src={post.profiles?.avatar_url || undefined} />}
                <AvatarFallback className={isAnonymous ? "bg-muted" : ""}>
                  {isAnonymous ? <EyeOff className="h-4 w-4" /> : initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className={`font-medium text-sm ${isAnonymous ? 'text-muted-foreground italic' : ''}`}>
                    {displayName}
                  </p>
                  {post.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                  <CategoryBadge category={post.category} />
                </div>
              </div>
            </div>
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
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
        </CardHeader>
        <CardContent>
          <RichTextDisplay content={post.content} className="mb-3" />
          {post.image_url && (
            <img 
              src={post.image_url} 
              alt="Post image" 
              className="rounded-xl max-h-96 w-full object-cover mb-3"
              loading="lazy"
            />
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onLike}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              hasLiked 
                ? 'bg-primary/10 text-primary' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <motion.div
              animate={hasLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
            </motion.div>
            {post.likes_count}
          </motion.button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
