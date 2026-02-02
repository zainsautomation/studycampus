import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const systemPrompt = `You are an MCQ parser. Given a PDF document containing multiple choice questions, extract each question with its options and correct answer.

RULES:
1. Identify questions by patterns like "Q1.", "1.", "1)", or just numbered questions
2. Options are labeled as A/B/C/D, a/b/c/d, 1/2/3/4, or i/ii/iii/iv
3. Correct answers can be:
   - After "Answer:" or "Ans:" 
   - In an answer key section (often at the end)
   - Marked with * or (correct) 
   - The full text of the correct option
4. If no answer is found for a question, set is_correct to false for all options
5. Always return exactly 4 options per question (A, B, C, D)
6. Clean up any extra whitespace or formatting
7. Handle page breaks and scattered formatting

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
        {"option_label": "D", "option_text": "Fourth option", "is_correct": false}
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
    const { pdfBase64, fileName } = await req.json();

    if (!pdfBase64) {
      throw new Error('PDF data is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing PDF:', fileName);

    // Use Gemini's native PDF understanding - send base64 directly
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
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: 'Parse the MCQs from this PDF document and extract all questions with their options and correct answers:'
              },
              {
                type: 'file',
                file: {
                  filename: fileName || 'document.pdf',
                  file_data: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          },
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
    console.error('parse-mcq-pdf error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
