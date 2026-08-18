"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { fetchModeFromDb, invalidateProviderModeCache, type AiProviderMode } from "@/lib/groq";
import { createCheckoutUrl } from "@/lib/actions/billing";
import type { Plan } from "@/lib/aiCreditsCore";
import type { BillingInterval } from "@/lib/lemonSqueezy";

export type DevPanelResult = { ok: boolean; error?: string };
export type DevPanelModeResult = { ok: boolean; mode?: AiProviderMode; error?: string };
export type DevPanelPlanResult = { ok: boolean; plan?: string; error?: string };
export type DevPanelCheckoutResult = { ok: boolean; url?: string; error?: string };

// Deliberately generic and identical whether the PIN was wrong, the role
// check failed, or the PIN env var isn't even configured -- nothing about
// *why* access was denied should leak to the caller.
const ACCESS_DENIED = "Access denied.";
const VALID_MODES: AiProviderMode[] = ["auto", "auto2", "groq", "mistral"];
// Plan values a workspace can hold. "free" is the legacy/default value
// every workspace is created with until real billing exists (see
// lib/actions/auth.ts / lib/actions/workspace.ts) -- kept selectable here so
// a workspace can be reset back to the no-plan-assigned state for testing.
const VALID_PLANS = ["free", "solo", "team", "scale"];

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

  return { ok: true as const, supabase, userId: user.id, workspace };
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

// Manual plan assignment for the current workspace -- there's no real
// billing/Stripe flow yet (see BillingTab.tsx), so this is the only way to
// exercise the AI credit system's plan-limit mapping (lib/aiCredits.ts)
// until that exists.
export async function getWorkspacePlan(pin: string): Promise<DevPanelPlanResult> {
  const access = await requireDevAccess(pin);
  if (!access.ok) return { ok: false, error: ACCESS_DENIED };

  return { ok: true, plan: access.workspace.plan };
}

export async function setWorkspacePlan(plan: string, pin: string): Promise<DevPanelResult> {
  if (!VALID_PLANS.includes(plan)) {
    return { ok: false, error: "Invalid plan." };
  }

  const access = await requireDevAccess(pin);
  if (!access.ok) return { ok: false, error: ACCESS_DENIED };

  const { error } = await access.supabase
    .from("workspaces")
    .update({ plan })
    .eq("id", access.workspace.id);

  // RLS also enforces owner/admin independently of the role check above --
  // if that update is rejected by the database, treat it the same as any
  // other access failure rather than exposing the underlying error.
  if (error) return { ok: false, error: ACCESS_DENIED };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

const VALID_TIERS: Plan[] = ["solo", "team", "scale"];
const VALID_INTERVALS: BillingInterval[] = ["monthly", "yearly"];

// Phase 4 test entry point: builds a real Lemon Squeezy hosted checkout
// URL for the current workspace (via lib/actions/billing.ts), gated behind
// the same PIN + owner/admin check as the rest of the Dev Panel. Exists so
// the checkout -> webhook -> DB sync flow (lib/subscriptionSync.ts) can be
// exercised end-to-end with a real test-mode purchase before BillingTab
// has real upgrade buttons (Phase 5).
export async function createTestCheckout(tier: string, interval: string, pin: string): Promise<DevPanelCheckoutResult> {
  if (!VALID_TIERS.includes(tier as Plan) || !VALID_INTERVALS.includes(interval as BillingInterval)) {
    return { ok: false, error: "Invalid tier/interval." };
  }

  const access = await requireDevAccess(pin);
  if (!access.ok) return { ok: false, error: ACCESS_DENIED };

  const result = await createCheckoutUrl(tier as Plan, interval as BillingInterval);
  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true, url: result.url };
}
