import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { QuestionCard } from "@/components/qa/QuestionCard";
import { QuestionForm } from "@/components/qa/QuestionForm";
import { QandADisabledBanner } from "@/components/qa/QandADisabledBanner";
import { QuestionCardSkeleton } from "@/components/ui/shimmer-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, HelpCircle, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function QandA() {
  const { user } = useAuth();
  const { anonymousPostsEnabled, qaEnabled, isLoading: settingsLoading } = useAppSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', search, subjectFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select(`
          *,
          subjects:subject_id(name, color),
          answers(count)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }
      if (subjectFilter !== "all") {
        query = query.eq('subject_id', subjectFilter);
      }
      if (statusFilter === "resolved") {
        query = query.eq('is_resolved', true);
      } else if (statusFilter === "open") {
        query = query.eq('is_resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles for non-anonymous questions
      const userIds = data?.filter(q => !q.is_anonymous).map(q => q.user_id) || [];
      const uniqueUserIds = [...new Set(userIds)];
      
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', uniqueUserIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return data?.map(question => ({
          ...question,
          profiles: question.is_anonymous ? null : profileMap.get(question.user_id) || null
        }));
      }
      
      return data?.map(question => ({ ...question, profiles: null }));
    },
  });

  const createQuestion = useMutation({
    mutationFn: async (data: { title: string; content: string; subject_id: string | null; is_anonymous: boolean }) => {
      const { error } = await supabase.from('questions').insert({
        ...data,
        user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setFormOpen(false);
      toast({ title: "Question posted successfully!" });
    },
    onError: (error) => {
      toast({ title: "Error posting question", description: error.message, variant: "destructive" });
    },
  });

  // Show disabled banner if Q&A is turned off
  if (!settingsLoading && !qaEnabled) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 md:py-8">
          <QandADisabledBanner />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 space-y-5">
        {/* Header */}
        <motion.div 
          className="flex flex-wrap items-start sm:items-center justify-between gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Q&A</h1>
              <p className="text-sm text-muted-foreground">Ask questions and help others</p>
            </div>
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ask Question
          </Button>
        </motion.div>

        {/* Search */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </motion.div>

        {/* Filter chips - horizontal scroll */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              {/* Status filters */}
              <Badge
                variant={statusFilter === "all" ? "default" : "outline"}
                className="cursor-pointer shrink-0 px-3 py-1.5"
                onClick={() => setStatusFilter("all")}
              >
                <Sparkles className="h-3 w-3 mr-1.5" />
                All
              </Badge>
              <Badge
                variant={statusFilter === "open" ? "default" : "outline"}
                className="cursor-pointer shrink-0 px-3 py-1.5"
                onClick={() => setStatusFilter("open")}
              >
                <Clock className="h-3 w-3 mr-1.5" />
                Open
              </Badge>
              <Badge
                variant={statusFilter === "resolved" ? "default" : "outline"}
                className="cursor-pointer shrink-0 px-3 py-1.5"
                onClick={() => setStatusFilter("resolved")}
              >
                <CheckCircle2 className="h-3 w-3 mr-1.5" />
                Resolved
              </Badge>

              {/* Separator */}
              <div className="w-px bg-border shrink-0 mx-1" />

              {/* Subject filters */}
              <Badge
                variant={subjectFilter === "all" ? "secondary" : "outline"}
                className="cursor-pointer shrink-0 px-3 py-1.5"
                onClick={() => setSubjectFilter("all")}
              >
                All Subjects
              </Badge>
              {subjects?.map((subject) => (
                <Badge
                  key={subject.id}
                  variant={subjectFilter === subject.id ? "secondary" : "outline"}
                  className="cursor-pointer shrink-0 px-3 py-1.5"
                  style={subjectFilter === subject.id ? { 
                    backgroundColor: `${subject.color}20`,
                    color: subject.color,
                    borderColor: subject.color
                  } : undefined}
                  onClick={() => setSubjectFilter(subject.id)}
                >
                  {subject.name}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="h-1.5" />
          </ScrollArea>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <QuestionCardSkeleton key={i} />
            ))}
          </div>
        ) : questions?.length === 0 ? (
          <motion.div 
            className="text-center py-16 px-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Be the first to spark a discussion! Ask a question and help build our community.
            </p>
            <Button onClick={() => setFormOpen(true)} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Ask the First Question
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {questions?.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                onClick={() => navigate(`/qa/${question.id}`)}
                index={index}
              />
            ))}
          </div>
        )}

        <QuestionForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={(data) => createQuestion.mutate(data)}
          isSubmitting={createQuestion.isPending}
          anonymousEnabled={anonymousPostsEnabled}
        />
      </div>
    </MainLayout>
  );
}
