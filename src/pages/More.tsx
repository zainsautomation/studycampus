import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bookmark, 
  Megaphone, 
  Calendar, 
  GitPullRequest, 
  Trophy,
  User,
  Settings,
  ChevronRight,
  HelpCircle,
  MoreHorizontal,
  FileText
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';

const allMenuItems = [
  { href: '/qa', label: 'Q&A', icon: HelpCircle, description: 'Ask and answer questions', requires: 'qa' as const },
  { href: '/saved-notes', label: 'Saved Notes', icon: Bookmark, description: 'Your bookmarked notes' },
  { href: '/announcements', label: 'Announcements', icon: Megaphone, description: 'Important updates' },
  { href: '/updates', label: 'Schedule', icon: Calendar, description: 'Upcoming events' },
  { href: '/requests', label: 'Requests', icon: GitPullRequest, description: 'Note & feature requests', requires: 'requests' as const },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, description: 'Top contributors', requires: 'leaderboard' as const },
  { href: '/profile', label: 'My Profile', icon: User, description: 'View your profile' },
  { href: '/terms', label: 'Terms & Conditions', icon: FileText, description: 'Platform usage terms' },
];

export default function More() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 max-w-lg mx-auto">
        {/* Gradient Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <MoreHorizontal className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">More</h1>
            <p className="text-sm text-muted-foreground">Explore all features</p>
          </div>
        </div>
        
        <div className="space-y-2">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={item.href}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                  location.pathname === item.href 
                    ? 'bg-primary/10 text-primary' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${
                  location.pathname === item.href 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </motion.div>
          ))}

          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: menuItems.length * 0.05 }}
            >
              <Link
                to="/admin"
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Admin Panel</p>
                  <p className="text-sm text-muted-foreground">Manage the portal</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
