"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 6;

export function ChangePasswordCard() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    const password = String(formData.get("new_password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

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
    (document.getElementById("change-password-form") as HTMLFormElement | null)?.reset();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose a new password for your account.
      </p>

      <form
        id="change-password-form"
        action={handleSubmit}
        className="mt-6 flex flex-col gap-4"
      >
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Password updated successfully.
          </div>
        )}

        <Input
          label="New Password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
        />
        <Input
          label="Confirm New Password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
        />

        <div className="mt-2 flex justify-end">
          <Button type="submit" loading={isSaving}>
            Update password
          </Button>
        </div>
      </form>
    </div>
  );
}
