"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, FileText, ListChecks, Paperclip, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HideBreadcrumb } from "@/components/dashboard/BreadcrumbContext";
import { askAssistant, confirmAssistantAction } from "@/lib/actions/assistant";
import { saveAiChatMessage } from "@/lib/actions/aiChatHistory";
import { setSaveAiHistory } from "@/lib/actions/userPreferences";
import { ClearChatDialog } from "./ClearChatDialog";
import { TOOL_LABELS, CREATE_ACTION_LABELS, type ReadTool, type WriteTool } from "@/lib/assistantToolLabels";
import type { RemainingCredits } from "@/lib/aiCredits";
import type {
  CreateCompanyParams,
  CreateContactParams,
  CreateDealParams,
  CreateInvoiceParams,
  CreateProjectParams,
  CreateTaskParams,
} from "@/lib/assistantTools";

const INPUT_MAX_HEIGHT = 200;

export type AnswerMessage = {
  id: string;
  role: "user" | "assistant";
  kind: "answer";
  content: string;
  tool?: ReadTool | WriteTool;
  // Only set when this specific response actually deducted a credit --
  // absent for messages loaded from persisted history (Phase 4 doesn't
  // store a per-message delta) or if the deduction itself failed.
  credits?: RemainingCredits;
};

export type ConfirmMessage = {
  id: string;
  role: "assistant";
  kind: "confirm";
  tool: WriteTool;
  params:
    | CreateContactParams
    | CreateTaskParams
    | CreateDealParams
    | CreateCompanyParams
    | CreateProjectParams
    | CreateInvoiceParams;
  preview: string;
  status: "pending" | "confirming" | "confirmed" | "cancelled" | "error";
  error?: string;
};

export type ChatMessage = AnswerMessage | ConfirmMessage;

const EXAMPLE_QUESTIONS = [
  { question: "How many leads do I have?", icon: Users },
  { question: "List my overdue invoices", icon: FileText },
  { question: "Create a task to call Ahmed tomorrow", icon: ListChecks },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Renders **bold** segments as React elements without ever interpreting the
// (partly AI/user-derived) text as HTML, unlike dangerouslySetInnerHTML would.
function renderWithBold(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const match = part.match(/^\*\*(.+)\*\*$/);
    return match ? <strong key={i}>{match[1]}</strong> : <span key={i}>{part}</span>;
  });
}

export function AssistantPageClient({
  initialMessages,
  initialSaveHistory,
  initialCredits,
}: {
  initialMessages: ChatMessage[];
  initialSaveHistory: boolean;
  initialCredits: RemainingCredits;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveHistory, setSaveHistory] = useState(initialSaveHistory);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [credits, setCredits] = useState<RemainingCredits>(initialCredits);
  const listEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Only the final user prompt / assistant answer is persisted -- intermediate
  // tool-call confirmation prompts are not, per the "final response only" scope.
  function persistMessage(role: "user" | "assistant", content: string) {
    if (!saveHistory) return;
    void saveAiChatMessage(role, content);
  }

  async function handleSaveHistoryToggle(checked: boolean) {
    setSaveHistory(checked);
    const result = await setSaveAiHistory(checked);
    if (result.error) {
      setSaveHistory(!checked);
      setError(result.error);
    }
  }

  // Every new message (sent or received) — as well as the "thinking" indicator
  // appearing/disappearing — should bring the latest content into view.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-grow the textarea with content, capped at INPUT_MAX_HEIGHT (then it scrolls).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT)}px`;
  }, [input]);

  function handleClearChat() {
    setConfirmingClear(true);
  }

  function handleChatCleared() {
    setMessages([]);
    setError(null);
    setConfirmingClear(false);
  }

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { id: makeId(), role: "user", kind: "answer", content: trimmed }]);
    persistMessage("user", trimmed);
    setLoading(true);

    const result = await askAssistant(trimmed);
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    if (result.credits) setCredits(result.credits);

    if (result.kind === "answer") {
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "assistant", kind: "answer", content: result.text, tool: result.tool, credits: result.credits },
      ]);
      persistMessage("assistant", result.text);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          kind: "confirm",
          tool: result.tool,
          params: result.params,
          preview: result.preview,
          status: "pending",
        },
      ]);
    }
  }

  async function handleConfirm(message: ConfirmMessage) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id && m.kind === "confirm" ? { ...m, status: "confirming" as const } : m
      )
    );

    const result = await confirmAssistantAction(message.tool, message.params);

    if ("error" in result) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id && m.kind === "confirm"
            ? { ...m, status: "error" as const, error: result.error }
            : m
        )
      );
      return;
    }

    if (result.credits) setCredits(result.credits);

    setMessages((prev) => [
      ...prev.map((m) =>
        m.id === message.id && m.kind === "confirm" ? { ...m, status: "confirmed" as const } : m
      ),
      { id: makeId(), role: "assistant", kind: "answer", content: result.text, tool: result.tool, credits: result.credits },
    ]);
    persistMessage("assistant", result.text);
  }

  function handleCancel(message: ConfirmMessage) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id && m.kind === "confirm" ? { ...m, status: "cancelled" as const } : m
      )
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendQuestion(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <HideBreadcrumb />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">AI Assistant</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your intelligent copilot for managing contacts, deals, and daily tasks.
          </p>
          <p
            className={`mt-1 text-xs font-medium ${
              credits.remaining === 0
                ? "text-red-600 dark:text-red-400"
                : credits.limit > 0 && credits.remaining / credits.limit < 0.1
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-400 dark:text-slate-500"
            }`}
            title={`${credits.used} of ${credits.limit} AI credits used this month`}
          >
            {credits.remaining} / {credits.limit} AI credits left this month
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span>Save Chat History</span>
            <input
              type="checkbox"
              checked={saveHistory}
              onChange={(e) => handleSaveHistoryToggle(e.target.checked)}
              className="h-5 w-9 shrink-0 appearance-none rounded-full bg-slate-300 outline-none transition-colors before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-accent checked:before:translate-x-4 dark:bg-slate-600"
            />
          </label>
          <button
            type="button"
            onClick={handleClearChat}
            disabled={messages.length === 0}
            aria-label="Clear chat"
            title="Clear chat"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex-1 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ask a question or give it something to do to get started.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUESTIONS.map(({ question, icon: Icon }) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendQuestion(question)}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) => {
                if (m.kind === "confirm") {
                  return (
                    <div key={m.id} className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm dark:bg-accent/10">
                        <p className="text-slate-800 dark:text-slate-100">{renderWithBold(m.preview)}</p>
                        {m.status === "pending" && (
                          <div className="mt-3 flex gap-2">
                            <Button type="button" onClick={() => handleConfirm(m)}>
                              Confirm
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => handleCancel(m)}>
                              Cancel
                            </Button>
                          </div>
                        )}
                        {m.status === "confirming" && (
                          <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-accent dark:border-slate-600" />
                            Creating...
                          </p>
                        )}
                        {m.status === "cancelled" && (
                          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Cancelled.</p>
                        )}
                        {m.status === "error" && (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{m.error}</p>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                    {m.tool && (
                      <span className="mb-1 px-1 text-xs text-slate-400 dark:text-slate-500">
                        {TOOL_LABELS[m.tool]}
                      </span>
                    )}
                    <div
                      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === "user"
                          ? "bg-accent text-white"
                          : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.credits?.cost != null && (
                      <span className="mt-1 px-1 text-[11px] text-slate-400 dark:text-slate-500">
                        -{m.credits.cost} AI Credit{m.credits.cost === 1 ? "" : "s"}
                        {m.tool && m.tool in CREATE_ACTION_LABELS
                          ? ` (${CREATE_ACTION_LABELS[m.tool as WriteTool]})`
                          : ""}
                      </span>
                    )}
                  </div>
                );
              })}
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

        <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 dark:border-slate-600 dark:bg-slate-800">
            <button
              type="button"
              disabled
              aria-label="Attach a file (coming soon)"
              title="Attach a file — coming soon"
              className="mb-1 shrink-0 rounded-lg p-1.5 text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data, or ask it to create a contact, task, or deal..."
              disabled={loading}
              maxLength={500}
              rows={1}
              className="max-h-[200px] flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              title="Send"
              className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>

      <ClearChatDialog
        open={confirmingClear}
        saveHistory={saveHistory}
        onClose={() => setConfirmingClear(false)}
        onCleared={handleChatCleared}
      />
    </div>
  );
}
