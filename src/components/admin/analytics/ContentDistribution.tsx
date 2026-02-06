import { motion } from 'framer-motion';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { SubjectDistribution } from '@/hooks/useAnalyticsData';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface ContentDistributionProps {
  subjectDistribution: SubjectDistribution[];
  totalNotes: number;
}

const chartConfig: Record<string, { label: string; color: string }> = {};

export function ContentDistribution({ subjectDistribution, totalNotes }: ContentDistributionProps) {
  // Build dynamic config
  const dynamicConfig = subjectDistribution.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.color };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <PieChartIcon className="w-4 h-4 text-accent" />
            </div>
            Content Distribution by Subject
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subjectDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-muted-foreground text-sm">No subject data yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 items-center">
              {/* Donut Chart */}
              <ChartContainer config={dynamicConfig} className="h-[220px] w-full">
                <PieChart>
                  <Pie
                    data={subjectDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="count"
                    nameKey="name"
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {subjectDistribution.map((entry, index) => (
                      <Cell key={`cell-pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>

              {/* Legend List */}
              <div className="space-y-2.5">
                {subjectDistribution.map((subject) => {
                  const percentage = totalNotes > 0
                    ? Math.round((subject.count / totalNotes) * 100)
                    : 0;
                  return (
                    <div key={subject.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="text-sm truncate max-w-[180px]">{subject.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{subject.count} notes</span>
                        <span className="font-medium w-10 text-right">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
