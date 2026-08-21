import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-2603";
const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
// Admin Portal AI Engine module: last-resort safety net, off by default
// (see fetchOpenAiFallbackFromDb below) -- only ever attempted after BOTH
// the selected strategy's providers have already failed, via
// tryFinalFallback(). Never a first or second choice in any mode.
const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MODE_CACHE_MS = 5000;

export type GroqMessage = { role: "system" | "user" | "assistant"; content: string };
export type GroqResult = { text?: string; error?: string };
export type GroqOptions = { temperature?: number };
export type AiProviderMode = "auto" | "auto2" | "groq" | "mistral";

type Attempt =
  | { kind: "response"; response: Response }
  | { kind: "timeout" }
  | { kind: "network-error" };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Honors the server's Retry-After header when present, otherwise backs off
// 1s, 2s, 4s across the retry attempts.
function backoffDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  }
  return BASE_DELAY_MS * 2 ** attempt;
}

function buildBody(model: string, messages: GroqMessage[], options?: GroqOptions, format?: "json") {
  return JSON.stringify({
    model,
    messages,
    ...(options?.temperature != null ? { temperature: options.temperature } : {}),
    ...(format === "json" ? { response_format: { type: "json_object" } } : {}),
  });
}

async function requestOnce(endpoint: string, body: string, apiKey: string): Promise<Attempt> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: controller.signal,
    });
    return { kind: "response", response };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { kind: "timeout" };
    }
    return { kind: "network-error" };
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(data: unknown): string {
  const choices = (data as { choices?: { message?: { content?: string } }[] } | null)?.choices;
  return choices?.[0]?.message?.content?.trim() ?? "";
}

// Tries Groq with its full retry/backoff behavior on 429. Returns a result on
// success, or null if Groq is unusable for any reason (missing key, timeout,
// network error, exhausted retries, non-2xx, empty response) -- null means
// "the caller should fall back to Mistral."
async function tryGroq(messages: GroqMessage[], options?: GroqOptions, format?: "json"): Promise<GroqResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[AI] GROQ_API_KEY is not set; falling back to Mistral.");
    return null;
  }

  const body = buildBody(GROQ_MODEL, messages, options, format);
  let response: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await requestOnce(GROQ_ENDPOINT, body, apiKey);

    if (result.kind === "timeout") {
      console.error("[AI] Groq request timed out; falling back to Mistral.");
      return null;
    }
    if (result.kind === "network-error") {
      console.error("[AI] Groq network error; falling back to Mistral.");
      return null;
    }

    response = result.response;
    if (response.status !== 429) break;
    if (attempt === MAX_RETRIES) break;

    await sleep(backoffDelayMs(response, attempt));
  }

  if (!response) {
    console.error("[AI] Groq gave no response; falling back to Mistral.");
    return null;
  }

  if (!response.ok) {
    console.error(`[AI] Groq returned ${response.status} after retries; falling back to Mistral.`);
    return null;
  }

  const text = extractText(await response.json());
  if (!text) {
    console.error("[AI] Groq returned an empty response; falling back to Mistral.");
    return null;
  }

  return { text };
}

// Single-shot fallback -- no retry loop of its own. If Groq already
// exhausted its retries, we want one clean attempt at the backup provider,
// not a second multi-attempt cycle.
async function tryMistral(messages: GroqMessage[], options?: GroqOptions, format?: "json"): Promise<GroqResult | null> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.error("[AI] MISTRAL_API_KEY is not set; no fallback available.");
    return null;
  }

  const body = buildBody(MISTRAL_MODEL, messages, options, format);
  const result = await requestOnce(MISTRAL_ENDPOINT, body, apiKey);

  if (result.kind === "timeout") {
    console.error("[AI] Mistral fallback request timed out.");
    return null;
  }
  if (result.kind === "network-error") {
    console.error("[AI] Mistral fallback network error.");
    return null;
  }

  const { response } = result;
  if (!response.ok) {
    console.error(`[AI] Mistral fallback returned ${response.status}.`);
    return null;
  }

  const text = extractText(await response.json());
  if (!text) {
    console.error("[AI] Mistral fallback returned an empty response.");
    return null;
  }

  return { text };
}

// Single-shot last-resort attempt at OpenAI, mirroring tryMistral's shape
// exactly (no retry loop -- by the time this is called, both Groq and
// Mistral have already exhausted their own attempts). Only ever invoked
// by tryFinalFallback() when the Admin Portal's OpenAI safety-net toggle
// is on.
async function tryOpenAI(messages: GroqMessage[], options?: GroqOptions, format?: "json"): Promise<GroqResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[AI] OpenAI fallback is enabled but OPENAI_API_KEY is not set; no safety net available.");
    return null;
  }

  const body = buildBody(OPENAI_MODEL, messages, options, format);
  const result = await requestOnce(OPENAI_ENDPOINT, body, apiKey);

  if (result.kind === "timeout") {
    console.error("[AI] OpenAI fallback request timed out.");
    return null;
  }
  if (result.kind === "network-error") {
    console.error("[AI] OpenAI fallback network error.");
    return null;
  }

  const { response } = result;
  if (!response.ok) {
    console.error(`[AI] OpenAI fallback returned ${response.status}.`);
    return null;
  }

  const text = extractText(await response.json());
  if (!text) {
    console.error("[AI] OpenAI fallback returned an empty response.");
    return null;
  }

  return { text };
}

// Reads the Admin Portal's OpenAI-fallback-safety-net toggle directly from
// app_settings (key "ai_engine_openai_fallback", value "true"/"false"),
// bypassing the cache below -- same bypass-for-true-value pattern as
// fetchModeFromDb, used by the admin page itself so it always shows the
// true persisted value. Missing row/value defaults to disabled (false) --
// this feature must be explicitly opted into, never silently on.
export async function fetchOpenAiFallbackFromDb(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_engine_openai_fallback")
    .maybeSingle();

  const value = (data as { value?: string } | null)?.value;
  return value === "true";
}

let cachedOpenAiFallback = false;
let cachedOpenAiFallbackAt = 0;

// Called by the admin route right after a successful write, same reasoning
// as invalidateProviderModeCache() above.
export function invalidateOpenAiFallbackCache() {
  cachedOpenAiFallbackAt = 0;
}

async function getOpenAiFallbackEnabled(): Promise<boolean> {
  if (Date.now() - cachedOpenAiFallbackAt < MODE_CACHE_MS) return cachedOpenAiFallback;

  try {
    const supabase = await createClient();
    cachedOpenAiFallback = await fetchOpenAiFallbackFromDb(supabase);
  } catch {
    // Any DB hiccup falls back to the safe default (disabled) rather than
    // unexpectedly spending on a third provider.
    cachedOpenAiFallback = false;
  }
  cachedOpenAiFallbackAt = Date.now();
  return cachedOpenAiFallback;
}

// Shared terminal step for every mode branch in callGroq() below: called
// only once every provider the active strategy allows has already failed.
// If the Admin Portal's OpenAI safety net is enabled, this is the one and
// only place it gets a chance to run before the caller sees an error.
async function tryFinalFallback(messages: GroqMessage[], options?: GroqOptions, format?: "json"): Promise<GroqResult> {
  if (await getOpenAiFallbackEnabled()) {
    console.error(`[AI] Falling back to OpenAI (${OPENAI_MODEL}) safety net after all configured providers failed.`);
    const openaiResult = await tryOpenAI(messages, options, format);
    if (openaiResult) return openaiResult;
  }
  return { error: "AI is currently unavailable. Please try again in a bit." };
}

// Reads the developer-panel provider override directly from app_settings,
// bypassing the cache below. Used by the dev panel itself so it always
// shows/confirms the true persisted value, never a stale cached one.
export async function fetchModeFromDb(supabase: SupabaseClient): Promise<AiProviderMode> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_provider_mode")
    .maybeSingle();

  const value = (data as { value?: string } | null)?.value;
  return value === "groq" || value === "mistral" || value === "auto2" ? value : "auto";
}

let cachedMode: AiProviderMode = "auto";
let cachedAt = 0;

// Called by the dev panel right after a successful write, so this process's
// very next AI call reflects the change immediately instead of waiting out
// the cache window. Other server instances/processes still pick it up
// within MODE_CACHE_MS.
export function invalidateProviderModeCache() {
  cachedAt = 0;
}

async function getProviderMode(): Promise<AiProviderMode> {
  if (Date.now() - cachedAt < MODE_CACHE_MS) return cachedMode;

  try {
    const supabase = await createClient();
    cachedMode = await fetchModeFromDb(supabase);
  } catch {
    // Any DB hiccup falls back to the safe default rather than breaking AI.
    cachedMode = "auto";
  }
  cachedAt = Date.now();
  return cachedMode;
}

export async function callGroq(
  prompt: string | GroqMessage[],
  options?: GroqOptions,
  format?: "json"
): Promise<GroqResult> {
  const messages: GroqMessage[] = typeof prompt === "string" ? [{ role: "user", content: prompt }] : prompt;
  const mode = await getProviderMode();

  if (mode === "groq") {
    const result = await tryGroq(messages, options, format);
    return result ?? (await tryFinalFallback(messages, options, format));
  }

  if (mode === "mistral") {
    const result = await tryMistral(messages, options, format);
    return result ?? (await tryFinalFallback(messages, options, format));
  }

  if (mode === "auto2") {
    // Reverse of "auto" -- Mistral first, Groq as the fallback.
    const mistralResult = await tryMistral(messages, options, format);
    if (mistralResult) return mistralResult;

    console.error(`[AI] Falling back to Groq (${GROQ_MODEL}) after Mistral failure.`);
    const groqResult = await tryGroq(messages, options, format);
    if (groqResult) return groqResult;

    return await tryFinalFallback(messages, options, format);
  }

  // "auto" (default) -- unchanged from the original Groq-first, Mistral-
  // fallback behavior.
  const groqResult = await tryGroq(messages, options, format);
  if (groqResult) return groqResult;

  console.error("[AI] Falling back to Mistral (mistral-small-2603) after Groq failure.");
  const mistralResult = await tryMistral(messages, options, format);
  if (mistralResult) return mistralResult;

  return await tryFinalFallback(messages, options, format);
}
