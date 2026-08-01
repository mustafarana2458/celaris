"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { ContactModal } from "./ContactModal";
import { DeleteContactDialog } from "./DeleteContactDialog";
import { AiFollowUpModal } from "./AiFollowUpModal";
import type { Company, Contact } from "@/lib/types";

const typeStyles: Record<Contact["type"], string> = {
  lead: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  customer: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
};

export function ContactsPageClient({
  initialContacts,
  companies,
}: {
  initialContacts: Contact[];
  companies: Pick<Company, "id" | "name">[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | Contact["type"]>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [aiContact, setAiContact] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialContacts.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (!q) return true;
      const companyName = c.companies?.name ?? c.company ?? "";
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        companyName.toLowerCase().includes(q)
      );
    });
  }, [initialContacts, search, typeFilter]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    closeModal();
    router.refresh();
  }

  function handleDeleted() {
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">People</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage the people you do business with.
          </p>
        </div>
        <Button onClick={openAdd}>+ Add contact</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search by name, email, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <div className="flex gap-2">
          {(["all", "lead", "customer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                typeFilter === t
                  ? "bg-accent text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {t === "all" ? "All" : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <NavIcon name="users" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {initialContacts.length === 0 ? "No contacts yet" : "No matching contacts"}
          </p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {initialContacts.length === 0
              ? "Add your first contact to start building your CRM."
              : "Try a different search or filter."}
          </p>
          {initialContacts.length === 0 && (
            <Button onClick={openAdd} className="mt-1">
              + Add contact
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Tags</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {c.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      <div className="flex flex-col">
                        {c.email && <span>{c.email}</span>}
                        {c.phone && (
                          <span className="text-slate-400 dark:text-slate-500">{c.phone}</span>
                        )}
                        {!c.email && !c.phone && "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {c.companies?.name || c.company || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${typeStyles[c.type]}`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setAiContact(c)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
                        >
                          AI Follow-Up
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ContactModal
        open={modalOpen}
        onClose={closeModal}
        contact={editing}
        companies={companies}
        onSaved={handleSaved}
      />

      <DeleteContactDialog
        contact={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />

      <AiFollowUpModal contact={aiContact} onClose={() => setAiContact(null)} />
    </div>
  );
}
