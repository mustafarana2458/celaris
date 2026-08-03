// Shared by dashboard "recent contacts", the People table, and the
// Companies table so every avatar circle behaves identically: single-word
// names use their first letter, multi-word names use first+last initials.
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}
