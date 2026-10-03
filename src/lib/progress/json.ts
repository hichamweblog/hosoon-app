/** PostgreSQL JSONB is not insertion-ordered: equality must be structural at every depth. */
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, sorted(child)]));
  return value;
}
export function canonicalStringify(value: unknown): string { return JSON.stringify(sorted(value)) ?? ""; }
