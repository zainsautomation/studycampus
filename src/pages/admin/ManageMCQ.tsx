import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  FileQuestion, 
  Eye, 
  EyeOff, 
  Pencil, 
  Trash2,
  Users,
  BarChart3
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MCQCreationWizard } from '@/components/admin/MCQCreationWizard';

interface MCQTestWithStats {
  id: string;
  title: string;
  topic_name: string | null;
  test_mode: string;
  is_published: boolean;
  time_limit_mins: number | null;
  created_at: string;
  result_visibility: string;
  results_revealed: boolean;
  subject: { name: string } | null;
  questionCount: number;
  attemptCount: number;
  avgScore: number | null;
}

function useAdminMCQTests(subjectFilter: string, searchQuery: string) {
  return useQuery({
    queryKey: ['admin-mcq-tests', subjectFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('mcq_tests')
        .select(`
          id,
          title,
          topic_name,
          test_mode,
          is_published,
          time_limit_mins,
          created_at,
          subject_id,
          result_visibility,
          results_revealed,
          subjects (name),
          mcq_questions (id)
        `)
        .order('created_at', { ascending: false });

      if (subjectFilter && subjectFilter !== 'all') {
        query = query.eq('subject_id', subjectFilter);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data: tests, error } = await query;
      if (error) throw error;

      // Get attempt stats
      const testIds = tests.map(t => t.id);
      const { data: attempts } = await supabase
        .from('mcq_attempts')
        .select('test_id, score')
        .in('test_id', testIds)
        .eq('status', 'completed');

      const statsMap = new Map<string, { count: number; totalScore: number }>();
      attempts?.forEach(a => {
        const existing = statsMap.get(a.test_id) || { count: 0, totalScore: 0 };
        statsMap.set(a.test_id, {
          count: existing.count + 1,
          totalScore: existing.totalScore + (a.score || 0),
        });
      });

      return tests.map(t => ({
        id: t.id,
        title: t.title,
        topic_name: t.topic_name,
        test_mode: t.test_mode,
        is_published: t.is_published,
        time_limit_mins: t.time_limit_mins,
        created_at: t.created_at,
        result_visibility: (t as any).result_visibility || 'instant',
        results_revealed: (t as any).results_revealed || false,
        subject: t.subjects ? { name: (t.subjects as any).name } : null,
        questionCount: t.mcq_questions?.length || 0,
        attemptCount: statsMap.get(t.id)?.count || 0,
        avgScore: statsMap.get(t.id) 
          ? statsMap.get(t.id)!.totalScore / statsMap.get(t.id)!.count 
          : null,
      })) as MCQTestWithStats[];
    },
  });
}

function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export default function ManageMCQ() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editTestId, setEditTestId] = useState<string | null>(null);

  const { data: tests, isLoading } = useAdminMCQTests(subjectFilter, searchQuery);
  const { data: subjects } = useSubjects();

  const togglePublish = useMutation({
    mutationFn: async ({ testId, isPublished }: { testId: string; isPublished: boolean }) => {
      const { error } = await supabase
        .from('mcq_tests')
        .update({ is_published: isPublished })
        .eq('id', testId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mcq-tests'] });
      toast.success('Test updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update test');
    },
  });

  const toggleReveal = useMutation({
    mutationFn: async ({ testId, revealed }: { testId: string; revealed: boolean }) => {
      const { error } = await supabase
        .from('mcq_tests')
        .update({ results_revealed: revealed } as any)
        .eq('id', testId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mcq-tests'] });
      toast.success('Results visibility updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update');
    },
  });

  const deleteTest = useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase
        .from('mcq_tests')
        .delete()
        .eq('id', testId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mcq-tests'] });
      toast.success('Test deleted');
      setDeleteTestId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete test');
    },
  });

  return (
    <AdminLayout title="MCQ Tests" description="Create and manage MCQ tests">
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Test
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects?.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tests List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : tests && tests.length > 0 ? (
          <div className="space-y-3">
            {tests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{test.title}</h3>
                          <Badge variant={test.is_published ? 'default' : 'secondary'}>
                            {test.is_published ? 'Published' : 'Draft'}
                          </Badge>
                          <Badge variant="outline">
                            {test.test_mode === 'exam' ? 'Exam' : 'Practice'}
                          </Badge>
                          {test.result_visibility === 'delayed' && (
                            <Badge variant="outline" className={test.results_revealed ? 'border-green-500/50 text-green-600' : 'border-yellow-500/50 text-yellow-600'}>
                              {test.results_revealed ? 'Answers Revealed' : 'Answers Pending'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {test.subject && <span>{test.subject.name}</span>}
                          {test.topic_name && <span>• {test.topic_name}</span>}
                          <span>• {test.questionCount} questions</span>
                          {test.time_limit_mins && <span>• {test.time_limit_mins} min</span>}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{test.attemptCount}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">attempts</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <BarChart3 className="w-4 h-4" />
                            <span>{test.avgScore ? `${test.avgScore.toFixed(0)}%` : '-'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">avg score</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditTestId(test.id)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => togglePublish.mutate({ 
                              testId: test.id, 
                              isPublished: !test.is_published 
                            })}
                          >
                            {test.is_published ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          {test.result_visibility === 'delayed' && (
                            <DropdownMenuItem
                              onClick={() => toggleReveal.mutate({
                                testId: test.id,
                                revealed: !test.results_revealed,
                              })}
                            >
                              {test.results_revealed ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Hide Answers
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Reveal Answers
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setDeleteTestId(test.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Tests Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first MCQ test to get started
              </p>
              <Button onClick={() => setIsCreating(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Test
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTestId} onOpenChange={() => setDeleteTestId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Test?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the test and all its questions, options, and attempt history.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTestId && deleteTest.mutate(deleteTestId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Creation Wizard Sheet */}
        <Sheet open={isCreating} onOpenChange={setIsCreating}>
          <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden">
            <MCQCreationWizard 
              onClose={() => {
                setIsCreating(false);
                queryClient.invalidateQueries({ queryKey: ['admin-mcq-tests'] });
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Edit Sheet */}
        <Sheet open={!!editTestId} onOpenChange={() => setEditTestId(null)}>
          <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden">
            <MCQCreationWizard 
              testId={editTestId || undefined}
              onClose={() => {
                setEditTestId(null);
                queryClient.invalidateQueries({ queryKey: ['admin-mcq-tests'] });
              }}
            />
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
