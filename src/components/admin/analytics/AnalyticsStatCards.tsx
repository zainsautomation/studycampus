import { motion } from 'framer-motion';
import { Download, FileText, Users, ClipboardCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { AnalyticsStats } from '@/hooks/useAnalyticsData';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface AnalyticsStatCardsProps {
  stats: AnalyticsStats;
}

export function AnalyticsStatCards({ stats }: AnalyticsStatCardsProps) {
  const statCards = [
    {
      label: 'Total Notes',
      value: stats.totalNotes,
      icon: FileText,
      gradient: 'from-accent/5 to-accent/10',
      border: 'border-accent/20',
      iconBg: 'bg-accent/20',
      iconColor: 'text-accent',
    },
    {
      label: 'Total Downloads',
      value: stats.totalDownloads,
      icon: Download,
      gradient: 'from-primary/5 to-primary/10',
      border: 'border-primary/20',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
    },
    {
      label: 'Students',
      value: stats.totalStudents,
      icon: Users,
      gradient: 'from-emerald-500/5 to-emerald-500/10',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'MCQ Tests',
      value: stats.mcqPublishedTests,
      icon: ClipboardCheck,
      gradient: 'from-purple-500/5 to-purple-500/10',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className={`glass bg-gradient-to-br ${stat.gradient} ${stat.border}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  <AnimatedCounter value={stat.value} />
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}
