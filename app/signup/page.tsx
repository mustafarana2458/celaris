import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm, type SignupInvite } from "@/components/auth/SignupForm";
import { createClient } from "@/lib/supabase/server";

type InvitationPreview = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

// Resolves an ?token= from the invite page into a locked-down signup: if the
// token is missing, invalid, expired, or already used, this is just null and
// signup behaves exactly as before (no lock, no special-casing downstream).
async function resolveInvite(token: string | undefined): Promise<SignupInvite | null> {
  if (!token) return null;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation_by_token", { p_token: token });
  const invitation = (Array.isArray(data) ? data[0] : data) as InvitationPreview | null;

  if (!invitation) return null;

  const isExpired = new Date(invitation.expires_at) < new Date();
  if (invitation.status !== "pending" || isExpired) return null;

  return { token, email: invitation.email, workspaceName: invitation.workspace_name };
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const invite = await resolveInvite(searchParams.token);

  return (
    <AuthCard
      title={invite ? `Join ${invite.workspaceName}` : "Create your account"}
      subtitle={
        invite
          ? `You've been invited to join ${invite.workspaceName} on Celaris.`
          : "Start managing your business in minutes."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={invite ? `/login?token=${encodeURIComponent(invite.token)}` : "/login"}
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm invite={invite} />
    </AuthCard>
  );
}
