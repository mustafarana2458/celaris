"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";

const MIN_LENGTH = 6;
// How long to wait for Supabase's client to process the recovery link
// before concluding there's nothing valid to process. Hash-fragment
// tokens resolve instantly (no network call); a PKCE ?code= needs one
// round trip to the self-hosted auth server, so this leaves real margin
// rather than racing a slow network.
const RECOVERY_TIMEOUT_MS = 4000;

type Status = "checking" | "ready" | "invalid";

// Celaris Improvements Phase 1: this page only ever renders the actual
// form for a genuine PASSWORD_RECOVERY session -- not just "any signed-in
// session". Someone with an unrelated normal session already open in
// this browser, who navigates here directly (not via a real recovery
// link), must still see the "invalid link" state: Supabase fires
// PASSWORD_RECOVERY specifically only when it just processed a real
// recovery code/token from the URL, distinct from the INITIAL_SESSION/
// SIGNED_IN events a pre-existing ordinary session would produce -- so
// filtering to that one event is what makes this check correct, not
// just "is there a session".
export function UpdatePasswordForm() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        settled = true;
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) setStatus("invalid");
    }, RECOVERY_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const canSubmit = password.length >= MIN_LENGTH && confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit() {
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
  }

  if (status === "checking") {
    return <p className="text-sm text-gray-500 dark:text-neutral-400">Verifying your link...</p>;
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          This password reset link is invalid or has expired.
        </div>
        <Link
          href="/reset-password"
          className="text-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
          Your password has been updated.
        </div>
        <Link
          href="/login"
          className="text-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <AuthInput
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <AuthInput
        label="Confirm new password"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <AuthButton type="submit" loading={isSaving} disabled={!canSubmit || isSaving} className="mt-2 w-full">
        Update password
      </AuthButton>
    </form>
  );
}
