const TAG_PALETTE: { badge: string; dot: string }[] = [
  { badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400", dot: "bg-blue-500" },
  { badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", dot: "bg-emerald-500" },
  { badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", dot: "bg-amber-500" },
  { badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400", dot: "bg-violet-500" },
  { badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400", dot: "bg-rose-500" },
  { badge: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400", dot: "bg-cyan-500" },
  { badge: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-400", dot: "bg-fuchsia-500" },
  { badge: "bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400", dot: "bg-lime-500" },
];

// Deterministic color per tag name so the same tag always renders the same
// color everywhere, without needing to store a color in the database.
export function tagColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}
