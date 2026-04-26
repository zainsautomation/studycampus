import { useState, useMemo } from 'react';
import { Wand2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

const EXAMPLE_INPUT = `Q1. What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid
Answer: B
Explanation: Paris has been the capital since 987 AD.

Q2. Which planet is closest to the Sun?
A) Venus
B) Earth
C) Mercury
D) Mars
E) Jupiter
Answer: C`;

/**
 * Pure regex parser — no AI, instant.
 * Recognizes:
 *   - Question prefixes: Q1., Q1), 1., 1), 1- 
 *   - Option labels: A) A. A- (and a/b/c/d/e, 1/2/3/4/5)
 *   - Answer markers: "Answer:", "Ans:", "Correct:" (letter, number, or full text)
 *   - Optional "Explanation:" / "Reason:" line
 *   - Supports 2–5 options
 */
function parseMCQs(raw: string): ParsedQuestion[] {
  // Normalize line endings, strip BOM
  const text = raw.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  const lines = text.split('\n');
  const questions: ParsedQuestion[] = [];

  // Regex helpers
  const Q_RE = /^\s*(?:Q\s*)?(\d+)[.):\-]\s*(.*)$/i;
  const OPT_RE = /^\s*([A-Ea-e1-5])[.):\-]\s+(.*)$/;
  const ANS_RE = /^\s*(?:Answer|Ans|Correct(?:\s*Answer)?)\s*[:\-]\s*(.+)$/i;
  const EXP_RE = /^\s*(?:Explanation|Reason|Explain)\s*[:\-]\s*(.+)$/i;

  type Block = { qText: string; opts: { label: string; text: string }[]; answer?: string; explanation?: string };
  const blocks: Block[] = [];
  let cur: Block | null = null;
  let mode: 'question' | 'option' | 'explanation' | null = null;

  const pushOption = (label: string, text: string) => {
    if (!cur) return;
    // Normalize numeric labels (1→A, 2→B, ...)
    let lbl = label.toUpperCase();
    if (/^[1-5]$/.test(lbl)) lbl = String.fromCharCode(64 + parseInt(lbl, 10));
    cur.opts.push({ label: lbl, text: text.trim() });
    mode = 'option';
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      // blank line — end of explanation continuation
      if (mode === 'explanation') mode = null;
      continue;
    }

    const qMatch = line.match(Q_RE);
    const optMatch = line.match(OPT_RE);
    const ansMatch = line.match(ANS_RE);
    const expMatch = line.match(EXP_RE);

    // Order matters: explanation/answer take priority over question (Q-regex is greedy with leading numbers)
    if (ansMatch && cur) {
      cur.answer = ansMatch[1].trim();
      mode = null;
      continue;
    }

    if (expMatch && cur) {
      cur.explanation = expMatch[1].trim();
      mode = 'explanation';
      continue;
    }

    if (optMatch && cur) {
      pushOption(optMatch[1], optMatch[2]);
      continue;
    }

    if (qMatch) {
      // Heuristic: if prior block has no options yet, treat this as new question only
      // when there's actually a question text. Otherwise treat as continuation.
      if (cur) blocks.push(cur);
      cur = { qText: qMatch[2].trim(), opts: [] };
      mode = 'question';
      continue;
    }

    // Continuation lines
    if (mode === 'question' && cur) {
      cur.qText += ' ' + line.trim();
    } else if (mode === 'option' && cur && cur.opts.length > 0) {
      cur.opts[cur.opts.length - 1].text += ' ' + line.trim();
    } else if (mode === 'explanation' && cur) {
      cur.explanation = (cur.explanation ? cur.explanation + ' ' : '') + line.trim();
    }
  }
  if (cur) blocks.push(cur);

  // Convert blocks → questions
  for (const b of blocks) {
    if (!b.qText || b.opts.length < 2) continue;

    let correctIdx = -1;
    if (b.answer) {
      const a = b.answer.trim();
      // Letter
      if (/^[A-Ea-e]$/.test(a)) {
        correctIdx = a.toUpperCase().charCodeAt(0) - 65;
      } else if (/^[1-5]$/.test(a)) {
        correctIdx = parseInt(a, 10) - 1;
      } else {
        // Match by text (case-insensitive, trim)
        const target = a.toLowerCase();
        correctIdx = b.opts.findIndex(o => o.text.toLowerCase() === target);
        // Or letter as first char e.g. "B) Paris"
        if (correctIdx < 0) {
          const m = a.match(/^([A-Ea-e1-5])\b/);
          if (m) {
            const c = m[1];
            correctIdx = /[1-5]/.test(c) ? parseInt(c, 10) - 1 : c.toUpperCase().charCodeAt(0) - 65;
          }
        }
      }
    }

    if (correctIdx < 0 || correctIdx >= b.opts.length) {
      // Skip silently — caller will see count and we'll warn below
      continue;
    }

    questions.push({
      question_text: b.qText,
      explanation: b.explanation || '',
      options: b.opts.map((o, i) => ({
        option_label: String.fromCharCode(65 + i),
        option_text: o.text,
        is_correct: i === correctIdx,
      })),
    });
  }

  return questions;
}

export function MCQTemplateParser({ onParsed }: MCQTemplateParserProps) {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [text, setText] = useState('');

  const preview = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return parseMCQs(text);
    } catch {
      return null;
    }
  }, [text]);

  const handleParse = () => {
    if (!text.trim()) {
      toast.error('Paste your MCQs first');
      return;
    }

    const questions = parseMCQs(text);
    if (questions.length === 0) {
      toast.error('No questions detected. Make sure each Q has options and an "Answer:" line.');
      return;
    }

    onParsed(questions);
    setText('');
    toast.success(`Parsed ${questions.length} questions instantly`);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p className="mb-1 flex items-center gap-1">
          <Wand2 className="w-3.5 h-3.5" />
          <strong className="text-foreground">No AI</strong> — instant regex parsing. Format your
          MCQs like the template, paste, and get questions in milliseconds.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">1. Template (reference only — shows expected format)</Label>
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={7}
          className="font-mono text-xs"
          placeholder="Reference template..."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">2. Paste Your MCQs</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setText(EXAMPLE_INPUT)}
          >
            Load Example
          </Button>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste all your MCQs here, following the template format..."
          rows={12}
          className="font-mono text-sm"
        />
      </div>

      {preview !== null && (
        <p className="text-xs text-muted-foreground">
          Detected: <span className="font-medium text-foreground">{preview.length}</span> question
          {preview.length !== 1 && 's'}
        </p>
      )}

      <Button
        onClick={handleParse}
        disabled={!text.trim()}
        className="w-full gap-2"
      >
        <Check className="w-4 h-4" />
        Parse Instantly
      </Button>
    </div>
  );
}
