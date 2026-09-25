// Digit & label formatting helpers (Arabic-Indic numerals option).

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function formatNum(n: number | string, arabic = false): string {
  const s = String(n);
  return arabic ? s.replace(/\d/g, (d) => AR_DIGITS[Number(d)]) : s;
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

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
