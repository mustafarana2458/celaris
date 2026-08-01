import type { Contact } from "./types";

// Prefers the new relational tags (contact_tags -> tags); falls back to the
// legacy contacts.tags array for rows that haven't been resaved yet.
export function resolveContactTagNames(contact: Contact | null | undefined): string[] {
  if (!contact) return [];
  const relational = (contact.contact_tags ?? [])
    .map((ct) => ct.tags?.name)
    .filter((name): name is string => !!name);
  if (relational.length > 0) return relational;
  return contact.tags ?? [];
}
