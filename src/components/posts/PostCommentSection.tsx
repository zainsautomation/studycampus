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

interface Comment {
  id: string;
  content: string;
  user_id: string;
  post_id: string;
  parent_comment_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export function PostCommentSection({ postId, commentCount = 0 }: PostCommentSectionProps) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Comment[];
    },
    enabled: isExpanded,
  });

  const createComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user?.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setShowForm(false);
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
            <div className="mt-3 space-y-3 pt-3 border-t border-border">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  {comments && comments.length > 0 ? (
                    comments.map((comment) => (
                      <CommentCard
                        key={comment.id}
                        comment={comment}
                        currentUserId={user?.id}
                        isAdmin={isAdmin}
                        onEdit={(content) => updateComment.mutate({ id: comment.id, content })}
                        onDelete={() => deleteComment.mutate(comment.id)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                  
                  {user && (
                    showForm ? (
                      <CommentForm
                        onSubmit={(content) => createComment.mutate(content)}
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
