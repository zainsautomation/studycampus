import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Megaphone,
  Calendar,
  HelpCircle,
  MessageSquare,
  GitPullRequest,
  Activity,
  Filter,
  Download,
  Search,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'note' | 'announcement' | 'update' | 'question' | 'post' | 'request';
  title: string;
  created_at: string;
  status?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setIsLoading(true);

    const [notes, announcements, updates, questions, posts, requests] = await Promise.all([
      supabase.from('notes').select('id, title, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('announcements').select('id, title, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('updates').select('id, title, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('questions').select('id, title, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('posts').select('id, content, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('requests').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(50),
    ]);

    const allActivities: ActivityItem[] = [
      ...(notes.data || []).map((n) => ({ ...n, type: 'note' as const })),
      ...(announcements.data || []).map((a) => ({ ...a, type: 'announcement' as const })),
      ...(updates.data || []).map((u) => ({ ...u, type: 'update' as const })),
      ...(questions.data || []).map((q) => ({ ...q, type: 'question' as const })),
      ...(posts.data || []).map((p) => ({
        id: p.id,
        title: p.content.slice(0, 60) + (p.content.length > 60 ? '...' : ''),
        created_at: p.created_at,
        type: 'post' as const,
      })),
      ...(requests.data || []).map((r) => ({ ...r, type: 'request' as const })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setActivities(allActivities);
    setIsLoading(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <FileText className="w-4 h-4 text-accent" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-warning" />;
      case 'update':
        return <Calendar className="w-4 h-4 text-primary" />;
      case 'question':
        return <HelpCircle className="w-4 h-4 text-blue-500" />;
      case 'post':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'request':
        return <GitPullRequest className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'note':
        return 'bg-accent/10';
      case 'announcement':
        return 'bg-warning/10';
      case 'update':
        return 'bg-primary/10';
      case 'question':
        return 'bg-blue-500/10';
      case 'post':
        return 'bg-purple-500/10';
      case 'request':
        return 'bg-orange-500/10';
      default:
        return 'bg-muted';
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesFilter = filter === 'all' || activity.type === filter;
    const matchesSearch = activity.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const exportToCSV = () => {
    const headers = ['Type', 'Title', 'Status', 'Created At'];
    const rows = filteredActivities.map((a) => [
      a.type,
      a.title.replace(/,/g, ';'),
      a.status || '-',
      format(new Date(a.created_at), 'yyyy-MM-dd HH:mm:ss'),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Activity Log" description="View all activity across the platform">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        {/* Filters */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activity..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="note">Notes</SelectItem>
                      <SelectItem value="announcement">Announcements</SelectItem>
                      <SelectItem value="update">Updates</SelectItem>
                      <SelectItem value="question">Questions</SelectItem>
                      <SelectItem value="post">Posts</SelectItem>
                      <SelectItem value="request">Requests</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={exportToCSV} className="gap-2">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity List */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                All Activity
                <Badge variant="secondary" className="ml-2">
                  {filteredActivities.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredActivities.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No activity found
                </p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredActivities.map((activity, index) => (
                    <motion.div
                      key={`${activity.type}-${activity.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs py-0 h-5 capitalize">
                            {activity.type}
                          </Badge>
                          {activity.status && (
                            <Badge variant="secondary" className="text-xs py-0 h-5">
                              {activity.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
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
