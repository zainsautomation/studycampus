import { useEffect, useState, useMemo } from 'react';
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
  User as UserIcon,
  Users as UsersIcon,
  Clock,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface UserInfo {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  last_seen_at?: string | null;
}

interface ActivityItem {
  id: string;
  type: 'note' | 'announcement' | 'update' | 'question' | 'post' | 'request';
  title: string;
  created_at: string;
  status?: string;
  user_id: string | null;
  user?: UserInfo | null;
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
  const [profilesMap, setProfilesMap] = useState<Record<string, UserInfo>>({});
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  useEffect(() => {
    fetchActivities();
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, last_seen_at')
      .order('last_seen_at', { ascending: false, nullsFirst: false });
    setAllUsers((data as UserInfo[]) || []);
  };

  const fetchActivities = async () => {
    setIsLoading(true);

    const [notes, announcements, updates, questions, posts, requests] = await Promise.all([
      supabase.from('notes').select('id, title, created_at, created_by').order('created_at', { ascending: false }).limit(50),
      supabase.from('announcements').select('id, title, created_at, created_by').order('created_at', { ascending: false }).limit(50),
      supabase.from('updates').select('id, title, created_at, created_by').order('created_at', { ascending: false }).limit(50),
      supabase.from('questions').select('id, title, created_at, user_id').order('created_at', { ascending: false }).limit(50),
      supabase.from('posts').select('id, content, created_at, user_id, is_anonymous').order('created_at', { ascending: false }).limit(50),
      supabase.from('requests').select('id, title, status, created_at, user_id, is_anonymous').order('created_at', { ascending: false }).limit(50),
    ]);

    const allActivities: ActivityItem[] = [
      ...(notes.data || []).map((n: any) => ({ id: n.id, title: n.title, created_at: n.created_at, user_id: n.created_by, type: 'note' as const })),
      ...(announcements.data || []).map((a: any) => ({ id: a.id, title: a.title, created_at: a.created_at, user_id: a.created_by, type: 'announcement' as const })),
      ...(updates.data || []).map((u: any) => ({ id: u.id, title: u.title, created_at: u.created_at, user_id: u.created_by, type: 'update' as const })),
      ...(questions.data || []).map((q: any) => ({ id: q.id, title: q.title, created_at: q.created_at, user_id: q.user_id, type: 'question' as const })),
      ...(posts.data || []).map((p: any) => {
        const cleanContent = p.content.replace(/<[^>]*>/g, '').trim();
        return {
          id: p.id,
          title: cleanContent.slice(0, 60) + (cleanContent.length > 60 ? '...' : ''),
          created_at: p.created_at,
          user_id: p.is_anonymous ? null : p.user_id,
          type: 'post' as const,
        };
      }),
      ...(requests.data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        created_at: r.created_at,
        user_id: r.is_anonymous ? null : r.user_id,
        type: 'request' as const,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const uniqueUserIds = Array.from(new Set(allActivities.map((a) => a.user_id).filter(Boolean))) as string[];
    let profMap: Record<string, UserInfo> = {};
    if (uniqueUserIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, last_seen_at')
        .in('id', uniqueUserIds);
      profMap = (profs || []).reduce((acc, p) => {
        acc[p.id] = p as UserInfo;
        return acc;
      }, {} as Record<string, UserInfo>);
    }

    setProfilesMap(profMap);
    setActivities(allActivities.map((a) => ({ ...a, user: a.user_id ? profMap[a.user_id] : null })));
    setIsLoading(false);
  };

  const userOptions = useMemo(() => {
    const map = new Map<string, UserInfo>();
    activities.forEach((a) => {
      if (a.user_id && profilesMap[a.user_id]) {
        map.set(a.user_id, profilesMap[a.user_id]);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.full_name || a.username || '').localeCompare(b.full_name || b.username || '')
    );
  }, [activities, profilesMap]);

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
    const matchesUser = userFilter === 'all' || activity.user_id === userFilter;
    return matchesFilter && matchesSearch && matchesUser;
  });

  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return allUsers;
    return allUsers.filter((u) =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  }, [allUsers, userSearchQuery]);

  const exportToCSV = () => {
    const headers = ['Type', 'Title', 'User', 'Status', 'Created At'];
    const rows = filteredActivities.map((a) => [
      a.type,
      a.title.replace(/,/g, ';'),
      (a.user?.full_name || a.user?.username || (a.user_id ? 'Unknown' : 'Anonymous')).replace(/,/g, ';'),
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

  const getInitials = (u?: UserInfo | null) => {
    const name = u?.full_name || u?.username || '?';
    return name.slice(0, 2).toUpperCase();
  };

  const selectUserAndSwitchTab = (uid: string) => {
    setUserFilter(uid);
    // Trigger tab switch
    const trigger = document.querySelector<HTMLButtonElement>('[data-activity-tab="all"]');
    trigger?.click();
  };

  return (
    <>
      <AdminPageHeader title="Activity Log" description="View all activity across the platform" />
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" data-activity-tab="all" className="gap-2">
              <Activity className="w-4 h-4" /> All Activity
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <UsersIcon className="w-4 h-4" /> Users
            </TabsTrigger>
          </TabsList>

          {/* === ALL ACTIVITY TAB === */}
          <TabsContent value="all" className="space-y-6 mt-0">
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search activity..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                      <Select value={userFilter} onValueChange={setUserFilter}>
                        <SelectTrigger className="w-[200px]">
                          <UserIcon className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="All Users" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          {userOptions.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.username || 'Unknown'}
                            </SelectItem>
                          ))}
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
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <Badge variant="outline" className="text-xs py-0 h-5 capitalize">
                                {activity.type}
                              </Badge>
                              {activity.status && (
                                <Badge variant="secondary" className="text-xs py-0 h-5">
                                  {activity.status}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Avatar className="h-4 w-4">
                                  {activity.user?.avatar_url && <AvatarImage src={activity.user.avatar_url} />}
                                  <AvatarFallback className="text-[8px]">
                                    {activity.user_id ? getInitials(activity.user) : 'A'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[120px]">
                                  {activity.user?.full_name ||
                                    activity.user?.username ||
                                    (activity.user_id ? 'Unknown' : 'Anonymous')}
                                </span>
                              </div>
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
          </TabsContent>

          {/* === USERS TAB === */}
          <TabsContent value="users" className="space-y-6 mt-0">
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name or username..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-primary" />
                    Users by Last Visit
                    <Badge variant="secondary" className="ml-2">
                      {filteredUsers.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredUsers.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No users found
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {filteredUsers.map((u, index) => (
                        <motion.div
                          key={u.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-10 w-10">
                            {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                            <AvatarFallback>{getInitials(u)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {u.full_name || u.username || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span className="truncate">
                                {u.last_seen_at
                                  ? `Last visit ${formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true })}`
                                  : 'Never visited'}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selectUserAndSwitchTab(u.id)}
                          >
                            View activity
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </>
  );
}
