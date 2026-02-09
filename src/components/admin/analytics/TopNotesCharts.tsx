import { motion } from 'framer-motion';
import { Download, Bookmark, MoveHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { TopNote } from '@/hooks/useAnalyticsData';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const chartColors = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(262 83% 58%)',
];

const chartConfig = {
  downloads: { label: 'Downloads', color: 'hsl(var(--primary))' },
  bookmarks: { label: 'Bookmarks', color: 'hsl(var(--accent))' },
};

interface TopNotesChartsProps {
  topDownloadedNotes: TopNote[];
  topBookmarkedNotes: TopNote[];
}

export function TopNotesCharts({ topDownloadedNotes, topBookmarkedNotes }: TopNotesChartsProps) {
  return (
    <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-4">
      {/* Top Downloaded Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Download className="w-4 h-4 text-primary" />
            </div>
            Top Downloaded Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topDownloadedNotes.length === 0 ? (
            <div className="flex items-center justify-center h-[280px]">
              <p className="text-muted-foreground text-sm">No download data yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
                <div className="min-w-[380px]">
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <BarChart data={topDownloadedNotes} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="title"
                        width={130}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}…` : value}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="download_count" name="Downloads" radius={[0, 6, 6, 0]} barSize={28}>
                        {topDownloadedNotes.map((_, index) => (
                          <Cell key={`cell-dl-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mt-1 md:hidden">
                <MoveHorizontal className="w-3 h-3" />
                <span>Swipe to see more</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top Bookmarked Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <Bookmark className="w-4 h-4 text-warning" />
            </div>
            Most Saved Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topBookmarkedNotes.length === 0 ? (
            <div className="flex items-center justify-center h-[280px]">
              <p className="text-muted-foreground text-sm">No bookmark data yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
                <div className="min-w-[380px]">
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <BarChart data={topBookmarkedNotes} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="title"
                        width={130}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}…` : value}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="bookmark_count" name="Bookmarks" radius={[0, 6, 6, 0]} barSize={28}>
                        {topBookmarkedNotes.map((_, index) => (
                          <Cell key={`cell-bm-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mt-1 md:hidden">
                <MoveHorizontal className="w-3 h-3" />
                <span>Swipe to see more</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
