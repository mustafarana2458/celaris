"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { ContactModal } from "./ContactModal";
import { DeleteContactDialog } from "./DeleteContactDialog";
import { AiFollowUpDrawer } from "./AiFollowUpDrawer";
import { BulkActionBar } from "./BulkActionBar";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { AdvancedFilterPopover, activeFilterCount } from "./AdvancedFilterPopover";
import { ContactsPagination } from "./ContactsPagination";
import { tagColor } from "@/lib/tagColors";
import { getInitials } from "@/lib/avatar";
import { resolveContactTagNames } from "@/lib/tags";
import { downloadCsv } from "@/lib/csv";
import {
  bulkAddTagToContacts,
  bulkDeleteContacts,
  listContacts,
} from "@/lib/actions/contacts";
import { DEFAULT_PAGE_SIZE } from "@/lib/types";
import type { Company, Contact, ContactFilters, Tag } from "@/lib/types";

const typeStyles: Record<Contact["type"], string> = {
  lead: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  customer: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
};

const EMPTY_FILTERS: ContactFilters = {
  tagIds: [],
  companyId: "",
  dateFrom: "",
  dateTo: "",
  missingPhone: false,
  missingCompany: false,
};

export function ContactsPageClient({
  initialContacts,
  initialTotal,
  companies,
  tags,
}: {
  initialContacts: Contact[];
  initialTotal: number;
  companies: Pick<Company, "id" | "name">[];
  tags: Pick<Tag, "id" | "name">[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | Contact["type"]>("all");
  const [filters, setFilters] = useState<ContactFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [aiContact, setAiContact] = useState<Contact | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const tagSuggestions = tags.map((t) => t.name);

  function fetchContacts(
    overrides: Partial<{
      page: number;
      pageSize: number;
      type: "all" | Contact["type"];
      search: string;
      filters: ContactFilters;
    }> = {}
  ) {
    const params = {
      search: overrides.search ?? search,
      type: overrides.type ?? typeFilter,
      page: overrides.page ?? page,
      pageSize: overrides.pageSize ?? pageSize,
      ...(overrides.filters ?? filters),
    };
    setLoadError(null);
    startTransition(async () => {
      const result = await listContacts(params);
      if ("error" in result) {
        setLoadError(result.error);
        return;
      }
      setContacts(result.contacts);
      setTotal(result.total);
      setSelectedIds(new Set());
    });
  }

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < contacts.length;
    }
  }, [selectedIds, contacts.length]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchContacts({ search: value, page: 1 });
    }, 350);
  }

  function handleTypeFilter(next: "all" | Contact["type"]) {
    setTypeFilter(next);
    setPage(1);
    fetchContacts({ type: next, page: 1 });
  }

  function applyAdvancedFilters(next: ContactFilters) {
    setFilters(next);
    setPage(1);
    setFilterOpen(false);
    fetchContacts({ filters: next, page: 1 });
  }

  function clearAdvancedFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setFilterOpen(false);
    fetchContacts({ filters: EMPTY_FILTERS, page: 1 });
  }

  function goToPage(next: number) {
    setPage(next);
    fetchContacts({ page: next });
  }

  function changePageSize(next: number) {
    setPageSize(next);
    setPage(1);
    fetchContacts({ pageSize: next, page: 1 });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(contacts.map((c) => c.id)) : new Set());
  }

  function toggleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

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
    fetchContacts();
  }

  function handleDeleted() {
    setDeleting(null);
    fetchContacts();
  }

  async function handleBulkDelete() {
    setBulkPending(true);
    setBulkError(null);
    const result = await bulkDeleteContacts(Array.from(selectedIds));
    setBulkPending(false);
    if (result.error) {
      setBulkError(result.error);
      return;
    }
    setBulkDeleteOpen(false);
    fetchContacts();
  }

  async function handleBulkAddTag(tagName: string) {
    setBulkError(null);
    const result = await bulkAddTagToContacts(Array.from(selectedIds), tagName);
    if (result.error) {
      setBulkError(result.error);
      return;
    }
    fetchContacts();
  }

  function handleExport() {
    const rows = contacts
      .filter((c) => selectedIds.has(c.id))
      .map((c) => [
        c.name,
        c.email ?? "",
        c.phone ?? "",
        c.companies?.name ?? c.company ?? "",
        c.type,
        resolveContactTagNames(c).join("; "),
        new Date(c.created_at).toLocaleDateString(),
      ]);

    downloadCsv(
      `contacts-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Phone", "Company", "Type", "Tags", "Created"],
      rows
    );
  }

  const allSelected = contacts.length > 0 && selectedIds.size === contacts.length;
  const hasActiveFilters = activeFilterCount(filters) > 0;
  const hasAnyQuery = !!search.trim() || typeFilter !== "all" || hasActiveFilters;

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
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "lead", "customer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                typeFilter === t
                  ? "bg-accent text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {t === "all" ? "All" : `${t}s`}
            </button>
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                hasActiveFilters
                  ? "border-accent/40 bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M4 5h16l-6 8v5l-4 2v-7L4 5Z" />
              </svg>
              Advanced Filter
              {hasActiveFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">
                  {activeFilterCount(filters)}
                </span>
              )}
            </button>

            <AdvancedFilterPopover
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              companies={companies}
              tags={tags}
              value={filters}
              onApply={applyAdvancedFilters}
              onClear={clearAdvancedFilters}
            />
          </div>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          selectedIds.size > 0 ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <BulkActionBar
          count={selectedIds.size}
          tagSuggestions={tagSuggestions}
          onDelete={() => setBulkDeleteOpen(true)}
          onExport={handleExport}
          onApplyTag={handleBulkAddTag}
          pending={bulkPending}
          error={bulkError}
        />
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {loadError}
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <NavIcon name="users" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {hasAnyQuery ? "No matching contacts" : "No contacts yet"}
          </p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {hasAnyQuery
              ? "Try a different search or filter."
              : "Add your first contact to start building your CRM."}
          </p>
          {!hasAnyQuery && (
            <Button onClick={openAdd} className="mt-1">
              + Add contact
            </Button>
          )}
        </div>
      ) : (
        <div
          className={`overflow-hidden rounded-2xl border border-slate-200 bg-white transition-opacity dark:border-slate-700 dark:bg-slate-800 ${
            isPending ? "opacity-60" : "opacity-100"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="w-10 px-5 py-3">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/40 dark:border-slate-600"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Tags</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                      selectedIds.has(c.id) ? "bg-accent/5 dark:bg-accent/10" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={(e) => toggleSelectOne(c.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/40 dark:border-slate-600"
                        aria-label={`Select ${c.name}`}
                      />
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${tagColor(c.name).dot}`}
                        >
                          {getInitials(c.name)}
                        </span>
                        {c.name}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          {c.email && <span>{c.email}</span>}
                          {c.phone && (
                            <span className="text-slate-400 dark:text-slate-500">{c.phone}</span>
                          )}
                          {!c.email && !c.phone && "—"}
                        </div>
                        <button
                          type="button"
                          onClick={() => setAiContact(c)}
                          title="AI Follow-Up"
                          aria-label={`AI follow-up for ${c.name}`}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-500 transition-all hover:bg-purple-100 hover:text-purple-600 hover:shadow-[0_0_10px_rgba(168,85,247,0.45)] dark:bg-purple-950/40 dark:text-purple-400 dark:hover:bg-purple-950/70"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
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
                        {resolveContactTagNames(c).map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${tagColor(tag).badge}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <RowActionsMenu
                          ariaLabel={`Actions for ${c.name}`}
                          actions={[
                            { label: "Edit", icon: Pencil, onClick: () => openEdit(c) },
                            {
                              label: "Delete",
                              icon: Trash2,
                              destructive: true,
                              onClick: () => setDeleting(c),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > 0 && (
        <ContactsPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      )}

      <ContactModal
        open={modalOpen}
        onClose={closeModal}
        contact={editing}
        companies={companies}
        tagSuggestions={tagSuggestions}
        onSaved={handleSaved}
      />

      <DeleteContactDialog
        contact={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        count={selectedIds.size}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        pending={bulkPending}
        error={bulkError}
      />

      <AiFollowUpDrawer contact={aiContact} onClose={() => setAiContact(null)} />
    </div>
  );
}
