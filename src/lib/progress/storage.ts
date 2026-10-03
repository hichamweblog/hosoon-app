import type { StateStorage } from "zustand/middleware";
import { useAppStatusStore } from "@/store/useAppStatusStore";
import { PROGRESS_VERSION, type ProgressData } from "./types";
import { MAX_BACKUP_BYTES, parseProgress } from "./schema";
import { migrateProgress } from "./migrate";

export function storageKey(owner: string | null): string { return `hosoon-progress:${owner ?? "guest"}`; }
function storage(): Storage | null {
  try {
    const store = typeof localStorage !== "undefined" ? localStorage : null;
    if (!store && typeof window !== "undefined") report(new Error("التخزين المحلي غير متاح. لا تغلق الصفحة قبل تصدير بياناتك."));
    return store;
  } catch { report(new Error("منع المتصفح التخزين المحلي. صدّر نسخة قبل إغلاق الصفحة.")); return null; }
}
function report(error: unknown) {
  useAppStatusStore.getState().setStatus({ storageError: error instanceof Error ? error.message : "تعذّر حفظ البيانات على الجهاز. صدّر نسخة قبل إغلاق الصفحة." });
}
let recoveryClock = 0;
export function saveRecovery(raw: string, owner: string | null, label: string): void {
  const store = storage();
  if (!store) throw new Error("لا يمكن حفظ نسخة رجوع؛ التخزين المحلي غير متاح");
  const prefix = `hosoon-recovery:${owner ?? "guest"}:`;
  recoveryClock = Math.max(Date.now(), recoveryClock + 1);
  const key = `${prefix}${recoveryClock}:${label}`;
  try {
    // Keep three recoveries per workspace. Fail safely BEFORE replacing any state.
    const keys = Array.from({ length: store.length }, (_, i) => store.key(i)).filter((k): k is string => !!k?.startsWith(prefix)).sort();
    while (keys.length >= 3) store.removeItem(keys.shift()!);
    store.setItem(key, raw);
  } catch { throw new Error("لا توجد مساحة لنسخة الرجوع. صدّر بياناتك وحرّر مساحة قبل الاستبدال."); }
}
export function decodeStored(raw: string, owner: string | null): ProgressData {
  if (new Blob([raw]).size > MAX_BACKUP_BYTES) throw new Error("بيانات محلية أكبر من الحد المسموح");
  const envelope = JSON.parse(raw) as { state?: unknown; version?: unknown };
  if (!envelope || typeof envelope !== "object" || !Number.isInteger(envelope.version)) throw new Error("بنية التخزين المحلي غير صالحة");
  const version = Number(envelope.version);
  const parsed = version === PROGRESS_VERSION ? parseProgress(envelope.state) : migrateProgress(envelope.state, version, owner);
  if (parsed.ownerId !== owner) throw new Error("مالك مساحة البيانات لا يطابق الحساب");
  return parsed;
}

export const progressStorage: StateStorage = {
  getItem: (name) => {
    const store = storage();
    if (!store) return null;
    try {
      let raw = store.getItem(name);
      const owner = name === storageKey(null) ? null : name.slice("hosoon-progress:".length);
      if (!raw && owner === null) raw = store.getItem("hifz-storage");
      if (!raw) return null;
      const envelope = JSON.parse(raw) as { version?: number; state?: unknown };
      if ((envelope.version ?? 0) < PROGRESS_VERSION) {
        saveRecovery(raw, owner, "migration");
        const data = migrateProgress(envelope.state, envelope.version ?? 0, owner);
        useAppStatusStore.getState().setStatus({ migrationNotice: "رُحّلت بياناتك بأمان. الرصيد القديم محفوظ منفصلًا؛ التصحيحات القديمة مسودات، والمحـفوظ لا يعني إنجاز أوراد تاريخية." });
        return JSON.stringify({ state: data, version: PROGRESS_VERSION });
      }
      decodeStored(raw, owner); // Even matching persist versions require validation.
      return raw;
    } catch (error) { report(error); return null; }
  },
  setItem: (name, value) => {
    const store = storage();
    if (!store) return;
    // A corrupt/unsupported original must not be silently overwritten by defaults.
    if (useAppStatusStore.getState().storageError) return;
    try { store.setItem(name, value); } catch { report(new Error("تعذّر الحفظ المحلي (المساحة أو الإذن). صدّر نسخة قبل إغلاق التطبيق.")); }
  },
  removeItem: (name) => { try { storage()?.removeItem(name); } catch (error) { report(error); } },
};

export function readWorkspace(owner: string | null): ProgressData | null {
  const raw = progressStorage.getItem(storageKey(owner));
  return typeof raw === "string" ? decodeStored(raw, owner) : null;
}
export function writeWorkspace(data: ProgressData): void {
  const raw = JSON.stringify({ state: data, version: PROGRESS_VERSION });
  const store = storage();
  if (!store) throw new Error("التخزين المحلي غير متاح");
  store.setItem(storageKey(data.ownerId), raw);
}
export function recoveryCopies(owner: string | null): { key: string; raw: string }[] {
  const store = storage();
  if (!store) return [];
  const prefix = `hosoon-recovery:${owner ?? "guest"}:`;
  return Array.from({ length: store.length }, (_, i) => store.key(i)).filter((key): key is string => !!key?.startsWith(prefix))
    .sort().reverse().map((key) => ({ key, raw: store.getItem(key) ?? "" }));
}

export function originalWorkspaceRaw(owner: string | null): string | null {
  return storage()?.getItem(storageKey(owner)) ?? (owner === null ? storage()?.getItem("hifz-storage") ?? null : null);
}
export function backupCurrent(data: ProgressData, label: string) {
  const raw = useAppStatusStore.getState().storageError ? originalWorkspaceRaw(data.ownerId) : null;
  saveRecovery(raw ?? JSON.stringify({ state: data, version: PROGRESS_VERSION }), data.ownerId, label);
}
export function peekWorkspace(owner: string | null): ProgressData | null {
  try {
    const raw = originalWorkspaceRaw(owner);
    if (!raw) return null;
    const envelope = JSON.parse(raw);
    return (envelope.version ?? 0) === PROGRESS_VERSION ? decodeStored(raw, owner) : migrateProgress(envelope.state, envelope.version ?? 0, owner);
  } catch { return null; }
}
export function forgetWorkspace(owner: string) {
  const store = storage();
  if (!store) return;
  store.removeItem(storageKey(owner));
  store.removeItem(`hosoon-cloud-established:${owner}`);
  for (const copy of recoveryCopies(owner)) store.removeItem(copy.key);
}

export function hasCloudProof(owner: string): boolean {
  try { return !!storage()?.getItem(`hosoon-cloud-established:${owner}`); } catch { return false; }
}
export function markCloudEstablished(owner: string, epoch: number) {
  const store = storage();
  if (!store) throw new Error("التخزين المحلي غير متاح");
  store.setItem(`hosoon-cloud-established:${owner}`, JSON.stringify({ epoch, at: new Date().toISOString() }));
}
