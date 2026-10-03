// Digit & label formatting helpers. UI numerals stay western for consistent navigation.

export function formatNum(n: number | string, _legacyArabicNumerals = false): string {
  void _legacyArabicNumerals;
  return String(n);
}

export function localDateKey(d: Date = new Date()): string {
  // Local calendar date (NOT UTC) — e.g. "2026-09-25"
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetweenLocal(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/** Normalize Arabic/Persian digits, diacritics and common letter variants for search only. */
export function normalizeSearch(value: string): string {
  return value.normalize("NFKC")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06EDـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي")
    .trim().replace(/\s+/g, " ").toLowerCase();
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
