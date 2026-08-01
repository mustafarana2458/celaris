"use client";

import { KeyboardEvent, useMemo, useState } from "react";
import { tagColor } from "@/lib/tagColors";

export function TagInput({
  name,
  suggestions,
  defaultTags,
}: {
  name: string;
  suggestions: string[];
  defaultTags?: string[];
}) {
  const [tags, setTags] = useState<string[]>(defaultTags ?? []);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const normalizedTags = useMemo(() => new Set(tags.map((t) => t.toLowerCase())), [tags]);

  const filteredSuggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    return suggestions
      .filter((s) => !normalizedTags.has(s.toLowerCase()))
      .filter((s) => !q || s.toLowerCase().includes(q))
      .slice(0, 8);
  }, [suggestions, input, normalizedTags]);

  const trimmedInput = input.trim();
  const canCreate =
    trimmedInput.length > 0 &&
    !normalizedTags.has(trimmedInput.toLowerCase()) &&
    !suggestions.some((s) => s.toLowerCase() === trimmedInput.toLowerCase());

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value || normalizedTags.has(value.toLowerCase())) {
      setInput("");
      return;
    }
    setTags((prev) => [...prev, value]);
    setInput("");
  }

  function removeTag(value: string) {
    setTags((prev) => prev.filter((t) => t !== value));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
      return;
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor="tag_input" className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Tags
      </label>

      {tags.map((tag) => (
        <input key={tag} type="hidden" name={name} value={tag} />
      ))}

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 outline-none transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 dark:border-slate-600 dark:bg-slate-800">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tagColor(tag).badge}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="tag_input"
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={tags.length === 0 ? "Type a tag and press Enter..." : ""}
          className="min-w-[8rem] flex-1 border-none bg-transparent p-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {open && (filteredSuggestions.length > 0 || canCreate) && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${tagColor(s).dot}`} />
              {s}
            </button>
          ))}

          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(trimmedInput)}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-accent-hover hover:bg-accent/5 dark:border-slate-700 dark:text-accent dark:hover:bg-accent/10"
            >
              + Add &ldquo;{trimmedInput}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
