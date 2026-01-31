import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileQuestion, ChevronRight, BookOpen } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

// Fetch subjects with test counts
function useSubjectsWithTests() {
  return useQuery({
    queryKey: ['mcq-subjects-with-tests'],
    queryFn: async () => {
      // Get all subjects
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, icon, color')
        .order('name');

      if (subjectsError) throw subjectsError;

      // Get test counts per subject
      const { data: testCounts, error: countsError } = await supabase
        .from('mcq_tests')
        .select('subject_id')
        .eq('is_published', true);

      if (countsError) throw countsError;

      // Count tests per subject
      const countMap = new Map<string, number>();
      testCounts?.forEach(t => {
        if (t.subject_id) {
          countMap.set(t.subject_id, (countMap.get(t.subject_id) || 0) + 1);
        }
      });

      return subjects.map(s => ({
        ...s,
        testCount: countMap.get(s.id) || 0,
      }));
    },
  });
}

export default function MCQ() {
  const { data: subjects, isLoading } = useSubjectsWithTests();

  return (
    <MainLayout>
      <div className="container px-4 py-6 md:py-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileQuestion className="w-6 h-6 text-primary" />
            MCQ Tests
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a subject to start practicing
          </p>
        </motion.div>

        {/* Subjects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : subjects && subjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/mcq/subject/${subject.id}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: subject.color || '#2563EB' }}
                      >
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {subject.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {subject.testCount} {subject.testCount === 1 ? 'test' : 'tests'} available
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Tests Available</h3>
              <p className="text-muted-foreground">
                Check back later for MCQ tests
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
