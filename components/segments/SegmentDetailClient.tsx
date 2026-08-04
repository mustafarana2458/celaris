"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { SegmentModal } from "./SegmentModal";
import { ContactsPagination } from "@/components/contacts/ContactsPagination";
import { SetBreadcrumbLabel } from "@/components/dashboard/BreadcrumbContext";
import { tagColor } from "@/lib/tagColors";
import { getInitials } from "@/lib/avatar";
import { resolveContactTagNames } from "@/lib/tags";
import { downloadCsv } from "@/lib/csv";
import { previewSegmentContacts, exportSegmentContacts } from "@/lib/actions/segments";
import { DEFAULT_PAGE_SIZE } from "@/lib/types";
import type { Segment } from "@/lib/segments";
import type { Company, Contact, Tag } from "@/lib/types";

const typeStyles: Record<Contact["type"], string> = {
  lead: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  customer: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
};

export function SegmentDetailClient({
  segment: initialSegment,
  initialContacts,
  initialTotal,
  companies,
  tags,
}: {
  segment: Segment;
  initialContacts: Contact[];
  initialTotal: number;
  companies: Pick<Company, "id" | "name">[];
  tags: Pick<Tag, "id" | "name">[];
}) {
  const [segment, setSegment] = useState(initialSegment);
  const [contacts, setContacts] = useState(initialContacts);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fetchContacts(
    overrides: Partial<{ page: number; pageSize: number; search: string; queryLogic: Segment["query_logic"] }> = {}
  ) {
    setLoadError(null);
    startTransition(async () => {
      const result = await previewSegmentContacts(overrides.queryLogic ?? segment.query_logic, {
        search: overrides.search ?? search,
        page: overrides.page ?? page,
        pageSize: overrides.pageSize ?? pageSize,
      });
      if ("error" in result) {
        setLoadError(result.error);
        return;
      }
      setContacts(result.contacts);
      setTotal(result.total);
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchContacts({ search: value, page: 1 });
    }, 350);
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

  function handleSaved(updated: Segment) {
    setEditOpen(false);
    setSegment(updated);
    setPage(1);
    fetchContacts({ page: 1, queryLogic: updated.query_logic });
  }

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    const result = await exportSegmentContacts(segment.query_logic);
    setExporting(false);
    if ("error" in result) {
      setExportError(result.error);
      return;
    }

    const rows = result.contacts.map((c) => [
      c.name,
      c.email ?? "",
      c.phone ?? "",
      c.companies?.name ?? c.company ?? "",
      c.type,
      resolveContactTagNames(c).join("; "),
      new Date(c.created_at).toLocaleDateString(),
    ]);

    downloadCsv(
      `${segment.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Phone", "Company", "Type", "Tags", "Created"],
      rows
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SetBreadcrumbLabel label={segment.name} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/contacts/segments"
            className="text-xs font-medium text-slate-400 hover:text-accent dark:text-slate-500"
          >
            &larr; Back to Segments
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {segment.name}
          </h1>
          {segment.description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{segment.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit Rules
          </Button>
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "Export to CSV"}
          </Button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by name, email, or company..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      {(loadError || exportError) && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {loadError || exportError}
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <NavIcon name="users" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {search.trim() ? "No matching contacts" : "No contacts match this segment yet"}
          </p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {search.trim()
              ? "Try a different search."
              : "As contacts start matching these rules, they'll show up here automatically."}
          </p>
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
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
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

      <SegmentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        segment={segment}
        companies={companies}
        tags={tags}
        onSaved={handleSaved}
      />
    </div>
  );
}
