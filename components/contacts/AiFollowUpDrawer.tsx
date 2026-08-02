"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { generateFollowUpDraft } from "@/lib/actions/ai";
import type { Contact, FollowUpOutputType, FollowUpTone } from "@/lib/types";

const TONE_OPTIONS: { value: FollowUpTone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "direct", label: "Direct" },
  { value: "warm", label: "Warm" },
];

const fieldClass =
  "rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export function AiFollowUpDrawer({
  contact,
  onClose,
}: {
  contact: Contact | null;
  onClose: () => void;
}) {
  const open = !!contact;
  const [outputType, setOutputType] = useState<FollowUpOutputType>("email");
  const [tone, setTone] = useState<FollowUpTone>("friendly");
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOutputType("email");
    setTone("friendly");
    setHasDraft(false);
    setSubject("");
    setBody("");
    setError(null);
    setCopied(false);
  }, [contact?.id, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleGenerate() {
    if (!contact) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    const result = await generateFollowUpDraft(contact.id, outputType, tone);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSubject(result.subject ?? "");
    setBody(result.body);
    setHasDraft(true);
  }

  async function handleCopy() {
    const text = outputType === "email" && subject ? `Subject: ${subject}\n\n${body}` : body;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const mailtoHref =
    outputType === "email" && contact?.email
      ? `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      : undefined;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-slate-900/40 transition-opacity dark:bg-slate-950/60 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out dark:bg-slate-800 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <span aria-hidden>✨</span>
            {contact?.name ?? "AI Follow-Up"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="flex gap-2">
            {(["email", "message"] as FollowUpOutputType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOutputType(t)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  outputType === t
                    ? "bg-accent text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                {t === "email" ? "Email" : "Message"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ai-tone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Tone
            </label>
            <select
              id="ai-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as FollowUpTone)}
              className={fieldClass}
            >
              {TONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button type="button" onClick={handleGenerate} disabled={loading}>
            {hasDraft ? "Generate again" : "Generate"}
          </Button>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-slate-50 py-10 dark:bg-slate-700/40">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-accent dark:border-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Drafting...</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && hasDraft && !error && (
            <div className="flex flex-col gap-4">
              {outputType === "email" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ai-subject" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Subject
                  </label>
                  <input
                    id="ai-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ai-body" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {outputType === "email" ? "Body" : "Message"}
                </label>
                <textarea
                  id="ai-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={outputType === "email" ? 10 : 5}
                  className={fieldClass}
                />
              </div>
            </div>
          )}
        </div>

        {!loading && hasDraft && !error && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <Button type="button" variant="secondary" onClick={handleGenerate}>
              Regenerate
            </Button>
            <Button type="button" variant="secondary" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
            {outputType === "email" && (
              <a
                href={mailtoHref}
                aria-disabled={!mailtoHref}
                onClick={(e) => {
                  if (!mailtoHref) e.preventDefault();
                }}
                className={`inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover ${
                  !mailtoHref ? "pointer-events-none opacity-60" : ""
                }`}
              >
                Open in email
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
