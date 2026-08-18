import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
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
