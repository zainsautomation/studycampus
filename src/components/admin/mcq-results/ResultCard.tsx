import { format } from 'date-fns';
import { Clock, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { AttemptWithDetails } from '@/hooks/useMCQResults';

function scoreColor(score: number | null) {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

function formatTime(secs: number | null) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

interface ResultCardProps {
  attempt: AttemptWithDetails;
  onClick: () => void;
}

export function ResultCard({ attempt, onClick }: ResultCardProps) {
  const initials = (attempt.student_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-border/50 bg-card p-4 hover:shadow-md hover:border-border transition-all flex items-center gap-3"
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={attempt.student_avatar || ''} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium truncate">{attempt.student_name}</p>
          <span className={`text-lg font-bold tabular-nums ${scoreColor(attempt.score)}`}>
            {attempt.score !== null ? `${Number(attempt.score).toFixed(0)}%` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span className="truncate max-w-[160px]">{attempt.test_title}</span>
          <span>•</span>
          <Badge variant={attempt.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
            {attempt.status === 'completed' ? 'Done' : 'In Progress'}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(attempt.time_taken_secs)}
          </span>
          <span>{format(new Date(attempt.started_at), 'MMM d, yyyy')}</span>
          <span>{attempt.correct_answers}/{attempt.total_questions} correct</span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
    </button>
  );
}
