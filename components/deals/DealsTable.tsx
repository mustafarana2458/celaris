import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { STAGES } from "./stages";
import type { Deal } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DealsTable({
  deals,
  onEdit,
  onDelete,
  onOpenSummary,
  canEdit,
}: {
  deals: Deal[];
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onOpenSummary: (deal: Deal) => void;
  canEdit: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3">Deal</th>
            <th className="px-4 py-3">Contact / Company</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Expected close</th>
            <th className="px-4 py-3">AI Summary</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {deals.map((deal) => {
            const stage = STAGES.find((s) => s.value === deal.stage);
            const companyName = deal.contacts?.companies?.name ?? deal.contacts?.company;
            return (
              <tr key={deal.id} className="text-slate-700 dark:text-slate-300">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{deal.title}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {deal.contacts?.name || companyName ? (
                    <>
                      {deal.contacts?.name}
                      {deal.contacts?.name && companyName ? " · " : ""}
                      {companyName}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${stage?.badge ?? ""}`}
                  >
                    {stage?.label ?? deal.stage}
                  </span>
                </td>
                <td className="px-4 py-3">{deal.value != null ? currency.format(deal.value) : "—"}</td>
                <td className="px-4 py-3">{formatDate(deal.expected_close)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onOpenSummary(deal)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {deal.ai_summary ? "AI Summary" : "Generate"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    {canEdit && (
                      <RowActionsMenu
                        ariaLabel="Deal actions"
                        actions={[
                          { label: "Edit", onClick: () => onEdit(deal), icon: Pencil },
                          { label: "Delete", onClick: () => onDelete(deal), icon: Trash2, destructive: true },
                        ]}
                      />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
