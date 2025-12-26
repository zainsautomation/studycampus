import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download,
  Bookmark,
  FileText,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';

interface TopNote {
  id: string;
  title: string;
  download_count: number;
  bookmark_count: number;
}

interface Stats {
  totalDownloads: number;
  totalBookmarks: number;
  totalNotes: number;
  totalStudents: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const chartConfig = {
  downloads: {
    label: "Downloads",
    color: "hsl(var(--primary))",
  },
  bookmarks: {
    label: "Bookmarks",
    color: "hsl(var(--accent))",
  },
};

export default function Analytics() {
  const [stats, setStats] = useState<Stats>({
    totalDownloads: 0,
    totalBookmarks: 0,
    totalNotes: 0,
    totalStudents: 0,
  });
  const [topDownloadedNotes, setTopDownloadedNotes] = useState<TopNote[]>([]);
  const [topBookmarkedNotes, setTopBookmarkedNotes] = useState<TopNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Fetch counts
      const [notesRes, bookmarksRes, studentsRes] = await Promise.all([
        supabase.from('notes').select('id, download_count'),
        supabase.from('saved_notes').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      ]);

      const totalDownloads = notesRes.data?.reduce((sum, note) => sum + (note.download_count || 0), 0) || 0;

      setStats({
        totalNotes: notesRes.data?.length || 0,
        totalDownloads,
        totalBookmarks: bookmarksRes.count || 0,
        totalStudents: studentsRes.count || 0,
      });

      // Fetch top downloaded notes
      const { data: topDownloaded } = await supabase
        .from('notes')
        .select('id, title, download_count')
        .order('download_count', { ascending: false })
        .limit(5);

      // Fetch bookmark counts for each note
      const notesWithBookmarks: TopNote[] = [];
      if (topDownloaded) {
        for (const note of topDownloaded) {
          const { count } = await supabase
            .from('saved_notes')
            .select('id', { count: 'exact', head: true })
            .eq('note_id', note.id);
          notesWithBookmarks.push({
            ...note,
            download_count: note.download_count || 0,
            bookmark_count: count || 0,
          });
        }
      }
      setTopDownloadedNotes(notesWithBookmarks);

      // Fetch top bookmarked notes
      const { data: bookmarkCounts } = await supabase
        .from('saved_notes')
        .select('note_id');

      if (bookmarkCounts) {
        const countMap: Record<string, number> = {};
        bookmarkCounts.forEach(b => {
          countMap[b.note_id] = (countMap[b.note_id] || 0) + 1;
        });

        const sortedNoteIds = Object.entries(countMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([id]) => id);

        if (sortedNoteIds.length > 0) {
          const { data: bookmarkedNotes } = await supabase
            .from('notes')
            .select('id, title, download_count')
            .in('id', sortedNoteIds);

          if (bookmarkedNotes) {
            const topBookmarked = sortedNoteIds.map(id => {
              const note = bookmarkedNotes.find(n => n.id === id);
              return {
                id,
                title: note?.title || 'Unknown',
                download_count: note?.download_count || 0,
                bookmark_count: countMap[id],
              };
            });
            setTopBookmarkedNotes(topBookmarked);
          }
        }
      }

      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  const statCards = [
    { label: 'Total Notes', value: stats.totalNotes, icon: FileText, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Total Downloads', value: stats.totalDownloads, icon: Download, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Bookmarks', value: stats.totalBookmarks, icon: Bookmark, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Students', value: stats.totalStudents, icon: Users, color: 'text-success', bg: 'bg-success/10' },
  ];

  const chartColors = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--warning))',
    'hsl(var(--success))',
    'hsl(var(--urgent))',
  ];

  return (
    <AdminLayout title="Analytics" description="View engagement and download statistics">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Analytics Charts */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-4">
          {/* Top Downloaded Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Top Downloaded Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topDownloadedNotes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No download data yet</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={topDownloadedNotes} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="title" 
                      width={120}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="download_count" name="Downloads" radius={[0, 4, 4, 0]}>
                      {topDownloadedNotes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Bookmarked Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-warning" />
                Most Saved Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topBookmarkedNotes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No bookmark data yet</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={topBookmarkedNotes} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="title" 
                      width={120}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="bookmark_count" name="Bookmarks" radius={[0, 4, 4, 0]}>
                      {topBookmarkedNotes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Additional Info */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Engagement Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-3xl font-bold text-primary">{stats.totalDownloads}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total Downloads</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-3xl font-bold text-warning">{stats.totalBookmarks}</p>
                  <p className="text-sm text-muted-foreground mt-1">Notes Saved</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-3xl font-bold text-accent">
                    {stats.totalNotes > 0 ? (stats.totalDownloads / stats.totalNotes).toFixed(1) : 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Avg Downloads/Note</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AdminLayout>
  );
}
