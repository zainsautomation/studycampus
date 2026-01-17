import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { AnswerCard } from "@/components/qa/AnswerCard";
import { AnswerForm } from "@/components/qa/AnswerForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { ArrowLeft, CheckCircle2, Pin, Trash2 } from "lucide-react";
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
      return data;
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
      return data;
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
      // Unaccept all other answers first
      await supabase.from('answers').update({ is_accepted: false }).eq('question_id', questionId);
      // Accept this answer
      await supabase.from('answers').update({ is_accepted: true }).eq('id', answerId);
      // Mark question as resolved
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
        <div className="space-y-4">
          <div className="h-40 bg-muted animate-pulse rounded-lg" />
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
        </div>
      </MainLayout>
    );
  }

  if (!question) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-medium">Question not found</h2>
          <Button variant="link" onClick={() => navigate('/qa')}>
            Back to Q&A
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isQuestionAuthor = user?.id === question.user_id;

  return (
    <MainLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/qa')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Q&A
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {question.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                    {question.is_resolved && (
                      <Badge className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                    {question.subjects && (
                      <Badge variant="outline" style={{ borderColor: question.subjects.color, color: question.subjects.color }}>
                        {question.subjects.name}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{question.title}</CardTitle>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => togglePin.mutate()}>
                      <Pin className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteQuestion.mutate()}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <RichTextDisplay content={question.content} className="mb-4" />
              <p className="text-sm text-muted-foreground">
                Asked {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <div>
          <h3 className="text-lg font-semibold mb-4">{answers?.length || 0} Answers</h3>
          <div className="space-y-4">
            {answers?.map((answer) => (
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
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Your Answer</h3>
          <AnswerForm
            onSubmit={(content) => createAnswer.mutate(content)}
            isSubmitting={createAnswer.isPending}
          />
        </div>
      </div>
    </MainLayout>
  );
}
