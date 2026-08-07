"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Printer, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { InvoiceModal } from "./InvoiceModal";
import { DeleteInvoiceDialog } from "./DeleteInvoiceDialog";
import { PrintInvoiceModal } from "./PrintInvoiceModal";
import { INVOICE_STATUSES } from "./statuses";
import { updateInvoiceStatus } from "@/lib/actions/invoices";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import type { Contact, Invoice, InvoiceSenderDetails, InvoiceStatus, Project } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const statusMap = Object.fromEntries(INVOICE_STATUSES.map((s) => [s.value, s]));

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvoicesPageClient({
  initialInvoices,
  contacts,
  projects,
  senderDetails,
}: {
  initialInvoices: Invoice[];
  contacts: Pick<Contact, "id" | "name">[];
  projects: Pick<Project, "id" | "name">[];
  senderDetails: InvoiceSenderDetails | null;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [printing, setPrinting] = useState<Invoice | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const unpaid = initialInvoices
      .filter((i) => i.status === "unpaid" || i.status === "overdue")
      .reduce((sum, i) => sum + i.total, 0);
    const paid = initialInvoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + i.total, 0);
    return { unpaid, paid };
  }, [initialInvoices]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return initialInvoices;
    return initialInvoices.filter((i) => i.status === statusFilter);
  }, [initialInvoices, statusFilter]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(invoice: Invoice) {
    setEditing(invoice);
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

  async function markPaid(invoice: Invoice) {
    setUpdatingId(invoice.id);
    const result = await updateInvoiceStatus(invoice.id, "paid");
    setUpdatingId(null);
    if (!result.error) {
      router.refresh();
    }
  }

  function handleDownloadPdf(invoice: Invoice) {
    downloadInvoicePdf(
      invoice,
      senderDetails ?? {
        name: "",
        address: null,
        tax_number: null,
        support_email: null,
        phone: null,
        payment_instructions: null,
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create and track payment on your invoices.
          </p>
        </div>
        <Button onClick={openAdd}>+ Add invoice</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total unpaid</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {currency.format(totals.unpaid)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total paid</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {currency.format(totals.paid)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-accent text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          All
        </button>
        {INVOICE_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s.value
                ? "bg-accent text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <NavIcon name="invoice" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {initialInvoices.length === 0 ? "No invoices yet" : "No matching invoices"}
          </p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {initialInvoices.length === 0
              ? "Add your first invoice to start tracking payments."
              : "Try a different status filter."}
          </p>
          {initialInvoices.length === 0 && (
            <Button onClick={openAdd} className="mt-1">
              + Add invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Invoice #</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Tax</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Due date</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        {invoice.invoice_number}
                        {invoice.is_recurring && (
                          <span
                            title={`Recurring · ${invoice.recurring_frequency ?? ""}`}
                            className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-hover dark:bg-accent/15 dark:text-accent"
                          >
                            Recurring
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {invoice.contacts?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {currency.format(invoice.amount)}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {currency.format(invoice.tax)}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {currency.format(invoice.total)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusMap[invoice.status]?.badge ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
                      >
                        {statusMap[invoice.status]?.label ?? invoice.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <RowActionsMenu
                          ariaLabel={`Actions for ${invoice.invoice_number}`}
                          actions={[
                            ...(invoice.status !== "paid"
                              ? [
                                  {
                                    label: updatingId === invoice.id ? "Marking paid…" : "Mark paid",
                                    icon: CheckCircle2,
                                    onClick: () => markPaid(invoice),
                                  },
                                ]
                              : []),
                            { label: "Print", icon: Printer, onClick: () => setPrinting(invoice) },
                            { label: "PDF", icon: Download, onClick: () => handleDownloadPdf(invoice) },
                            { label: "Edit", icon: Pencil, onClick: () => openEdit(invoice) },
                            {
                              label: "Delete",
                              icon: Trash2,
                              destructive: true,
                              onClick: () => setDeleting(invoice),
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

      <InvoiceModal
        open={modalOpen}
        onClose={closeModal}
        invoice={editing}
        contacts={contacts}
        projects={projects}
        existingInvoiceNumbers={initialInvoices.map((i) => i.invoice_number)}
        onSaved={handleSaved}
      />

      <DeleteInvoiceDialog
        invoice={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />

      <PrintInvoiceModal
        invoice={printing}
        senderDetails={senderDetails}
        onClose={() => setPrinting(null)}
      />
    </div>
  );
}
