import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  FileText, 
  Megaphone, 
  Calendar, 
  TrendingUp,
  Clock,
  Activity,
  HelpCircle,
  MessageSquare,
  GitPullRequest,
  Plus,
  ArrowRight,
  Download,
  Bookmark
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Stats {
  totalNotes: number;
  totalAnnouncements: number;
  totalUpdates: number;
  totalStudents: number;
  totalSubjects: number;
  totalQuestions: number;
  resolvedQuestions: number;
  totalPosts: number;
  pendingRequests: number;
  totalDownloads: number;
  totalBookmarks: number;
}

interface RecentActivity {
  id: string;
  type: 'note' | 'announcement' | 'update' | 'question' | 'post' | 'request';
  title: string;
  created_at: string;
  status?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalNotes: 0,
    totalAnnouncements: 0,
    totalUpdates: 0,
    totalStudents: 0,
    totalSubjects: 0,
    totalQuestions: 0,
    resolvedQuestions: 0,
    totalPosts: 0,
    pendingRequests: 0,
    totalDownloads: 0,
    totalBookmarks: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch counts
      const [
        notesRes, 
        announcementsRes, 
        updatesRes, 
        studentsRes, 
        subjectsRes,
        questionsRes,
        resolvedQuestionsRes,
        postsRes,
        pendingRequestsRes,
        savedNotesRes
      ] = await Promise.all([
        supabase.from('notes').select('id, download_count', { count: 'exact' }),
        supabase.from('announcements').select('id', { count: 'exact', head: true }),
        supabase.from('updates').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('is_resolved', true),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('saved_notes').select('id', { count: 'exact', head: true }),
      ]);

      // Calculate total downloads
      const totalDownloads = (notesRes.data || []).reduce((sum, note) => sum + (note.download_count || 0), 0);

      setStats({
        totalNotes: notesRes.count || 0,
        totalAnnouncements: announcementsRes.count || 0,
        totalUpdates: updatesRes.count || 0,
        totalStudents: studentsRes.count || 0,
        totalSubjects: subjectsRes.count || 0,
        totalQuestions: questionsRes.count || 0,
        resolvedQuestions: resolvedQuestionsRes.count || 0,
        totalPosts: postsRes.count || 0,
        pendingRequests: pendingRequestsRes.count || 0,
        totalDownloads: totalDownloads,
        totalBookmarks: savedNotesRes.count || 0,
      });

      // Fetch recent activity (including community content)
      const [recentNotes, recentAnnouncements, recentQuestions, recentPosts, recentRequests] = await Promise.all([
        supabase.from('notes').select('id, title, created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('announcements').select('id, title, created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('questions').select('id, title, created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('posts').select('id, content, created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('requests').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(2),
      ]);

      const activities: RecentActivity[] = [
        ...(recentNotes.data || []).map(n => ({ ...n, type: 'note' as const })),
        ...(recentAnnouncements.data || []).map(a => ({ ...a, type: 'announcement' as const })),
        ...(recentQuestions.data || []).map(q => ({ ...q, type: 'question' as const })),
        ...(recentPosts.data || []).map(p => ({ id: p.id, title: p.content.slice(0, 50) + (p.content.length > 50 ? '...' : ''), created_at: p.created_at, type: 'post' as const })),
        ...(recentRequests.data || []).map(r => ({ ...r, type: 'request' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

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
      case 'question': return <HelpCircle className="w-4 h-4 text-blue-500" />;
      case 'post': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'request': return <GitPullRequest className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'note': return 'bg-accent/10';
      case 'announcement': return 'bg-warning/10';
      case 'update': return 'bg-primary/10';
      case 'question': return 'bg-blue-500/10';
      case 'post': return 'bg-purple-500/10';
      case 'request': return 'bg-orange-500/10';
      default: return 'bg-muted';
    }
  };

  const quickActions = [
    { label: 'Add Note', href: '/admin/notes', icon: FileText, color: 'bg-accent/10 text-accent hover:bg-accent/20' },
    { label: 'New Announcement', href: '/admin/announcements', icon: Megaphone, color: 'bg-warning/10 text-warning hover:bg-warning/20' },
    { label: 'Add Event', href: '/admin/updates', icon: Calendar, color: 'bg-primary/10 text-primary hover:bg-primary/20' },
    { label: 'View Requests', href: '/admin/requests', icon: GitPullRequest, color: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20' },
  ];

  return (
    <AdminLayout title="Admin Dashboard" description="Overview of your class portal">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link key={action.label} to={action.href}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 p-4 rounded-xl border border-border transition-colors ${action.color}`}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{action.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Main Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalNotes}</p>
                  <p className="text-xs text-muted-foreground">Notes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Users className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <HelpCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalQuestions}</p>
                  <p className="text-xs text-muted-foreground">Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <MessageSquare className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalPosts}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <GitPullRequest className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
              {stats.pendingRequests > 0 && (
                <div className="absolute top-2 right-2">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Community & Engagement Stats */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolution Rate</p>
                  <p className="text-2xl font-bold">
                    {stats.totalQuestions > 0 
                      ? Math.round((stats.resolvedQuestions / stats.totalQuestions) * 100) 
                      : 0}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.resolvedQuestions} of {stats.totalQuestions} questions resolved
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Downloads</p>
                  <p className="text-2xl font-bold">{stats.totalDownloads}</p>
                </div>
                <div className="p-3 rounded-full bg-accent/10">
                  <Download className="w-5 h-5 text-accent" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all notes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookmarks</p>
                  <p className="text-2xl font-bold">{stats.totalBookmarks}</p>
                </div>
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Bookmark className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Notes saved by students
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Content</p>
                  <p className="text-2xl font-bold">{stats.totalAnnouncements + stats.totalUpdates}</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Megaphone className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalAnnouncements} announcements, {stats.totalUpdates} events
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <Link to="/admin/activity">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    View All
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((activity, index) => (
                    <motion.div 
                      key={`${activity.type}-${activity.id}`} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground capitalize">{activity.type}</span>
                          {activity.status && (
                            <Badge variant="outline" className="text-xs py-0 h-5">{activity.status}</Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                      </span>
                    </motion.div>
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
