import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SyncController, fingerprint, type SyncAdapter, type SyncTransport } from "./controller";
import { emptyProgress } from "@/lib/progress/derive";
import type { ProgressData } from "@/lib/progress/types";
import type { CloudRecord } from "@/lib/progress/cloud-dto";
import { CloudConflict } from "@/lib/supabase";
import type { SyncPhase } from "@/store/useAppStatusStore";
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function harness() {
  let local: ProgressData & { lastCloudSyncAt?: string } = emptyProgress(A);
  let remote: CloudRecord = { snapshot: structuredClone(local), revision: 1, epoch: 0 };
  const listeners = new Set<() => void>(), phases: { phase: SyncPhase; error?: string }[] = [];
  const notify = () => listeners.forEach((listener) => listener());
  const apply = vi.fn((data: ProgressData) => { local = data; notify(); });
  const transport: SyncTransport = {
    fetch: vi.fn(async () => structuredClone(remote)),
    save: vi.fn(async (_owner, data, expected) => {
      if (expected.revision !== remote.revision) throw new CloudConflict();
      remote = { snapshot: structuredClone(data), revision: remote.revision + 1, epoch: data.epoch };
      return structuredClone(remote);
    }),
  };
  const adapter: SyncAdapter = {
    read: () => local, apply, subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    status: (phase, error, at) => { phases.push({ phase, error }); if (at) { local.lastCloudSyncAt = at; notify(); } }, online: () => true,
  };
  const controller = new SyncController(transport, adapter, 100);
  return { controller, transport, adapter, phases, apply, listeners, notify, read: () => local, update: (data: ProgressData) => { local = data; notify(); }, remote: () => remote, setRemote: (value: CloudRecord) => { remote = value; } };
}
let active: ReturnType<typeof harness>[] = [];
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-02T12:00:00Z")); active = []; });
afterEach(() => { active.forEach((h) => h.controller.stop()); vi.useRealTimers(); });
const make = () => { const h = harness(); active.push(h); return h; };
const edit = (data: ProgressData, id: number, text: string, clock: number, device = "a") => ({ ...data, notes: { ...data.notes, [id]: text }, versions: { ...data.versions, [`note:${id}`]: { clock, device } } });

describe("مسار واحد، فشل مغلق، ومزامنة عند التغيير فقط", () => {
  it("فشل الجلب لا يعني صفًا فارغًا ولا يتبعه رفع أو تطبيق", async () => {
    const h = make(); h.update(edit(h.read(), 1, "keep", 10)); vi.mocked(h.transport.fetch).mockRejectedValue(new Error("unavailable"));
    h.controller.start(A); await expect(h.controller.syncNow()).rejects.toThrow();
    expect(h.transport.save).not.toHaveBeenCalled(); expect(h.apply).not.toHaveBeenCalled(); expect(h.read().notes[1]).toBe("keep"); expect(h.phases.at(-1)?.phase).toBe("error");
  });
  it("أربع تحديثات خمول/lastCloudSyncAt لا تسبب أربع عمليات رفع", async () => {
    const h = make(); h.controller.start(A); await h.controller.syncNow();
    for (let i = 0; i < 4; i++) h.notify(); await vi.advanceTimersByTimeAsync(20000);
    expect(h.transport.fetch).toHaveBeenCalledTimes(1); expect(h.transport.save).not.toHaveBeenCalled(); expect(h.phases.at(-1)?.phase).toBe("synced");
  });
  it("المسار اليدوي والتلقائي يشتركان بعملية واحدة قيد التنفيذ", async () => {
    const h = make(), request = deferred<CloudRecord>(); vi.mocked(h.transport.fetch).mockReturnValueOnce(request.promise);
    h.controller.start(A); const manual1 = h.controller.syncNow(), manual2 = h.controller.syncNow();
    request.resolve(h.remote()); await Promise.all([manual1, manual2]); expect(h.transport.fetch).toHaveBeenCalledTimes(1); expect(h.transport.save).not.toHaveBeenCalled();
  });
  it("يرفع نتيجة الدمج الحديثة لا لقطة الرندر السابقة", async () => {
    const h = make(); h.update(edit(h.read(), 1, "stale", 1)); const remote = edit(h.remote().snapshot!, 1, "remote-new", 2, "b");
    h.setRemote({ ...h.remote(), snapshot: remote }); h.update(edit(h.read(), 2, "local-new", 3));
    h.controller.start(A); await h.controller.syncNow();
    expect(vi.mocked(h.transport.save).mock.calls[0][1].notes).toEqual({ 1: "remote-new", 2: "local-new" }); expect(h.read().notes).toEqual({ 1: "remote-new", 2: "local-new" });
  });
  it("تعديل أثناء الرفع يبقى pending ثم يرفع مرة أخرى دون ضياع", async () => {
    const h = make(), request = deferred<CloudRecord>(); h.setRemote({ snapshot: null, revision: 0, epoch: 0 }); vi.mocked(h.transport.save).mockReturnValueOnce(request.promise);
    h.controller.start(A); const initial = h.controller.syncNow(); await vi.advanceTimersByTimeAsync(0);
    const sent = vi.mocked(h.transport.save).mock.calls[0][1]; h.update(edit(h.read(), 2, "while-saving", 100));
    const saved = { snapshot: structuredClone(sent), revision: 1, epoch: 0 }; h.setRemote(saved); request.resolve(saved); await initial;
    expect(h.read().notes[2]).toBe("while-saving"); expect(h.phases.at(-1)?.phase).toBe("pending");
    await vi.advanceTimersByTimeAsync(100); expect(h.transport.save).toHaveBeenCalledTimes(2); expect(h.remote().snapshot?.notes[2]).toBe("while-saving");
    await vi.advanceTimersByTimeAsync(20000); expect(h.transport.save).toHaveBeenCalledTimes(2);
  });
  it("CAS conflict يعيد القراءة والدمج ولا يكتب فوق تعديل جهاز آخر", async () => {
    const h = make(); h.update(edit(h.read(), 1, "local", 10));
    vi.mocked(h.transport.save).mockImplementationOnce(async () => { h.setRemote({ ...h.remote(), revision: 2, snapshot: edit(h.remote().snapshot!, 2, "other-device", 11, "b") }); throw new CloudConflict(); });
    h.controller.start(A); await h.controller.syncNow(); expect(h.transport.fetch).toHaveBeenCalledTimes(2);
    expect(h.remote().snapshot?.notes).toEqual({ 1: "local", 2: "other-device" }); expect(vi.mocked(h.transport.save).mock.calls[1][2].revision).toBe(2);
  });
  it("response من A بعد التحول إلى B لا يطبق ولا يرفع بيانات A باسم B", async () => {
    const h = make(), request = deferred<CloudRecord>(); vi.mocked(h.transport.fetch).mockReturnValueOnce(request.promise);
    h.controller.start(A); const initial = h.controller.syncNow(); h.update(emptyProgress(B)); h.controller.stop();
    request.resolve(h.remote()); await initial; expect(h.apply).not.toHaveBeenCalled(); expect(h.transport.save).not.toHaveBeenCalled(); expect(h.read().ownerId).toBe(B); expect(h.listeners.size).toBe(0);
  });
  it("استجابة بمالك مختلف مرفوضة قبل أي تطبيق أو حفظ", async () => {
    const h = make(); h.setRemote({ snapshot: emptyProgress(B), revision: 1, epoch: 0 }); h.controller.start(A);
    await expect(h.controller.syncNow()).rejects.toThrow(); expect(h.transport.save).not.toHaveBeenCalled(); expect(h.apply).not.toHaveBeenCalled();
  });
  it("epoch جديد يستبدل القديم ولا يبعث البيانات التي صُفرت", async () => {
    const h = make(); h.update(edit(h.read(), 1, "deleted", 10)); const fresh = emptyProgress(A); fresh.epoch = 1; h.setRemote({ snapshot: fresh, revision: 2, epoch: 1 });
    h.controller.start(A); await h.controller.syncNow(); expect(h.read().epoch).toBe(1); expect(h.read().notes).toEqual({}); expect(h.transport.save).not.toHaveBeenCalled();
  });
  it("الترتيب المختلف لمفاتيح JSONB لا يسبب حلقة pending/رفع", async () => {
    const h = make(); const data = edit(edit(h.read(), 1, "one", 10), 2, "two", 20); h.update(data);
    h.setRemote({ snapshot: { ...structuredClone(data), versions: Object.fromEntries(Object.entries(data.versions).reverse()), settings: Object.fromEntries(Object.entries(data.settings).reverse()) as ProgressData["settings"] }, revision: 2, epoch: 0 });
    expect(fingerprint(h.read())).toBe(fingerprint(h.remote().snapshot!)); h.controller.start(A); await h.controller.syncNow(); await vi.advanceTimersByTimeAsync(20000);
    expect(h.transport.save).not.toHaveBeenCalled(); expect(h.phases.at(-1)?.phase).toBe("synced");
  });
  it("retry متدرج ومحدود، مع إلغاء التوقيت والاشتراك عند stop", async () => {
    const h = make(); vi.mocked(h.transport.fetch).mockRejectedValueOnce(new Error("down")); h.controller.start(A); await h.controller.syncNow().catch(() => {});
    await vi.advanceTimersByTimeAsync(1999); expect(h.transport.fetch).toHaveBeenCalledTimes(1); await vi.advanceTimersByTimeAsync(1); expect(h.transport.fetch).toHaveBeenCalledTimes(2);
    h.controller.stop(); await vi.advanceTimersByTimeAsync(60000); expect(h.transport.fetch).toHaveBeenCalledTimes(2); expect(h.listeners.size).toBe(0);
  });
  it("offline لا يتبعه طلب réseau، ويظل التعديل محليًا", async () => {
    const h = make(); h.adapter.online = () => false; h.update(edit(h.read(), 1, "offline", 10)); h.controller.start(A); await h.controller.syncNow().catch(() => {});
    expect(h.transport.fetch).not.toHaveBeenCalled(); expect(h.transport.save).not.toHaveBeenCalled(); expect(h.read().notes[1]).toBe("offline");
  });
});
