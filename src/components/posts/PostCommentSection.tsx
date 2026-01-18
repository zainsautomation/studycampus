import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CommentCard } from "@/components/qa/CommentCard";
import { CommentForm } from "@/components/qa/CommentForm";
import { Button } from "@/components/ui/button";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface PostCommentSectionProps {
  postId: string;
  commentCount?: number;
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

export function PostCommentSection({ postId, commentCount = 0 }: PostCommentSectionProps) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
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

      // Fetch profiles for all comment authors
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, is_public')
        .in('id', userIds);

      // Map profiles to comments
      return data.map(comment => ({
        ...comment,
        likes_count: comment.likes_count || 0,
        profile: profiles?.find(p => p.id === comment.user_id) || null
      })) as CommentWithProfile[];
    },
    enabled: isExpanded,
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

  // Organize comments into threads
  const topLevelComments = comments?.filter(c => !c.parent_comment_id) || [];
  const replies = comments?.filter(c => c.parent_comment_id) || [];
  
  const getReplies = (parentId: string) => 
    replies.filter(r => r.parent_comment_id === parentId);

  const displayCount = comments?.length ?? commentCount;

  return (
    <div className="pt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gap-2 text-muted-foreground hover:text-foreground h-8 px-2"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-xs">
          {displayCount > 0 ? `${displayCount} comment${displayCount > 1 ? 's' : ''}` : 'Comment'}
        </span>
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-4 pt-3 border-t border-border">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                      <div className="flex-1 h-16 bg-muted animate-pulse rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {topLevelComments.length > 0 ? (
                    <div className="space-y-4">
                      {topLevelComments.map((comment) => (
                        <div key={comment.id} className="space-y-3">
                          <CommentCard
                            comment={comment}
                            currentUserId={user?.id}
                            isAdmin={isAdmin}
                            onEdit={(content) => updateComment.mutate({ id: comment.id, content })}
                            onDelete={() => deleteComment.mutate(comment.id)}
                            onReply={() => setReplyingTo(comment.id)}
                            showReplyButton={true}
                          />
                          
                          {/* Replies */}
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

                          {/* Reply form */}
                          {replyingTo === comment.id && user && (
                            <div className="ml-8 pl-4 border-l-2 border-border">
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
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet. Be the first to comment!
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
                        variant="outline"
                        size="sm"
                        onClick={() => setShowForm(true)}
                        className="w-full text-xs"
                      >
                        Add a comment
                      </Button>
                    )
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}