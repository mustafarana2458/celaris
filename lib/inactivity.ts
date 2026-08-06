// Client-side inactivity/auto-logout config and localStorage/cookie helpers.
// Shared between InactivityProvider, the login/signup flows (to reset the
// timer on a fresh sign-in), and manual logout (to clear stale state).

const DEFAULT_INACTIVITY_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours

// Overridable for local testing: set NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS in
// .env.local (gitignored) to a small value like 60000 (1 min), restart
// `next dev`, then remove it to fall back to the 4h default. Must be
// NEXT_PUBLIC_-prefixed to be readable in the browser.
function resolveInactivityTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INACTIVITY_TIMEOUT_MS;
}

export const INACTIVITY_TIMEOUT_MS = resolveInactivityTimeoutMs();

export const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

// How often an activity event is allowed to persist to localStorage (and so
// broadcast to other tabs) -- keeps high-frequency events like mousemove/scroll
// from hammering storage writes.
export const ACTIVITY_WRITE_THROTTLE_MS = 5_000;

export const LAST_ACTIVITY_KEY = "bizsuite:lastActivity";
export const SESSION_EXPIRED_KEY = "bizsuite:sessionExpired";

// Short-lived cookie set by the login server action so a fresh sign-in always
// starts a clean inactivity window, even if this browser has a stale
// lastActivity timestamp left over from a previous (unrelated) session.
const FRESH_LOGIN_COOKIE = "inactivity_reset";

export function readLastActivity(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function writeLastActivity(timestamp: number = Date.now()) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
}

export function markSessionExpired() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_EXPIRED_KEY, String(Date.now()));
}

export function isSessionMarkedExpired(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SESSION_EXPIRED_KEY) !== null;
}

// Clears both keys -- used on a fresh login and on manual logout so no stale
// state leaks into the next session in this browser.
export function clearInactivityState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  window.localStorage.removeItem(SESSION_EXPIRED_KEY);
}

// Reads (and deletes) the fresh-login cookie. Returns true exactly once per
// login redirect.
export function consumeFreshLoginSignal(): boolean {
  if (typeof document === "undefined") return false;
  const has = document.cookie
    .split("; ")
    .some((c) => c === `${FRESH_LOGIN_COOKIE}=1` || c.startsWith(`${FRESH_LOGIN_COOKIE}=1;`));
  if (has) {
    document.cookie = `${FRESH_LOGIN_COOKIE}=; Max-Age=0; path=/`;
  }
  return has;
}

export { FRESH_LOGIN_COOKIE };
