"use client";

import type { Product } from "@/lib/types";

export type LineItemDraft = { description: string; quantity: string; unit_price: string };

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function InvoiceLineItemsEditor({
  items,
  onChange,
  products = [],
}: {
  items: LineItemDraft[];
  onChange: (items: LineItemDraft[]) => void;
  products?: Pick<Product, "id" | "name" | "unit_price">[];
}) {
  function updateItem(index: number, field: keyof LineItemDraft, value: string) {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    onChange([...items, { description: "", quantity: "1", unit_price: "" }]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addFromProduct(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const newItem = { description: product.name, quantity: "1", unit_price: String(product.unit_price) };
    const isSingleBlankRow =
      items.length === 1 && !items[0].description.trim() && !items[0].unit_price.trim();
    onChange(isSingleBlankRow ? [newItem] : [...items, newItem]);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Line items</label>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-400">
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="w-20 px-3 py-2 text-left font-medium">Qty</th>
              <th className="w-28 px-3 py-2 text-left font-medium">Unit price</th>
              <th className="w-28 px-3 py-2 text-right font-medium">Amount</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {items.map((item, i) => {
              const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
              return (
                <tr key={i}>
                  <td className="px-3 py-2">
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      placeholder="Description"
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                    {currency.format(amount)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                      aria-label="Remove line"
                      className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        className="h-4 w-4"
                      >
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addItem}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
        >
          + Add line
        </button>
        {products.length > 0 && (
          <select
            aria-label="Add from product library"
            value=""
            onChange={(e) => {
              if (e.target.value) addFromProduct(e.target.value);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">+ Add from product library</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {currency.format(p.unit_price)}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
