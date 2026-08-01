export type AccentColor = "#2563EB" | "#10B981" | "#7C3AED" | "#F59E0B";

export type AccentDefinition = {
  value: AccentColor;
  label: string;
  rgb: string;
  darkRgb: string;
};

// Each accent's base color (rgb) and a darker "700-level" shade (darkRgb)
// used for hover states and for text placed directly on light backgrounds.
// Kept in sync by hand with the inline bootstrap script in app/layout.tsx,
// which cannot import this module because it must run before any JS bundle loads.
export const ACCENT_PALETTE: AccentDefinition[] = [
  { value: "#2563EB", label: "Blue", rgb: "37 99 235", darkRgb: "29 78 216" },
  { value: "#10B981", label: "Green", rgb: "16 185 129", darkRgb: "4 120 87" },
  { value: "#7C3AED", label: "Purple", rgb: "124 58 237", darkRgb: "109 40 217" },
  { value: "#F59E0B", label: "Amber", rgb: "245 158 11", darkRgb: "180 83 9" },
];

export const DEFAULT_ACCENT = ACCENT_PALETTE[0];
export const ACCENT_STORAGE_KEY = "accentColor";
export const THEME_STORAGE_KEY = "theme";

export function resolveAccent(color: string | null): AccentDefinition {
  return ACCENT_PALETTE.find((a) => a.value === color) ?? DEFAULT_ACCENT;
}

export function applyAccent(color: string | null) {
  const accent = resolveAccent(color);
  document.documentElement.style.setProperty("--accent-rgb", accent.rgb);
  document.documentElement.style.setProperty("--accent-dark-rgb", accent.darkRgb);
}
