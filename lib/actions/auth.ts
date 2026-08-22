"use server";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { FRESH_LOGIN_COOKIE } from "@/lib/inactivity";
import { acceptInvitation } from "@/lib/actions/team-invites";

export type AuthActionResult = {
  error?: string;
  needsConfirmation?: boolean;
};

// Tells InactivityProvider (mounted on the next /dashboard load) to reset
// the inactivity timer, ignoring any stale lastActivity timestamp left over
// from a previous session in this browser.
async function signalFreshLogin() {
  const cookieStore = await cookies();
  cookieStore.set(FRESH_LOGIN_COOKIE, "1", {
    httpOnly: false,
    path: "/",
    maxAge: 30,
    sameSite: "lax",
  });
}

function workspaceNameFor(fullName: string, businessName: string) {
  if (businessName) return businessName;
  const firstName = fullName.split(/\s+/)[0] || "My";
  return `${firstName}'s Workspace`;
}

// Shared by the form-based signUp action below and by
// completeSignupProvisioning (called from the client-side signup form, which
// talks to Supabase auth directly for hCaptcha). Creates the profile row,
// then either joins an invited workspace (when a valid invite token is
// passed) or creates a first workspace (falling back to "[First Name]'s
// Workspace" when no business name was given) with this user as owner --
// safe to call more than once for the same user (unique-violation on
// re-insert is ignored).
async function provisionUserAndWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
  fullName: string,
  businessName: string,
  inviteToken?: string | null
): Promise<AuthActionResult> {
  const { error: profileError } = await supabase.from("users").insert({
    id: user.id,
    full_name: fullName,
    business_name: businessName || null,
    plan: "free",
  });
  // 23505 = unique_violation, safe to ignore (row already exists)
  if (profileError && profileError.code !== "23505") {
    return { error: profileError.message };
  }

  const { data: existingMembership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existingMembership) {
    return {};
  }

  if (inviteToken) {
    // acceptInvitation() re-verifies the token server-side (pending, not
    // expired, and -- crucially -- that this user's actual auth email
    // matches the invite's email) before inserting the workspace_members
    // row, so a tampered/locked email field on the client can't bypass it.
    const inviteResult = await acceptInvitation(inviteToken);
    if (!inviteResult.error) {
      return {};
    }
    // Invite couldn't be honored (expired between page load and submit,
    // email mismatch, already used, etc.) -- fall through to normal
    // provisioning rather than leaving the account with zero workspaces.
    console.error(
      "[provisionUserAndWorkspace] invite accept failed, falling back to a new workspace:",
      inviteResult.error
    );
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: workspaceNameFor(fullName, businessName), owner_id: user.id, plan: "free" })
    .select("id")
    .single();

  if (workspaceError) {
    return { error: workspaceError.message };
  }

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError && memberError.code !== "23505") {
    return { error: memberError.message };
  }

  await supabase.from("users").update({ last_active_workspace_id: workspace.id }).eq("id", user.id);

  return {};
}

// Called by SignupForm right after its client-side supabase.auth.signUp()
// succeeds (that call has to happen client-side to carry the hCaptcha
// token). Reads the just-created session via cookies, so no user id needs to
// come from the client.
export async function completeSignupProvisioning(
  fullName: string,
  businessName: string,
  inviteToken?: string | null
): Promise<AuthActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  return provisionUserAndWorkspace(supabase, user, fullName, businessName, inviteToken);
}

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const inviteToken = String(formData.get("token") ?? "").trim() || null;

  if (!email || !password || !fullName) {
    return { error: "Please fill in all fields." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, business_name: businessName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const result = await provisionUserAndWorkspace(supabase, data.user, fullName, businessName, inviteToken);
    if (result.error) return result;
  }

  if (!data.session) {
    return { needsConfirmation: true };
  }

  await signalFreshLogin();
  redirect("/dashboard");
}

export async function logIn(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (user) {
    // Backfill for accounts that predate the workspace model, or whose
    // signup provisioning failed partway (e.g. the SMTP-confirmation
    // blocker). provisionUserAndWorkspace no-ops each step that's already
    // done, so this is safe (if slightly redundant) to call on every login.
    const meta = (user.user_metadata ?? {}) as {
      full_name?: string;
      business_name?: string;
    };
    await provisionUserAndWorkspace(supabase, user, meta.full_name ?? "", meta.business_name ?? "");
  }

  await signalFreshLogin();
  redirect("/dashboard");
}

// Celaris Improvements Phase 1: sends a Supabase recovery email. Always
// returns success (`{}`) from this function's point of view regardless
// of whether Supabase actually found an account for `email` -- returning
// a distinct error for "no such account" vs "email sent" would let a
// caller enumerate which emails have accounts, which is exactly what the
// neutral "if an account exists..." message on ResetPasswordForm is
// built to avoid. Any real Supabase-side error (rate limit, SMTP down,
// etc.) is logged server-side for ops visibility but never surfaced to
// the client for the same reason.
export async function requestPasswordReset(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Please enter your email address." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("[auth] NEXT_PUBLIC_APP_URL is not set -- cannot build the password reset redirect URL.");
    return { error: "This feature isn't fully configured yet. Please contact support." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/update-password`,
  });

  if (error) {
    console.error("[auth] resetPasswordForEmail failed:", error.message);
  }

  return {};
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
