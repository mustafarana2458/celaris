"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelInvitation, resendInvitation } from "@/lib/actions/team-invites";
import type { Invitation } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = { admin: "Admin", member: "Member" };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInviteUrl(token: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${baseUrl}/invite/${token}`;
}

export function PendingInvitationsList({ invitations }: { invitations: Invitation[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(invitations);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setRows(invitations), [invitations]);

  async function handleCopy(invitation: Invitation) {
    await navigator.clipboard.writeText(getInviteUrl(invitation.token));
    setCopiedId(invitation.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleResend(invitation: Invitation) {
    setBusyId(invitation.id);
    setError(null);
    const result = await resendInvitation(invitation.id);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleCancel(invitation: Invitation) {
    setBusyId(invitation.id);
    setError(null);
    const previous = rows;
    setRows((prev) => prev.filter((i) => i.id !== invitation.id));
    const result = await cancelInvitation(invitation.id);
    setBusyId(null);
    if (result.error) {
      setRows(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pending invitations</h2>
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Expires</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((invitation) => {
                const busy = busyId === invitation.id;
                const expired = new Date(invitation.expires_at) < new Date();
                return (
                  <tr key={invitation.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {invitation.email}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {ROLE_LABELS[invitation.role] ?? invitation.role}
                    </td>
                    <td className="px-5 py-3">
                      <span className={expired ? "font-medium text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}>
                        {formatDate(invitation.expires_at)}
                        {expired && " · expired"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleCopy(invitation)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-accent-hover hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/15"
                        >
                          {copiedId === invitation.id ? "Copied!" : "Copy link"}
                        </button>
                        <button
                          onClick={() => handleResend(invitation)}
                          disabled={busy}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleCancel(invitation)}
                          disabled={busy}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
