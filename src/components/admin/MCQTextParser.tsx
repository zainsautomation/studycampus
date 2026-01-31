import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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

interface MCQTextParserProps {
  onParsed: (questions: ParsedQuestion[]) => void;
}

export function MCQTextParser({ onParsed }: MCQTextParserProps) {
  const [text, setText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) {
      toast.error('Please paste some MCQ text');
      return;
    }

    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-mcq-text', {
        body: { text: text.trim() },
      });

      if (error) throw error;

      if (data.questions && data.questions.length > 0) {
        onParsed(data.questions);
        setText('');
      } else {
        toast.error('No questions detected. Please check the format.');
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error(error.message || 'Failed to parse MCQs');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p className="mb-2">Paste your MCQs below. The AI will automatically detect:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Questions and options (A/B/C/D or 1/2/3/4)</li>
          <li>Correct answers (inline, at bottom, or marked with *)</li>
          <li>Answer keys at the end of text</li>
        </ul>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Example:

Q1. What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid
Answer: B

Q2. Which planet is closest to the Sun?
A) Venus
B) Earth
C) Mercury
D) Mars

Answers: 2-C`}
        rows={12}
        className="font-mono text-sm"
      />

      <Button 
        onClick={handleParse} 
        disabled={!text.trim() || isParsing}
        className="w-full gap-2"
      >
        {isParsing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Parsing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Parse MCQs with AI
          </>
        )}
      </Button>
    </div>
  );
}
