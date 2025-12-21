import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  FileText, 
  Megaphone, 
  Calendar, 
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Stats {
  totalNotes: number;
  totalAnnouncements: number;
  totalUpdates: number;
  totalStudents: number;
  totalSubjects: number;
}

interface RecentActivity {
  id: string;
  type: 'note' | 'announcement' | 'update';
  title: string;
  created_at: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch counts
      const [notesRes, announcementsRes, updatesRes, studentsRes, subjectsRes] = await Promise.all([
        supabase.from('notes').select('id', { count: 'exact', head: true }),
        supabase.from('announcements').select('id', { count: 'exact', head: true }),
        supabase.from('updates').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalNotes: notesRes.count || 0,
        totalAnnouncements: announcementsRes.count || 0,
        totalUpdates: updatesRes.count || 0,
        totalStudents: studentsRes.count || 0,
        totalSubjects: subjectsRes.count || 0,
      });

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
    { label: 'Announcements', value: stats.totalAnnouncements, icon: Megaphone, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Events', value: stats.totalUpdates, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Students', value: stats.totalStudents, icon: Users, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Subjects', value: stats.totalSubjects, icon: TrendingUp, color: 'text-urgent', bg: 'bg-urgent/10' },
  ];

  return (
    <MainLayout>
      <div className="container py-6 md:py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your class portal</p>
          </motion.div>

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
      </div>
    </MainLayout>
  );
}
