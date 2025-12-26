import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  FileText, 
  Megaphone, 
  Calendar, 
  TrendingUp,
  Clock,
  Activity,
  Download,
  Bookmark
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface Stats {
  totalNotes: number;
  totalAnnouncements: number;
  totalUpdates: number;
  totalStudents: number;
  totalSubjects: number;
  totalBookmarks: number;
  totalDownloads: number;
}

interface RecentActivity {
  id: string;
  type: 'note' | 'announcement' | 'update';
  title: string;
  created_at: string;
}

interface TopNote {
  id: string;
  title: string;
  download_count: number;
  bookmark_count: number;
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalNotes: 0,
    totalAnnouncements: 0,
    totalUpdates: 0,
    totalStudents: 0,
    totalSubjects: 0,
    totalBookmarks: 0,
    totalDownloads: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topDownloadedNotes, setTopDownloadedNotes] = useState<TopNote[]>([]);
  const [topBookmarkedNotes, setTopBookmarkedNotes] = useState<TopNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch counts
      const [notesRes, announcementsRes, updatesRes, studentsRes, subjectsRes, bookmarksRes] = await Promise.all([
        supabase.from('notes').select('id, download_count'),
        supabase.from('announcements').select('id', { count: 'exact', head: true }),
        supabase.from('updates').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('saved_notes').select('id', { count: 'exact', head: true }),
      ]);

      const totalDownloads = notesRes.data?.reduce((sum, note) => sum + (note.download_count || 0), 0) || 0;

      setStats({
        totalNotes: notesRes.data?.length || 0,
        totalAnnouncements: announcementsRes.count || 0,
        totalUpdates: updatesRes.count || 0,
        totalStudents: studentsRes.count || 0,
        totalSubjects: subjectsRes.count || 0,
        totalBookmarks: bookmarksRes.count || 0,
        totalDownloads,
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

      // Fetch recent activity
      const [recentNotes, recentAnnouncements, recentUpdates] = await Promise.all([
        supabase.from('notes').select('id, title, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('announcements').select('id, title, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('updates').select('id, title, created_at').order('created_at', { ascending: false }).limit(3),
      ]);

      const activities: RecentActivity[] = [
        ...(recentNotes.data || []).map(n => ({ ...n, type: 'note' as const })),
        ...(recentAnnouncements.data || []).map(a => ({ ...a, type: 'announcement' as const })),
        ...(recentUpdates.data || []).map(u => ({ ...u, type: 'update' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

      setRecentActivity(activities);
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note': return <FileText className="w-4 h-4 text-accent" />;
      case 'announcement': return <Megaphone className="w-4 h-4 text-warning" />;
      case 'update': return <Calendar className="w-4 h-4 text-primary" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const statCards = [
    { label: 'Total Notes', value: stats.totalNotes, icon: FileText, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Total Downloads', value: stats.totalDownloads, icon: Download, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Bookmarks', value: stats.totalBookmarks, icon: Bookmark, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Students', value: stats.totalStudents, icon: Users, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Subjects', value: stats.totalSubjects, icon: TrendingUp, color: 'text-urgent', bg: 'bg-urgent/10' },
  ];

  const chartColors = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--warning))',
    'hsl(var(--success))',
    'hsl(var(--urgent))',
  ];

  return (
    <AdminLayout title="Admin Dashboard" description="Manage your class portal">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

          {/* Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="p-2 rounded-lg bg-muted">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{activity.type}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
      </motion.div>
    </AdminLayout>
  );
}
