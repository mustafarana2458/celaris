"use client";

import { useEffect, useState } from "react";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";

const ACCENT_STORAGE_KEY = "accentColor";
const ACCENT_COLORS = ["#2563EB", "#10B981", "#7C3AED", "#F59E0B"];

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function ThemePreview({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <div className="h-16 w-full rounded-lg border border-slate-200 bg-white p-2">
        <div className="h-2 w-8 rounded-full bg-slate-200" />
        <div className="mt-2 h-2 w-full rounded-full bg-slate-100" />
      </div>
    );
  }
  if (mode === "dark") {
    return (
      <div className="h-16 w-full rounded-lg border border-slate-700 bg-slate-900 p-2">
        <div className="h-2 w-8 rounded-full bg-slate-600" />
        <div className="mt-2 h-2 w-full rounded-full bg-slate-700" />
      </div>
    );
  }
  return (
    <div className="grid h-16 w-full grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-white p-2">
        <div className="h-2 w-6 rounded-full bg-slate-200" />
      </div>
      <div className="bg-slate-900 p-2">
        <div className="h-2 w-6 rounded-full bg-slate-600" />
      </div>
    </div>
  );
}

export function AppearanceTab() {
  const { mode, setMode } = useTheme();
  const [accent, setAccent] = useState<string>(ACCENT_COLORS[0]);

  useEffect(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    const initial = stored && ACCENT_COLORS.includes(stored) ? stored : ACCENT_COLORS[0];
    setAccent(initial);
    document.documentElement.style.setProperty("--accent-color", initial);
  }, []);

  function selectAccent(color: string) {
    setAccent(color);
    localStorage.setItem(ACCENT_STORAGE_KEY, color);
    document.documentElement.style.setProperty("--accent-color", color);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Theme</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose how Celaris looks on this device.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const isActive = option.value === mode;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors ${
                  isActive
                    ? "border-blue-500 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <ThemePreview mode={option.value} />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">
                    {option.label}
                  </span>
                  {isActive && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-2.5 w-2.5"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Accent Color</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pick a primary accent color. Saved on this device.
        </p>

        <div className="mt-6 flex items-center gap-3">
          {ACCENT_COLORS.map((color) => {
            const isActive = color === accent;
            return (
              <button
                key={color}
                type="button"
                onClick={() => selectAccent(color)}
                aria-label={`Select accent color ${color}`}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform ${
                  isActive ? "scale-110 ring-2 ring-offset-2 ring-slate-400" : ""
                }`}
                style={{ backgroundColor: color }}
              >
                {isActive && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
