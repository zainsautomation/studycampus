import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Megaphone, 
  Calendar, 
  ChevronRight,
  Clock,
  AlertCircle,
  FileText,
  LogIn,
  Sparkles
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { RecentlyViewedNotes } from '@/components/dashboard/RecentlyViewedNotes';
import { useQuery } from '@tanstack/react-query';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-data', user?.id ?? 'guest'],
    queryFn: async () => {
      const [announcementsRes, notesRes, updatesRes, announcementsCount, notesCount] = await Promise.all([
        supabase.from('announcements').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
        supabase.from('notes').select('*, subjects(name, color)').order('created_at', { ascending: false }).limit(4),
        supabase.from('updates').select('*').gte('event_date', new Date().toISOString().split('T')[0]).order('event_date', { ascending: true }).limit(4),
        supabase.from('announcements').select('*', { count: 'exact', head: true }),
        supabase.from('notes').select('*', { count: 'exact', head: true }),
      ]);
      return {
        announcements: announcementsRes.data || [],
        notes: notesRes.data || [],
        updates: updatesRes.data || [],
        totalAnnouncements: announcementsCount.count || 0,
        totalNotes: notesCount.count || 0,
      };
    },
  });

  const announcements = data?.announcements || [];
  const notes = data?.notes || [];
  const updates = data?.updates || [];
  const totalAnnouncements = data?.totalAnnouncements || 0;
  const totalNotes = data?.totalNotes || 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-urgent text-urgent-foreground';
      case 'important': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'exam': return 'bg-urgent/10 text-urgent border-urgent/20';
      case 'assignment': return 'bg-warning/10 text-warning border-warning/20';
      case 'holiday': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <MainLayout>
      <div className="container py-6 md:py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Welcome Section */}
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              {user ? 'Welcome back!' : 'Study Materials Portal'} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {user ? 'Stay updated with your class activities' : 'Browse notes, announcements, and stay updated'}
            </p>
          </motion.div>

          {/* Sign In CTA for guests */}
          {!user && (
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-semibold text-lg">Sign in to unlock all features</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Save notes, ask questions, join discussions, and track your progress
                      </p>
                    </div>
                    <Button onClick={() => navigate('/auth')} className="gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Megaphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-7 w-8 mb-1" /> : <p className="text-2xl font-bold">{totalAnnouncements}</p>}
                  <p className="text-xs text-muted-foreground">Announcements</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <BookOpen className="w-5 h-5 text-accent" />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-7 w-8 mb-1" /> : <p className="text-2xl font-bold">{totalNotes}</p>}
                  <p className="text-xs text-muted-foreground">Total Notes</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-7 w-8 mb-1" /> : <p className="text-2xl font-bold">{updates.length}</p>}
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Clock className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{format(new Date(), 'dd')}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(), 'MMM yyyy')}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Announcements Section */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-primary" />
                    Latest Announcements
                  </CardTitle>
                  <Link 
                    to="/announcements" 
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))
                  ) : announcements.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No announcements yet
                    </p>
                  ) : (
                    announcements.map((announcement: any) => (
                      <div
                        key={announcement.id}
                        className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {announcement.is_pinned && (
                                <AlertCircle className="w-3 h-3 text-warning flex-shrink-0" />
                              )}
                              <h4 className="font-medium text-sm truncate">{announcement.title}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {announcement.content}
                            </p>
                          </div>
                          <Badge className={`${getPriorityColor(announcement.priority)} text-xs flex-shrink-0`}>
                            {announcement.priority}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Updates Section */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-warning" />
                    Upcoming Events
                  </CardTitle>
                  <Link 
                    to="/updates" 
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    ))
                  ) : updates.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No upcoming events
                    </p>
                  ) : (
                    updates.map((update: any) => (
                      <div
                        key={update.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className={`px-3 py-2 rounded-lg border text-center ${getEventTypeColor(update.event_type)}`}>
                          <p className="text-lg font-bold leading-none">
                            {format(new Date(update.event_date), 'dd')}
                          </p>
                          <p className="text-xs mt-0.5">
                            {format(new Date(update.event_date), 'MMM')}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{update.title}</h4>
                          <p className="text-xs text-muted-foreground capitalize">
                            {update.event_type}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Notes Section */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" />
                  Recent Notes
                </CardTitle>
                <Link 
                  to="/notes" 
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-4 rounded-lg border border-border space-y-2">
                        <div className="flex items-center gap-3 mb-2">
                          <Skeleton className="w-8 h-8 rounded-lg" />
                          <Skeleton className="h-4 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    ))}
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No notes uploaded yet
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {notes.map((note: any) => (
                      <Link
                        key={note.id}
                        to={`/notes${note.subject_id ? `?subject=${note.subject_id}&note=${note.id}` : `?note=${note.id}`}`}
                        className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors group cursor-pointer block"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                            <FileText className="w-4 h-4 text-accent" />
                          </div>
                          {note.subjects && (
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ borderColor: note.subjects.color, color: note.subjects.color }}
                            >
                              {note.subjects.name}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm truncate">{note.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(note.created_at), 'MMM dd, yyyy')}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recently Viewed Notes */}
          <motion.div variants={itemVariants}>
            <RecentlyViewedNotes />
          </motion.div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
