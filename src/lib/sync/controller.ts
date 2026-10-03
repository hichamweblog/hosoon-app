import type { CloudRecord } from "@/lib/progress/cloud-dto";
import { mergeProgress } from "@/lib/progress/merge";
import { canonicalStringify } from "@/lib/progress/json";
import { parseProgress } from "@/lib/progress/schema";
import { snapshotOf, type ProgressData } from "@/lib/progress/types";
import type { SyncPhase } from "@/store/useAppStatusStore";

export interface SyncTransport {
  fetch: (owner: string, signal?: AbortSignal) => Promise<CloudRecord>;
  save: (owner: string, data: ProgressData, expected: CloudRecord, signal?: AbortSignal) => Promise<CloudRecord>;
}
export interface SyncAdapter {
  read: () => ProgressData;
  apply: (data: ProgressData) => void;
  subscribe: (listener: () => void) => () => void;
  status: (phase: SyncPhase, message?: string, at?: string) => void;
  online?: () => boolean;
  readReady?: (epoch: number) => void;
}
export const fingerprint = (data: ProgressData) => canonicalStringify(snapshotOf(data));

/** One serialized pipeline for automatic, login, visibility and manual synchronization. */
export class SyncController {
  private owner: string | null = null;
  private generation = 0;
  private abort: AbortController | null = null;
  private unsubscribe: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private applying = false;
  private acknowledged: string | null = null;
  private failures = 0;
  private observed = "";
  constructor(private transport: SyncTransport, private adapter: SyncAdapter, private debounceMs = 1500) {}

  start(owner: string): void {
    this.stop(); this.owner = owner; this.abort = new AbortController();
    this.observed = fingerprint(this.adapter.read());
    this.unsubscribe = this.adapter.subscribe(() => {
      const current = this.adapter.read();
      if (this.applying || current.ownerId !== this.owner) return;
      const next = fingerprint(current);
      if (next === this.observed) return; // Runtime timestamps/status do not dirty progress.
      this.observed = next;
      if (next !== this.acknowledged) { this.adapter.status("pending"); this.schedule(this.debounceMs); }
    });
    void this.syncNow().catch(() => {});
  }
  stop(): void {
    this.generation++; this.abort?.abort(); this.abort = null;
    this.unsubscribe?.(); this.unsubscribe = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null; this.owner = null; this.running = null; this.acknowledged = null; this.failures = 0;
  }
  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; void this.syncNow().catch(() => {}); }, ms);
  }
  async syncNow(): Promise<void> {
    if (!this.owner) return;
    if (this.running) return this.running;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const owner = this.owner, generation = this.generation, signal = this.abort?.signal;
    const valid = () => generation === this.generation && this.owner === owner && this.adapter.read().ownerId === owner;
    if (!valid()) throw new Error("مالك البيانات لا يطابق الجلسة");
    const operation = async () => {
      if (this.adapter.online && !this.adapter.online()) throw new Error("لا يوجد اتصال. تقدمك محفوظ محليًا وينتظر المزامنة.");
      this.adapter.status("syncing");
      for (let attempt = 0; attempt < 3; attempt++) {
        const remote = await this.transport.fetch(owner, signal);
        if (!valid()) return;
        this.adapter.readReady?.(remote.epoch);
        const latest = snapshotOf(this.adapter.read());
        if (latest.epoch > remote.epoch) throw new Error("الخادم يسبق إعادة ضبط محلية غير مؤكدة؛ توقفت الكتابة لحماية البيانات");
        const merged = parseProgress(remote.snapshot ? mergeProgress(latest, remote.snapshot) : latest);
        this.applying = true;
        try { if (fingerprint(merged) !== fingerprint(latest)) this.adapter.apply(merged); }
        finally { this.applying = false; }
        if (!valid()) return;
        const sent = snapshotOf(this.adapter.read()), sentHash = fingerprint(sent);
        let saved = remote;
        if (remote.needsUpgrade || !remote.snapshot || fingerprint(remote.snapshot) !== sentHash) {
          try { saved = await this.transport.save(owner, sent, remote, signal); }
          catch (error) {
            if ((error as Error).name === "CloudConflict" && attempt < 2) continue;
            throw error;
          }
        }
        if (!valid()) return;
        // Preserve edits made while the request was in flight. Never apply a stale render.
        const current = snapshotOf(this.adapter.read());
        this.applying = true;
        try {
          if (saved.snapshot) {
            const final = mergeProgress(current, saved.snapshot);
            if (fingerprint(final) !== fingerprint(current)) this.adapter.apply(final);
          }
        } finally { this.applying = false; }
        this.acknowledged = saved.snapshot ? fingerprint(saved.snapshot) : sentHash;
        this.observed = fingerprint(this.adapter.read());
        this.failures = 0;
        if (this.observed === this.acknowledged) this.adapter.status("synced", undefined, new Date().toISOString());
        else { this.adapter.status("pending"); this.schedule(this.debounceMs); }
        return;
      }
    };
    const promise = operation().catch((error) => {
      if (!valid() || signal?.aborted) return;
      this.adapter.status("error", error instanceof Error ? error.message : "تعذرت المزامنة. تقدمك محفوظ محليًا.");
      this.failures++;
      this.schedule(Math.min(60000, 2000 * 2 ** Math.min(this.failures - 1, 5)));
      throw error;
    }).finally(() => { if (generation === this.generation) this.running = null; });
    this.running = promise;
    return promise;
  }
}
