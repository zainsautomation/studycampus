import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { AnswerCard } from "@/components/qa/AnswerCard";
import { AnswerForm } from "@/components/qa/AnswerForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { ArrowLeft, CheckCircle2, Pin, Trash2, EyeOff, Clock, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function QuestionDetail() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          subjects:subject_id(name, color)
        `)
        .eq('id', questionId)
        .maybeSingle();
      if (error) throw error;
      
      // Fetch profile separately
      if (data && !data.is_anonymous) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, username, avatar_url')
          .eq('id', data.user_id)
          .single();
        return { ...data, profiles: profileData };
      }
      return { ...data, profiles: null };
    },
  });

  const { data: answers } = useQuery({
    queryKey: ['answers', questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('answers')
        .select(`*`)
        .eq('question_id', questionId)
        .order('is_accepted', { ascending: false })
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      // Fetch profiles for each answer
      const answerIds = data?.map(a => a.user_id) || [];
      const uniqueUserIds = [...new Set(answerIds)];
      
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', uniqueUserIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return data?.map(answer => ({
          ...answer,
          profiles: profileMap.get(answer.user_id) || null
        }));
      }
      
      return data?.map(answer => ({ ...answer, profiles: null }));
    },
    enabled: !!questionId,
  });

  const { data: userUpvotes } = useQuery({
    queryKey: ['answer-upvotes', questionId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('answer_upvotes')
        .select('answer_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(u => u.answer_id);
    },
    enabled: !!user?.id,
  });

  const { data: currentUserProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const createAnswer = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('answers').insert({
        question_id: questionId,
        user_id: user?.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast({ title: "Answer posted!" });
    },
  });

  const upvoteAnswer = useMutation({
    mutationFn: async (answerId: string) => {
      const hasUpvoted = userUpvotes?.includes(answerId);
      if (hasUpvoted) {
        await supabase.from('answer_upvotes').delete().eq('answer_id', answerId).eq('user_id', user?.id);
        await supabase.from('answers').update({ upvotes: (answers?.find(a => a.id === answerId)?.upvotes || 1) - 1 }).eq('id', answerId);
      } else {
        await supabase.from('answer_upvotes').insert({ answer_id: answerId, user_id: user?.id });
        await supabase.from('answers').update({ upvotes: (answers?.find(a => a.id === answerId)?.upvotes || 0) + 1 }).eq('id', answerId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] });
      queryClient.invalidateQueries({ queryKey: ['answer-upvotes', questionId, user?.id] });
    },
  });

  const acceptAnswer = useMutation({
    mutationFn: async (answerId: string) => {
      await supabase.from('answers').update({ is_accepted: false }).eq('question_id', questionId);
      await supabase.from('answers').update({ is_accepted: true }).eq('id', answerId);
      await supabase.from('questions').update({ is_resolved: true }).eq('id', questionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] });
      queryClient.invalidateQueries({ queryKey: ['question', questionId] });
      toast({ title: "Answer accepted!" });
    },
  });

  const deleteAnswer = useMutation({
    mutationFn: async (answerId: string) => {
      const { error } = await supabase.from('answers').delete().eq('id', answerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] });
      toast({ title: "Answer deleted" });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('questions').delete().eq('id', questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      navigate('/qa');
      toast({ title: "Question deleted" });
    },
  });

  const togglePin = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('questions')
        .update({ is_pinned: !question?.is_pinned })
        .eq('id', questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question', questionId] });
      toast({ title: question?.is_pinned ? "Question unpinned" : "Question pinned" });
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 space-y-4">
          <div className="h-8 w-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!question) {
    return (
      <MainLayout>
        <div className="container px-4 py-12 text-center">
          <h2 className="text-xl font-medium mb-2">Question not found</h2>
          <Button variant="link" onClick={() => navigate('/qa')}>
            Back to Q&A
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isQuestionAuthor = user?.id === question.user_id;
  const isAnonymous = question.is_anonymous;
  
  const displayName = isAnonymous 
    ? 'Anonymous' 
    : question.profiles?.username 
      ? `@${question.profiles.username}` 
      : question.profiles?.full_name || 'User';
  
  const initials = isAnonymous 
    ? '?' 
    : question.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U';

  const currentUserInitials = currentUserProfile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/qa')} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Q&A
        </Button>

        {/* Question Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden relative">
            {/* Subject color accent bar */}
            {question.subjects && (
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5"
                style={{ backgroundColor: question.subjects.color }}
              />
            )}
            
            <CardContent className="p-5 pl-6">
              {/* Header badges */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {question.is_pinned && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-xs px-2 py-0.5 gap-1">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </Badge>
                )}
                {question.is_resolved && (
                  <Badge variant="secondary" className="bg-success/10 text-success text-xs px-2.5 py-1 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Resolved
                  </Badge>
                )}
                {question.subjects && (
                  <Badge 
                    variant="outline"
                    className="text-xs px-2.5 py-1"
                    style={{ borderColor: question.subjects.color, color: question.subjects.color }}
                  >
                    {question.subjects.name}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl md:text-2xl font-bold mb-4">{question.title}</h1>

              {/* Content */}
              <RichTextDisplay content={question.content} className="mb-5 text-muted-foreground" />

              {/* Footer with author and actions */}
              <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-border/50">
                {/* Author info */}
                <div className="flex items-center gap-3">
                  {isAnonymous ? (
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-muted">
                        <EyeOff className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Link to={`/user/${question.profiles?.username || question.user_id}`} className="shrink-0">
                      <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                        {question.profiles?.avatar_url && (
                          <AvatarImage src={question.profiles.avatar_url} alt={displayName} />
                        )}
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  )}
                  <div className="flex flex-col">
                    {isAnonymous ? (
                      <span className="text-sm font-medium text-muted-foreground italic">
                        {displayName}
                      </span>
                    ) : (
                      <Link
                        to={`/user/${question.profiles?.username || question.user_id}`}
                        className="text-sm font-medium hover:underline hover:text-primary transition-colors"
                      >
                        {displayName}
                      </Link>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Asked {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                {/* Admin actions */}
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => togglePin.mutate()} className="gap-1.5">
                      <Pin className="h-4 w-4" />
                      {question.is_pinned ? 'Unpin' : 'Pin'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteQuestion.mutate()} className="gap-1.5 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Answers Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{answers?.length || 0}</span>
            </div>
            <h2 className="text-lg font-semibold">
              {answers?.length === 1 ? 'Answer' : 'Answers'}
            </h2>
          </div>

          {answers?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground mb-1">No answers yet</p>
                <p className="text-sm text-muted-foreground/60">Be the first to help out!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {answers?.map((answer, index) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  isQuestionAuthor={isQuestionAuthor}
                  currentUserId={user?.id}
                  hasUpvoted={userUpvotes?.includes(answer.id) ?? false}
                  isAdmin={isAdmin}
                  onUpvote={() => upvoteAnswer.mutate(answer.id)}
                  onAccept={() => acceptAnswer.mutate(answer.id)}
                  onDelete={() => deleteAnswer.mutate(answer.id)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Answer Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-4">Your Answer</h3>
          <AnswerForm
            onSubmit={(content) => createAnswer.mutate(content)}
            isSubmitting={createAnswer.isPending}
            userAvatar={currentUserProfile?.avatar_url}
            userInitials={currentUserInitials}
          />
        </motion.div>
      </div>
    </MainLayout>
  );
}
