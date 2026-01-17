import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CommentCard } from "./CommentCard";
import { CommentForm } from "./CommentForm";
import { Button } from "@/components/ui/button";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CommentSectionProps {
  answerId: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  answer_id: string;
  parent_comment_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export function CommentSection({ answerId }: CommentSectionProps) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', answerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('answer_id', answerId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Comment[];
    },
    enabled: isExpanded,
  });

  const createComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('comments').insert({
        answer_id: answerId,
        user_id: user?.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', answerId] });
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
      queryClient.invalidateQueries({ queryKey: ['comments', answerId] });
      toast({ title: "Comment updated" });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', answerId] });
      toast({ title: "Comment deleted" });
    },
  });

  const commentCount = comments?.length || 0;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <MessageCircle className="h-4 w-4" />
        {commentCount > 0 ? `${commentCount} comment${commentCount > 1 ? 's' : ''}` : 'Add comment'}
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {comments?.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id}
                  isAdmin={isAdmin}
                  onEdit={(content) => updateComment.mutate({ id: comment.id, content })}
                  onDelete={() => deleteComment.mutate(comment.id)}
                />
              ))}
              
              {showForm ? (
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
                  className="w-full"
                >
                  Add a comment
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
