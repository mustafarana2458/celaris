"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DealModal } from "./DealModal";
import { DeleteDealDialog } from "./DeleteDealDialog";
import { STAGES } from "./stages";
import { updateDealStage } from "@/lib/actions/deals";
import type { Contact, Deal, DealStage } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function DealsPageClient({
  initialDeals,
  contacts,
}: {
  initialDeals: Deal[];
  contacts: Pick<Contact, "id" | "name">[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      STAGES.map((s) => ({
        ...s,
        deals: initialDeals.filter((d) => d.stage === s.value),
      })),
    [initialDeals]
  );

  const totalValue = useMemo(
    () => initialDeals.reduce((sum, d) => sum + (d.value ?? 0), 0),
    [initialDeals]
  );

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(deal: Deal) {
    setEditing(deal);
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

  async function handleStageChange(deal: Deal, stage: DealStage) {
    if (stage === deal.stage) return;
    setMovingId(deal.id);
    const result = await updateDealStage(deal.id, stage);
    setMovingId(null);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Deals</h1>
          <p className="mt-1 text-sm text-slate-500">
            {initialDeals.length} deal{initialDeals.length === 1 ? "" : "s"} ·{" "}
            {currency.format(totalValue)} in pipeline
          </p>
        </div>
        <Button onClick={openAdd}>+ Add deal</Button>
      </div>

      {initialDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <p className="text-sm font-medium text-slate-700">No deals yet</p>
          <p className="max-w-sm text-sm text-slate-500">
            Add your first deal to start tracking your sales pipeline.
          </p>
          <Button onClick={openAdd} className="mt-1">
            + Add deal
          </Button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((col) => {
            const colValue = col.deals.reduce((sum, d) => sum + (d.value ?? 0), 0);
            return (
              <div
                key={col.value}
                className={`flex w-72 shrink-0 flex-col gap-3 rounded-2xl border-x border-b border-t-4 border-slate-200 bg-white p-3 ${col.column}`}
              >
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-slate-900">{col.label}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {col.deals.length}
                  </span>
                </div>
                <p className="px-1 text-xs text-slate-400">{currency.format(colValue)}</p>

                <div className="flex flex-col gap-2">
                  {col.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="rounded-xl border border-slate-200 p-3 hover:border-slate-300"
                    >
                      <p className="text-sm font-medium text-slate-900">{deal.title}</p>
                      {deal.contacts?.name && (
                        <p className="mt-1 text-xs text-slate-500">{deal.contacts.name}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                          {deal.value != null ? currency.format(deal.value) : "—"}
                        </span>
                        {formatDate(deal.expected_close) && (
                          <span className="text-xs text-slate-400">
                            {formatDate(deal.expected_close)}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <select
                          value={deal.stage}
                          disabled={movingId === deal.id}
                          onChange={(e) =>
                            handleStageChange(deal, e.target.value as DealStage)
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 outline-none focus:border-blue-500 disabled:opacity-60"
                        >
                          {STAGES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEdit(deal)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleting(deal)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {col.deals.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                      No deals
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DealModal
        open={modalOpen}
        onClose={closeModal}
        deal={editing}
        contacts={contacts}
        onSaved={handleSaved}
      />

      <DeleteDealDialog
        deal={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
