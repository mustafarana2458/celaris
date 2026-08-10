"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/dashboard/NavIcon";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { useCanEdit } from "@/components/workspace/WorkspaceContext";
import { ProductModal } from "./ProductModal";
import { DeleteProductDialog } from "./DeleteProductDialog";
import type { Product } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ProductLibraryPageClient({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const canEdit = useCanEdit("invoices", "product_library");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Product Library</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Reusable products and services you can drop straight into an invoice&apos;s line items.
          </p>
        </div>
        {canEdit && <Button onClick={openAdd}>+ Add Product</Button>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:max-w-xs">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total products</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {initialProducts.length}
        </p>
      </div>

      {initialProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-hover dark:bg-accent/15 dark:text-accent">
            <NavIcon name="invoice" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No products yet</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Add a product or service to pick it straight into future invoices and recurring profiles.
          </p>
          {canEdit && (
            <Button onClick={openAdd} className="mt-1">
              + Add Product
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Item Name</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Unit Price</th>
                  <th className="px-5 py-3 font-medium">Taxable</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {initialProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {product.name}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-slate-600 dark:text-slate-300">
                      {product.description || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {currency.format(product.unit_price)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.taxable
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {product.taxable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        {canEdit && (
                          <RowActionsMenu
                            ariaLabel={`Actions for ${product.name}`}
                            actions={[
                              { label: "Edit", icon: Pencil, onClick: () => openEdit(product) },
                              {
                                label: "Delete",
                                icon: Trash2,
                                destructive: true,
                                onClick: () => setDeleting(product),
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

      <ProductModal open={modalOpen} onClose={closeModal} product={editing} onSaved={handleSaved} />

      <DeleteProductDialog
        product={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
