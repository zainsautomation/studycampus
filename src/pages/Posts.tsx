import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/posts/PostCard";
import { PostForm } from "@/components/posts/PostForm";
import { PostsDisabledBanner } from "@/components/posts/PostsDisabledBanner";
import { CategoryFilter, PostCategory } from "@/components/posts/CategoryFilter";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/hooks/useAppSettings";
import { motion } from "framer-motion";

export default function Posts() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { postsEnabled, anonymousPostsEnabled } = useAppSettings();
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('all');

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
      return data;
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
    mutationFn: async ({ content, isAnonymous, category }: { content: string; isAnonymous: boolean; category?: string }) => {
      const { error } = await supabase.from('posts').insert({
        user_id: user?.id,
        content,
        is_anonymous: isAnonymous,
        category: category || 'discussion',
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
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: "Post deleted" });
    },
  });

  if (!postsEnabled) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 md:py-8 space-y-6">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Posts</h1>
              <p className="text-muted-foreground">Share updates with classmates</p>
            </div>
          </motion.div>
          <PostsDisabledBanner />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 space-y-6">
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Posts</h1>
            <p className="text-muted-foreground">Share updates with classmates</p>
          </div>
        </motion.div>

        <PostForm
          onSubmit={(content, isAnonymous, category) => createPost.mutate({ content, isAnonymous, category })}
          isSubmitting={createPost.isPending}
          anonymousEnabled={anonymousPostsEnabled}
        />

        <CategoryFilter 
          selectedCategory={selectedCategory} 
          onSelectCategory={setSelectedCategory} 
        />

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : posts?.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No posts yet</h3>
            <p className="text-muted-foreground">Be the first to share something!</p>
          </div>
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
                onDelete={() => deletePost.mutate(post.id)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
