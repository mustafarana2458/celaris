"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createProduct, updateProduct } from "@/lib/actions/products";
import type { Product } from "@/lib/types";

export function ProductModal({
  open,
  onClose,
  product,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [taxable, setTaxable] = useState(product?.taxable ?? true);
  const isEdit = !!product;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateProduct(product!.id, formData)
        : await createProduct(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit product" : "Add product"}>
      <form key={product?.id ?? "new"} action={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <Input
          label="Item name"
          name="name"
          defaultValue={product?.name}
          placeholder="e.g. Monthly SEO Retainer"
          required
        />

        <Textarea
          label="Description"
          name="description"
          rows={3}
          defaultValue={product?.description ?? ""}
          placeholder="Optional — shown in the catalog only"
        />

        <Input
          label="Unit price ($)"
          name="unit_price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product?.unit_price ?? ""}
          placeholder="0.00"
        />

        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3.5 dark:border-slate-600">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Taxable</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {taxable ? "This item is subject to tax." : "This item is tax-exempt."}
            </span>
          </span>
          <input
            type="checkbox"
            name="taxable"
            checked={taxable}
            onChange={(e) => setTaxable(e.target.checked)}
            className="h-5 w-9 shrink-0 appearance-none rounded-full bg-slate-300 outline-none transition-colors before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-accent checked:before:translate-x-4 dark:bg-slate-600"
          />
        </label>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Add product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
