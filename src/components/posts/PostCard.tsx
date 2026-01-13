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

interface PostCardProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    likes_count: number;
    is_pinned: boolean;
    is_anonymous?: boolean;
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
  
  // Display name logic: anonymous > @username > full_name > 'User'
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={post.is_pinned ? "border-primary" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
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
                  {post.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
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
          <p className="whitespace-pre-wrap mb-3">{post.content}</p>
          {post.image_url && (
            <img 
              src={post.image_url} 
              alt="Post image" 
              className="rounded-lg max-h-96 w-full object-cover mb-3"
            />
          )}
          <div className="flex items-center gap-2">
            <Button
              variant={hasLiked ? "default" : "ghost"}
              size="sm"
              onClick={onLike}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
              {post.likes_count}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
