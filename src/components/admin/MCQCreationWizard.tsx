import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check,
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  FileUp,
  X,
  Wand2,
  FileJson
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MCQTextParser } from './MCQTextParser';
import { MCQPDFUploader } from './MCQPDFUploader';
import { MCQTemplateParser } from './MCQTemplateParser';
import { MCQJSONImporter } from './MCQJSONImporter';

interface Question {
  id?: string;
  question_text: string;
  explanation: string;
  options: Array<{
    id?: string;
    option_label: string;
    option_text: string;
    is_correct: boolean;
  }>;
}

interface MCQCreationWizardProps {
  testId?: string;
  onClose: () => void;
}

const STEPS = ['Details', 'Questions', 'Review'];

export function MCQCreationWizard({ testId, onClose }: MCQCreationWizardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    topic_name: '',
    description: '',
    subject_id: '',
    time_limit_mins: '',
    test_mode: 'practice',
    result_visibility: 'instant',
    shuffle_questions: false,
    shuffle_options: false,
    retake_allowed: true,
    is_published: false,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionInput, setQuestionInput] = useState('add'); // 'add' | 'paste' | 'pdf'

  // Load existing test data if editing
  const { data: existingTest } = useQuery({
    queryKey: ['mcq-test-edit', testId],
    queryFn: async () => {
      if (!testId) return null;

      const { data: test, error: testError } = await supabase
        .from('mcq_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;

      const { data: questionsData, error: questionsError } = await supabase
        .from('mcq_questions')
        .select(`
          id,
          question_text,
          explanation,
          order_number,
          mcq_options (
            id,
            option_label,
            option_text,
            is_correct,
            order_number
          )
        `)
        .eq('test_id', testId)
        .order('order_number');

      if (questionsError) throw questionsError;

      return { test, questions: questionsData };
    },
    enabled: !!testId,
  });

  useEffect(() => {
    if (existingTest) {
      const { test, questions: existingQuestions } = existingTest;
      setFormData({
        title: test.title || '',
        topic_name: test.topic_name || '',
        description: test.description || '',
        subject_id: test.subject_id || '',
        time_limit_mins: test.time_limit_mins?.toString() || '',
        test_mode: test.test_mode || 'practice',
        result_visibility: test.result_visibility || 'instant',
        shuffle_questions: test.shuffle_questions || false,
        shuffle_options: test.shuffle_options || false,
        retake_allowed: test.retake_allowed ?? true,
        is_published: test.is_published || false,
      });

      setQuestions(existingQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        explanation: q.explanation || '',
        options: (q.mcq_options as any[]).sort((a, b) => a.order_number - b.order_number).map(o => ({
          id: o.id,
          option_label: o.option_label,
          option_text: o.option_text,
          is_correct: o.is_correct,
        })),
      })));
    }
  }, [existingTest]);

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        explanation: '',
        options: [
          { option_label: 'A', option_text: '', is_correct: false },
          { option_label: 'B', option_text: '', is_correct: false },
          { option_label: 'C', option_text: '', is_correct: false },
          { option_label: 'D', option_text: '', is_correct: false },
        ],
      },
    ]);
  };

  const addOptionToQuestion = (questionIndex: number) => {
    setQuestions(questions.map((q, idx) => {
      if (idx !== questionIndex || q.options.length >= 5) return q;
      const nextLabel = String.fromCharCode(65 + q.options.length); // A=65, B=66, etc.
      return {
        ...q,
        options: [...q.options, { option_label: nextLabel, option_text: '', is_correct: false }]
      };
    }));
  };

  const removeOptionFromQuestion = (questionIndex: number, optionIndex: number) => {
    setQuestions(questions.map((q, idx) => {
      if (idx !== questionIndex || q.options.length <= 2) return q;
      const newOptions = q.options.filter((_, oIdx) => oIdx !== optionIndex);
      // Relabel options A, B, C, D, E
      return {
        ...q,
        options: newOptions.map((o, oIdx) => ({
          ...o,
          option_label: String.fromCharCode(65 + oIdx)
        }))
      };
    }));
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions(questions.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const updateOption = (questionIndex: number, optionIndex: number, updates: Partial<Question['options'][0]>) => {
    setQuestions(questions.map((q, qIdx) => {
      if (qIdx !== questionIndex) return q;
      return {
        ...q,
        options: q.options.map((o, oIdx) => {
          if (oIdx !== optionIndex) return updates.is_correct ? { ...o, is_correct: false } : o;
          return { ...o, ...updates };
        }),
      };
    }));
  };

  const handleParsedQuestions = (parsedQuestions: Question[]) => {
    setQuestions([...questions, ...parsedQuestions]);
    setQuestionInput('add');
    toast.success(`Added ${parsedQuestions.length} questions`);
  };

  const handleSave = async (publish = false) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const testData = {
        title: formData.title,
        topic_name: formData.topic_name || null,
        description: formData.description || null,
        subject_id: formData.subject_id || null,
        time_limit_mins: formData.time_limit_mins ? parseInt(formData.time_limit_mins) : null,
        test_mode: formData.test_mode,
        result_visibility: formData.result_visibility,
        shuffle_questions: formData.shuffle_questions,
        shuffle_options: formData.shuffle_options,
        retake_allowed: formData.retake_allowed,
        is_published: publish ? true : formData.is_published,
        created_by: user.id,
      };

      let savedTestId = testId;

      if (testId) {
        // Update existing test
        const { error } = await supabase
          .from('mcq_tests')
          .update(testData)
          .eq('id', testId);
        if (error) throw error;
      } else {
        // Create new test
        const { data: newTest, error } = await supabase
          .from('mcq_tests')
          .insert(testData)
          .select()
          .single();
        if (error) throw error;
        savedTestId = newTest.id;
      }

      // Diff-based question save: preserve existing question IDs so student
      // attempt responses (mcq_responses) are not cascade-deleted.
      const keptQuestionIds = questions.filter(q => q.id).map(q => q.id as string);

      if (testId) {
        // Delete only questions that were removed in the editor
        const { data: existingQs } = await supabase
          .from('mcq_questions')
          .select('id')
          .eq('test_id', testId);
        const toDelete = (existingQs || [])
          .map(q => q.id)
          .filter(id => !keptQuestionIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from('mcq_questions').delete().in('id', toDelete);
        }
      }

      // Upsert questions and their options
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let questionId = q.id;

        if (questionId) {
          // Update existing question (keeps responses intact)
          const { error: qError } = await supabase
            .from('mcq_questions')
            .update({
              question_text: q.question_text,
              explanation: q.explanation || null,
              order_number: i,
            })
            .eq('id', questionId);
          if (qError) throw qError;

          // Replace options for this question. Responses reference option IDs
          // via ON DELETE SET NULL, so historical responses keep their
          // is_correct value but the selected option text may be lost.
          await supabase.from('mcq_options').delete().eq('question_id', questionId);
        } else {
          const { data: savedQuestion, error: qError } = await supabase
            .from('mcq_questions')
            .insert({
              test_id: savedTestId,
              question_text: q.question_text,
              explanation: q.explanation || null,
              order_number: i,
            })
            .select()
            .single();
          if (qError) throw qError;
          questionId = savedQuestion.id;
        }

        const optionsData = q.options.map((o, oIdx) => ({
          question_id: questionId,
          option_label: o.option_label,
          option_text: o.option_text,
          is_correct: o.is_correct,
          order_number: oIdx,
        }));

        const { error: oError } = await supabase
          .from('mcq_options')
          .insert(optionsData);

        if (oError) throw oError;
      }

      toast.success(publish ? 'Test published!' : 'Test saved!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save test');
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return formData.title.trim().length > 0;
    }
    if (currentStep === 1) {
      return questions.length > 0 && questions.every(q => 
        q.question_text.trim() && 
        q.options.some(o => o.is_correct) &&
        q.options.every(o => o.option_text.trim())
      );
    }
    return true;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{testId ? 'Edit Test' : 'Create MCQ Test'}</h2>
          <p className="text-sm text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b">
        <div className="flex gap-2">
          {STEPS.map((step, idx) => (
            <div 
              key={step}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-colors",
                idx <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          {STEPS.map((step, idx) => (
            <span key={step} className={cn(idx === currentStep && "text-primary font-medium")}>
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Test Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Chapter 1 Review"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select 
                      value={formData.subject_id} 
                      onValueChange={(v) => setFormData({ ...formData, subject_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects?.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic Name</Label>
                    <Input
                      id="topic"
                      value={formData.topic_name}
                      onChange={(e) => setFormData({ ...formData, topic_name: e.target.value })}
                      placeholder="e.g., Photosynthesis"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Test Mode</Label>
                    <Select 
                      value={formData.test_mode} 
                      onValueChange={(v) => setFormData({ ...formData, test_mode: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="practice">Practice</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time Limit (mins)</Label>
                    <Input
                      id="time"
                      type="number"
                      value={formData.time_limit_mins}
                      onChange={(e) => setFormData({ ...formData, time_limit_mins: e.target.value })}
                      placeholder="No limit"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Result Visibility</Label>
                  <Select 
                    value={formData.result_visibility} 
                    onValueChange={(v) => setFormData({ ...formData, result_visibility: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant (show immediately)</SelectItem>
                      <SelectItem value="delayed">Delayed (score shown, answers revealed by you later)</SelectItem>
                      <SelectItem value="hidden">Hidden (never show answers)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shuffle-q">Shuffle Questions</Label>
                    <Switch
                      id="shuffle-q"
                      checked={formData.shuffle_questions}
                      onCheckedChange={(v) => setFormData({ ...formData, shuffle_questions: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shuffle-o">Shuffle Options</Label>
                    <Switch
                      id="shuffle-o"
                      checked={formData.shuffle_options}
                      onCheckedChange={(v) => setFormData({ ...formData, shuffle_options: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="retake">Allow Retakes</Label>
                    <Switch
                      id="retake"
                      checked={formData.retake_allowed}
                      onCheckedChange={(v) => setFormData({ ...formData, retake_allowed: v })}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Input Method Tabs */}
                <Tabs value={questionInput} onValueChange={(v) => setQuestionInput(v as any)}>
                  <TabsList className="grid grid-cols-5 w-full h-auto">
                    <TabsTrigger value="add" className="text-xs">Manual</TabsTrigger>
                    <TabsTrigger value="paste" className="gap-1 text-xs">
                      <Sparkles className="w-3 h-3" /> Smart
                    </TabsTrigger>
                    <TabsTrigger value="template" className="gap-1 text-xs">
                      <Wand2 className="w-3 h-3" /> Template
                    </TabsTrigger>
                    <TabsTrigger value="json" className="gap-1 text-xs">
                      <FileJson className="w-3 h-3" /> JSON
                    </TabsTrigger>
                    <TabsTrigger value="pdf" className="gap-1 text-xs">
                      <FileUp className="w-3 h-3" /> PDF
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="add" className="mt-4 space-y-4">
                    {questions.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {questions.length} question{questions.length !== 1 && 's'} added
                      </p>
                    )}

                    {questions.map((q, qIdx) => (
                      <Card key={qIdx} className="border-border/50">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="shrink-0 mt-2">Q{qIdx + 1}</Badge>
                            <Textarea
                              value={q.question_text}
                              onChange={(e) => updateQuestion(qIdx, { question_text: e.target.value })}
                              placeholder="Enter question..."
                              rows={2}
                              className="flex-1"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeQuestion(qIdx)}
                              className="shrink-0 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="space-y-2 pl-10">
                            {q.options.map((o, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateOption(qIdx, oIdx, { is_correct: true })}
                                  className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center font-medium text-sm transition-colors",
                                    o.is_correct 
                                      ? "bg-green-500 text-white" 
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  )}
                                >
                                  {o.option_label}
                                </button>
                                <Input
                                  value={o.option_text}
                                  onChange={(e) => updateOption(qIdx, oIdx, { option_text: e.target.value })}
                                  placeholder={`Option ${o.option_label}`}
                                  className="flex-1"
                                />
                                {q.options.length > 2 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeOptionFromQuestion(qIdx, oIdx)}
                                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            {q.options.length < 5 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addOptionToQuestion(qIdx)}
                                className="text-xs text-muted-foreground gap-1 ml-10"
                              >
                                <Plus className="w-3 h-3" />
                                Add Option {String.fromCharCode(65 + q.options.length)}
                              </Button>
                            )}
                          </div>

                          <div className="pl-10">
                            <Input
                              value={q.explanation}
                              onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                              placeholder="Explanation (optional)"
                              className="text-sm"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button onClick={addQuestion} variant="outline" className="w-full gap-2">
                      <Plus className="w-4 h-4" />
                      Add Question
                    </Button>
                  </TabsContent>

                  <TabsContent value="paste" className="mt-4">
                    <MCQTextParser onParsed={handleParsedQuestions} />
                  </TabsContent>

                  <TabsContent value="template" className="mt-4">
                    <MCQTemplateParser onParsed={handleParsedQuestions} />
                  </TabsContent>

                  <TabsContent value="json" className="mt-4">
                    <MCQJSONImporter onParsed={handleParsedQuestions} />
                  </TabsContent>

                  <TabsContent value="pdf" className="mt-4">
                    <MCQPDFUploader onParsed={handleParsedQuestions} />
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Card className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold">{formData.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{formData.test_mode}</Badge>
                      <Badge variant="outline">{questions.length} questions</Badge>
                      {formData.time_limit_mins && (
                        <Badge variant="outline">{formData.time_limit_mins} min</Badge>
                      )}
                      <Badge variant="outline">{formData.result_visibility} results</Badge>
                    </div>
                    {formData.description && (
                      <p className="text-sm text-muted-foreground">{formData.description}</p>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Questions Preview</h4>
                  {questions.slice(0, 5).map((q, idx) => (
                    <Card key={idx} className="border-border/30">
                      <CardContent className="p-3">
                        <p className="text-sm">
                          <span className="font-medium">Q{idx + 1}:</span> {q.question_text}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Answer: {q.options.find(o => o.is_correct)?.option_label}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  {questions.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{questions.length - 5} more questions
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(s => s - 1)}
          disabled={currentStep === 0}
          className="gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex gap-2">
          {currentStep === STEPS.length - 1 ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                Save Draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={isSaving || !canProceed()}
                className="gap-1"
              >
                <Check className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Publish'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canProceed()}
              className="gap-1"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
