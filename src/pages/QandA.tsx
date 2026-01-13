import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { QuestionCard } from "@/components/qa/QuestionCard";
import { QuestionForm } from "@/components/qa/QuestionForm";
import { QuestionCardSkeleton } from "@/components/ui/shimmer-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function QandA() {
  const { user } = useAuth();
  const { anonymousPostsEnabled } = useAppSettings();
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
      return data;
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Q&A</h1>
              <p className="text-muted-foreground">Ask questions and help others</p>
            </div>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ask Question
          </Button>
        </motion.div>

        <motion.div 
          className="flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects?.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <QuestionCardSkeleton key={i} />
            ))}
          </div>
        ) : questions?.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No questions yet</h3>
            <p className="text-muted-foreground mb-4">Be the first to ask a question!</p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ask Question
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions?.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onClick={() => navigate(`/qa/${question.id}`)}
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
