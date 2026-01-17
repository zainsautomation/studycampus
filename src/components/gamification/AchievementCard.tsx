import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Lock, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AchievementCardProps {
  name: string;
  description: string;
  icon: string;
  category: string;
  pointsReward: number;
  earnedAt?: string | null;
  compact?: boolean;
}

// Icon mapping for dynamic icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HelpCircle: LucideIcons.HelpCircle,
  MessageSquare: LucideIcons.MessageSquare,
  CheckCircle: LucideIcons.CheckCircle,
  Bookmark: LucideIcons.Bookmark,
  Trophy: LucideIcons.Trophy,
  Star: LucideIcons.Star,
  Users: LucideIcons.Users,
  Eye: LucideIcons.Eye,
  MessageCircle: LucideIcons.MessageCircle,
  GraduationCap: LucideIcons.GraduationCap,
  Flame: LucideIcons.Flame,
  Feather: LucideIcons.Feather,
  Award: LucideIcons.Award,
};

const categoryColors: Record<string, string> = {
  community: 'from-blue-500 to-indigo-500',
  learning: 'from-green-500 to-emerald-500',
  milestone: 'from-amber-500 to-orange-500',
  streak: 'from-red-500 to-pink-500',
  general: 'from-purple-500 to-violet-500',
};

export function AchievementCard({
  name,
  description,
  icon,
  category,
  pointsReward,
  earnedAt,
  compact = false,
}: AchievementCardProps) {
  const isEarned = !!earnedAt;
  const IconComponent = iconMap[icon] || LucideIcons.Award;
  const gradientClass = categoryColors[category] || categoryColors.general;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full',
                isEarned 
                  ? `bg-gradient-to-br ${gradientClass} shadow-md` 
                  : 'bg-muted'
              )}
            >
              {isEarned ? (
                <IconComponent className="h-5 w-5 text-white" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
            {isEarned && earnedAt && (
              <p className="mt-1 text-xs text-green-500">
                Earned {format(new Date(earnedAt), 'MMM d, yyyy')}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        'relative overflow-hidden transition-all',
        isEarned 
          ? 'border-2 border-primary/20 shadow-md' 
          : 'opacity-60 grayscale'
      )}>
        {/* Gradient accent */}
        <div className={cn(
          'absolute left-0 top-0 h-1 w-full bg-gradient-to-r',
          gradientClass,
          !isEarned && 'opacity-30'
        )} />
        
        <CardContent className="flex items-start gap-4 p-4">
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            isEarned 
              ? `bg-gradient-to-br ${gradientClass}` 
              : 'bg-muted'
          )}>
            {isEarned ? (
              <IconComponent className="h-6 w-6 text-white" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{name}</h4>
              <div className="flex items-center gap-1 text-amber-500">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">+{pointsReward}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {isEarned && earnedAt && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Earned on {format(new Date(earnedAt), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
