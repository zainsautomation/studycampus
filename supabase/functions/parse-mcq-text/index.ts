import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const systemPrompt = `You are an MCQ parser. Given raw text containing multiple choice questions, extract each question with its options and correct answer.

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing MCQ text, length:', text.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse these MCQs:\n\n${text}` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'API credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Failed to parse MCQs');
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let parsed;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
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
