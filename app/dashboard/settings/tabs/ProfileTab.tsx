"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "@/lib/actions/settings";
import { ChangePasswordCard } from "./ChangePasswordCard";
import type { UserProfile } from "@/lib/types";

function getInitial(name: string, email: string) {
  const source = name.trim() || email.trim();
  return source ? source[0].toUpperCase() : "U";
}

export function ProfileTab({
  email,
  profile,
}: {
  email: string;
  profile: UserProfile | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Profile</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Update your personal details.
        </p>

        <div className="mt-6 flex items-center gap-4">
          {profile?.avatar_url ? (
            // TODO: wire this to real uploaded image once avatar storage is connected.
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-xl font-semibold text-accent-hover dark:bg-accent/20 dark:text-accent">
              {getInitial(profile?.full_name ?? "", email)}
            </span>
          )}
          <div>
            {/* TODO: hook this button up to file upload + Supabase Storage once avatar uploads are built. */}
            <Button type="button" variant="secondary" disabled>
              Upload photo
            </Button>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Photo upload is coming soon.
            </p>
          </div>
        </div>

        <form action={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-400">
              Profile updated successfully.
            </div>
          )}

          <Input
            label="Full Name"
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
            required
          />

          <Input label="Phone" name="phone" defaultValue={profile?.phone ?? ""} />

          <Input label="Email" name="email" value={email} readOnly disabled />

          <div className="mt-2 flex justify-end">
            <Button type="submit" loading={isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </div>

      <ChangePasswordCard />
    </div>
  );
}
