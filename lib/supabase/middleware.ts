import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  return supabaseResponse;
}
