"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PasswordResetModal } from "./PasswordResetModal";
import { EditNameModal } from "./EditNameModal";
import { SuspendModal } from "./SuspendModal";
import type { AdminUserDetail } from "@/app/admin/users/[id]/page";

function formatDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function UserDetailClient({ user }: { user: AdminUserDetail }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.fullName);
  const [suspended, setSuspended] = useState(user.suspended);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);

  function handleNameApplied(newName: string) {
    setFullName(newName);
    router.refresh();
  }

  function handleSuspendApplied(newSuspended: boolean) {
    setSuspended(newSuspended);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/users" className="text-xs font-medium text-accent-hover hover:underline dark:text-accent">
          &larr; All users
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{user.email ?? "(no email)"}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{fullName || "No display name set"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Status</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {suspended ? (
              <span className="text-red-600 dark:text-red-400">Suspended</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">Active</span>
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Created</p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDate(user.createdAt)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Last sign-in</p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDate(user.lastSignInAt)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Workspaces</h3>
        {user.memberships.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Not a member of any workspace.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {user.memberships.map((m, i) => (
              <li key={i} className="text-slate-700 dark:text-slate-200">
                {m.workspaceName} <span className="text-xs text-slate-400 dark:text-slate-500">({m.role})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Every action below is audit-logged and requires confirmation before applying.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => setResetModalOpen(true)}>
            Send password reset
          </Button>
          <Button type="button" variant="secondary" onClick={() => setNameModalOpen(true)}>
            Edit display name
          </Button>
          <Button type="button" variant="secondary" onClick={() => setSuspendModalOpen(true)}>
            {suspended ? "Unsuspend account" : "Suspend account"}
          </Button>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
          Not available yet: editing login email (auth-identity change, needs its own careful design) and editing
          workspace role from here (role is scoped per workspace -- manage it from that workspace&apos;s Team
          settings instead). Session termination as a standalone action isn&apos;t available on this Supabase
          version -- suspending an account is what actually revokes access.
        </div>
      </div>

      <PasswordResetModal open={resetModalOpen} onClose={() => setResetModalOpen(false)} userId={user.id} email={user.email} />
      <EditNameModal
        open={nameModalOpen}
        onClose={() => setNameModalOpen(false)}
        userId={user.id}
        currentName={fullName}
        onApplied={handleNameApplied}
      />
      <SuspendModal
        open={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        userId={user.id}
        email={user.email}
        currentlySuspended={suspended}
        onApplied={handleSuspendApplied}
      />
    </div>
  );
}
