// Shared helper to call the Lovable AI Gateway with automatic failover
// across an admin-managed pool of API keys stored in `ai_api_keys`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface AIKey {
  id: string;
  label: string;
  api_key: string;
}

export async function loadKeyPool(): Promise<AIKey[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data, error } = await admin
    .from("ai_api_keys")
    .select("id, label, api_key")
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
  }));

  // Always append the system fallback last so existing setups keep working
  const systemKey = Deno.env.get("LOVABLE_API_KEY");
  if (systemKey) {
    pool.push({ id: "system", label: "System (LOVABLE_API_KEY)", api_key: systemKey });
  }

  return pool;
}

async function markKeyFailed(keyId: string) {
  if (keyId === "system") return;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    await admin
      .from("ai_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyId);
  } catch (e) {
    console.warn("Failed to mark key used:", e);
  }
}

/**
 * POST to the Lovable AI Gateway, failing over to the next key in the pool
 * when the current one returns 402 (out of credits) or 429 (rate limited).
 *
 * Returns the first successful Response. If every key fails, returns the
 * last failing Response so the caller can surface the appropriate status.
 */
export async function callAIGateway(body: unknown): Promise<{
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
    console.log(`Trying AI key: ${key.label}`);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    lastResponse = response;
    lastKeyLabel = key.label;

    if (response.ok) {
      await markKeyUsed(key.id);
      return { response, usedKeyLabel: key.label, exhausted: false };
    }

    // Failover on credits, rate-limit, or auth errors (invalid/expired keys).
    if (response.status === 402 || response.status === 429 || response.status === 401 || response.status === 403) {
      console.warn(`Key "${key.label}" returned ${response.status}, trying next key`);
      await markKeyFailed(key.id);
      // Drain body to free the connection
      try { await response.text(); } catch { /* noop */ }
      continue;
    }

    // Non-retryable error — stop and return it
    return { response, usedKeyLabel: key.label, exhausted: false };
  }

  // All keys exhausted
  return { response: lastResponse!, usedKeyLabel: lastKeyLabel, exhausted: true };
}
