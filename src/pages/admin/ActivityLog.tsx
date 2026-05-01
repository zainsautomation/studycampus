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
  Users,
  Eye,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'note' | 'announcement' | 'update' | 'question' | 'post' | 'request';
  title: string;
  created_at: string;
  status?: string;
}

interface UserSummary {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  questions: number;
  answers: number;
  posts: number;
  comments: number;
  notes_viewed: number;
  profiles_viewed: number;
}

interface ProfileViewItem {
  viewed_at: string;
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface UserActionItem {
  type: 'question' | 'answer' | 'post' | 'comment' | 'request';
  id: string;
  title: string;
  created_at: string;
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

  // User activity state
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [profileViews, setProfileViews] = useState<ProfileViewItem[]>([]);
  const [userActions, setUserActions] = useState<UserActionItem[]>([]);

  useEffect(() => {
    fetchActivities();
    fetchUsersActivity();
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
      ...(posts.data || []).map((p) => {
        const cleanContent = p.content.replace(/<[^>]*>/g, '').trim();
        return {
          id: p.id,
          title: cleanContent.slice(0, 60) + (cleanContent.length > 60 ? '...' : ''),
          created_at: p.created_at,
          type: 'post' as const,
        };
      }),
      ...(requests.data || []).map((r) => ({ ...r, type: 'request' as const })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setActivities(allActivities);
    setIsLoading(false);
  };

  const fetchUsersActivity = async () => {
    setUsersLoading(true);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, last_seen_at')
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(200);

    if (!profiles) {
      setUsersLoading(false);
      return;
    }

    const userIds = profiles.map((p) => p.id);

    // Aggregate counts in parallel
    const [questions, answers, posts, comments, noteViews, profileViews] = await Promise.all([
      supabase.from('questions').select('user_id').in('user_id', userIds),
      supabase.from('answers').select('user_id').in('user_id', userIds),
      supabase.from('posts').select('user_id').in('user_id', userIds),
      supabase.from('comments').select('user_id').in('user_id', userIds),
      supabase.from('note_views').select('user_id').in('user_id', userIds),
      supabase.from('profile_views').select('viewer_id').in('viewer_id', userIds),
    ]);

    const countBy = (rows: any[] | null, key: string) => {
      const map: Record<string, number> = {};
      (rows || []).forEach((r) => {
        map[r[key]] = (map[r[key]] || 0) + 1;
      });
      return map;
    };

    const qCounts = countBy(questions.data, 'user_id');
    const aCounts = countBy(answers.data, 'user_id');
    const pCounts = countBy(posts.data, 'user_id');
    const cCounts = countBy(comments.data, 'user_id');
    const nvCounts = countBy(noteViews.data, 'user_id');
    const pvCounts = countBy(profileViews.data, 'viewer_id');

    const summaries: UserSummary[] = profiles.map((p) => ({
      ...p,
      questions: qCounts[p.id] || 0,
      answers: aCounts[p.id] || 0,
      posts: pCounts[p.id] || 0,
      comments: cCounts[p.id] || 0,
      notes_viewed: nvCounts[p.id] || 0,
      profiles_viewed: pvCounts[p.id] || 0,
    }));

    setUsers(summaries);
    setUsersLoading(false);
  };

  const openUserDetail = async (user: UserSummary) => {
    setSelectedUser(user);
    setUserDetailLoading(true);
    setProfileViews([]);
    setUserActions([]);

    const [pv, qs, ans, ps, cms, reqs] = await Promise.all([
      supabase
        .from('profile_views')
        .select('viewed_at, viewed_profile_id')
        .eq('viewer_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(30),
      supabase.from('questions').select('id, title, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('answers').select('id, content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('posts').select('id, content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('comments').select('id, content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('requests').select('id, title, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]);

    // Resolve viewed profiles
    const viewedIds = (pv.data || []).map((v) => v.viewed_profile_id);
    let profileMap: Record<string, any> = {};
    if (viewedIds.length > 0) {
      const { data: viewed } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', viewedIds);
      (viewed || []).forEach((p) => {
        profileMap[p.id] = p;
      });
    }

    setProfileViews(
      (pv.data || []).map((v) => ({
        viewed_at: v.viewed_at,
        profile: profileMap[v.viewed_profile_id] || null,
      }))
    );

    const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').trim();
    const truncate = (s: string, n = 80) => (s.length > n ? s.slice(0, n) + '...' : s);

    const actions: UserActionItem[] = [
      ...(qs.data || []).map((q) => ({ type: 'question' as const, id: q.id, title: q.title, created_at: q.created_at })),
      ...(ans.data || []).map((a) => ({ type: 'answer' as const, id: a.id, title: truncate(stripHtml(a.content)), created_at: a.created_at })),
      ...(ps.data || []).map((p) => ({ type: 'post' as const, id: p.id, title: truncate(stripHtml(p.content)), created_at: p.created_at })),
      ...(cms.data || []).map((c) => ({ type: 'comment' as const, id: c.id, title: truncate(stripHtml(c.content)), created_at: c.created_at })),
      ...(reqs.data || []).map((r) => ({ type: 'request' as const, id: r.id, title: r.title, created_at: r.created_at })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setUserActions(actions);
    setUserDetailLoading(false);
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
      case 'answer':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
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
      case 'answer':
        return 'bg-green-500/10';
      case 'comment':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesFilter = filter === 'all' || activity.type === filter;
    const matchesSearch = activity.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
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

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <>
      <AdminPageHeader title="Activity Log" description="View all activity across the platform" />
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="all" className="gap-2">
              <Activity className="w-4 h-4" /> All Activity
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" /> User Activity
            </TabsTrigger>
          </TabsList>

          {/* All Activity */}
          <TabsContent value="all" className="space-y-6 mt-6">
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
                    <p className="text-muted-foreground text-sm text-center py-8">No activity found</p>
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
          </TabsContent>

          {/* User Activity */}
          <TabsContent value="users" className="space-y-6 mt-6">
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
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
                    <Users className="w-5 h-5 text-primary" />
                    User Activity
                    <Badge variant="secondary" className="ml-2">
                      {filteredUsers.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No users found</p>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {filteredUsers.map((u, index) => (
                        <motion.button
                          key={u.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => openUserDetail(u)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                        >
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {u.full_name || 'Unknown'}
                              {u.username && (
                                <span className="text-muted-foreground font-normal ml-1">
                                  @{u.username}
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <Badge variant="outline" className="text-xs py-0 h-5">
                                <Eye className="w-3 h-3 mr-1" /> {u.profiles_viewed} profiles
                              </Badge>
                              <Badge variant="outline" className="text-xs py-0 h-5">
                                <FileText className="w-3 h-3 mr-1" /> {u.notes_viewed} notes
                              </Badge>
                              <Badge variant="outline" className="text-xs py-0 h-5">
                                {u.questions + u.answers + u.posts + u.comments} actions
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                              <Clock className="w-3 h-3" />
                              {u.last_seen_at
                                ? formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true })
                                : 'Never'}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* User detail sheet */}
      <Sheet open={!!selectedUser} onOpenChange={(o) => !o && setSelectedUser(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(selectedUser.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <SheetTitle>{selectedUser.full_name || 'Unknown'}</SheetTitle>
                    <SheetDescription>
                      {selectedUser.username ? `@${selectedUser.username}` : 'No username'}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Last seen */}
                <Card variant="flat">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Last visit:</span>
                      <span className="font-medium">
                        {selectedUser.last_seen_at
                          ? format(new Date(selectedUser.last_seen_at), 'MMM dd, yyyy HH:mm')
                          : 'Never'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2">
                  <Card variant="flat">
                    <CardContent className="p-3 text-center">
                      <div className="text-lg font-bold">{selectedUser.profiles_viewed}</div>
                      <div className="text-xs text-muted-foreground">Profiles viewed</div>
                    </CardContent>
                  </Card>
                  <Card variant="flat">
                    <CardContent className="p-3 text-center">
                      <div className="text-lg font-bold">{selectedUser.notes_viewed}</div>
                      <div className="text-xs text-muted-foreground">Notes viewed</div>
                    </CardContent>
                  </Card>
                  <Card variant="flat">
                    <CardContent className="p-3 text-center">
                      <div className="text-lg font-bold">
                        {selectedUser.questions + selectedUser.answers + selectedUser.posts + selectedUser.comments}
                      </div>
                      <div className="text-xs text-muted-foreground">Total actions</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Profiles viewed */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Profiles Viewed
                  </h3>
                  {userDetailLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : profileViews.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No profile views yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {profileViews.map((v, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={v.profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              <UserIcon className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {v.profile?.full_name || 'Deleted user'}
                            </p>
                            {v.profile?.username && (
                              <p className="text-xs text-muted-foreground truncate">
                                @{v.profile.username}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent actions */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Recent Actions
                  </h3>
                  {userDetailLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : userActions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No actions yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {userActions.slice(0, 30).map((a) => (
                        <div
                          key={`${a.type}-${a.id}`}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border"
                        >
                          <div className={`p-1.5 rounded ${getActivityColor(a.type)}`}>
                            {getActivityIcon(a.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{a.title || '(no content)'}</p>
                            <Badge variant="outline" className="text-xs py-0 h-4 mt-0.5 capitalize">
                              {a.type}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
