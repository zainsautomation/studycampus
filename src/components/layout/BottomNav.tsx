import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileQuestion, 
  MessageSquare,
  MoreHorizontal
} from 'lucide-react';
import { useKeyboard } from '@/contexts/KeyboardContext';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/notes', label: 'Notes', icon: BookOpen },
  { href: '/mcq', label: 'MCQ', icon: FileQuestion },
  { href: '/posts', label: 'Posts', icon: MessageSquare },
  { href: '/more', label: 'More', icon: MoreHorizontal },
];

export function BottomNav() {
  const { isKeyboardVisible } = useKeyboard();
  const location = useLocation();

  // Check if current path matches or starts with the nav item path
  const isActive = (href: string) => {
    if (href === '/more') {
      return ['/saved-notes', '/announcements', '/updates', '/requests', '/leaderboard', '/profile', '/qa'].some(
        path => location.pathname.startsWith(path)
      );
    }
    if (href === '/mcq') {
      return location.pathname.startsWith('/mcq');
    }
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <AnimatePresence>
      {!isKeyboardVisible && (
        <motion.nav 
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <div className="flex items-center justify-around h-[60px] px-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="relative flex flex-col items-center justify-center flex-1 h-full tap-highlight-transparent"
                >
                  <motion.div
                    className="relative flex flex-col items-center gap-1 py-1.5 px-3"
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {active && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className="absolute -top-0.5 w-6 h-1 bg-primary rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                    <item.icon 
                      className={`w-[22px] h-[22px] transition-colors duration-200 ${
                        active ? 'text-primary' : 'text-muted-foreground'
                      }`} 
                    />
                    <span 
                      className={`text-[11px] font-medium transition-colors duration-200 ${
                        active ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
