import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// admin.celaris.cloud is Caddy-reverse-proxied to this exact same
// Next.js app/port as celaris.cloud (no separate deployment) -- so which
// pages that host serves is decided here, by Host header, not by
// DNS/infra. Hardcoded rather than an env var: getting this wrong has
// real consequences (see ADMIN_SUBDOMAIN_PASSTHROUGH below), so it
// should never silently vary by environment/config.
const ADMIN_HOST = "admin.celaris.cloud";

// Paths that must keep resolving to their normal (non-/admin) handler
// even when the host is admin.celaris.cloud:
//  - /api: every Admin Portal mutation already lives under /api/admin/*
//    and is called via relative fetch("/api/admin/...") from admin UI
//    running ON admin.celaris.cloud -- rewriting /api would break every
//    one of those calls, plus every other API route/webhook.
//  - /login: where app/admin/layout.tsx redirects a signed-out visitor.
//    Must render the real login page here (no /admin/login route
//    exists) -- the session cookie a super-admin already has on
//    celaris.cloud is host-only and is NOT sent to this subdomain (see
//    the subdomain build report), so they sign in again, right here.
//  - /dashboard: where that same layout redirects a signed-in-but-not-
//    platform-admin user. Must render the real dashboard (no
//    /admin/dashboard route exists) so that redirect lands somewhere
//    real instead of a 404.
//  - /admin: already the correct destination -- rewriting it again would
//    double-prefix into /admin/admin/....
const ADMIN_SUBDOMAIN_PASSTHROUGH = ["/api", "/login", "/dashboard", "/admin"];

function resolveAdminRewrite(request: NextRequest): URL | undefined {
  const host = (request.headers.get("host") ?? "").split(":")[0];
  if (host !== ADMIN_HOST) return undefined;

  const { pathname } = request.nextUrl;
  if (ADMIN_SUBDOMAIN_PASSTHROUGH.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return undefined;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/admin${pathname}`;
  return url;
}

export async function middleware(request: NextRequest) {
  return await updateSession(request, resolveAdminRewrite(request));
}

export const config = {
  matcher: [
    // api/webhooks excluded -- webhook requests (Lemon Squeezy) carry no
    // user cookies and must never be redirected or delayed by the
    // Supabase auth.getUser() round-trip below. Signature verification
    // is the route handler's own job.
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
