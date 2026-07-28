"use client";

import { useState, useTransition } from "react";
import { signUp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.needsConfirmation) {
        setNeedsConfirmation(true);
      }
    });
  }

  if (needsConfirmation) {
    return (
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
        Almost there! Check your email to confirm your account before
        signing in.
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Full name"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="Jane Doe"
        required
      />
      <Input
        label="Business name"
        name="businessName"
        type="text"
        autoComplete="organization"
        placeholder="Acme Inc."
        required
      />
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
        autoComplete="new-password"
        placeholder="At least 6 characters"
        minLength={6}
        required
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" loading={isPending} className="mt-2 w-full">
        Create account
      </Button>
    </form>
  );
}
