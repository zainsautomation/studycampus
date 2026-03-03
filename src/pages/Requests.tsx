import { useState, useRef, useCallback, useEffect } from "react";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { RequestCard } from "@/components/requests/RequestCard";
import { RequestForm } from "@/components/requests/RequestForm";
import { RequestCardSkeleton } from "@/components/ui/shimmer-skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, GitPullRequest, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const PAGE_SIZE = 10;

export default function Requests() {
  const { user } = useAuth();
  const { anonymousPostsEnabled } = useAppSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['requests', activeTab],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('requests')
        .select(`*`)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (activeTab === "mine") {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    enabled: !!user?.id,
  });

  const requests = data?.pages.flatMap(p => p) ?? [];

  // IntersectionObserver
  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [observerCallback]);

  const { data: userUpvotes } = useQuery({
    queryKey: ['request-upvotes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('request_upvotes')
        .select('request_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(u => u.request_id);
    },
    enabled: !!user?.id,
  });

  const createRequest = useMutation({
    mutationFn: async (data: { title: string; description: string; type: string; is_public: boolean; is_anonymous: boolean }) => {
      const { error } = await supabase.from('requests').insert({
        ...data,
        user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setFormOpen(false);
      toast({ title: "Request submitted!" });
    },
    onError: (error) => {
      toast({ title: "Error submitting request", description: error.message, variant: "destructive" });
    },
  });

  const upvoteRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const hasUpvoted = userUpvotes?.includes(requestId);
      const request = requests?.find(r => r.id === requestId);
      
      if (hasUpvoted) {
        await supabase.from('request_upvotes').delete().eq('request_id', requestId).eq('user_id', user?.id);
        await supabase.from('requests').update({ upvotes: (request?.upvotes || 1) - 1 }).eq('id', requestId);
      } else {
        await supabase.from('request_upvotes').insert({ request_id: requestId, user_id: user?.id });
        await supabase.from('requests').update({ upvotes: (request?.upvotes || 0) + 1 }).eq('id', requestId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-upvotes', user?.id] });
    },
  });

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 space-y-6">
        <motion.div 
          className="flex flex-wrap items-start sm:items-center justify-between gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <GitPullRequest className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Requests</h1>
              <p className="text-muted-foreground">Request notes or suggest features</p>
            </div>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="mine">My Requests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            {renderRequestsList()}
          </TabsContent>
          
          <TabsContent value="mine" className="mt-4">
            {renderRequestsList()}
          </TabsContent>
        </Tabs>

        <RequestForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={(data) => createRequest.mutate(data)}
          isSubmitting={createRequest.isPending}
          anonymousEnabled={anonymousPostsEnabled}
        />
      </div>
    </MainLayout>
  );

  function renderRequestsList() {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (<RequestCardSkeleton key={i} />))}
        </div>
      );
    }

    if (requests.length === 0) {
      return (
        <div className="text-center py-12">
          <GitPullRequest className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No requests yet</h3>
          <p className="text-muted-foreground mb-4">
            {activeTab === "mine" ? "You haven't submitted any requests yet" : "Be the first to submit a request!"}
          </p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Request
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            hasUpvoted={userUpvotes?.includes(request.id) ?? false}
            currentUserId={user?.id}
            onUpvote={() => upvoteRequest.mutate(request.id)}
          />
        ))}
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </div>
    );
  }
}
