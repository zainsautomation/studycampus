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
  Ban
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextDisplay } from '@/components/ui/rich-text-display';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
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
  author?: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
  reportCount?: number;
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

const reasonLabels: Record<string, string> = {
  spam: 'Spam or misleading',
  inappropriate: 'Inappropriate content',
  harassment: 'Harassment or bullying',
  misinformation: 'Misinformation',
  other: 'Other',
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  removed: 'bg-destructive/10 text-destructive border-destructive/20',
  warned: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400',
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

          // Get reported content and author
          let content = null;
          let author = null;
          
          if (item.content_type === 'post') {
            const { data: post } = await supabase
              .from('posts')
              .select('content, user_id, is_anonymous, image_url')
              .eq('id', item.content_id)
              .single();
            content = post;
            if (post && !post.is_anonymous) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', post.user_id)
                .single();
              author = profile;
            }
          } else if (item.content_type === 'question') {
            const { data: question } = await supabase
              .from('questions')
              .select('title, content, user_id, is_anonymous')
              .eq('id', item.content_id)
              .single();
            content = question;
            if (question && !question.is_anonymous) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', question.user_id)
                .single();
              author = profile;
            }
          } else if (item.content_type === 'answer') {
            const { data: answer } = await supabase
              .from('answers')
              .select('content, user_id')
              .eq('id', item.content_id)
              .single();
            content = answer;
            if (answer) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', answer.user_id)
                .single();
              author = profile;
            }
          } else if (item.content_type === 'comment') {
            const { data: comment } = await supabase
              .from('comments')
              .select('content, user_id')
              .eq('id', item.content_id)
              .single();
            content = comment;
            if (comment) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', comment.user_id)
                .single();
              author = profile;
            }
          }

          return { ...item, reporter, content, author, reportCount: reportCount || 1 };
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
              await window.gapi.client.drive.files.delete({ fileId });
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

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const ContentIcon = selectedItem ? contentTypeIcons[selectedItem.content_type] || FileText : FileText;

  return (
    <AdminLayout title="Content Moderation" description="Review reported content">
      <div className="space-y-6">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.resolvedToday}</p>
                  <p className="text-xs text-muted-foreground">Resolved Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <Ban className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.removed}</p>
                  <p className="text-xs text-muted-foreground">Removed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.dismissed}</p>
                  <p className="text-xs text-muted-foreground">Dismissed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending
              {stats.pending > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {stats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Eye className="h-4 w-4" />
              All Reports
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Queue */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-success opacity-50" />
              <p className="mt-4 text-muted-foreground">
                {filter === 'pending' ? 'No pending reports. All caught up!' : 'No reports found.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => {
              const Icon = contentTypeIcons[item.content_type] || FileText;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="capitalize">
                              {item.content_type}
                            </Badge>
                            <Badge variant="outline" className={statusColors[item.status]}>
                              {item.status}
                            </Badge>
                            {item.reportCount && item.reportCount > 1 && (
                              <Badge variant="destructive" className="gap-1">
                                <Flag className="h-3 w-3" />
                                {item.reportCount} reports
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <span className="font-medium">{reasonLabels[item.reason] || item.reason}</span>
                          </div>

                          {item.details && (
                            <p className="text-sm text-muted-foreground">{item.details}</p>
                          )}

                          {item.content && (
                            <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm">
                              {item.content.title && (
                                <p className="font-medium mb-1">{item.content.title}</p>
                              )}
                              <div className="line-clamp-2 text-muted-foreground">
                                <RichTextDisplay content={item.content.content} />
                              </div>
                            </div>
                          )}

                          {/* Author and Reporter info */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {item.author ? (
                              <div className="flex items-center gap-1.5">
                                <span>Author:</span>
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={item.author.avatar_url || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {(item.author.full_name || 'U')[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{item.author.username || item.author.full_name}</span>
                              </div>
                            ) : item.content?.is_anonymous ? (
                              <span>Author: Anonymous</span>
                            ) : (
                              <span>Author: Unknown</span>
                            )}
                            <span className="opacity-40">•</span>
                            <div className="flex items-center gap-1.5">
                              <span>Reported by:</span>
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={item.reporter?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {(item.reporter?.full_name || 'U')[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{item.reporter?.username || item.reporter?.full_name || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {item.status === 'pending' && (
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success hover:text-success hover:bg-success/10"
                              onClick={() => handleQuickAction(item, 'approved')}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Dismiss
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleQuickAction(item, 'removed')}
                              disabled={isProcessing}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedItem(item);
                                setIsActionDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ContentIcon className="h-5 w-5" />
              Review Report
            </DialogTitle>
            <DialogDescription>
              Choose an action for this reported {selectedItem?.content_type}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-1">
                  Reason: {reasonLabels[selectedItem.reason] || selectedItem.reason}
                </p>
                {selectedItem.details && (
                  <p className="text-sm text-muted-foreground">{selectedItem.details}</p>
                )}
              </div>

              {selectedItem.content && (
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-2">Reported content:</p>
                  {selectedItem.content.title && (
                    <p className="font-medium mb-1">{selectedItem.content.title}</p>
                  )}
                  <div className="text-sm">
                    <RichTextDisplay content={selectedItem.content.content} />
                  </div>
                </div>
              )}

              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Approve (Dismiss report)
                    </span>
                  </SelectItem>
                  <SelectItem value="warned">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Warn User
                    </span>
                  </SelectItem>
                  <SelectItem value="removed">
                    <span className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      Remove Content
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={!selectedAction || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
