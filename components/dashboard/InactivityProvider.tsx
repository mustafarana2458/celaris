"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACTIVITY_EVENTS,
  ACTIVITY_WRITE_THROTTLE_MS,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
  SESSION_EXPIRED_KEY,
  clearInactivityState,
  consumeFreshLoginSignal,
  isSessionMarkedExpired,
  markSessionExpired,
  readLastActivity,
  writeLastActivity,
} from "@/lib/inactivity";
import { SessionExpiredModal } from "./SessionExpiredModal";

// Wraps the authenticated app (mounted once in DashboardShell). Tracks
// activity across mousemove/mousedown/keydown/scroll/touchstart, throttled
// to avoid excessive localStorage writes, and force-signs-out after
// INACTIVITY_TIMEOUT_MS of silence -- in this tab, in another tab (synced via
// the "storage" event), or across a closed-and-reopened tab (synced via the
// lastActivity timestamp persisted in localStorage).
export function InactivityProvider({ children }: { children: ReactNode }) {
  const [expired, setExpired] = useState(false);
  const expiredRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWriteRef = useRef(0);

  // signOutAndBroadcast: this tab detected the timeout itself, so it owns
  // signing out of Supabase and marking the shared "expired" flag for other
  // tabs. signOutAndBroadcast=false means another tab already did that --
  // just reflect the expired state here.
  const triggerExpiry = useCallback((signOutAndBroadcast: boolean) => {
    if (expiredRef.current) return;
    expiredRef.current = true;
    setExpired(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (signOutAndBroadcast) {
      markSessionExpired();
      createClient()
        .auth.signOut()
        .catch(() => {});
    }
  }, []);

  const scheduleTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => triggerExpiry(true), INACTIVITY_TIMEOUT_MS);
  }, [triggerExpiry]);

  const recordActivity = useCallback(() => {
    if (expiredRef.current) return;
    const now = Date.now();
    if (now - lastWriteRef.current >= ACTIVITY_WRITE_THROTTLE_MS) {
      lastWriteRef.current = now;
      writeLastActivity(now);
    }
    scheduleTimeout();
  }, [scheduleTimeout]);

  useEffect(() => {
    if (consumeFreshLoginSignal()) {
      // Fresh sign-in: always start a clean window, ignoring any stale
      // timestamp left over from a previous session in this browser.
      clearInactivityState();
      writeLastActivity();
    } else if (isSessionMarkedExpired()) {
      triggerExpiry(false);
      return;
    } else {
      const last = readLastActivity();
      if (last === null) {
        writeLastActivity();
      } else if (Date.now() - last >= INACTIVITY_TIMEOUT_MS) {
        // Tab was closed (or backgrounded) past the timeout -- expire now.
        triggerExpiry(true);
        return;
      }
    }

    scheduleTimeout();

    const onActivity = () => recordActivity();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true })
    );

    // Catches the case where the timer's setTimeout was suspended (e.g. the
    // OS throttled a backgrounded/sleeping tab) by re-checking elapsed time
    // whenever the tab regains visibility.
    const onVisibility = () => {
      if (document.visibilityState !== "visible" || expiredRef.current) return;
      const last = readLastActivity();
      if (last !== null && Date.now() - last >= INACTIVITY_TIMEOUT_MS) {
        triggerExpiry(true);
      } else {
        scheduleTimeout();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onStorage = (e: StorageEvent) => {
      if (expiredRef.current) return;
      if (e.key === SESSION_EXPIRED_KEY && e.newValue) {
        triggerExpiry(false);
      } else if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        scheduleTimeout();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className={expired ? "pointer-events-none blur-sm select-none" : undefined}>
        {children}
      </div>
      <SessionExpiredModal open={expired} />
    </>
  );
}
