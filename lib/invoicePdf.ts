import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Invoice } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function readAccentColor(): [number, number, number] {
  const fallback: [number, number, number] = [234, 88, 12];
  if (typeof window === "undefined") return fallback;

  const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();
  const parts = raw.split(/\s+/).map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return parts as [number, number, number];
  }
  return fallback;
}

export function downloadInvoicePdf(invoice: Invoice, workspaceName: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const accent = readAccentColor();
  const marginX = 40;
  const rightEdge = 555;
  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...accent);
  doc.text(workspaceName || "Invoice", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice ${invoice.invoice_number}`, marginX, y + 16);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.status.toUpperCase(), rightEdge, y, { align: "right" });

  y += 34;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y, rightEdge, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("BILL TO", marginX, y);
  doc.text("ISSUED", 400, y);
  doc.text("DUE", 480, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  let billY = y + 15;
  doc.text(invoice.contacts?.name || "—", marginX, billY);
  if (invoice.contacts?.company) {
    billY += 14;
    doc.text(invoice.contacts.company, marginX, billY);
  }
  if (invoice.contacts?.email) {
    billY += 14;
    doc.text(invoice.contacts.email, marginX, billY);
  }
  doc.text(formatDate(invoice.issued_at), 400, y + 15);
  doc.text(formatDate(invoice.due_date), 480, y + 15);

  y = Math.max(billY, y + 15) + 30;

  const items =
    invoice.invoice_items && invoice.invoice_items.length > 0
      ? invoice.invoice_items
      : [
          {
            description: "Invoice amount",
            quantity: 1,
            unit_price: invoice.amount,
            amount: invoice.amount,
          },
        ];

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit price", "Amount"]],
    body: items.map((item) => [
      item.description,
      String(item.quantity),
      currency.format(item.unit_price),
      currency.format(item.amount),
    ]),
    styles: { fontSize: 10, cellPadding: 8, textColor: [30, 41, 59] },
    headStyles: { fillColor: accent, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { halign: "right", cellWidth: 50 },
      2: { halign: "right", cellWidth: 90 },
      3: { halign: "right", cellWidth: 90 },
    },
    margin: { left: marginX, right: 595 - rightEdge },
  });

  const tableFinalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 60;

  let totalsY = tableFinalY + 24;
  if (totalsY > 720) {
    doc.addPage();
    totalsY = 60;
  }

  const totalsX = 380;
  const valuesX = rightEdge;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal", totalsX, totalsY);
  doc.text(currency.format(invoice.amount), valuesX, totalsY, { align: "right" });

  if (invoice.discount > 0) {
    totalsY += 16;
    doc.text("Discount", totalsX, totalsY);
    doc.text(`-${currency.format(invoice.discount)}`, valuesX, totalsY, { align: "right" });
  }

  if (invoice.tax_percent > 0 || invoice.tax > 0) {
    totalsY += 16;
    doc.text(`Tax${invoice.tax_percent > 0 ? ` (${invoice.tax_percent}%)` : ""}`, totalsX, totalsY);
    doc.text(currency.format(invoice.tax), valuesX, totalsY, { align: "right" });
  }

  totalsY += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(totalsX, totalsY, valuesX, totalsY);
  totalsY += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Total", totalsX, totalsY);
  doc.text(currency.format(invoice.total), valuesX, totalsY, { align: "right" });

  if (invoice.is_recurring && invoice.recurring_frequency) {
    totalsY += 30;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const freqLabel = FREQUENCY_LABELS[invoice.recurring_frequency] ?? invoice.recurring_frequency;
    const nextLabel = invoice.next_issue_date ? formatDate(invoice.next_issue_date) : "—";
    doc.text(`Recurring · ${freqLabel} · Next issue ${nextLabel}`, marginX, totalsY);
  }

  doc.save(`${invoice.invoice_number || "invoice"}.pdf`);
}
