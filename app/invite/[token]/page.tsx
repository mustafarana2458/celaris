import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "@/components/team/AcceptInviteButton";

export const dynamic = "force-dynamic";

type InvitationPreview = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

const ROLE_LABELS: Record<string, string> = { admin: "Admin", member: "Member" };

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase.rpc("get_invitation_by_token", { p_token: params.token });
  const invitation = (Array.isArray(data) ? data[0] : data) as InvitationPreview | null;

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-900">Invite not found</p>
          <p className="mt-2 text-sm text-slate-500">
            This link is invalid or the invite is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = new Date(invitation.expires_at) < new Date();
  const isUsable = invitation.status === "pending" && !isExpired;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-slate-900">
          You&apos;re invited to {invitation.workspace_name}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {invitation.email} · {ROLE_LABELS[invitation.role] ?? invitation.role}
        </p>

        {!isUsable ? (
          <p className="mt-6 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {invitation.status === "accepted"
              ? "This invite has already been accepted."
              : invitation.status === "cancelled"
                ? "This invite has been cancelled."
                : "This invite has expired. Ask the workspace owner to resend it."}
          </p>
        ) : user ? (
          <div className="mt-6">
            <AcceptInviteButton token={params.token} />
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-xs text-slate-400">
              Sign in or create an account with {invitation.email}, then come back to this link to
              accept.
            </p>
            <div className="flex gap-2">
              <Link
                href="/login"
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
