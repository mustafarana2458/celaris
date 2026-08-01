"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { updateWorkspaceBranding } from "@/lib/actions/settings";
import type { CurrentWorkspace } from "@/lib/workspace";
import type { WorkspaceBranding } from "../page";

const CURRENCIES = [
  { value: "USD", label: "USD $" },
  { value: "EUR", label: "EUR €" },
  { value: "PKR", label: "PKR ₨" },
  { value: "GBP", label: "GBP £" },
];

export function WorkspaceTab({
  workspace,
  branding,
}: {
  workspace: CurrentWorkspace | null;
  branding: WorkspaceBranding | null;
}) {
  const isOwner = workspace?.role === "owner";
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateWorkspaceBranding(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  if (!workspace) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        No workspace found for this account.
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Workspace & Branding
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Only the workspace owner can edit these settings. Contact your
          workspace owner if changes are needed.
        </p>
        <dl className="mt-6 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
          <div className="grid grid-cols-3 gap-4 py-3 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">Workspace name</dt>
            <dd className="col-span-2 font-medium text-slate-900 dark:text-slate-100">
              {branding?.name || workspace.name}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-4 py-3 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">Support email</dt>
            <dd className="col-span-2 font-medium text-slate-900 dark:text-slate-100">
              {branding?.support_email || "—"}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-4 py-3 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">Default currency</dt>
            <dd className="col-span-2 font-medium text-slate-900 dark:text-slate-100">
              {branding?.currency || "USD"}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Workspace & Branding
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          This name replaces the workspace placeholder shown across your
          dashboard.
        </p>

        <form action={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-400">
              Workspace settings updated successfully.
            </div>
          )}

          <Input
            label="Workspace / Company Name"
            name="name"
            defaultValue={branding?.name ?? workspace.name}
            required
          />

          <Input
            label="Support / Billing Email"
            name="support_email"
            type="email"
            defaultValue={branding?.support_email ?? ""}
          />

          <Input
            label="Tax / Registration Number"
            name="tax_number"
            defaultValue={branding?.tax_number ?? ""}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="currency"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Default Currency
            </label>
            <select
              id="currency"
              name="currency"
              defaultValue={branding?.currency ?? "USD"}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <Textarea
            label="Business Address"
            name="address"
            rows={3}
            defaultValue={branding?.address ?? ""}
          />

          <div className="mt-2 flex justify-end">
            <Button type="submit" loading={isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Logo</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload a logo to show on invoices and across your workspace.
        </p>

        {/*
          TODO: wire this drop-zone to real file upload + Supabase Storage
          (e.g. a "workspace-logos" bucket) and persist the resulting URL to
          workspaces.logo_url. Not implemented yet — UI only.
        */}
        <label
          htmlFor="logo-upload"
          className="mt-6 flex cursor-not-allowed flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center dark:border-slate-600 dark:bg-slate-800/60"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-8 w-8 text-slate-400 dark:text-slate-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            />
          </svg>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Drag & drop your logo, or click to browse
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            PNG, JPG or SVG — coming soon
          </p>
          <input id="logo-upload" type="file" accept="image/*" disabled className="hidden" />
        </label>
      </div>
    </div>
  );
}
