"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { logIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        required
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Your password"
        required
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" loading={isPending} className="mt-2 w-full">
        Sign in
      </Button>

      <p className="text-center text-xs text-slate-500">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-700">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-700">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
