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
import { Pin, Trash2, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function ManagePosts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { postsEnabled, updateSetting } = useAppSettings();

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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast({ title: "Post deleted" });
    },
  });

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

  return (
    <AdminLayout title="Manage Posts">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage Posts</h1>
            <p className="text-muted-foreground">Moderate posts and toggle the feature</p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="posts-enabled"
              checked={postsEnabled}
              onCheckedChange={togglePostsEnabled}
            />
            <Label htmlFor="posts-enabled">Posts {postsEnabled ? 'Enabled' : 'Disabled'}</Label>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead className="hidden sm:table-cell">Author</TableHead>
                      <TableHead>Likes</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts?.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {post.is_pinned && <Pin className="h-4 w-4 text-primary flex-shrink-0" />}
                            <span className="line-clamp-2 max-w-xs">{post.content}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          Anonymous
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {post.likes_count}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => togglePin.mutate({ id: post.id, is_pinned: post.is_pinned })}
                            >
                              <Pin className={`h-4 w-4 ${post.is_pinned ? 'text-primary' : ''}`} />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => deletePost.mutate(post.id)}
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
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
