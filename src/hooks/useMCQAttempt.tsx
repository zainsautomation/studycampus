import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MCQOption {
  id: string;
  option_label: string;
  option_text: string;
  is_correct: boolean;
  order_number: number;
}

interface MCQQuestion {
  id: string;
  question_text: string;
  explanation: string | null;
  order_number: number;
  options: MCQOption[];
}

interface MCQTest {
  id: string;
  title: string;
  topic_name: string | null;
  description: string | null;
  time_limit_mins: number | null;
  test_mode: string;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  result_visibility: string;
  retake_allowed: boolean;
  subject_id: string | null;
}

interface MCQAttempt {
  id: string;
  user_id: string;
  test_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_questions: number;
  correct_answers: number;
  time_taken_secs: number | null;
  status: string;
}

interface MCQResponse {
  question_id: string;
  selected_option_id: string | null;
  is_correct: boolean | null;
}

export function useMCQTest(testId: string) {
  return useQuery({
    queryKey: ['mcq-test', testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcq_tests')
        .select('*')
        .eq('id', testId)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      return data as MCQTest;
    },
    enabled: !!testId,
  });
}

export function useMCQQuestions(testId: string, shuffleQuestions = false, shuffleOptions = false) {
  return useQuery({
    queryKey: ['mcq-questions', testId],
    queryFn: async () => {
      const { data: questions, error } = await supabase
        .from('mcq_questions')
        .select(`
          id,
          question_text,
          explanation,
          order_number,
          mcq_options (
            id,
            option_label,
            option_text,
            is_correct,
            order_number
          )
        `)
        .eq('test_id', testId)
        .order('order_number');

      if (error) throw error;

      let result = questions.map(q => ({
        ...q,
        options: (q.mcq_options as MCQOption[]).sort((a, b) => a.order_number - b.order_number),
      }));

      // Shuffle questions if enabled
      if (shuffleQuestions) {
        result = result.sort(() => Math.random() - 0.5);
      }

      // Shuffle options if enabled
      if (shuffleOptions) {
        result = result.map(q => ({
          ...q,
          options: [...q.options].sort(() => Math.random() - 0.5),
        }));
      }

      return result as MCQQuestion[];
    },
    enabled: !!testId,
  });
}

export function useMCQAttempt(attemptId: string) {
  return useQuery({
    queryKey: ['mcq-attempt', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcq_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (error) throw error;
      return data as MCQAttempt;
    },
    enabled: !!attemptId,
  });
}

export function useUserAttempts(testId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mcq-user-attempts', testId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('mcq_attempts')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as MCQAttempt[];
    },
    enabled: !!testId && !!user,
  });
}

export function useStartAttempt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testId, totalQuestions }: { testId: string; totalQuestions: number }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('mcq_attempts')
        .insert({
          user_id: user.id,
          test_id: testId,
          total_questions: totalQuestions,
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) throw error;
      return data as MCQAttempt;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mcq-user-attempts', variables.testId] });
    },
  });
}

export function useSaveResponse() {
  return useMutation({
    mutationFn: async ({ 
      attemptId, 
      questionId, 
      selectedOptionId,
      isCorrect 
    }: { 
      attemptId: string; 
      questionId: string; 
      selectedOptionId: string;
      isCorrect: boolean;
    }) => {
      const { error } = await supabase
        .from('mcq_responses')
        .upsert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_option_id: selectedOptionId,
          is_correct: isCorrect,
          answered_at: new Date().toISOString(),
        }, {
          onConflict: 'attempt_id,question_id',
        });

      if (error) throw error;
    },
  });
}

export function useCompleteAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      attemptId, 
      score, 
      correctAnswers,
      timeTakenSecs 
    }: { 
      attemptId: string; 
      score: number; 
      correctAnswers: number;
      timeTakenSecs: number;
    }) => {
      const { data, error } = await supabase
        .from('mcq_attempts')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          score,
          correct_answers: correctAnswers,
          time_taken_secs: timeTakenSecs,
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (error) throw error;
      return data as MCQAttempt;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mcq-attempt', data.id] });
      queryClient.invalidateQueries({ queryKey: ['mcq-user-attempts', data.test_id] });
    },
  });
}

export function useAttemptResponses(attemptId: string) {
  return useQuery({
    queryKey: ['mcq-responses', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcq_responses')
        .select('question_id, selected_option_id, is_correct')
        .eq('attempt_id', attemptId);

      if (error) throw error;
      return data as MCQResponse[];
    },
    enabled: !!attemptId,
  });
}
