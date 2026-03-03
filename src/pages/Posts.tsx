import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/posts/PostCard";
import { PostForm } from "@/components/posts/PostForm";
import { PostsDisabledBanner } from "@/components/posts/PostsDisabledBanner";
import { CategoryFilter, PostCategory } from "@/components/posts/CategoryFilter";
import { CardSkeleton } from "@/components/ui/shimmer-skeleton";
import { MessageSquare, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useGoogleDriveContext } from "@/contexts/GoogleDriveContext";
import { motion } from "framer-motion";
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

// Helper function to extract Google Drive file ID from URL
const extractGoogleDriveFileId = (url: string): string | null => {
  if (!url) return null;
  
  // Handle various Google Drive URL formats
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,           // /d/FILE_ID format
    /id=([a-zA-Z0-9_-]+)/,              // id=FILE_ID format
    /\/file\/d\/([a-zA-Z0-9_-]+)/,     // /file/d/FILE_ID format
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

export default function Posts() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { postsEnabled, anonymousPostsEnabled, postCreationEnabled } = useAppSettings();
  const googleDrive = useGoogleDriveContext();
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<{ id: string; imageUrl: string | null } | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`*`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles for non-anonymous posts
      const userIds = data?.filter(p => !p.is_anonymous).map(p => p.user_id) || [];
      const uniqueUserIds = [...new Set(userIds)];
      
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', uniqueUserIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return data?.map(post => ({
          ...post,
          profiles: post.is_anonymous ? null : profileMap.get(post.user_id) || null
        }));
      }
      
      return data?.map(post => ({ ...post, profiles: null }));
    },
    enabled: postsEnabled,
  });

  const { data: userLikes } = useQuery({
    queryKey: ['post-likes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(l => l.post_id);
    },
    enabled: !!user?.id && postsEnabled,
  });

  const createPost = useMutation({
    mutationFn: async ({ content, isAnonymous, category, imageUrl }: { content: string; isAnonymous: boolean; category?: string; imageUrl?: string }) => {
      const { error } = await supabase.from('posts').insert({
        user_id: user?.id,
        content,
        is_anonymous: isAnonymous,
        category: category || 'discussion',
        image_url: imageUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: "Post created!" });
    },
  });

  const likePost = useMutation({
    mutationFn: async (postId: string) => {
      const hasLiked = userLikes?.includes(postId);
      const post = posts?.find(p => p.id === postId);
      
      if (hasLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user?.id);
        await supabase.from('posts').update({ likes_count: (post?.likes_count || 1) - 1 }).eq('id', postId);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user?.id });
        await supabase.from('posts').update({ likes_count: (post?.likes_count || 0) + 1 }).eq('id', postId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post-likes', user?.id] });
    },
  });

  const pinPost = useMutation({
    mutationFn: async (postId: string) => {
      const post = posts?.find(p => p.id === postId);
      const { error } = await supabase
        .from('posts')
        .update({ is_pinned: !post?.is_pinned })
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async ({ postId, imageUrl }: { postId: string; imageUrl: string | null }) => {
      // Always delete image from storage if it exists
      if (imageUrl) {
        // Check if it's a Supabase storage URL
        if (imageUrl.includes('supabase') && imageUrl.includes('/post-images/')) {
          try {
            const urlParts = imageUrl.split('/post-images/');
            if (urlParts[1]) {
              const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
              await supabase.storage.from('post-images').remove([filePath]);
            }
          } catch (storageError) {
            console.error('Failed to delete image from storage:', storageError);
          }
        }
        // Check if it's a Google Drive URL
        else if (imageUrl.includes('drive.google.com') || imageUrl.includes('googleapis.com')) {
          const fileId = extractGoogleDriveFileId(imageUrl);
          if (fileId && googleDrive.isSignedIn) {
            try {
              // Use the Google Drive API to delete the file
              await window.gapi.client.drive.files.delete({
                fileId: fileId,
              });
              console.log('[GoogleDrive] Successfully deleted file:', fileId);
            } catch (driveError) {
              console.error('Failed to delete image from Google Drive:', driveError);
              // Don't throw error, continue with post deletion
            }
          } else if (fileId && !googleDrive.isSignedIn) {
            console.warn('[GoogleDrive] Cannot delete file - not signed in to Google Drive');
          }
        }
      }
      
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: "Post deleted" });
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    },
  });

  const handleDeleteClick = (postId: string, imageUrl: string | null) => {
    setPostToDelete({ id: postId, imageUrl });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (postToDelete) {
      deletePost.mutate({
        postId: postToDelete.id,
        imageUrl: postToDelete.imageUrl,
      });
    }
  };

  if (!postsEnabled) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 md:py-8 space-y-6">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Posts</h1>
              <p className="text-sm text-muted-foreground">Share updates with classmates</p>
            </div>
          </motion.div>
          <PostsDisabledBanner />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 space-y-5">
        {/* Header */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Posts</h1>
            <p className="text-sm text-muted-foreground">Share updates with classmates</p>
          </div>
        </motion.div>

        {/* Post Form */}
        {postCreationEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PostForm
              onSubmit={(content, isAnonymous, category, imageUrl) => createPost.mutate({ content, isAnonymous, category, imageUrl })}
              isSubmitting={createPost.isPending}
              anonymousEnabled={anonymousPostsEnabled}
            />
          </motion.div>
        )}

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <CategoryFilter 
            selectedCategory={selectedCategory} 
            onSelectCategory={setSelectedCategory} 
          />
        </motion.div>

        {/* Posts List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : posts?.length === 0 ? (
          <motion.div 
            className="text-center py-16 px-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Be the first to share something with your classmates!
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {posts?.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                hasLiked={userLikes?.includes(post.id) ?? false}
                currentUserId={user?.id}
                isAdmin={isAdmin}
                onLike={() => likePost.mutate(post.id)}
                onPin={() => pinPost.mutate(post.id)}
                onDelete={() => handleDeleteClick(post.id, post.image_url)}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Post?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this post{postToDelete?.imageUrl ? " and its image" : ""}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletePost.isPending}
              >
                {deletePost.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
