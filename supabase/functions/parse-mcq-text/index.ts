import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAIGateway } from "../_shared/aiKeyPool.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const baseSystemPrompt = `You are an MCQ parser. Given raw text containing multiple choice questions, extract each question with its options and correct answer.

RULES:
1. Identify questions by patterns like "Q1.", "1.", "1)", or just numbered questions
2. Options are labeled as A/B/C/D/E, a/b/c/d/e, 1/2/3/4/5, or i/ii/iii/iv/v
3. Correct answers can be:
   - After "Answer:" or "Ans:" 
   - At the bottom as an answer key
   - Marked with * or (correct) 
   - The full text of the correct option
4. If no answer is found for a question, set is_correct to false for all options
5. Return 4-5 options per question (A, B, C, D, and optionally E if present in the source)
6. Clean up any extra whitespace or formatting
7. Look for explanations after answers (marked with "Explanation:", "Reason:", or similar)

OUTPUT FORMAT (strict JSON):
{
  "questions": [
    {
      "question_text": "The question text here",
      "explanation": "Optional explanation or empty string",
      "options": [
        {"option_label": "A", "option_text": "First option", "is_correct": false},
        {"option_label": "B", "option_text": "Second option", "is_correct": true},
        {"option_label": "C", "option_text": "Third option", "is_correct": false},
        {"option_label": "D", "option_text": "Fourth option", "is_correct": false},
        {"option_label": "E", "option_text": "Fifth option (if present)", "is_correct": false}
      ]
    }
  ]
}

Return ONLY valid JSON, no markdown or explanation.`;

function extractJson(raw: string): any | null {
  if (!raw) return null;
  // Strip markdown fences anywhere in the string
  let s = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Try direct parse first
  try { return JSON.parse(s); } catch { /* fall through */ }

  // Find the first { or [ and the matching last } or ]
  const firstBrace = s.indexOf('{');
  const firstBracket = s.indexOf('[');
  let start = -1;
  let openChar = '';
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace; openChar = '{';
  } else if (firstBracket !== -1) {
    start = firstBracket; openChar = '[';
  }
  if (start === -1) return null;

  const closeChar = openChar === '{' ? '}' : ']';
  const lastClose = s.lastIndexOf(closeChar);
  if (lastClose > start) {
    const slice = s.slice(start, lastClose + 1);
    try { return JSON.parse(slice); } catch { /* try repair */ }
  }

  // Repair likely-truncated JSON by walking and balancing brackets
  const sub = s.slice(start);
  const stack: string[] = [];
  let inStr = false;
  let escape = false;
  let lastSafe = -1;
  for (let i = 0; i < sub.length; i++) {
    const ch = sub[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') {
      stack.pop();
      if (stack.length === 0) lastSafe = i;
    }
  }

  // If still inside a structure, close it
  let candidate = sub;
  if (stack.length > 0) {
    // Trim trailing partial token (incomplete string/number/key)
    let cut = candidate.length;
    // remove trailing comma+whitespace+partial
    candidate = candidate.replace(/,\s*("[^"]*"?\s*:?\s*[^,}\]]*)?$/, '');
    // close remaining open brackets
    while (stack.length) {
      const open = stack.pop()!;
      candidate += open === '{' ? '}' : ']';
    }
  } else if (lastSafe !== -1) {
    candidate = sub.slice(0, lastSafe + 1);
  }

  try { return JSON.parse(candidate); } catch { return null; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, template } = await req.json();

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }

    console.log('Parsing MCQ text, length:', text.length, 'template provided:', !!template);

    const systemPrompt = template && typeof template === 'string' && template.trim()
      ? `${baseSystemPrompt}\n\nIMPORTANT: The user has provided a TEMPLATE showing their exact MCQ format. Use this template to understand the structure, then parse the input text following the same pattern.\n\nTEMPLATE:\n${template.trim()}`
      : baseSystemPrompt;

    const { response, usedKeyLabel, exhausted } = await callAIGateway({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse these MCQs:\n\n${text}` },
      ],
      temperature: 0.1,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error (key: ${usedKeyLabel}):`, response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: exhausted ? 'All API keys are rate limited. Please try again later.' : 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'All AI API keys are out of credits. Add a new key in Admin → AI Keys.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Failed to parse MCQs');
    }

    console.log(`Parsed successfully using key: ${usedKeyLabel}`);

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response — robust against markdown fences, prefixes, and trailing junk
    const parsed = extractJson(content);
    if (!parsed) {
      console.error('Failed to parse AI response (first 500 chars):', content.slice(0, 500));
      console.error('Last 500 chars:', content.slice(-500));
      throw new Error('Failed to parse AI response as JSON');
    }

    console.log('Parsed questions count:', parsed.questions?.length || 0);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('parse-mcq-text error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
