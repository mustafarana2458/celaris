import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getCurrentWorkspace } from "@/lib/workspace";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_PAGES = ["/login", "/signup"];

// `rewriteUrl` (set by middleware.ts for the admin.celaris.cloud host)
// swaps every NextResponse.next({request}) below for
// NextResponse.rewrite(rewriteUrl, {request}) instead -- same {request}
// carry-through the Supabase cookie-refresh trick already relies on, so
// the auth/session logic below (getAll/setAll wiring, auth.getUser(),
// the redirect checks) is completely unchanged either way. When
// rewriteUrl is undefined (the normal celaris.cloud case), behavior is
// byte-identical to before this parameter existed.
function baseResponse(request: NextRequest, rewriteUrl?: URL) {
  return rewriteUrl ? NextResponse.rewrite(rewriteUrl, { request }) : NextResponse.next({ request });
}

// Celaris Improvements Phase 2A: billing gate, layered AFTER the auth
// gate below -- "logged in" and "has a workspace with paid access" are
// different questions with different failure destinations (/login vs
// /billing-gateway). Called only when isProtected is already true (see
// the call site), so it's scoped to exactly the same /dashboard/* routes
// the auth gate already covers -- reusing that boolean directly rather
// than a second prefix list. That reuse is also what rules out an
// infinite redirect loop: /billing-gateway is a top-level route, not
// nested under /dashboard, so the redirect TARGET can never itself
// satisfy isProtected -- the loop is structurally impossible, not just
// runtime-avoided. Same reasoning covers every other exception the spec
// asked for (/login, /signup, /reset-password, /update-password, every
// /api/** route, the entire /admin surface): none of them start with
// /dashboard, so none of them ever reach this function at all.
//
// Only "active" or a still-in-grace "cancelled" subscription counts as
// paid access -- deliberately NOT re-derived from subscriptions.status
// here. Reusing workspace.plan (via getCurrentWorkspace, the same
// helper every other part of the app already trusts as "current
// entitlement") instead of re-implementing that state machine is
// deliberate: lib/subscriptionSync.ts's handleCancelled explicitly does
// NOT touch workspaces.plan when a subscription is cancelled (access
// continues until current_period_end; only handleExpired -- fired on
// subscription_expired -- downgrades it to "free"), and
// BillingTab.tsx's hasManageableSubscription reads the exact same way
// (only status === "expired" means "nothing to manage"). Duplicating
// that logic against subscriptions.status directly here would risk
// drifting out of sync with it; reading the already-derived plan field
// cannot drift, by construction. It also means an admin's manual Plan
// Override (Admin Portal > Workspaces, which sets workspaces.plan
// directly with no subscriptions row involved at all) correctly bypasses
// this gate too -- exactly that feature's intended purpose.
async function resolveBillingGateRedirect(
  supabase: SupabaseClient,
  user: User,
  request: NextRequest
): Promise<URL | null> {
  const workspace = await getCurrentWorkspace(supabase, user.id);
  // No resolvable workspace (mid-provisioning race right after signup,
  // or a genuinely workspace-less account) is out of scope for this
  // gate -- pages that need a workspace already have their own "no
  // workspace" handling, and sending someone to /billing-gateway with no
  // workspace to attach a subscription to would be a dead end.
  if (!workspace) return null;

  if (workspace.plan !== "free") return null;

  const url = request.nextUrl.clone();
  url.pathname = "/billing-gateway";
  url.search = "";
  return url;
}

export async function updateSession(request: NextRequest, rewriteUrl?: URL) {
  let supabaseResponse = baseResponse(request, rewriteUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = baseResponse(request, rewriteUrl);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // "next-action" is Next.js's own header on Server Action invocation
  // requests (e.g. the sign-out button in ProfileDropdown, called
  // directly as a function -- not a <form action>, but still a real POST
  // to the current page's URL under the hood). Skipping the billing gate
  // for these specifically -- not the auth gate above, only this one --
  // means an already-loaded dashboard page's actions (most importantly,
  // signing out) keep working even for a workspace that just became
  // gated, instead of silently getting redirected to /billing-gateway
  // mid-action.
  if (user && isProtected && !request.headers.get("next-action")) {
    const billingRedirect = await resolveBillingGateRedirect(supabase, user, request);
    if (billingRedirect) {
      return NextResponse.redirect(billingRedirect);
    }
  }

  return supabaseResponse;
}
