"use client";

import { useEffect, useState } from "react";
import { Sparkles, Mail } from "lucide-react";
import { generateDealSummary } from "@/lib/actions/dealSummary";
import type { Deal } from "@/lib/types";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// Shared content for both the List view's AiSummarySheet and the Kanban
// card's inline accordion -- one generate/cache/regenerate flow, two chrome
// wrappers around the same panel.
export function DealAiSummaryPanel({
  deal,
  onUpdated,
  variant = "spacious",
}: {
  deal: Deal;
  onUpdated: (patch: Partial<Deal> & { id: string }) => void;
  variant?: "spacious" | "compact";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasSummary = !!deal.ai_summary;

  useEffect(() => {
    if (!hasSummary) void generate();
    // Only re-check when switching to a different deal -- once this deal has
    // a cached summary, re-renders must never silently re-trigger a call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id, hasSummary]);

  async function generate() {
    setLoading(true);
    setError(null);
    const result = await generateDealSummary(deal.id);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.summary) {
      onUpdated({ id: deal.id, ai_summary: result.summary, ai_summary_generated_at: result.generated_at ?? new Date().toISOString() });
      setShowFollowUp(false);
      setCopied(false);
    }
  }

  async function handleCopy() {
    if (!deal.ai_summary) return;
    const { subject, body } = deal.ai_summary.follow_up_email;
    const text = subject ? `Subject: ${subject}\n\n${body}` : body;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const textSize = variant === "compact" ? "text-xs" : "text-sm";

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 ${variant === "compact" ? "py-4" : "py-10"}`}>
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-accent dark:border-slate-600" />
        <p className={`${textSize} text-slate-500 dark:text-slate-400`}>Summarizing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <div className={`rounded-lg bg-red-50 p-3 ${textSize} text-red-700 dark:bg-red-950/40 dark:text-red-400`}>
          {error}
        </div>
        <button
          type="button"
          onClick={generate}
          className={`self-start rounded-lg px-2 py-1 ${textSize} font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40`}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!deal.ai_summary) return null;

  const { summary, next_steps, follow_up_email } = deal.ai_summary;
  const mailtoHref = deal.contacts?.email
    ? `mailto:${deal.contacts.email}?subject=${encodeURIComponent(follow_up_email.subject)}&body=${encodeURIComponent(follow_up_email.body)}`
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className={`font-medium text-slate-700 dark:text-slate-300 ${textSize}`}>Summary</p>
        <p className={`mt-1 text-slate-600 dark:text-slate-400 ${textSize}`}>{summary}</p>
      </div>

      <div>
        <p className={`font-medium text-slate-700 dark:text-slate-300 ${textSize}`}>Next best action</p>
        <p className={`mt-1 text-slate-600 dark:text-slate-400 ${textSize}`}>{next_steps}</p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowFollowUp((v) => !v)}
          className={`flex items-center gap-1.5 font-medium text-purple-600 hover:underline dark:text-purple-400 ${textSize}`}
        >
          <Mail className="h-3.5 w-3.5" />
          {showFollowUp ? "Hide follow-up email" : "Draft follow-up email"}
        </button>

        {showFollowUp && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            {follow_up_email.subject && (
              <p className={`font-medium text-slate-900 dark:text-slate-100 ${textSize}`}>{follow_up_email.subject}</p>
            )}
            <p className={`whitespace-pre-wrap text-slate-600 dark:text-slate-400 ${textSize}`}>{follow_up_email.body}</p>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className={`rounded-lg border border-slate-200 px-2.5 py-1 ${textSize} font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              {mailtoHref && (
                <a
                  href={mailtoHref}
                  className={`rounded-lg bg-accent px-2.5 py-1 ${textSize} font-medium text-white hover:bg-accent-hover`}
                >
                  Open in email
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {deal.ai_summary_generated_at ? `Generated ${timeAgo(deal.ai_summary_generated_at)}` : null}
        </span>
        <button
          type="button"
          onClick={generate}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
        >
          <Sparkles className="h-3 w-3" />
          Regenerate
        </button>
      </div>
    </div>
  );
}
