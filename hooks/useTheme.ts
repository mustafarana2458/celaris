"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

function resolveIsDark(mode: ThemeMode) {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyMode(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", resolveIsDark(mode));
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial: ThemeMode =
      stored === "dark" || stored === "light" || stored === "system"
        ? stored
        : "system";
    setMode(initial);
    setIsDark(resolveIsDark(initial));
    applyMode(initial);
  }, []);

  const updateMode = useCallback((next: ThemeMode) => {
    setMode(next);
    setIsDark(resolveIsDark(next));
    localStorage.setItem(STORAGE_KEY, next);
    applyMode(next);
  }, []);

  return { mode, isDark, setMode: updateMode };
}
