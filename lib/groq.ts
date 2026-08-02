const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export type GroqMessage = { role: "system" | "user" | "assistant"; content: string };
export type GroqResult = { text?: string; error?: string };
export type GroqOptions = { temperature?: number };

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

async function requestOnce(body: string, apiKey: string): Promise<Attempt> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_ENDPOINT, {
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

export async function callGroq(
  prompt: string | GroqMessage[],
  options?: GroqOptions,
  format?: "json"
): Promise<GroqResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { error: "AI service is not configured (missing GROQ_API_KEY)." };
  }

  const messages: GroqMessage[] = typeof prompt === "string" ? [{ role: "user", content: prompt }] : prompt;
  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages,
    ...(options?.temperature != null ? { temperature: options.temperature } : {}),
    ...(format === "json" ? { response_format: { type: "json_object" } } : {}),
  });

  let response: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await requestOnce(body, apiKey);

    if (result.kind === "timeout") {
      return { error: "The AI took too long to respond. Please try again." };
    }
    if (result.kind === "network-error") {
      return { error: "Could not reach the AI service. Please try again later." };
    }

    response = result.response;
    if (response.status !== 429) break;
    if (attempt === MAX_RETRIES) break;

    await sleep(backoffDelayMs(response, attempt));
  }

  if (!response) {
    return { error: "Could not reach the AI service. Please try again later." };
  }

  if (response.status === 429) {
    return { error: "The AI is a bit busy right now — please try again in a moment." };
  }

  if (!response.ok) {
    return { error: `AI service returned an error (${response.status}).` };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";

  if (!text) {
    return { error: "The AI didn't return a response. Please try again." };
  }

  return { text };
}
