import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIGateway } from "../_shared/aiKeyPool.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const systemPrompt = `You are an MCQ parser. Given a PDF document containing multiple choice questions, extract each question with its options and correct answer.

RULES:
1. Identify questions by patterns like "Q1.", "1.", "1)", or just numbered questions
2. Options are labeled as A/B/C/D/E, a/b/c/d/e, 1/2/3/4/5, or i/ii/iii/iv/v
3. Correct answers can be:
   - After "Answer:" or "Ans:" 
   - In an answer key section (often at the end)
   - Marked with * or (correct) 
   - The full text of the correct option
4. If no answer is found for a question, set is_correct to false for all options
5. Return 4-5 options per question (A, B, C, D, and optionally E if present in the source)
6. Clean up any extra whitespace or formatting
7. Handle page breaks and scattered formatting
8. Look for explanations after answers (marked with "Explanation:", "Reason:", or similar)

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

  let tempStoragePath: string | null = null;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { pdfUrl, storagePath, fileName } = body;

    if (!pdfUrl) {
      throw new Error('pdfUrl is required');
    }

    tempStoragePath = storagePath || null;

    console.log('Processing PDF from URL:', fileName);

    // Fetch the PDF and convert to base64 (streamed, low memory)
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();
    
    // Convert to base64 in chunks to avoid stack overflow
    const bytes = new Uint8Array(pdfBuffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    const pdfBase64 = btoa(binary);

    const { response, usedKeyLabel, exhausted } = await callAIGateway({
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

    console.log(`Parsed PDF successfully using key: ${usedKeyLabel}`);

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    console.log('Parsed questions count:', parsed.questions?.length || 0);

    // Cleanup temp file
    if (tempStoragePath) {
      await admin.storage.from('notes').remove([tempStoragePath]).catch((e) => 
        console.warn('Cleanup failed:', e)
      );
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('parse-mcq-pdf error:', error);
    if (tempStoragePath) {
      await admin.storage.from('notes').remove([tempStoragePath]).catch(() => {});
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
