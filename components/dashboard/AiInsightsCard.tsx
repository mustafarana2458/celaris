"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { generateInsights } from "@/lib/actions/insights";

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(?:[-*•]\s*)+/, ""))
    .filter(Boolean);
}

export function AiInsightsCard() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    const result = await generateInsights();
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setInsights(parseBullets(result.insights ?? ""));
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-[linear-gradient(120deg,rgb(var(--accent-rgb)/0.12),rgb(var(--accent-rgb)/0.02))] p-5 shadow-sm dark:bg-[linear-gradient(120deg,rgb(var(--accent-rgb)/0.2),rgb(var(--accent-rgb)/0.05))]">
      <Sparkles className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-accent/10 dark:text-accent/15" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 dark:bg-accent/25">
            <Sparkles className="h-5 w-5 text-accent-hover dark:text-accent" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Insights</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              AI-generated recommendations based on your current business data.
            </p>
          </div>
        </div>
        <Button onClick={handleGenerate} loading={loading} disabled={loading} className="relative shrink-0">
          {insights ? "Regenerate" : "Generate Insights"}
        </Button>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-accent dark:border-slate-600" />
          Analyzing your business data… this can take up to 30 seconds.
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">{error}</div>
      )}

      {!loading && insights && insights.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {insights.map((insight, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-lg bg-accent/5 px-3 py-2 text-sm text-slate-700 dark:bg-accent/10 dark:text-slate-300"
            >
              <span className="mt-0.5 shrink-0 text-accent-hover dark:text-accent">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      )}

      {!loading && insights && insights.length === 0 && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          The AI didn&apos;t return any insights. Try regenerating.
        </p>
      )}
    </div>
  );
}
