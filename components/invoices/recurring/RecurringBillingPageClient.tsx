"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePause, CirclePlay, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { useCanEdit } from "@/components/workspace/WorkspaceContext";
import { setRecurringProfileStatus } from "@/lib/actions/recurringProfiles";
import { RecurringProfileModal } from "./RecurringProfileModal";
import { DeleteRecurringProfileDialog } from "./DeleteRecurringProfileDialog";
import { RECURRING_PROFILE_FREQUENCIES, RECURRING_PROFILE_STATUSES } from "./profileStatuses";
import type { Contact, Product, RecurringProfile } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const statusMap = Object.fromEntries(RECURRING_PROFILE_STATUSES.map((s) => [s.value, s]));
const frequencyMap = Object.fromEntries(RECURRING_PROFILE_FREQUENCIES.map((f) => [f.value, f.label]));

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function profileTotal(profile: RecurringProfile) {
  const subtotal = profile.line_items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxable = Math.max(0, subtotal - profile.discount);
  return taxable + taxable * (profile.tax_percent / 100);
}

export function RecurringBillingPageClient({
  initialProfiles,
  contacts,
  products,
}: {
  initialProfiles: RecurringProfile[];
  contacts: Pick<Contact, "id" | "name">[];
  products: Pick<Product, "id" | "name" | "unit_price">[];
}) {
  const router = useRouter();
  const canEdit = useCanEdit("invoices", "recurring_billing");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringProfile | null>(null);
  const [deleting, setDeleting] = useState<RecurringProfile | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const activeCount = useMemo(
    () => initialProfiles.filter((p) => p.status === "active").length,
    [initialProfiles]
  );

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(profile: RecurringProfile) {
    setEditing(profile);
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

  async function toggleStatus(profile: RecurringProfile) {
    setUpdatingId(profile.id);
    const nextStatus = profile.status === "active" ? "paused" : "active";
    const result = await setRecurringProfileStatus(profile.id, nextStatus);
    setUpdatingId(null);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Recurring Billing</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Retainer profiles that generate invoices automatically on a schedule.
          </p>
        </div>
        {canEdit && <Button onClick={openAdd}>+ Create Recurring Profile</Button>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Active subscriptions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total profiles</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {initialProfiles.length}
          </p>
        </div>
      </div>

      {initialProfiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <NavIcon name="invoice" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No recurring profiles yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Create a retainer profile to stop billing the same client manually every month.
          </p>
          {canEdit && (
            <Button onClick={openAdd} className="mt-1">
              + Create Recurring Profile
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Profile Name</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Frequency</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Next Issue Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {initialProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        {profile.profile_name}
                        {profile.auto_send && (
                          <span
                            title="Auto-send is on — generated invoices email automatically"
                            className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-hover dark:bg-accent/15 dark:text-accent"
                          >
                            Auto-send
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {profile.contacts?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {frequencyMap[profile.frequency] ?? profile.frequency}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {currency.format(profileTotal(profile))}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {formatDate(profile.next_issue_date)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusMap[profile.status]?.badge ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
                      >
                        {statusMap[profile.status]?.label ?? profile.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        {canEdit && (
                          <RowActionsMenu
                            ariaLabel={`Actions for ${profile.profile_name}`}
                            actions={[
                              { label: "Edit", icon: Pencil, onClick: () => openEdit(profile) },
                              {
                                label:
                                  updatingId === profile.id
                                    ? "Updating…"
                                    : profile.status === "active"
                                      ? "Pause"
                                      : "Resume",
                                icon: profile.status === "active" ? CirclePause : CirclePlay,
                                onClick: () => toggleStatus(profile),
                              },
                              {
                                label: "Delete",
                                icon: Trash2,
                                destructive: true,
                                onClick: () => setDeleting(profile),
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

      <RecurringProfileModal
        open={modalOpen}
        onClose={closeModal}
        profile={editing}
        contacts={contacts}
        products={products}
        onSaved={handleSaved}
      />

      <DeleteRecurringProfileDialog
        profile={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
