import { useState } from 'react';
import { FileJson, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

interface MCQJSONImporterProps {
  onParsed: (questions: ParsedQuestion[]) => void;
}

const EXAMPLE = `[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "answer": "B",
    "explanation": "Paris is the capital of France."
  },
  {
    "question": "Which planet is closest to the Sun?",
    "options": ["Venus", "Earth", "Mercury", "Mars", "Jupiter"],
    "answer": "C"
  }
]`;

function normalizeAnswer(
  answer: unknown,
  options: string[]
): number {
  if (typeof answer === 'number') return answer;
  if (typeof answer !== 'string') return -1;
  const trimmed = answer.trim();
  // Letter (A/B/C/D/E or a/b/c/d/e)
  if (/^[a-eA-E]$/.test(trimmed)) {
    return trimmed.toUpperCase().charCodeAt(0) - 65;
  }
  // Number (1-5)
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= options.length) return num - 1;
  // Match by text
  const idx = options.findIndex((o) => o.trim().toLowerCase() === trimmed.toLowerCase());
  return idx;
}

export function MCQJSONImporter({ onParsed }: MCQJSONImporterProps) {
  const [text, setText] = useState('');

  const handleImport = () => {
    if (!text.trim()) {
      toast.error('Paste some JSON first');
      return;
    }

    try {
      const parsed = JSON.parse(text.trim());
      const arr = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(arr)) throw new Error('Expected an array of questions');

      const questions: ParsedQuestion[] = arr.map((item: any, qIdx: number) => {
        const questionText = item.question || item.question_text || item.text;
        if (!questionText) throw new Error(`Question ${qIdx + 1} is missing 'question' field`);

        // Options can be array of strings, or array of objects with text/is_correct
        let optionTexts: string[] = [];
        let correctIdx = -1;

        if (Array.isArray(item.options)) {
          if (item.options.length > 0 && typeof item.options[0] === 'object') {
            optionTexts = item.options.map((o: any) => o.text || o.option_text || '');
            correctIdx = item.options.findIndex((o: any) => o.is_correct === true || o.correct === true);
          } else {
            optionTexts = item.options.map((o: any) => String(o));
          }
        }

        if (optionTexts.length < 2) {
          throw new Error(`Question ${qIdx + 1} must have at least 2 options`);
        }
        if (optionTexts.length > 5) {
          throw new Error(`Question ${qIdx + 1} has more than 5 options (max supported)`);
        }

        if (correctIdx < 0) {
          const ans = item.answer ?? item.correct ?? item.correct_answer;
          correctIdx = normalizeAnswer(ans, optionTexts);
        }

        if (correctIdx < 0 || correctIdx >= optionTexts.length) {
          throw new Error(`Question ${qIdx + 1} has invalid or missing answer`);
        }

        return {
          question_text: questionText,
          explanation: item.explanation || item.exp || '',
          options: optionTexts.map((opt, oIdx) => ({
            option_label: String.fromCharCode(65 + oIdx),
            option_text: opt,
            is_correct: oIdx === correctIdx,
          })),
        };
      });

      onParsed(questions);
      setText('');
      toast.success(`Imported ${questions.length} questions`);
    } catch (err: any) {
      console.error('JSON import error:', err);
      toast.error(err.message || 'Invalid JSON format');
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p className="mb-2">Paste a JSON array of questions. Supports 4 or 5 options.</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><code className="text-primary">question</code> — the question text</li>
          <li><code className="text-primary">options</code> — array of 2–5 strings</li>
          <li><code className="text-primary">answer</code> — letter (A–E), number (1–5), or full option text</li>
          <li><code className="text-primary">explanation</code> — optional</li>
        </ul>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={EXAMPLE}
        rows={14}
        className="font-mono text-xs"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setText(EXAMPLE)}
          className="gap-2"
          type="button"
        >
          <FileJson className="w-4 h-4" />
          Load Example
        </Button>
        <Button onClick={handleImport} disabled={!text.trim()} className="flex-1 gap-2">
          <Check className="w-4 h-4" />
          Import JSON
        </Button>
      </div>
    </div>
  );
}
