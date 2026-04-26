import { useState } from 'react';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedQuestion {
  question_text: string;
  explanation: string;
  options: Array<{
    option_label: string;
    option_text: string;
    is_correct: boolean;
  }>;
}

interface MCQTemplateParserProps {
  onParsed: (questions: ParsedQuestion[]) => void;
}

const DEFAULT_TEMPLATE = `Q1. <question text here>
A) <option A>
B) <option B>
C) <option C>
D) <option D>
Answer: B
Explanation: <optional explanation>`;

export function MCQTemplateParser({ onParsed }: MCQTemplateParserProps) {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [text, setText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) {
      toast.error('Paste your MCQs first');
      return;
    }
    if (!template.trim()) {
      toast.error('Provide a template/sample');
      return;
    }

    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-mcq-text', {
        body: { text: text.trim(), template: template.trim() },
      });

      if (error) throw error;

      if (data?.questions?.length > 0) {
        onParsed(data.questions);
        setText('');
      } else {
        toast.error('No questions detected. Check your template matches the format.');
      }
    } catch (err: any) {
      console.error('Template parse error:', err);
      toast.error(err.message || 'Failed to parse MCQs');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p className="mb-1 flex items-center gap-1">
          <Wand2 className="w-3.5 h-3.5" />
          Show your <strong className="text-foreground">exact format</strong> once, then paste
          MCQs in that same structure for higher accuracy.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">1. Your Template/Format Sample</Label>
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={7}
          className="font-mono text-xs"
          placeholder="Paste one example MCQ in your exact format..."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">2. Paste Your MCQs (in same format)</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste all your MCQs here, following the template above..."
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      <Button
        onClick={handleParse}
        disabled={!text.trim() || !template.trim() || isParsing}
        className="w-full gap-2"
      >
        {isParsing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Parsing with template...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Parse Using Template
          </>
        )}
      </Button>
    </div>
  );
}
