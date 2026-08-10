"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { useCanEdit } from "@/components/workspace/WorkspaceContext";
import { CompanyModal } from "./CompanyModal";
import { DeleteCompanyDialog } from "./DeleteCompanyDialog";
import { BulkActionBar } from "@/components/contacts/BulkActionBar";
import { BulkDeleteDialog } from "@/components/contacts/BulkDeleteDialog";
import { ContactsPagination } from "@/components/contacts/ContactsPagination";
import { tagColor } from "@/lib/tagColors";
import { getInitials } from "@/lib/avatar";
import { bulkDeleteCompanies } from "@/lib/actions/companies";
import { DEFAULT_PAGE_SIZE } from "@/lib/types";
import type { Company } from "@/lib/types";

export function CompaniesPageClient({
  initialCompanies,
}: {
  initialCompanies: Company[];
}) {
  const router = useRouter();
  const canEdit = useCanEdit("contacts", "companies");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPending, startBulkDelete] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const total = initialCompanies.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageCompanies = useMemo(
    () => initialCompanies.slice((page - 1) * pageSize, page * pageSize),
    [initialCompanies, page, pageSize]
  );

  function goToPage(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages));
    setSelectedIds(new Set());
  }

  function changePageSize(next: number) {
    setPageSize(next);
    setPage(1);
    setSelectedIds(new Set());
  }

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < pageCompanies.length;
    }
  }, [selectedIds, pageCompanies.length]);

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(pageCompanies.map((c) => c.id)) : new Set());
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

  function openEdit(company: Company) {
    setEditing(company);
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

  function handleBulkDelete() {
    setBulkError(null);
    startBulkDelete(async () => {
      const result = await bulkDeleteCompanies(Array.from(selectedIds));
      if (result.error) {
        setBulkError(result.error);
        return;
      }
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  const allSelected = pageCompanies.length > 0 && selectedIds.size === pageCompanies.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Companies</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            The organizations your people belong to.
          </p>
        </div>
        {canEdit && <Button onClick={openAdd}>+ Add company</Button>}
      </div>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          selectedIds.size > 0 ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <BulkActionBar
          count={selectedIds.size}
          onDelete={() => setBulkDeleteOpen(true)}
          pending={bulkPending || !canEdit}
          error={bulkError}
        />
      </div>

      {initialCompanies.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <NavIcon name="building" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No companies yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Add your first company so you can link people to it.
          </p>
          {canEdit && (
            <Button onClick={openAdd} className="mt-1">
              + Add company
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
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
                  <th className="px-5 py-3 font-medium">Industry</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Website</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pageCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                      selectedIds.has(company.id) ? "bg-accent/5 dark:bg-accent/10" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(company.id)}
                        onChange={(e) => toggleSelectOne(company.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/40 dark:border-slate-600"
                        aria-label={`Select ${company.name}`}
                      />
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${tagColor(company.name).dot}`}
                        >
                          {getInitials(company.name)}
                        </span>
                        {company.name}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {company.industry || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {company.size || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {company.location || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-hover hover:underline dark:text-accent"
                        >
                          {company.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        {canEdit && (
                          <RowActionsMenu
                            ariaLabel={`Actions for ${company.name}`}
                            actions={[
                              { label: "Edit", icon: Pencil, onClick: () => openEdit(company) },
                              {
                                label: "Delete",
                                icon: Trash2,
                                destructive: true,
                                onClick: () => setDeleting(company),
                              },
                            ]}
                          />
                        )}
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

      <CompanyModal
        open={modalOpen}
        onClose={closeModal}
        company={editing}
        onSaved={handleSaved}
      />

      <DeleteCompanyDialog
        company={deleting}
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
        title="Delete companies"
        itemLabel={selectedIds.size === 1 ? "company" : "companies"}
      />
    </div>
  );
}
