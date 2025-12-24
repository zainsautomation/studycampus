import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  Megaphone, 
  Calendar, 
  BookOpen, 
  Users,
  ChevronLeft,
  GraduationCap,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/notes', label: 'Notes', icon: FileText },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/updates', label: 'Events', icon: Calendar },
  { href: '/admin/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/admin/users', label: 'Users', icon: Users },
];

const sidebarVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { x: -10, opacity: 0 },
  visible: { x: 0, opacity: 1 }
};

export function AdminSidebar() {
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <motion.aside 
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      className="hidden lg:flex w-64 flex-col border-r border-border bg-card"
    >
      {/* Logo/Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <Link to="/admin" className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-sm">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">Manage everything</p>
            </div>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Back to Portal */}
      <div className="p-3 border-b border-border">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
            Back to Portal
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {adminNavItems.map((item, index) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/admin' && location.pathname.startsWith(item.href));
          return (
            <motion.div key={item.href} variants={itemVariants}>
              <Link
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform",
                  isActive && "scale-110"
                )} />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground"
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Student Portal Admin
        </p>
      </div>
    </motion.aside>
  );
}

export function AdminMobileNav() {
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="lg:hidden border-b border-border bg-card sticky top-0 z-40">
      {/* Mobile Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-sm">Admin Panel</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ChevronLeft className="w-3 h-3" />
              Back to Portal
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Scrollable Nav */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex px-2 py-2 gap-1.5 min-w-max">
          {adminNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/admin' && location.pathname.startsWith(item.href));
            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "gap-1.5 whitespace-nowrap transition-all text-xs px-3",
                    isActive && "shadow-md"
                  )}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
