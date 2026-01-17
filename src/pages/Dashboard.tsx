import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Megaphone, 
  Calendar, 
  ChevronRight,
  Clock,
  AlertCircle,
  FileText
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { RecentlyViewedNotes } from '@/components/dashboard/RecentlyViewedNotes';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  is_pinned: boolean;
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  description: string;
  file_name: string;
  created_at: string;
  subject_id: string | null;
  subjects: { name: string; color: string } | null;
}

interface Update {
  id: string;
  title: string;
  description: string;
  event_type: string;
  event_date: string;
}

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch announcements
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch recent notes
      const { data: notesData } = await supabase
        .from('notes')
        .select('*, subjects(name, color)')
        .order('created_at', { ascending: false })
        .limit(4);

      // Fetch upcoming updates
      const { data: updatesData } = await supabase
        .from('updates')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(4);

      setAnnouncements(announcementsData || []);
      setNotes(notesData || []);
      setUpdates(updatesData || []);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-urgent text-urgent-foreground';
      case 'important':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'exam':
        return 'bg-urgent/10 text-urgent border-urgent/20';
      case 'assignment':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'holiday':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
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
              Welcome back! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with your class activities
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Megaphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{announcements.length}</p>
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
                  <p className="text-2xl font-bold">{notes.length}</p>
                  <p className="text-xs text-muted-foreground">Recent Notes</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{updates.length}</p>
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
                  {announcements.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No announcements yet
                    </p>
                  ) : (
                    announcements.map((announcement) => (
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
                  {updates.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No upcoming events
                    </p>
                  ) : (
                    updates.map((update) => (
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
                {notes.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No notes uploaded yet
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {notes.map((note) => (
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
