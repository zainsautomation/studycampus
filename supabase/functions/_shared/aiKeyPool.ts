// Shared helper to call AI providers (Lovable Gateway or Google Gemini direct)
// with automatic failover across an admin-managed pool of API keys.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type AIProvider = "lovable" | "gemini";

export interface AIKey {
  id: string;
  label: string;
  api_key: string;
  provider: AIProvider;
}

export async function loadKeyPool(): Promise<AIKey[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data, error } = await admin
    .from("ai_api_keys")
    .select("id, label, api_key, provider")
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load ai_api_keys:", error);
  }

  const pool: AIKey[] = (data ?? []).map((k) => ({
    id: k.id,
    label: k.label,
    api_key: k.api_key,
    provider: (k.provider as AIProvider) ?? "lovable",
  }));

  // Append the system fallback last so existing setups keep working
  const systemKey = Deno.env.get("LOVABLE_API_KEY");
  if (systemKey) {
    pool.push({
      id: "system",
      label: "System (LOVABLE_API_KEY)",
      api_key: systemKey,
      provider: "lovable",
    });
  }

  return pool;
}

async function markKeyFailed(keyId: string) {
  if (keyId === "system") return;
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin
      .from("ai_api_keys")
      .update({ last_failed_at: new Date().toISOString() })
      .eq("id", keyId);
  } catch (e) {
    console.warn("Failed to mark key failed:", e);
  }
}

async function markKeyUsed(keyId: string) {
  if (keyId === "system") return;
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin
      .from("ai_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyId);
  } catch (e) {
    console.warn("Failed to mark key used:", e);
  }
}

interface CallBody {
  model: string;
  // content can be a string or a multimodal array (text + file parts)
  messages: Array<{ role: string; content: unknown }>;
  temperature?: number;
}

// Map Lovable model IDs to Gemini API model names
function toGeminiModel(model: string): string {
  // Strip "google/" prefix if present
  const stripped = model.replace(/^google\//, "");
  // Gemini API uses model names like "gemini-2.5-flash", "gemini-1.5-flash"
  // Map preview names to stable equivalents
  const map: Record<string, string> = {
    "gemini-3-flash-preview": "gemini-2.5-flash",
    "gemini-3-pro-preview": "gemini-2.5-pro",
    "gemini-3.1-pro-preview": "gemini-2.5-pro",
  };
  return map[stripped] ?? stripped;
}

async function callLovable(key: AIKey, body: CallBody): Promise<Response> {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function callGemini(key: AIKey, body: CallBody): Promise<Response> {
  const model = toGeminiModel(body.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.api_key}`;

  // Gemini fallback only supports plain string content. Skip if multimodal.
  const hasMultimodal = body.messages.some((m) => typeof m.content !== "string");
  if (hasMultimodal) {
    return new Response(
      JSON.stringify({ error: "Gemini direct provider does not support multimodal input here" }),
      { status: 415, headers: { "Content-Type": "application/json" } },
    );
  }

  const systemMsgs = body.messages.filter((m) => m.role === "system");
  const convMsgs = body.messages.filter((m) => m.role !== "system");

  const geminiBody: Record<string, unknown> = {
    contents: convMsgs.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content as string }],
    })),
    generationConfig: {
      temperature: body.temperature ?? 0.1,
      maxOutputTokens: 8192,
    },
  };

  if (systemMsgs.length > 0) {
    geminiBody.systemInstruction = {
      parts: [{ text: systemMsgs.map((m) => m.content as string).join("\n\n") }],
    };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
  });

  if (!resp.ok) return resp;

  // Reshape Gemini response to OpenAI-compatible shape so callers stay unchanged
  const data = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
    "";

  const openAiShape = {
    choices: [{ message: { role: "assistant", content: text } }],
  };

  return new Response(JSON.stringify(openAiShape), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Try each active key in priority order. Falls over to the next key on
 * 401/402/403/429. Returns the first successful response.
 */
export async function callAIGateway(body: CallBody): Promise<{
  response: Response;
  usedKeyLabel: string;
  exhausted: boolean;
}> {
  const pool = await loadKeyPool();
  if (pool.length === 0) {
    throw new Error("No AI API keys configured");
  }

  let lastResponse: Response | null = null;
  let lastKeyLabel = "";

  for (const key of pool) {
    console.log(`Trying AI key: ${key.label} (${key.provider})`);
    const response =
      key.provider === "gemini" ? await callGemini(key, body) : await callLovable(key, body);

    lastResponse = response;
    lastKeyLabel = key.label;

    if (response.ok) {
      await markKeyUsed(key.id);
      return { response, usedKeyLabel: key.label, exhausted: false };
    }

    // Failover on credits, rate-limit, or auth errors
    if ([401, 402, 403, 429].includes(response.status)) {
      console.warn(`Key "${key.label}" returned ${response.status}, trying next key`);
      await markKeyFailed(key.id);
      try {
        await response.text();
      } catch {
        /* noop */
      }
      continue;
    }

    // Non-retryable error — stop
    return { response, usedKeyLabel: key.label, exhausted: false };
  }

  return { response: lastResponse!, usedKeyLabel: lastKeyLabel, exhausted: true };
}
