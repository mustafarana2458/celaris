const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 30_000;

export type GroqMessage = { role: "system" | "user" | "assistant"; content: string };
export type GroqResult = { text?: string; error?: string };
export type GroqOptions = { temperature?: number };

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
        ...(format === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      return { error: "The AI service is rate-limited right now. Please try again in a moment." };
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
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "The AI took too long to respond. Please try again." };
    }
    return { error: "Could not reach the AI service. Please try again later." };
  } finally {
    clearTimeout(timeout);
  }
}
