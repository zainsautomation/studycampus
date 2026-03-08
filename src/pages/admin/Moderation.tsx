import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  HelpCircle,
  FileText,
  Eye,
  Trash2,
  Clock,
  Flag,
  Ban,
  User,
  Lock,
  ExternalLink,
  ImageIcon
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextDisplay } from '@/components/ui/rich-text-display';
import { ImageViewerDialog } from '@/components/ui/ImageViewerDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { useGoogleDriveContext } from '@/contexts/GoogleDriveContext';

// Helper to extract Google Drive file ID from various URL formats
const extractGoogleDriveFileId = (url: string): string | null => {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /thumbnail\?id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

interface AuthorInfo {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  isAnonymous?: boolean;
  user_id?: string;
}

interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  reported_by: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter?: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
  content?: any;
  author?: AuthorInfo | null;
  reportCount?: number;
  authorWarningCount?: number;
}

interface ModerationStats {
  pending: number;
  resolvedToday: number;
  removed: number;
  dismissed: number;
}

const contentTypeIcons: Record<string, React.ElementType> = {
  post: FileText,
  question: HelpCircle,
  answer: MessageSquare,
  comment: MessageSquare,
};

const contentTypeLabels: Record<string, string> = {
  post: 'Post',
  question: 'Question',
  answer: 'Answer',
  comment: 'Comment',
};

const reasonLabels: Record<string, string> = {
  spam: 'Spam or misleading',
  inappropriate: 'Inappropriate content',
  harassment: 'Harassment or bullying',
  misinformation: 'Misinformation',
  other: 'Other',
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Pending' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Dismissed' },
  removed: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Removed' },
  warned: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', label: 'Warned' },
};

export default function Moderation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSignedIn } = useGoogleDriveContext();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<ModerationStats>({ pending: 0, resolvedToday: 0, removed: 0, dismissed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<string | 'all' | null>(null);
  useEffect(() => {
    fetchModerationQueue();
    fetchStats();
  }, [filter]);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingRes, resolvedRes, removedRes, dismissedRes] = await Promise.all([
      supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).gte('reviewed_at', today.toISOString()).neq('status', 'pending'),
      supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).eq('status', 'removed'),
      supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    ]);

    setStats({
      pending: pendingRes.count || 0,
      resolvedToday: resolvedRes.count || 0,
      removed: removedRes.count || 0,
      dismissed: dismissedRes.count || 0,
    });
  };

  const fetchModerationQueue = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('moderation_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query = query.eq('status', 'pending');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching moderation queue:', error);
    } else {
      // Fetch reporter profiles, content, author, and report count for each item
      const itemsWithDetails = await Promise.all(
        (data || []).map(async (item) => {
          // Get reporter info
          const { data: reporter } = await supabase
            .from('profiles')
            .select('full_name, username, avatar_url')
            .eq('id', item.reported_by)
            .single();

          // Get report count for this content
          const { count: reportCount } = await supabase
            .from('moderation_queue')
            .select('id', { count: 'exact', head: true })
            .eq('content_id', item.content_id);

          // Get reported content and author - ALWAYS get real author for admin
          let content = null;
          let author: AuthorInfo | null = null;
          let authorWarningCount = 0;
          
          if (item.content_type === 'post') {
            const { data: post } = await supabase
              .from('posts')
              .select('content, user_id, is_anonymous, image_url, category, created_at')
              .eq('id', item.content_id)
              .single();
            content = post;
            
            // ALWAYS fetch real author profile for admin view
            if (post) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', post.user_id)
                .single();
              author = profile ? { ...profile, isAnonymous: post.is_anonymous, user_id: post.user_id } : null;
              
              // Get author's warning history
              const { count } = await supabase
                .from('moderation_queue')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'removed')
                .in('content_id', (await supabase.from('posts').select('id').eq('user_id', post.user_id)).data?.map(p => p.id) || []);
              authorWarningCount = count || 0;
            }
          } else if (item.content_type === 'question') {
            const { data: question } = await supabase
              .from('questions')
              .select('title, content, user_id, is_anonymous, created_at')
              .eq('id', item.content_id)
              .single();
            content = question;
            
            if (question) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', question.user_id)
                .single();
              author = profile ? { ...profile, isAnonymous: question.is_anonymous, user_id: question.user_id } : null;
            }
          } else if (item.content_type === 'answer') {
            const { data: answer } = await supabase
              .from('answers')
              .select('content, user_id, created_at')
              .eq('id', item.content_id)
              .single();
            content = answer;
            
            if (answer) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', answer.user_id)
                .single();
              author = profile ? { ...profile, isAnonymous: false, user_id: answer.user_id } : null;
            }
          } else if (item.content_type === 'comment') {
            const { data: comment } = await supabase
              .from('comments')
              .select('content, user_id, created_at')
              .eq('id', item.content_id)
              .single();
            content = comment;
            
            if (comment) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', comment.user_id)
                .single();
              author = profile ? { ...profile, isAnonymous: false, user_id: comment.user_id } : null;
            }
          }

          return { ...item, reporter, content, author, reportCount: reportCount || 1, authorWarningCount };
        })
      );

      setItems(itemsWithDetails);
    }
    setIsLoading(false);
  };

  const handleQuickAction = async (item: ModerationItem, action: 'approved' | 'removed') => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      // Update moderation queue
      await supabase
        .from('moderation_queue')
        .update({
          status: action,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          action_taken: action,
        })
        .eq('id', item.id);

      // If removing content, delete it
      if (action === 'removed' && item.content) {
        await deleteContent(item);
      }

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: `moderation_${action}`,
        resource_type: item.content_type,
        resource_id: item.content_id,
        details: { reason: item.reason, action },
      });

      toast({ title: 'Action completed', description: `Report ${action === 'approved' ? 'dismissed' : 'content removed'}` });
      fetchModerationQueue();
      fetchStats();
    } catch (error: any) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteContent = async (item: ModerationItem) => {
    const table = item.content_type === 'post' ? 'posts' 
      : item.content_type === 'question' ? 'questions'
      : item.content_type === 'answer' ? 'answers'
      : 'comments';
    
    // If it's a post, also delete the associated image from storage
    if (item.content_type === 'post') {
      const { data: post } = await supabase
        .from('posts')
        .select('image_url')
        .eq('id', item.content_id)
        .single();
      
      if (post?.image_url) {
        // Handle Supabase storage
        if (post.image_url.includes('supabase') && post.image_url.includes('/post-images/')) {
          try {
            const urlParts = post.image_url.split('/post-images/');
            if (urlParts[1]) {
              const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
              await supabase.storage.from('post-images').remove([filePath]);
            }
          } catch (storageError) {
            console.error('Failed to delete image from Supabase storage:', storageError);
          }
        }
        // Handle Google Drive
        else if (post.image_url.includes('drive.google.com') || post.image_url.includes('googleapis.com')) {
          const fileId = extractGoogleDriveFileId(post.image_url);
          if (fileId && isSignedIn && window.gapi?.client?.drive) {
            try {
              await window.gapi.client.drive.files.update({ fileId, resource: { trashed: true } });
            } catch (driveError) {
              console.error('Failed to delete image from Google Drive:', driveError);
            }
          }
        }
      }
    }
    
    await supabase.from(table).delete().eq('id', item.content_id);
  };

  const handleAction = async () => {
    if (!selectedItem || !selectedAction || !user) return;

    setIsProcessing(true);
    try {
      // Update moderation queue
      await supabase
        .from('moderation_queue')
        .update({
          status: selectedAction,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          action_taken: selectedAction,
        })
        .eq('id', selectedItem.id);

      // If removing content, delete it
      if (selectedAction === 'removed' && selectedItem.content) {
        await deleteContent(selectedItem);
      }

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: `moderation_${selectedAction}`,
        resource_type: selectedItem.content_type,
        resource_id: selectedItem.content_id,
        details: { reason: selectedItem.reason, action: selectedAction },
      });

      toast({ title: 'Action completed', description: `Report marked as ${selectedAction}` });
      setIsActionDialogOpen(false);
      setSelectedItem(null);
      setSelectedAction('');
      fetchModerationQueue();
      fetchStats();
    } catch (error: any) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearCase = (itemId: string) => {
    setClearTarget(itemId);
    setClearConfirmOpen(true);
  };

  const handleClearAllResolved = () => {
    setClearTarget('all');
    setClearConfirmOpen(true);
  };

  const confirmClear = async () => {
    if (!clearTarget) return;
    setIsProcessing(true);
    try {
      if (clearTarget === 'all') {
        await supabase.from('moderation_queue').delete().neq('status', 'pending');
        toast({ title: 'All resolved cases cleared' });
      } else {
        await supabase.from('moderation_queue').delete().eq('id', clearTarget);
        toast({ title: 'Case cleared' });
      }
      fetchModerationQueue();
      fetchStats();
    } catch (error: any) {
      toast({ title: 'Failed to clear', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setClearConfirmOpen(false);
      setClearTarget(null);
    }
  };

  const ContentIcon = selectedItem ? contentTypeIcons[selectedItem.content_type] || FileText : FileText;

  return (
    <>
      <AdminPageHeader title="Content Moderation" description="Review reported content and take action" />
      <div className="space-y-6">
        {/* Stats Dashboard - Redesigned */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="relative overflow-hidden border-amber-200/50 dark:border-amber-800/30">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
                  <p className="text-sm font-medium text-muted-foreground mt-1">Pending</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-blue-200/50 dark:border-blue-800/30">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.resolvedToday}</p>
                  <p className="text-sm font-medium text-muted-foreground mt-1">Resolved Today</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-red-200/50 dark:border-red-800/30">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-400">{stats.removed}</p>
                  <p className="text-sm font-medium text-muted-foreground mt-1">Removed</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Ban className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-emerald-200/50 dark:border-emerald-800/30">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400">{stats.dismissed}</p>
                  <p className="text-sm font-medium text-muted-foreground mt-1">Dismissed</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Clear All */}
        <div className="flex items-center justify-between gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="pending" className="flex-1 sm:flex-none gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Pending</span>
                {stats.pending > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    {stats.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 sm:flex-none gap-2">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">All Reports</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {filter === 'all' && items.some(i => i.status !== 'pending') && (
            <Button
              size="sm"
              variant="outline"
              className="text-muted-foreground hover:text-destructive hover:border-destructive/50 shrink-0"
              onClick={handleClearAllResolved}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Clear Resolved
            </Button>
          )}
        </div>

        {/* Queue */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-lg mb-1">All caught up!</h3>
              <p className="text-muted-foreground">
                {filter === 'pending' ? 'No pending reports to review.' : 'No reports found.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => {
              const Icon = contentTypeIcons[item.content_type] || FileText;
              const status = statusConfig[item.status] || statusConfig.pending;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 border-l-amber-500/50">
                    <CardContent className="p-0">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 border-b">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{contentTypeLabels[item.content_type]}</span>
                              <Badge variant="outline" className={`${status.bg} ${status.text} border-0 text-xs`}>
                                {status.label}
                              </Badge>
                              {item.reportCount && item.reportCount > 1 && (
                                <Badge variant="destructive" className="gap-1 text-xs">
                                  <Flag className="h-3 w-3" />
                                  {item.reportCount}×
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                onClick={() => handleQuickAction(item, 'approved')}
                                disabled={isProcessing}
                              >
                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">Dismiss</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                onClick={() => handleQuickAction(item, 'removed')}
                                disabled={isProcessing}
                              >
                                <Trash2 className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">Remove</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsActionDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">Review</span>
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleClearCase(item.id)}
                              disabled={isProcessing}
                            >
                              <XCircle className="h-4 w-4 mr-1.5" />
                              <span className="hidden sm:inline">Clear</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4 space-y-4">
                        {/* Report Reason */}
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-sm text-amber-700 dark:text-amber-300">
                              {reasonLabels[item.reason] || item.reason}
                            </p>
                            {item.details && (
                              <p className="text-sm text-muted-foreground mt-1">{item.details}</p>
                            )}
                          </div>
                        </div>

                        {/* Reported Content Preview */}
                        {item.content ? (
                          <div className="rounded-lg border bg-card overflow-hidden">
                            <div className="px-3 py-2 border-b bg-muted/30">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Reported Content
                              </p>
                            </div>
                            <div className="p-3">
                              {/* Image thumbnail for posts */}
                              {item.content.image_url && (
                                <button
                                  onClick={() => {
                                    setSelectedImage(item.content.image_url);
                                    setImageViewerOpen(true);
                                  }}
                                  className="mb-3 relative group overflow-hidden rounded-lg w-full max-w-[200px]"
                                >
                                  <img 
                                    src={item.content.image_url} 
                                    alt="Post image" 
                                    className="w-full h-24 object-cover rounded-lg transition-transform group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </button>
                              )}
                              
                              {item.content.title && (
                                <p className="font-medium text-sm mb-2">{item.content.title}</p>
                              )}
                              <div className="text-sm text-muted-foreground line-clamp-3">
                                <RichTextDisplay content={item.content.content} />
                              </div>
                              
                              {item.content.created_at && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Posted {format(new Date(item.content.created_at), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed bg-muted/20 p-4 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Content deleted</p>
                              <p className="text-xs text-muted-foreground/70">This content has already been removed</p>
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Author & Reporter Info - Redesigned */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Author */}
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                              <AvatarImage src={item.author?.avatar_url || undefined} />
                              <AvatarFallback className="text-sm bg-primary/10 text-primary">
                                {(item.author?.full_name || 'U')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground uppercase">Author</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="font-medium text-sm truncate">
                                  {item.author?.username || item.author?.full_name || 'Unknown'}
                                </p>
                                {item.author?.isAnonymous && (
                                  <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-muted">
                                    <Lock className="h-2.5 w-2.5" />
                                    Anonymous
                                  </Badge>
                                )}
                              </div>
                              {item.authorWarningCount !== undefined && item.authorWarningCount > 0 && (
                                <Badge variant="destructive" className="mt-1.5 text-[10px] h-5">
                                  {item.authorWarningCount} previous removal{item.authorWarningCount > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Reporter */}
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                              <AvatarImage src={item.reporter?.avatar_url || undefined} />
                              <AvatarFallback className="text-sm bg-blue-500/10 text-blue-600">
                                {(item.reporter?.full_name || 'U')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground uppercase">Reported by</span>
                              </div>
                              <p className="font-medium text-sm truncate mt-1">
                                {item.reporter?.username || item.reporter?.full_name || 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Viewer Dialog */}
      <ImageViewerDialog
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        imageUrl={selectedImage}
        alt="Reported content image"
      />

      {/* Action Dialog - Enhanced */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ContentIcon className="h-5 w-5" />
              Review Report
            </DialogTitle>
            <DialogDescription>
              Review this {selectedItem?.content_type} and take appropriate action
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2">
              {/* Report Reason */}
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-sm">Report Reason</span>
                </div>
                <p className="text-sm">{reasonLabels[selectedItem.reason] || selectedItem.reason}</p>
                {selectedItem.details && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedItem.details}</p>
                )}
              </div>

              {/* Author Info with real identity */}
              {selectedItem.author && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedItem.author.avatar_url || undefined} />
                    <AvatarFallback>
                      {(selectedItem.author.full_name || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {selectedItem.author.username || selectedItem.author.full_name}
                      </p>
                      {selectedItem.author.isAnonymous && (
                        <Badge variant="outline" className="text-[10px] h-5 gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          Posted Anonymously
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Content Author</p>
                  </div>
                </div>
              )}

              {/* Content Preview */}
              {selectedItem.content && (
                <div className="rounded-lg border overflow-hidden">
                  <div className="px-3 py-2 border-b bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground">Reported Content</p>
                  </div>
                  <div className="p-3 max-h-48 overflow-y-auto">
                    {selectedItem.content.image_url && (
                      <img 
                        src={selectedItem.content.image_url} 
                        alt="Post image" 
                        className="w-full max-h-32 object-contain rounded-lg mb-2"
                      />
                    )}
                    {selectedItem.content.title && (
                      <p className="font-medium mb-1">{selectedItem.content.title}</p>
                    )}
                    <div className="text-sm">
                      <RichTextDisplay content={selectedItem.content.content} />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Action</label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        Dismiss Report
                      </span>
                    </SelectItem>
                    <SelectItem value="warned">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Warn User
                      </span>
                    </SelectItem>
                    <SelectItem value="removed">
                      <span className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                        Remove Content
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={!selectedAction || isProcessing}
              className={selectedAction === 'removed' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isProcessing ? 'Processing...' : 'Confirm Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clearTarget === 'all' ? 'Clear all resolved cases?' : 'Clear this case?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clearTarget === 'all' 
                ? 'This will remove all resolved reports from the moderation queue. This action cannot be undone.'
                : 'This will remove this report from the moderation queue. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmClear} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
            >
              {isProcessing ? 'Clearing...' : 'Clear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
