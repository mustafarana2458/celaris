"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Admin Auth Rebuild Phase 3: the admin login page, at its permanent
// /admin/login URL. Lives as a sibling of app/admin/(protected)/ rather
// than inside it -- route groups don't add a URL segment, so the guarded
// pages still resolve to /admin/* while this page, sitting outside the
// (protected) folder, has no ancestor layout requiring a session at all
// (Next.js layouts wrap every descendant of their literal folder with no
// file-based way to exempt one nested page -- this is why Phase 2
// couldn't put this page at /admin/login directly under the OLD
// app/admin/layout.tsx, and had to use the temporary /admin-login
// instead; see app/admin-login/page.tsx, now just a redirect here).
//
// Minimal, matches the Admin Portal's visual language (components/ui/*,
// the same logo+badge treatment as AdminSidebar) rather than the
// marketing-styled AuthCard/AuthShowcase used by the regular app's
// /login -- this is an internal tool, not a branded auth flow.

type LoginResponse = { ok: true } | { ok: false; error: string };

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    let json: LoginResponse | null = null;
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      json = (await res.json()) as LoginResponse;
    } catch {
      setLoading(false);
      setError("Could not reach the server. Try again.");
      return;
    }
    setLoading(false);

    if (!json.ok) {
      setError(json.error || "Invalid email or password.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <img src="/celaris-logo.svg" alt="Celaris" className="h-8 w-8 rounded-lg dark:hidden" />
          <img src="/celaris-logo-white.png" alt="Celaris" className="hidden h-8 w-8 rounded-lg dark:block" />
          <span className="flex items-center gap-1.5">
            Celaris
            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-hover dark:bg-accent/20 dark:text-accent">
              Admin
            </span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="mt-2 w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
