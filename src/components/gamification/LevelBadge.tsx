import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LevelBadgeProps {
  level: number;
  rankTitle?: string;
  size?: 'sm' | 'md' | 'lg';
  showRank?: boolean;
  className?: string;
}

const levelColors: Record<string, { bg: string; border: string; text: string }> = {
  Freshman: { bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-600', text: 'text-slate-700 dark:text-slate-300' },
  Sophomore: { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-400 dark:border-green-600', text: 'text-green-700 dark:text-green-400' },
  Junior: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-400 dark:border-blue-600', text: 'text-blue-700 dark:text-blue-400' },
  Senior: { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-400 dark:border-purple-600', text: 'text-purple-700 dark:text-purple-400' },
  Master: { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-400 dark:border-amber-600', text: 'text-amber-700 dark:text-amber-400' },
  Legend: { bg: 'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30', border: 'border-amber-500 dark:border-amber-400', text: 'text-amber-800 dark:text-amber-300' },
};

const sizeClasses = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-9 h-9 text-sm',
};

export function LevelBadge({ level, rankTitle = 'Freshman', size = 'md', showRank = false, className }: LevelBadgeProps) {
  const colors = levelColors[rankTitle] || levelColors.Freshman;

  const badge = (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center justify-center rounded-full border-2 font-bold',
        colors.bg,
        colors.border,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      {level}
    </motion.div>
  );

  if (showRank) {
    return (
      <div className="inline-flex items-center gap-1.5">
        {badge}
        <span className={cn('text-xs font-medium', colors.text)}>{rankTitle}</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Level {level} • {rankTitle}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
