import { useEffect, useState, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  isPaused?: boolean;
  className?: string;
}

export function TestTimer({ 
  totalSeconds, 
  onTimeUp, 
  isPaused = false,
  className 
}: TestTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (isPaused || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, remainingSeconds, onTimeUp]);

  const isLowTime = remainingSeconds <= 60;
  const isCriticalTime = remainingSeconds <= 30;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-sm font-medium transition-all",
      !isLowTime && "bg-muted text-muted-foreground",
      isLowTime && !isCriticalTime && "bg-orange-500/20 text-orange-600 dark:text-orange-400",
      isCriticalTime && "bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse",
      className
    )}>
      <Clock className={cn(
        "w-4 h-4",
        isCriticalTime && "animate-bounce"
      )} />
      <span>{formatTime(remainingSeconds)}</span>
    </div>
  );
}
