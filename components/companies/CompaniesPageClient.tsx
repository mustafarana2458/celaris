"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { CompanyModal } from "./CompanyModal";
import { DeleteCompanyDialog } from "./DeleteCompanyDialog";
import type { Company } from "@/lib/types";

export function CompaniesPageClient({
  initialCompanies,
}: {
  initialCompanies: Company[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Companies</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            The organizations your people belong to.
          </p>
        </div>
        <Button onClick={openAdd}>+ Add company</Button>
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
          <Button onClick={openAdd} className="mt-1">
            + Add company
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Industry</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Website</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {initialCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {company.name}
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
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(company)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(company)}
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
    </div>
  );
}
