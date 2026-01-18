import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Trash2, X, Check, Heart, Reply, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    user_id: string;
    is_edited: boolean;
    created_at: string;
    likes_count?: number;
    parent_comment_id?: string | null;
    profile?: {
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      is_public?: boolean;
    } | null;
  };
  currentUserId: string | undefined;
  isAdmin: boolean;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onReply?: () => void;
  isReply?: boolean;
  showReplyButton?: boolean;
}

export function CommentCard({
  comment,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
  onReply,
  isReply = false,
  showReplyButton = true,
}: CommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const queryClient = useQueryClient();

  const canModify = currentUserId === comment.user_id || isAdmin;
  const displayName = comment.profile?.full_name || comment.profile?.username || "Anonymous";
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const profileIsPublic = comment.profile?.is_public !== false;

  const { data: hasLiked } = useQuery({
    queryKey: ['comment-like', comment.id, currentUserId],
    queryFn: async () => {
      if (!currentUserId) return false;
      const { data } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', comment.id)
        .eq('user_id', currentUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!currentUserId,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!currentUserId) return;
      if (hasLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: comment.id, user_id: currentUserId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-like', comment.id] });
      queryClient.invalidateQueries({ queryKey: ['post-comments'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  const handleSave = () => {
    if (!editContent.trim()) return;
    onEdit(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const likesCount = comment.likes_count || 0;

  const renderAvatar = () => {
    const avatar = (
      <Avatar className={cn("h-8 w-8 shrink-0", profileIsPublic && comment.profile?.id && "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all")}>
        <AvatarImage src={comment.profile?.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
    );

    if (profileIsPublic && comment.profile?.id) {
      return (
        <Link to={`/user/${comment.profile.username || comment.profile.id}`}>
          {avatar}
        </Link>
      );
    }
    return avatar;
  };

  const renderName = () => {
    if (profileIsPublic && comment.profile?.id) {
      return (
        <Link 
          to={`/user/${comment.profile.username || comment.profile.id}`}
          className="text-sm font-medium hover:underline"
        >
          {displayName}
        </Link>
      );
    }
    return <span className="text-sm font-medium">{displayName}</span>;
  };

  return (
    <div className={cn("group", isReply && "ml-8 border-l-2 border-border pl-4")}>
      <div className="flex gap-3">
        {renderAvatar()}

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  {renderName()}
                  {comment.profile?.username && (
                    <span className="text-xs text-muted-foreground">@{comment.profile.username}</span>
                  )}
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {comment.is_edited && (
                    <span className="text-xs text-muted-foreground">(edited)</span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
              </div>

              <div className="flex items-center gap-1 mt-1 px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 px-2 gap-1 text-xs", hasLiked && "text-red-500")}
                  onClick={() => currentUserId && toggleLike.mutate()}
                  disabled={!currentUserId}
                >
                  <Heart className={cn("h-3.5 w-3.5", hasLiked && "fill-current")} />
                  {likesCount > 0 && <span>{likesCount}</span>}
                </Button>

                {showReplyButton && onReply && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={onReply}>
                    <Reply className="h-3.5 w-3.5" />
                    Reply
                  </Button>
                )}

                {canModify && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {currentUserId === comment.user_id && (
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}