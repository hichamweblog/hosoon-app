/** Real Storage semantics for persist/migration tests, including quota/access failures. */
export class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  failRead = false; failWrite = false;
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { if (this.failRead) throw new DOMException("Denied", "SecurityError"); return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.failWrite) throw new DOMException("Quota", "QuotaExceededError"); this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); this.failRead = false; this.failWrite = false; }
}
