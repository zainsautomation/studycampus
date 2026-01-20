import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pin, Trash2, Heart, Settings2, FolderOpen, HardDrive, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useGoogleDriveContext } from "@/contexts/GoogleDriveContext";
import { FolderPicker } from "@/components/admin/FolderPicker";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Utility to strip HTML tags from content
const stripHtml = (html: string) => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

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

export default function ManagePosts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { 
    postsEnabled, 
    postImagesStorageType,
    postImagesGoogleDriveFolderId,
    updateSetting 
  } = useAppSettings();
  
  const { isSignedIn, isInitialized, signIn, openFolderPicker } = useGoogleDriveContext();
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [postToDelete, setPostToDelete] = useState<{ id: string; image_url: string | null } | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`*`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from('posts')
        .update({ is_pinned: !is_pinned })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast({ title: "Post updated" });
    },
  });

  const deletePost = useMutation({
    mutationFn: async ({ id, image_url }: { id: string; image_url: string | null }) => {
      // Delete image from storage if exists
      if (image_url) {
        // Handle Supabase storage
        if (image_url.includes('supabase') && image_url.includes('/post-images/')) {
          try {
            const urlParts = image_url.split('/post-images/');
            if (urlParts[1]) {
              const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
              await supabase.storage.from('post-images').remove([filePath]);
            }
          } catch (storageError) {
            console.error('Failed to delete image from Supabase storage:', storageError);
          }
        }
        // Handle Google Drive
        else if (image_url.includes('drive.google.com') || image_url.includes('googleapis.com')) {
          const fileId = extractGoogleDriveFileId(image_url);
          if (fileId && isSignedIn && window.gapi?.client?.drive) {
            try {
              await window.gapi.client.drive.files.delete({ fileId });
            } catch (driveError) {
              console.error('Failed to delete image from Google Drive:', driveError);
            }
          }
        }
      }
      
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: "Post deleted" });
      setPostToDelete(null);
    },
  });

  const handleDeleteClick = (post: { id: string; image_url: string | null }) => {
    setPostToDelete(post);
  };

  const confirmDelete = () => {
    if (postToDelete) {
      deletePost.mutate(postToDelete);
    }
  };

  const togglePostsEnabled = () => {
    updateSetting.mutate(
      { key: 'posts_enabled', value: !postsEnabled },
      {
        onSuccess: () => {
          toast({ title: `Posts ${!postsEnabled ? 'enabled' : 'disabled'}` });
        },
      }
    );
  };

  const stats = {
    total: posts?.length || 0,
    pinned: posts?.filter(p => p.is_pinned).length || 0,
    totalLikes: posts?.reduce((acc, p) => acc + (p.likes_count || 0), 0) || 0,
  };

  const handleStorageTypeChange = (value: 'supabase' | 'google_drive') => {
    updateSetting.mutate(
      { key: 'post_images_storage_type', value },
      {
        onSuccess: () => {
          toast({ title: `Post images will be stored in ${value === 'supabase' ? 'Supabase' : 'Google Drive'}` });
        },
      }
    );
  };

  const handleSelectFolder = async () => {
    if (!isSignedIn) {
      await signIn();
      return;
    }

    setIsSelectingFolder(true);
    try {
      const folder = await openFolderPicker();
      if (folder) {
        await updateSetting.mutateAsync({ 
          key: 'post_images_google_drive_folder_id', 
          value: folder.id 
        });
        setSelectedFolderName(folder.name);
        toast({ title: `Folder set to "${folder.name}"` });
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    } finally {
      setIsSelectingFolder(false);
    }
  };

  return (
    <AdminLayout title="Manage Posts" description="Moderate posts and toggle the feature">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col gap-4">
          {/* Image Storage Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Image Storage Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Label className="text-sm whitespace-nowrap min-w-[100px]">Storage:</Label>
                <Select
                  value={postImagesStorageType}
                  onValueChange={handleStorageTypeChange}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supabase">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Supabase Storage
                      </div>
                    </SelectItem>
                    <SelectItem value="google_drive">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Google Drive
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Google Drive Folder Picker */}
              {postImagesStorageType === 'google_drive' && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t">
                  <Label className="text-sm whitespace-nowrap min-w-[100px]">Folder:</Label>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 px-3 py-2 rounded-md border bg-muted/50 text-sm truncate">
                      {selectedFolderName || (postImagesGoogleDriveFolderId ? 'Folder selected' : 'No folder selected')}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectFolder}
                      disabled={!isInitialized || isSelectingFolder}
                    >
                      {isSelectingFolder ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          {isSignedIn ? 'Change' : 'Connect'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50 border">
              <Switch
                id="posts-enabled"
                checked={postsEnabled}
                onCheckedChange={togglePostsEnabled}
              />
              <Label htmlFor="posts-enabled" className="text-sm">
                Posts {postsEnabled ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pinned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{stats.pinned}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Likes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalLikes}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-32 bg-muted animate-pulse rounded" />
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-3">
                  {posts?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No posts yet</p>
                  ) : (
                    posts?.map((post) => (
                      <div key={post.id} className="p-4 rounded-lg border bg-card space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            {post.is_pinned && <Pin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />}
                            <span className="line-clamp-2 text-sm">{stripHtml(post.content)}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => togglePin.mutate({ id: post.id, is_pinned: post.is_pinned })}
                            >
                              <Pin className={`h-4 w-4 ${post.is_pinned ? 'text-primary' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteClick({ id: post.id, image_url: post.image_url })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {post.likes_count}
                          </div>
                          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Content</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Likes</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posts?.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {post.is_pinned && <Pin className="h-4 w-4 text-primary flex-shrink-0" />}
                              <span className="line-clamp-2 max-w-xs">{stripHtml(post.content)}</span>
                            </div>
                          </TableCell>
                          <TableCell>Anonymous</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4" />
                              {post.likes_count}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => togglePin.mutate({ id: post.id, is_pinned: post.is_pinned })}
                              >
                                <Pin className={`h-4 w-4 ${post.is_pinned ? 'text-primary' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteClick({ id: post.id, image_url: post.image_url })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Post?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this post{postToDelete?.image_url ? ' and its associated image from storage' : ''}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletePost.isPending}
              >
                {deletePost.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}