import { useHifzStore } from "@/store/useHifzStore";
import { useAppStatusStore } from "@/store/useAppStatusStore";
import { fetchCloudProgress, fetchCloudMetadata, saveCloudProgress, replaceCloudProgress } from "@/lib/supabase";
import { emptyProgress, deriveProgress } from "@/lib/progress/derive";
import { mergeProgress } from "@/lib/progress/merge";
import { parseProgress } from "@/lib/progress/schema";
import { peekWorkspace, backupCurrent, markCloudEstablished } from "@/lib/progress/storage";
import { snapshotOf, type ProgressData } from "@/lib/progress/types";
import { SyncController } from "./controller";

let active: SyncController | null = null;
export function stopCloudSync() { active?.stop(); active = null; }
export function startCloudSync(owner: string) {
  stopCloudSync();
  const controller = new SyncController({ fetch: fetchCloudProgress, save: saveCloudProgress }, {
    read: () => snapshotOf(useHifzStore.getState()),
    apply: (data) => useHifzStore.getState().hydrateFromCloud(data),
    subscribe: (listener) => useHifzStore.subscribe(listener),
    readReady: (epoch) => { markCloudEstablished(owner, epoch); useAppStatusStore.getState().setStatus({ cloudReadReady: true }); },
    online: () => typeof navigator === "undefined" || navigator.onLine,
    status: (phase, message, at) => {
      useAppStatusStore.getState().setStatus({ syncPhase: phase, syncError: message ?? null, ...(at ? { syncedAt: at } : {}) });
      if (at) useHifzStore.getState().setLastCloudSync(at);
    },
  });
  active = controller; controller.start(owner);
  return () => { controller.stop(); if (active === controller) active = null; };
}
export async function synchronizeNow() {
  if (!active || !useHifzStore.getState().ownerId) throw new Error("سجّل دخولك قبل المزامنة");
  if (useAppStatusStore.getState().storageError) throw new Error("أصلح التخزين المحلي قبل المزامنة");
  return active.syncNow();
}
/** Replace all devices via an epoch barrier. No local clear happens before server success. */
export async function replaceAllProgress(raw?: ProgressData) {
  const owner = useHifzStore.getState().ownerId;
  if (!owner) {
    if (raw) useHifzStore.getState().restoreGuestBackup(raw); else useHifzStore.getState().resetProgress();
    return;
  }
  const old = snapshotOf(useHifzStore.getState());
  backupCurrent(old, raw ? "import" : "reset");
  stopCloudSync();
  try {
    const remote = await fetchCloudMetadata(owner);
    const next = parseProgress({ ...snapshotOf(raw ?? emptyProgress(owner)), ownerId: owner, epoch: remote.epoch });
    const saved = await replaceCloudProgress(owner, next, remote);
    if (useHifzStore.getState().ownerId !== owner) throw new Error("تغيّر الحساب أثناء العملية؛ لم تُمسّ بيانات الحساب الجديد");
    if (!saved.snapshot) throw new Error("لم يؤكد الخادم عملية الاستبدال");
    useAppStatusStore.getState().setStatus({ storageError: null });
    markCloudEstablished(owner, saved.epoch);
    useAppStatusStore.getState().setStatus({ cloudReadReady: true });
    useHifzStore.getState().hydrateFromCloud(saved.snapshot);
  } finally {
    if (useHifzStore.getState().ownerId === owner) startCloudSync(owner);
  }
}
export async function transferGuestProgress() {
  const owner = useHifzStore.getState().ownerId;
  if (!owner) throw new Error("سجّل دخولك أولًا");
  await synchronizeNow(); // Resolve the account epoch before rebinding guest data.
  const guest = peekWorkspace(null);
  if (!guest) throw new Error("مساحة الضيف غير متاحة أو غير صالحة؛ لم تُنقل بيانات");
  // An explicit user action is the ONLY path across owners.
  const local = snapshotOf(useHifzStore.getState());
  const rebound = parseProgress({ ...guest, ownerId: owner, epoch: local.epoch, showOnboarding: false });
  const merged = deriveProgress(mergeProgress(local, rebound));
  useHifzStore.getState().hydrateFromCloud(merged);
  await synchronizeNow();
  // Keep the guest workspace as a rollback, but do not repeatedly prompt this session.
  useAppStatusStore.getState().setStatus({ guestTransferAvailable: false });
}
