"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";

// Celaris Improvements Phase 1: requestPasswordReset() (lib/actions/auth.ts)
// always returns success regardless of whether the email actually
// belongs to an account -- this neutral message is the other half of
// that anti-enumeration design, deliberately never distinguishing
// "sent" from "no such account" or "something went wrong server-side".
export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
        If an account exists for that email, we&apos;ve sent a link to reset your password. Check your inbox.
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <AuthInput label="Email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <AuthButton type="submit" loading={isPending} className="mt-2 w-full">
        Send reset link
      </AuthButton>
    </form>
  );
}
