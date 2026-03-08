import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Pin, Trash2, MoreHorizontal, EyeOff, ImageOff, MessageCircle, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryBadge } from "./CategoryBadge";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { ImageViewerDialog } from "@/components/ui/ImageViewerDialog";
import { PostCommentSection } from "./PostCommentSection";
import { ReportButton } from "@/components/ui/ReportButton";
import { useState, useMemo, useRef } from "react";
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
  index?: number;
}

function getDisplayImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("drive.google.com")) {
    let fileId: string | null = null;
    const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (ucMatch) fileId = ucMatch[1];
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) fileId = fileMatch[1];
    if (url.includes("/thumbnail?id=")) return url;
    if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  return url;
}

export function PostCard({ post, hasLiked, currentUserId, isAdmin, onLike, onPin, onDelete, index = 0 }: PostCardProps) {
  const navigate = useNavigate();
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const canDelete = isAdmin || currentUserId === post.user_id;
  const isAnonymous = post.is_anonymous;
  const contentRef = useRef<HTMLDivElement>(null);

  const displayImageUrl = useMemo(() => getDisplayImageUrl(post.image_url), [post.image_url]);

  const displayName = isAnonymous
    ? "Anonymous"
    : post.profiles?.username
      ? `@${post.profiles.username}`
      : post.profiles?.full_name || "User";

  const initials = isAnonymous
    ? "?"
    : post.profiles?.full_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U";

  const longPressHandlers = useLongPress({
    delay: 900,
    onLongPress: () => setImageViewerOpen(true),
    onClick: () => setImageViewerOpen(true),
  });

  const handleUserClick = () => {
    if (!isAnonymous && post.user_id) {
      navigate(`/user/${post.user_id}`);
    }
  };

  // Check if content is long enough to need truncation
  const plainText = post.content.replace(/<[^>]*>/g, '').trim();
  const isLongContent = plainText.length > 280;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="tap-highlight-transparent"
    >
      <Card className={`overflow-hidden border-border/60 ${post.is_pinned ? "border-t-2 border-t-primary" : ""}`}>
        <CardContent className="p-0">
          {/* Pinned strip */}
          {post.is_pinned && (
            <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-0">
              <Pin className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-medium text-primary">Pinned</span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                className={`h-9 w-9 shrink-0 ${!isAnonymous ? "cursor-pointer" : ""}`}
                onClick={handleUserClick}
              >
                {!isAnonymous && post.profiles?.avatar_url && (
                  <AvatarImage src={post.profiles.avatar_url} alt={displayName} />
                )}
                <AvatarFallback className={`text-xs ${isAnonymous ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                  {isAnonymous ? <EyeOff className="h-3.5 w-3.5" /> : initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p
                    className={`font-semibold text-[13px] leading-tight truncate ${isAnonymous ? "text-muted-foreground italic" : "cursor-pointer hover:underline"}`}
                    onClick={handleUserClick}
                  >
                    {displayName}
                  </p>
                  <CategoryBadge category={post.category} compact />
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {isAdmin && onPin && (
                  <DropdownMenuItem onClick={onPin}>
                    <Pin className="h-4 w-4 mr-2" />
                    {post.is_pinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
                {currentUserId !== post.user_id && (
                  <>
                    {canDelete && <DropdownMenuSeparator />}
                    <DropdownMenuItem asChild>
                      <ReportButton 
                        contentType="post" 
                        contentId={post.id} 
                        size="default" 
                        variant="ghost"
                        showLabel
                        className="w-full justify-start cursor-pointer"
                      />
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <div className="px-4 pt-2.5 pb-0">
            <div
              ref={contentRef}
              className={`${!contentExpanded && isLongContent ? "line-clamp-6" : ""}`}
            >
              <RichTextDisplay content={post.content} />
            </div>
            {isLongContent && !contentExpanded && (
              <button
                onClick={() => setContentExpanded(true)}
                className="text-primary text-xs font-medium mt-1 hover:underline"
              >
                Read more
              </button>
            )}
          </div>

          {/* Image */}
          {displayImageUrl && !imageError && (
            <>
              <div
                className="relative mx-4 mt-3 rounded-2xl overflow-hidden cursor-pointer group select-none bg-muted/30"
                style={{ aspectRatio: '16/10' }}
                {...longPressHandlers}
              >
                {imageLoading && (
                  <div className="absolute inset-0 animate-pulse bg-muted rounded-2xl" />
                )}
                <img
                  src={displayImageUrl}
                  alt="Post image"
                  className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.02] ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                  loading="lazy"
                  onLoad={() => setImageLoading(false)}
                  onError={() => { setImageError(true); setImageLoading(false); }}
                  draggable={false}
                />
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
            <div className="flex items-center justify-center gap-2 mx-4 mt-3 p-5 rounded-2xl bg-muted/30 text-muted-foreground">
              <ImageOff className="h-4 w-4" />
              <span className="text-xs">Image unavailable</span>
            </div>
          )}

          {/* Unified Action Bar */}
          <div className="flex items-center px-2 py-1 mt-2 border-t border-border/40">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onLike}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                hasLiked
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <motion.div animate={hasLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 0.2 }}>
                <Heart className={`h-[18px] w-[18px] ${hasLiked ? "fill-current" : ""}`} />
              </motion.div>
              <span className="text-xs font-medium">{post.likes_count || 0}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCommentsOpen(!commentsOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                commentsOpen
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <MessageCircle className="h-[18px] w-[18px]" />
              <span className="text-xs font-medium">{post.comment_count || 0}</span>
            </motion.button>

            <div className="flex-1" />
          </div>

          {/* Comment Section */}
          <div className={`${commentsOpen ? 'px-4 pb-3' : ''}`}>
            <PostCommentSection 
              postId={post.id} 
              commentCount={post.comment_count}
              isOpen={commentsOpen}
              onToggle={() => setCommentsOpen(!commentsOpen)}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
