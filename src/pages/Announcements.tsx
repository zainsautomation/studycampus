import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, AlertCircle, Pin } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Announcement { id: string; title: string; content: string; priority: string; is_pinned: boolean; created_at: string; }

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    supabase.from('announcements').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => setAnnouncements(data || []));
  }, []);

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent': return { badge: 'bg-urgent text-urgent-foreground', border: 'border-l-urgent' };
      case 'important': return { badge: 'bg-warning text-warning-foreground', border: 'border-l-warning' };
      default: return { badge: 'bg-secondary text-secondary-foreground', border: 'border-l-primary' };
    }
  };

  return (
    <MainLayout>
      <div className="container py-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Announcements</h1>
            <p className="text-muted-foreground mt-1">Stay updated with class notices</p>
          </div>
          {announcements.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No announcements yet</p></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => {
                const styles = getPriorityStyles(announcement.priority);
                return (
                  <motion.div key={announcement.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Card className={`border-l-4 ${styles.border}`}>
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            {announcement.is_pinned && <Pin className="w-4 h-4 text-warning" />}
                            <h3 className="font-semibold text-lg">{announcement.title}</h3>
                          </div>
                          <Badge className={styles.badge}>{announcement.priority}</Badge>
                        </div>
                        <p className="text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                        <p className="text-xs text-muted-foreground mt-4">{format(new Date(announcement.created_at), 'MMMM dd, yyyy • hh:mm a')}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
