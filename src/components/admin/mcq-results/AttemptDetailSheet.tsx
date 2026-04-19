import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import type { AttemptWithDetails } from '@/hooks/useMCQResults';

interface AttemptDetailSheetProps {
  attempt: AttemptWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttemptDetailSheet({ attempt, open, onOpenChange }: AttemptDetailSheetProps) {
  const { data: responses, isLoading } = useQuery({
    queryKey: ['mcq-attempt-responses', attempt?.id],
    enabled: !!attempt?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcq_responses')
        .select(`
          id, is_correct, answered_at,
          mcq_questions(question_text, order_number, explanation),
          mcq_options:selected_option_id(option_text, option_label)
        `)
        .eq('attempt_id', attempt!.id)
        .order('answered_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        isCorrect: r.is_correct,
        questionText: r.mcq_questions?.question_text || '(Question removed)',
        orderNumber: r.mcq_questions?.order_number ?? 0,
        explanation: r.mcq_questions?.explanation,
        selectedOption: r.mcq_options ? `${r.mcq_options.option_label}. ${r.mcq_options.option_text}` : 'No answer',
      })).sort((a: any, b: any) => a.orderNumber - b.orderNumber);
    },
  });

  if (!attempt) return null;

  const initials = (attempt.student_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 sm:max-w-2xl sm:mx-auto">
        <SheetHeader className="p-5 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={attempt.student_avatar || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base truncate">{attempt.student_name}</SheetTitle>
              <p className="text-xs text-muted-foreground truncate">{attempt.test_title}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">
                {attempt.score !== null ? `${Number(attempt.score).toFixed(0)}%` : '—'}
              </p>
              <Badge variant={attempt.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                {attempt.status === 'completed' ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {attempt.time_taken_secs ? `${Math.floor(attempt.time_taken_secs / 60)}m ${attempt.time_taken_secs % 60}s` : '—'}
            </span>
            <span>{attempt.correct_answers}/{attempt.total_questions} correct</span>
            <span>{format(new Date(attempt.started_at), 'MMM d, yyyy h:mm a')}</span>
          </div>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 h-[calc(85vh-140px)]">
          <div className="p-5 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Question-by-Question Review</p>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : responses && responses.length > 0 ? (
              <div className="space-y-3">
                {responses.map((r: any, i: number) => (
                  <div
                    key={r.id}
                    className={`rounded-xl border p-3 ${
                      r.isCorrect
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30'
                        : 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {r.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Q{i + 1}. {r.questionText}</p>
                        <p className="text-xs text-muted-foreground mt-1">Answer: {r.selectedOption}</p>
                        {r.explanation && (
                          <p className="text-xs text-muted-foreground mt-1 italic">💡 {r.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No responses recorded for this attempt.</p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
