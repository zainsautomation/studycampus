import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday } from 'date-fns';

interface Update { id: string; title: string; description: string; event_type: string; event_date: string; event_time: string | null; }

export default function Updates() {
  const [updates, setUpdates] = useState<Update[]>([]);

  useEffect(() => {
    supabase.from('updates').select('*').order('event_date', { ascending: true }).then(({ data }) => setUpdates(data || []));
  }, []);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'exam': return 'bg-urgent/10 text-urgent border-urgent/30';
      case 'assignment': return 'bg-warning/10 text-warning border-warning/30';
      case 'holiday': return 'bg-success/10 text-success border-success/30';
      case 'event': return 'bg-accent/10 text-accent border-accent/30';
      default: return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  const upcoming = updates.filter(u => !isPast(new Date(u.event_date)) || isToday(new Date(u.event_date)));
  const past = updates.filter(u => isPast(new Date(u.event_date)) && !isToday(new Date(u.event_date)));

  return (
    <MainLayout>
      <div className="container py-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Updates & Events</h1>
            <p className="text-muted-foreground mt-1">Exams, assignments, and important dates</p>
          </div>
          {updates.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No events scheduled</p></CardContent></Card>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div className="space-y-4">
                  <h2 className="font-semibold text-lg">Upcoming</h2>
                  {upcoming.map((update) => (
                    <motion.div key={update.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                      <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`px-4 py-3 rounded-xl border text-center ${getTypeStyles(update.event_type)}`}>
                            <p className="text-2xl font-bold">{format(new Date(update.event_date), 'dd')}</p>
                            <p className="text-xs">{format(new Date(update.event_date), 'MMM')}</p>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{update.title}</h3>
                              <Badge variant="outline" className="capitalize">{update.event_type}</Badge>
                            </div>
                            {update.description && <p className="text-sm text-muted-foreground">{update.description}</p>}
                            {update.event_time && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{update.event_time}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
              {past.length > 0 && (
                <div className="space-y-4 opacity-60">
                  <h2 className="font-semibold text-lg">Past Events</h2>
                  {past.slice(0, 5).map((update) => (
                    <Card key={update.id} className="bg-muted/30">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="px-4 py-3 rounded-xl border border-border text-center">
                          <p className="text-xl font-bold">{format(new Date(update.event_date), 'dd')}</p>
                          <p className="text-xs">{format(new Date(update.event_date), 'MMM')}</p>
                        </div>
                        <div><h3 className="font-medium">{update.title}</h3><Badge variant="outline" className="capitalize mt-1">{update.event_type}</Badge></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
