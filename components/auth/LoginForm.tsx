"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { logIn } from "@/lib/actions/auth";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await logIn(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <AuthInput
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        required
      />
      <AuthInput
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Your password"
        required
      />
      <div className="-mt-2 text-right">
        <Link
          href="/reset-password"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Forgot password?
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <AuthButton type="submit" loading={isPending} className="mt-2 w-full">
        Sign in
      </AuthButton>

      <p className="text-center text-xs text-gray-500 dark:text-neutral-400">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
