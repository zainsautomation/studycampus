import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, FileQuestion, Megaphone, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWhatsNew, WhatsNewItem } from '@/hooks/useWhatsNew';
import { useAuth } from '@/hooks/useAuth';

const typeIcon = {
  note: BookOpen,
  mcq: FileQuestion,
  announcement: Megaphone,
  update: Calendar,
};

const typeLabel = {
  note: 'New Note',
  mcq: 'New MCQ',
  announcement: 'Announcement',
  update: 'Event',
};

const typeHref = (item: WhatsNewItem) => {
  switch (item.type) {
    case 'note': return `/notes?note=${item.id}`;
    case 'mcq': return `/mcq`;
    case 'announcement': return `/announcements`;
    case 'update': return `/updates`;
  }
};

export function WhatsNewButton() {
  const { user } = useAuth();
  const { items, count, markAsRead } = useWhatsNew();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && count > 0) {
      // Mark as read a moment later so user can see the list before it clears
      setTimeout(() => markAsRead(), 800);
    }
  };

  const displayCount = count > 9 ? '9+' : String(count);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          aria-label={`What's New${count > 0 ? ` (${count} new)` : ''}`}
        >
          <Sparkles className="w-5 h-5" />
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
              >
                {displayCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0" sideOffset={8}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">What's New</h3>
            {count > 0 && <Badge variant="secondary" className="ml-auto text-xs">{count}</Badge>}
          </div>
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">✨</div>
              <p className="text-sm font-medium">You're all caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll let you know when new content is added.
              </p>
            </div>
          ) : (
            <div className="py-1">
              {items.map((item) => {
                const Icon = typeIcon[item.type];
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={typeHref(item)}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                          {typeLabel[item.type]}
                        </span>
                        {item.subtitle && (
                          <span className="text-[10px] text-muted-foreground">
                            · {item.subtitle}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {items.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => { markAsRead(); setOpen(false); }}
            >
              Mark all as read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
