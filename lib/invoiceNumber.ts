const TRAILING_NUMBER = /^(.*?)(\d+)$/;

// Looks at every existing invoice number, finds the one with the highest
// trailing numeric sequence, and increments it (preserving prefix + zero-padding).
// Falls back to "INV-0001" when nothing matches the pattern.
export function suggestNextInvoiceNumber(existingNumbers: (string | null | undefined)[]): string {
  let best: { prefix: string; digits: string; value: number } | null = null;

  for (const raw of existingNumbers) {
    const number = (raw ?? "").trim();
    const match = number.match(TRAILING_NUMBER);
    if (!match) continue;

    const [, prefix, digits] = match;
    const value = parseInt(digits, 10);
    if (!Number.isFinite(value)) continue;

    if (!best || value > best.value) {
      best = { prefix, digits, value };
    }
  }

  if (!best) return "INV-0001";

  const nextValue = best.value + 1;
  const nextDigits = String(nextValue).padStart(best.digits.length, "0");
  return `${best.prefix}${nextDigits}`;
}
