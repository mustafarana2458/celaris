"use client";

import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { askAssistant } from "@/lib/actions/assistant";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const EXAMPLE_QUESTIONS = [
  "How many leads do I have?",
  "What's my total unpaid amount?",
  "Which deals are in proposal stage?",
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AssistantPageClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { id: makeId(), role: "user", content: trimmed }]);
    setLoading(true);

    const result = await askAssistant(trimmed);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "assistant", content: result.answer ?? "" },
    ]);

    requestAnimationFrame(() => {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendQuestion(input);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">AI Business Assistant</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ask questions about your contacts, deals, projects, tasks, and invoices.
        </p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex-1 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ask a question about your business data to get started.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendQuestion(q)}
                    disabled={loading}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-accent text-white"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-accent dark:border-slate-600" />
                    Thinking… this can take up to 30 seconds.
                  </div>
                </div>
              )}
              <div ref={listEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-slate-200 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-slate-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-3 border-t border-slate-200 p-4 dark:border-slate-700">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your contacts, deals, tasks, invoices..."
            disabled={loading}
            maxLength={500}
            className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <Button type="submit" loading={loading} disabled={!input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
