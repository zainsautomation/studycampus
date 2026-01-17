import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  HelpCircle, 
  MessageSquare,
  MoreHorizontal
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/notes', label: 'Notes', icon: BookOpen },
  { href: '/qa', label: 'Q&A', icon: HelpCircle },
  { href: '/posts', label: 'Posts', icon: MessageSquare },
  { href: '/more', label: 'More', icon: MoreHorizontal },
];

export function BottomNav() {
  const location = useLocation();

  // Check if current path matches or starts with the nav item path
  const isActive = (href: string) => {
    if (href === '/more') {
      return ['/saved-notes', '/announcements', '/updates', '/requests', '/leaderboard', '/profile'].some(
        path => location.pathname.startsWith(path)
      );
    }
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className="relative flex flex-col items-center justify-center flex-1 h-full tap-highlight-transparent"
            >
              <motion.div
                className="relative flex flex-col items-center gap-0.5"
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-1 w-8 h-1 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon 
                  className={`w-5 h-5 transition-colors duration-200 ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`} 
                />
                <span 
                  className={`text-[10px] font-medium transition-colors duration-200 ${
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
    </nav>
  );
}
