import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sun,
  BarChart3,
  HelpCircle,
  MessageSquare,
  GitPullRequest,
  Settings,
  ChevronDown,
  Download,
  EyeOff,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from '@/hooks/useTheme';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

const adminNavGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ]
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/notes', label: 'Notes', icon: FileText },
      { href: '/admin/mcq', label: 'MCQ Tests', icon: HelpCircle },
      { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/admin/updates', label: 'Events', icon: Calendar },
      { href: '/admin/subjects', label: 'Subjects', icon: BookOpen },
    ]
  },
  {
    label: 'Community',
    items: [
      { href: '/admin/qa', label: 'Q&A', icon: HelpCircle },
      { href: '/admin/posts', label: 'Posts', icon: MessageSquare },
      { href: '/admin/requests', label: 'Requests', icon: GitPullRequest },
    ]
  },
  {
    label: 'Management',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/moderation', label: 'Moderation', icon: Shield, showPendingBadge: true },
    ]
  },
];

const allNavItems = adminNavGroups.flatMap(group => group.items);

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
  const { settings, updateSetting } = useAppSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);

  // Fetch pending reports count
  useEffect(() => {
    const fetchPendingReports = async () => {
      const { count } = await supabase
        .from('moderation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingReports(count || 0);
    };
    
    fetchPendingReports();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('moderation_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation_queue' }, fetchPendingReports)
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <motion.aside 
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      className="hidden lg:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-sm h-screen sticky top-0"
    >
      {/* Logo/Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <Link to="/admin" className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
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
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={resolvedTheme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </motion.div>
            </AnimatePresence>
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
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {adminNavGroups.map((group) => (
          <motion.div key={group.label} variants={itemVariants}>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const showBadge = 'showPendingBadge' in item && item.showPendingBadge && pendingReports > 0;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                      active
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                    )}
                  >
                    <item.icon className={cn(
                      "w-4 h-4 transition-transform group-hover:scale-110",
                      !active && "group-hover:text-primary"
                    )} />
                    {item.label}
                    {showBadge && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto h-5 min-w-[20px] px-1.5 text-xs flex items-center justify-center"
                      >
                        {pendingReports > 99 ? '99+' : pendingReports}
                      </Badge>
                    )}
                    {active && !showBadge && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ))}
      </nav>

      {/* Settings Panel */}
      <div className="border-t border-border">
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Settings className="h-4 w-4" />
                <span>Feature Settings</span>
              </div>
              <motion.div
                animate={{ rotate: settingsOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 pb-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Label htmlFor="posts-toggle" className="text-sm flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Posts
                </Label>
                <Switch
                  id="posts-toggle"
                  checked={settings.posts_enabled}
                  onCheckedChange={(checked) => updateSetting.mutate({ key: 'posts_enabled', value: checked })}
                />
              </div>
              {settings.posts_enabled && (
                <div className="flex items-center justify-between pl-6">
                  <Label htmlFor="post-creation-toggle" className="text-xs flex items-center gap-2 cursor-pointer text-muted-foreground">
                    New Posts
                  </Label>
                  <Switch
                    id="post-creation-toggle"
                    checked={settings.post_creation_enabled}
                    onCheckedChange={(checked) => updateSetting.mutate({ key: 'post_creation_enabled', value: checked })}
                    className="scale-90"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="qa-toggle" className="text-sm flex items-center gap-2 cursor-pointer">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Q&A
                </Label>
                <Switch
                  id="qa-toggle"
                  checked={settings.qa_enabled}
                  onCheckedChange={(checked) => updateSetting.mutate({ key: 'qa_enabled', value: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="requests-toggle" className="text-sm flex items-center gap-2 cursor-pointer">
                  <GitPullRequest className="h-3.5 w-3.5" />
                  Requests
                </Label>
                <Switch
                  id="requests-toggle"
                  checked={settings.requests_enabled}
                  onCheckedChange={(checked) => updateSetting.mutate({ key: 'requests_enabled', value: checked })}
                />
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <Label htmlFor="downloads-toggle" className="text-sm flex items-center gap-2 cursor-pointer">
                  <Download className="h-3.5 w-3.5" />
                  Downloads
                </Label>
                <Switch
                  id="downloads-toggle"
                  checked={settings.downloads_enabled}
                  onCheckedChange={(checked) => updateSetting.mutate({ key: 'downloads_enabled', value: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="anonymous-toggle" className="text-sm flex items-center gap-2 cursor-pointer">
                  <EyeOff className="h-3.5 w-3.5" />
                  Anonymous Posts
                </Label>
                <Switch
                  id="anonymous-toggle"
                  checked={settings.anonymous_posts_enabled}
                  onCheckedChange={(checked) => updateSetting.mutate({ key: 'anonymous_posts_enabled', value: checked })}
                />
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </div>

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
  const { settings, updateSetting } = useAppSettings();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);

  // Fetch pending reports count
  useEffect(() => {
    const fetchPendingReports = async () => {
      const { count } = await supabase
        .from('moderation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingReports(count || 0);
    };
    
    fetchPendingReports();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('moderation_updates_mobile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation_queue' }, fetchPendingReports)
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  // Get current page title
  const currentPage = allNavItems.find(item => isActive(item.href));

  return (
    <div className="lg:hidden border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-40">
      {/* Mobile Header */}
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                    <GraduationCap className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <SheetTitle className="text-left">Admin Panel</SheetTitle>
                    <p className="text-xs text-muted-foreground">Manage everything</p>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 h-[calc(100vh-180px)]">
                <nav className="p-3 space-y-4">
                  {adminNavGroups.map((group) => (
                    <div key={group.label}>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
                        {group.label}
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const active = isActive(item.href);
                          const showBadge = 'showPendingBadge' in item && item.showPendingBadge && pendingReports > 0;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setIsSheetOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all',
                                active
                                  ? 'bg-primary text-primary-foreground shadow-md'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                              )}
                            >
                              <item.icon className="w-5 h-5" />
                              {item.label}
                              {showBadge && (
                                <Badge 
                                  variant="destructive" 
                                  className="ml-auto h-5 min-w-[20px] px-1.5 text-xs"
                                >
                                  {pendingReports > 99 ? '99+' : pendingReports}
                                </Badge>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
              </ScrollArea>

              {/* Feature Settings in Sheet */}
              <div className="border-t border-border p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase">Quick Settings</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <Label className="text-xs">Posts</Label>
                    <Switch
                      checked={settings.posts_enabled}
                      onCheckedChange={(checked) => updateSetting.mutate({ key: 'posts_enabled', value: checked })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <Label className="text-xs">Q&A</Label>
                    <Switch
                      checked={settings.qa_enabled}
                      onCheckedChange={(checked) => updateSetting.mutate({ key: 'qa_enabled', value: checked })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <Label className="text-xs">Requests</Label>
                    <Switch
                      checked={settings.requests_enabled}
                      onCheckedChange={(checked) => updateSetting.mutate({ key: 'requests_enabled', value: checked })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <Label className="text-xs">Downloads</Label>
                    <Switch
                      checked={settings.downloads_enabled}
                      onCheckedChange={(checked) => updateSetting.mutate({ key: 'downloads_enabled', value: checked })}
                      className="scale-75"
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-sm truncate block">
                {currentPage?.label || 'Admin'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
