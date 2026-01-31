import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TestProgressProps {
  current: number;
  total: number;
  answeredCount: number;
  className?: string;
}

export function TestProgress({ current, total, answeredCount, className }: TestProgressProps) {
  const progress = (answeredCount / total) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {answeredCount} of {total} answered
        </span>
        <span className="font-medium text-primary">
          {Math.round(progress)}%
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
