"use client";

import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfile, updateAvatarUrl } from "@/lib/actions/settings";
import { createClient } from "@/lib/supabase/client";
import { validateImageFile, fileExtension } from "@/lib/upload";
import { ChangePasswordCard } from "./ChangePasswordCard";
import type { UserProfile } from "@/lib/types";

const AVATAR_TYPES = ["image/png", "image/jpeg"];
const AVATAR_MAX_MB = 5;

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

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savedFullName, setSavedFullName] = useState(profile?.full_name ?? "");
  const [savedPhone, setSavedPhone] = useState(profile?.phone ?? "");
  const isDirty = fullName !== savedFullName || phone !== savedPhone;

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile?.id) return;

    const validationError = validateImageFile(file, {
      allowedTypes: AVATAR_TYPES,
      maxSizeMb: AVATAR_MAX_MB,
    });
    if (validationError) {
      setAvatarError(validationError);
      return;
    }

    setAvatarError(null);
    setUploadingAvatar(true);

    const supabase = createClient();
    const path = `${profile.id}/${Date.now()}.${fileExtension(file)}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (uploadError) {
      setUploadingAvatar(false);
      setAvatarError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const result = await updateAvatarUrl(publicUrl);
    setUploadingAvatar(false);

    if (result.error) {
      setAvatarError(result.error);
      return;
    }

    setAvatarUrl(publicUrl);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedFullName(fullName);
      setSavedPhone(phone);
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
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="Change profile photo"
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full disabled:cursor-not-allowed"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-xl font-semibold text-accent-hover dark:bg-accent/20 dark:text-accent">
                {getInitial(fullName, email)}
              </span>
            )}
            {uploadingAvatar ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </span>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} className="h-5 w-5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 8a2 2 0 0 1 2-2h2l1-2h6l1 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
                  />
                  <circle cx="12" cy="13" r="3.2" stroke="white" strokeWidth={1.8} />
                </svg>
              </span>
            )}
          </button>
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => avatarInputRef.current?.click()}
              loading={uploadingAvatar}
            >
              Upload photo
            </Button>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">PNG or JPG, up to 5MB.</p>
            {avatarError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{avatarError}</p>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleAvatarChange}
              className="hidden"
            />
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
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input label="Email" name="email" value={email} readOnly disabled />

          <div className="mt-2 flex justify-end">
            <Button type="submit" loading={isPending} disabled={!isDirty || isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </div>

      <ChangePasswordCard />
    </div>
  );
}
