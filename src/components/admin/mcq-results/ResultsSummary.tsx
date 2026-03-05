import { Users, Target, TrendingUp, CheckCircle2 } from 'lucide-react';

interface ResultsSummaryProps {
  total: number;
  completedCount: number;
  avgScore: number;
  completionRate: number;
}

export function ResultsSummary({ total, completedCount, avgScore, completionRate }: ResultsSummaryProps) {
  const stats = [
    { label: 'Total Attempts', value: total, icon: Users, color: 'text-primary' },
    { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Avg Score', value: `${avgScore.toFixed(1)}%`, icon: Target, color: 'text-amber-500' },
    { label: 'Completion', value: `${completionRate.toFixed(0)}%`, icon: TrendingUp, color: 'text-blue-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-muted ${stat.color}`}>
            <stat.icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
