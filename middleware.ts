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
//  - /login: the regular app's login page. Admin Auth Rebuild Phase 3
//    made admin auth fully independent of Supabase, so nothing in the
//    admin guard redirects here anymore (app/admin/(protected)/layout.tsx
//    redirects to /admin/login instead, already covered by the /admin
//    entry below) -- kept passthrough anyway so this host doesn't lose
//    the ability to serve the regular login page at all, on the off
//    chance anything else ever links to it from here.
//  - /dashboard: same reasoning -- no longer an admin-guard redirect
//    target either (see above), kept passthrough so it still resolves
//    to something real rather than a confusing rewrite into /admin/*.
//  - /admin: covers every real admin URL, including /admin/login (the
//    permanent login page as of Phase 3 -- see app/admin/login/page.tsx)
//    and /admin/(protected)/* -- rewriting any of these again would
//    double-prefix into /admin/admin/....
// /admin-login (Phase 2's temporary login URL) is deliberately NOT
// listed here anymore -- it's now just a redirect stub
// (app/admin-login/page.tsx) to /admin/login, and letting it fall
// through to the rewrite is harmless: it becomes /admin/admin-login,
// 404s inside the (protected) tree, the new guard still fail-closes
// correctly (redirects to /admin/login) for a signed-out visitor either
// way.
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
