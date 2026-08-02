"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { fetchModeFromDb, invalidateProviderModeCache, type AiProviderMode } from "@/lib/groq";

export type DevPanelResult = { ok: boolean; error?: string };
export type DevPanelModeResult = { ok: boolean; mode?: AiProviderMode; error?: string };

// Deliberately generic and identical whether the PIN was wrong, the role
// check failed, or the PIN env var isn't even configured -- nothing about
// *why* access was denied should leak to the caller.
const ACCESS_DENIED = "Access denied.";
const VALID_MODES: AiProviderMode[] = ["auto", "groq", "mistral"];

async function requireDevAccess(pin: string) {
  const expectedPin = process.env.DEV_PANEL_PIN;
  if (!expectedPin) {
    return { ok: false as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const };
  }

  const workspace = await getCurrentWorkspace(supabase, user.id);
  if (!workspace || (workspace.role !== "owner" && workspace.role !== "admin")) {
    return { ok: false as const };
  }

  if (pin.trim() !== expectedPin) {
    return { ok: false as const };
  }

  return { ok: true as const, supabase, userId: user.id };
}

export async function verifyDevPanelPin(pin: string): Promise<DevPanelResult> {
  if (!/^\d{6}$/.test(pin.trim())) {
    return { ok: false, error: ACCESS_DENIED };
  }

  const access = await requireDevAccess(pin);
  if (!access.ok) return { ok: false, error: ACCESS_DENIED };

  return { ok: true };
}

export async function getAiProviderMode(pin: string): Promise<DevPanelModeResult> {
  const access = await requireDevAccess(pin);
  if (!access.ok) return { ok: false, error: ACCESS_DENIED };

  const mode = await fetchModeFromDb(access.supabase);
  return { ok: true, mode };
}

export async function setAiProviderMode(mode: string, pin: string): Promise<DevPanelResult> {
  if (!VALID_MODES.includes(mode as AiProviderMode)) {
    return { ok: false, error: "Invalid mode." };
  }

  const access = await requireDevAccess(pin);
  if (!access.ok) return { ok: false, error: ACCESS_DENIED };

  const { error } = await access.supabase
    .from("app_settings")
    .update({
      value: mode,
      updated_at: new Date().toISOString(),
      updated_by: access.userId,
    })
    .eq("key", "ai_provider_mode");

  // RLS also enforces owner/admin independently of the role check above --
  // if that update is rejected by the database, treat it the same as any
  // other access failure rather than exposing the underlying error.
  if (error) return { ok: false, error: ACCESS_DENIED };

  invalidateProviderModeCache();
  return { ok: true };
}
