import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CommentCard } from "@/components/qa/CommentCard";
import { CommentForm } from "@/components/qa/CommentForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface PostCommentSectionProps {
  postId: string;
  commentCount?: number;
  isOpen?: boolean;
  onToggle?: () => void;
}

interface CommentWithProfile {
  id: string;
  content: string;
  user_id: string;
  post_id: string;
  parent_comment_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  likes_count: number;
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_public: boolean;
  } | null;
}

export function PostCommentSection({ postId, commentCount = 0, isOpen = false, onToggle }: PostCommentSectionProps) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, is_public')
        .in('id', userIds);
      return data.map(comment => ({
        ...comment,
        likes_count: comment.likes_count || 0,
        profile: profiles?.find(p => p.id === comment.user_id) || null
      })) as CommentWithProfile[];
    },
    enabled: isOpen,
  });

  const createComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user?.id,
        content,
        parent_comment_id: parentId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setShowForm(false);
      setReplyingTo(null);
      toast({ title: "Comment added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('comments')
        .update({ content, is_edited: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      toast({ title: "Comment updated" });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: "Comment deleted" });
    },
  });

  const topLevelComments = comments?.filter(c => !c.parent_comment_id) || [];
  const replies = comments?.filter(c => c.parent_comment_id) || [];
  const getReplies = (parentId: string) => replies.filter(r => r.parent_comment_id === parentId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="space-y-3 pt-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-2">
                  <div className="h-7 w-7 bg-muted animate-pulse rounded-full shrink-0" />
                  <div className="flex-1 h-10 bg-muted animate-pulse rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {topLevelComments.length > 0 ? (
                <div className="space-y-2.5">
                  {topLevelComments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <CommentCard
                        comment={comment}
                        currentUserId={user?.id}
                        isAdmin={isAdmin}
                        onEdit={(content) => updateComment.mutate({ id: comment.id, content })}
                        onDelete={() => deleteComment.mutate(comment.id)}
                        onReply={() => setReplyingTo(comment.id)}
                        showReplyButton={true}
                      />
                      {getReplies(comment.id).length > 0 && (
                        <div className="ml-9 space-y-2 pl-3 border-l-2 border-muted">
                          {getReplies(comment.id).map((reply) => (
                            <CommentCard
                              key={reply.id}
                              comment={reply}
                              currentUserId={user?.id}
                              isAdmin={isAdmin}
                              onEdit={(content) => updateComment.mutate({ id: reply.id, content })}
                              onDelete={() => deleteComment.mutate(reply.id)}
                              isReply={true}
                              showReplyButton={false}
                            />
                          ))}
                        </div>
                      )}
                      {replyingTo === comment.id && user && (
                        <div className="ml-9 pl-3 border-l-2 border-primary/30">
                          <CommentForm
                            onSubmit={(content) => createComment.mutate({ content, parentId: comment.id })}
                            onCancel={() => setReplyingTo(null)}
                            isSubmitting={createComment.isPending}
                            placeholder="Write a reply..."
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No comments yet. Be the first!
                </p>
              )}
              
              {user && (
                showForm ? (
                  <CommentForm
                    onSubmit={(content) => createComment.mutate({ content })}
                    onCancel={() => setShowForm(false)}
                    isSubmitting={createComment.isPending}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(true)}
                    className="w-full text-xs h-8 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground"
                  >
                    Add a comment...
                  </Button>
                )
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
