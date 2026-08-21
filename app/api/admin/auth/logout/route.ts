import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, revokeAdminSession } from "@/lib/adminAuth";

// Admin Auth Rebuild Phase 2: revokes the current admin_sessions row (if
// any) and clears the cookie. Not wired into any UI yet (AdminTopbar has
// no sign-out control -- that's Phase 3, alongside the guard swap).
// Always succeeds from the caller's point of view, even with no/garbage
// cookie present -- logout should never itself be a source of errors.

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await revokeAdminSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
