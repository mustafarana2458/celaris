const OLLAMA_MODEL = "llama3.2:3b";
const TIMEOUT_MS = 60_000;

export type OllamaResult = { text?: string; error?: string };
export type OllamaOptions = { temperature?: number };

export async function callOllama(
  prompt: string,
  options?: OllamaOptions,
  format?: "json"
): Promise<OllamaResult> {
  const ollamaUrl = process.env.OLLAMA_URL;
  if (!ollamaUrl) {
    return { error: "AI service is not configured (missing OLLAMA_URL)." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        ...(format ? { format } : {}),
        ...(options ? { options } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { error: `AI service returned an error (${response.status}).` };
    }

    const data = (await response.json()) as { response?: unknown };
    const text = typeof data.response === "string" ? data.response.trim() : "";

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
