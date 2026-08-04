"use client";

import { useMemo, useRef, useState } from "react";

type ContactOption = { id: string; name: string };

export function ContactCombobox({
  contacts,
  defaultContactId,
  defaultContactName,
}: {
  contacts: ContactOption[];
  defaultContactId?: string | null;
  defaultContactName?: string | null;
}) {
  const [selected, setSelected] = useState<ContactOption | null>(
    defaultContactId && defaultContactName
      ? { id: defaultContactId, name: defaultContactName }
      : null
  );
  const [query, setQuery] = useState(defaultContactName ?? "");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, query]);

  function selectContact(contact: ContactOption) {
    setSelected(contact);
    setQuery(contact.name);
    setOpen(false);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setOpen(false);
  }

  function handleBlur() {
    // Delay closing so a click on an option registers first.
    blurTimeout.current = setTimeout(() => {
      setOpen(false);
      // Nothing was picked -- don't leave unsaved text behind.
      if (!selected) {
        setQuery("");
      }
    }, 150);
  }

  function handleFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setOpen(true);
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor="contact_search" className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Contact
      </label>
      <input type="hidden" name="contact_id" value={selected?.id ?? ""} />
      <input
        id="contact_search"
        type="text"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          setOpen(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search contacts..."
        className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {selected && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearSelection}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              No contact linked
            </button>
          )}

          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectContact(option)}
              className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                selected?.id === option.id
                  ? "bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {option.name}
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No contacts found.</p>
          )}
        </div>
      )}
    </div>
  );
}
