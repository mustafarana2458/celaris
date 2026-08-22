"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

// Celaris Improvements Phase 2B: opened by Sidebar when a plan-locked nav
// item is clicked instead of navigating there. Links into the existing
// Settings > Billing tab (?tab=billing is an established deep link --
// see app/dashboard/settings/tabs/BillingTab.tsx) rather than building a
// separate upgrade flow.
export function UpgradePlanModal({ open, onClose, moduleLabel }: { open: boolean; onClose: () => void; moduleLabel: string }) {
  return (
    <Modal open={open} onClose={onClose} title="Upgrade to unlock this">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {moduleLabel} isn&apos;t included in your current plan. Upgrade to unlock it and the rest of that plan&apos;s
          features.
        </p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Not now
          </Button>
          <Link href="/dashboard/settings?tab=billing" onClick={onClose}>
            <Button type="button">View plans</Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
