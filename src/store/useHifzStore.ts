import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TaskType } from "@/lib/constants";
import { localDateKey } from "@/lib/format";
import { newId, nextStamp } from "@/lib/progress/clock";
import { deriveProgress, emptyProgress } from "@/lib/progress/derive";
import { completionId, makeDailyPlan, materialIds, memorizedIds, tasksForPlan } from "@/lib/progress/plan";
import { correctionDraftSchema, parseProgress, settingsSchema } from "@/lib/progress/schema";
import { migrateProgress } from "@/lib/progress/migrate";
import { progressStorage, readWorkspace, backupCurrent, peekWorkspace, hasCloudProof, storageKey, writeWorkspace } from "@/lib/progress/storage";
import { PROGRESS_VERSION, snapshotOf, type DailyPlan, type ProgressData, type Settings, type ThumunRating } from "@/lib/progress/types";
import { useAppStatusStore } from "./useAppStatusStore";
import type { SessionPayload } from "./useSessionStore";

export type { TaskType };
export type { DailyTasks, DailyLogEntry, SessionEntry, Settings, ThumunRating, ProgressData } from "@/lib/progress/types";
export { isDayCompleted } from "@/lib/progress/plan";

export interface HifzState extends ProgressData {
  lastCloudSyncAt: string | null;
  ensureTodayPlan: (date?: string) => void;
  toggleTask: (day: number, task: TaskType, date?: string) => boolean;
  completeTask: (day: number, task: TaskType, date?: string, performedIds?: number[]) => boolean;
  toggleDayCompletion: (day: number) => void;
  markRangeComplete: (upToDay: number) => void;
  setMemorized: (id: number, memorized: boolean) => void;
  declarePriorMemorization: (ids: number[]) => void;
  advanceDay: () => void;
  setReviewOnlyToday: (enabled: boolean) => boolean;
  setNote: (id: number, note: string) => void;
  setThumunRating: (id: number, rating: ThumunRating | null) => void;
  editThumun: (id: number, data: ProgressData["editedThumuns"][number]) => void;
  clearCorrectionDraft: (id: number) => void;
  recordReviewAttempt: (id: number, rating: ThumunRating, sessionId: string) => boolean;
  logSession: (task: TaskType, day: number, seconds: number, opts?: { id?: string; date?: string; thumunIds?: number[]; abandoned?: boolean }) => void;
  finishSession: (payload: SessionPayload, seconds: number) => boolean;
  completeOnboarding: (opts?: { startAtDay?: number; memorizedIds?: number[]; reminderTime?: string | null }) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  startMaintainMode: () => void;
  dismissCelebration: () => void;
  setLastCloudSync: (iso: string) => void;
  resetProgress: () => void;
  hydrateFromCloud: (data: ProgressData) => void;
  switchOwner: (ownerId: string | null) => void;
  restoreGuestBackup: (data: ProgressData) => void;
}
const volatileWorkspaces = new Map<string, { data: ProgressData; storageError: string | null }>();
const validId = (id: number) => Number.isInteger(id) && id >= 1 && id <= 480;
function canWrite(): boolean { return !useAppStatusStore.getState().storageError; }
function error(message: string): never { throw new Error(message); }
function activity(data: ProgressData, stamp: ReturnType<typeof nextStamp>, date = localDateKey()) {
  return { ...data.versions, [`activity:${date}`]: data.versions[`activity:${date}`] ?? stamp };
}
function withPlan(data: ProgressData, date = localDateKey()): { data: ProgressData; plan: DailyPlan } {
  const existing = data.dailyPlans[date];
  if (existing) return { data, plan: existing };
  const plan = makeDailyPlan(data, date, nextStamp(data));
  return { data: { ...data, dailyPlans: { ...data.dailyPlans, [date]: plan } }, plan };
}
function setTask(data: ProgressData, day: number, task: TaskType, done: boolean, date = localDateKey(), performed?: number[]): ProgressData {
  // Preview is unrestricted; credited actions are restricted at the store boundary too.
  if (!validId(day) || day > data.currentDay || date !== localDateKey() || task === "free_review") return data;
  const { data: base, plan } = withPlan(data, date);
  if (plan.journeyDay !== day || !plan.taskKeys.includes(task)) return data;
  const expected = materialIds(plan, task);
  if (performed && expected.join(",") !== performed.join(",")) return data;
  const id = completionId(date, task, plan.id), before = base.completions[id];
  if (before?.done === done && before.day === day && before.materialIds.join(",") === expected.join(",")) return base;
  const stamp = nextStamp(base);
  const completions = { ...base.completions, [id]: {
    id, planId: plan.id, task, day, date, done, materialIds: expected, legacy: false, stamp,
  } };
  const memorization = { ...base.memorization };
  if (task === "new_hifz" && plan.newHifzId) {
    const prior = memorization[plan.newHifzId];
    if (!(prior?.memorized && prior.source === "prior")) memorization[plan.newHifzId] = {
      memorized: done, source: prior?.source === "legacy" ? "legacy" : "learned",
      at: new Date().toISOString(), stamp,
    };
  }
  return deriveProgress({ ...base, completions, memorization, versions: done ? activity(base, stamp, date) : base.versions });
}

export const useHifzStore = create<HifzState>()(persist((set, get) => {
  const mutate = (fn: (state: ProgressData) => ProgressData) => {
    if (!canWrite()) return false;
    const before = get();
    if (before.ownerId && !useAppStatusStore.getState().cloudReadReady) return false;
    const next = fn(before);
    if (next === before) return false;
    set(deriveProgress(next));
    if (get().ownerId) useAppStatusStore.getState().setStatus({ syncPhase: "pending" });
    return true;
  };
  return {
    ...emptyProgress(), lastCloudSyncAt: null,
    ensureTodayPlan: (date = localDateKey()) => {
      if ((get().ownerId && !useAppStatusStore.getState().cloudReadReady) || get().showOnboarding || get().dailyPlans[date] || date !== localDateKey()) return;
      mutate((data) => withPlan(data, date).data);
    },
    toggleTask: (day, task, date = localDateKey()) => mutate((data) => {
      if (!validId(day) || day > data.currentDay || date !== localDateKey() || task === "free_review") return data;
      const base = withPlan(data, date);
      if (base.plan.journeyDay !== day || !base.plan.taskKeys.includes(task)) return data;
      const before = base.data.completions[completionId(date, task, base.plan.id)]?.done === true;
      return setTask(base.data, day, task, !before, date);
    }),
    completeTask: (day, task, date = localDateKey(), performedIds) => mutate((data) => setTask(data, day, task, true, date, performedIds)),
    // Kept for compatibility. A memorization declaration is NOT six historical tasks.
    toggleDayCompletion: (day) => { if (day <= get().currentDay) get().setMemorized(day, !get().memorization[day]?.memorized); },
    markRangeComplete: (upToDay) => {
      if (!Number.isInteger(upToDay) || upToDay < 0 || upToDay > 480) return;
      mutate((data) => {
        const stamp = nextStamp(data), memorization = { ...data.memorization };
        for (let id = 1; id <= upToDay; id++) if (!memorization[id]?.memorized) memorization[id] = {
          memorized: true, source: "prior", at: new Date().toISOString(), stamp,
        };
        const currentDay = Math.min(480, upToDay + 1);
        return { ...data, memorization, currentDay, versions: { ...data.versions, currentDay: stamp } };
      });
    },
    setMemorized: (id, memorized) => {
      if (!validId(id)) return;
      mutate((data) => {
        if (data.memorization[id]?.memorized === memorized) return data;
        const stamp = nextStamp(data), prev = data.memorization[id];
        const memorization = { ...data.memorization, [id]: {
          memorized, source: prev?.source ?? "prior", at: new Date().toISOString(), stamp,
        } };
        const completions = { ...data.completions };
        if (!memorized) for (const [key, completion] of Object.entries(completions)) {
          if (completion.task === "new_hifz" && (completion.materialIds.includes(id) || completion.day === id))
            completions[key] = { ...completion, done: false, stamp };
        }
        // Declaration/restoration is not a learning activity or an XP grant.
        return { ...data, memorization, completions };
      });
    },
    declarePriorMemorization: (ids) => mutate((data) => {
      if (ids.some((id) => !validId(id))) return data;
      const selected = new Set(ids), stamp = nextStamp(data), memorization = { ...data.memorization }, completions = { ...data.completions };
      for (let id = 1; id <= 480; id++) {
        const before = memorization[id], done = selected.has(id);
        if ((before?.memorized ?? false) === done) continue;
        memorization[id] = { memorized: done, source: before?.source ?? "prior", at: new Date().toISOString(), stamp };
        if (!done) for (const [key, c] of Object.entries(completions)) if (c.task === "new_hifz" && (c.day === id || c.materialIds.includes(id))) completions[key] = { ...c, done: false, stamp };
      }
      let currentDay = 1; while (currentDay < 480 && memorization[currentDay]?.memorized) currentDay++;
      return { ...data, memorization, completions, currentDay, versions: { ...data.versions, currentDay: stamp } };
    }),
    advanceDay: () => mutate((data) => {
      if (!data.memorization[data.currentDay]?.memorized || data.currentDay >= 480) return data;
      let next = data.currentDay + 1;
      while (next < 480 && data.memorization[next]?.memorized) next++;
      return { ...data, currentDay: next, versions: { ...data.versions, currentDay: nextStamp(data) } };
    }),
    setReviewOnlyToday: (enabled) => mutate((data) => {
      const { data: base, plan } = withPlan(data);
      if (plan.mode !== "journey" || tasksForPlan(base, plan).new_hifz || plan.reviewOnly === enabled) return data;
      const stamp = nextStamp(base);
      const newHifzId = enabled || base.memorization[plan.journeyDay]?.memorized ? null : plan.journeyDay;
      const taskKeys: TaskType[] = plan.taskKeys.filter((key) => key !== "new_hifz");
      if (newHifzId !== null) taskKeys.push("new_hifz");
      const completions = { ...base.completions };
      const cid = completionId(plan.date, "new_hifz", plan.id);
      if (completions[cid]) completions[cid] = { ...completions[cid], done: false, stamp };
      return { ...base, completions, dailyPlans: { ...base.dailyPlans, [plan.date]: { ...plan, newHifzId, taskKeys, reviewOnly: enabled, stamp } } };
    }),
    setNote: (id, note) => {
      if (!validId(id) || typeof note !== "string" || note.length > 10000) return;
      mutate((data) => {
        if ((data.notes[id] ?? "") === note) return data;
        const notes = { ...data.notes };
        if (note) notes[id] = note; else delete notes[id];
        return { ...data, notes, versions: { ...data.versions, [`note:${id}`]: nextStamp(data) } };
      });
    },
    setThumunRating: (id, rating) => {
      if (!validId(id) || (rating !== null && !["weak", "good", "strong"].includes(rating))) return;
      mutate((data) => {
        if ((data.thumunRatings[id] ?? null) === rating) return data;
        const thumunRatings = { ...data.thumunRatings };
        if (rating) thumunRatings[id] = rating; else delete thumunRatings[id];
        return { ...data, thumunRatings, versions: { ...data.versions, [`rating:${id}`]: nextStamp(data) } };
      });
    },
    editThumun: (id, proposal) => {
      if (!validId(id)) return;
      const fields = correctionDraftSchema.parse(proposal);
      mutate((data) => ({ ...data, editedThumuns: { ...data.editedThumuns, [id]: fields }, versions: { ...data.versions, [`draft:${id}`]: nextStamp(data) } }));
    },
    clearCorrectionDraft: (id) => mutate((data) => {
      if (!validId(id) || !data.editedThumuns[id]) return data;
      const editedThumuns = { ...data.editedThumuns }; delete editedThumuns[id];
      return { ...data, editedThumuns, versions: { ...data.versions, [`draft:${id}`]: nextStamp(data) } };
    }),
    recordReviewAttempt: (thumunId, rating, sessionId) => mutate((data) => {
      if (!validId(thumunId) || !["weak", "good", "strong"].includes(rating) || !/^[\w:.-]{1,180}$/.test(sessionId)) return data;
      if (!data.memorization[thumunId]?.memorized) return data;
      const id = `${sessionId}:${thumunId}`;
      if (data.reviewAttempts[id]) return data;
      const stamp = nextStamp(data), date = localDateKey(), at = new Date().toISOString();
      return { ...data, reviewAttempts: { ...data.reviewAttempts, [id]: { id, thumunId, rating, at, date, sessionId, stamp } },
        thumunRatings: { ...data.thumunRatings, [thumunId]: rating }, versions: { ...activity(data, stamp), [`rating:${thumunId}`]: stamp } };
    }),
    logSession: (task, day, seconds, opts = {}) => mutate((data) => {
      if (!validId(day) || !Number.isFinite(seconds) || seconds < 1) return data;
      const id = opts.id ?? newId();
      if (!/^[\w:.-]{1,220}$/.test(id)) return data;
      const existing = data.sessions[id];
      if (existing && (!existing.abandoned || existing.seconds > seconds)) return data;
      const date = opts.date ?? localDateKey();
      const session = {
        id, task, day, seconds: Math.min(43200, Math.floor(seconds)), date, at: new Date().toISOString(),
        thumunIds: [...new Set((opts.thumunIds ?? []).filter(validId))], abandoned: opts.abandoned ?? false, stamp: nextStamp(data),
      };
      return { ...data, sessions: { ...data.sessions, [id]: session }, versions: seconds >= 30 ? activity(data, nextStamp(data), date) : data.versions };
    }),
    finishSession: (payload, seconds) => {
      const data = get();
      if (payload.ownerId !== data.ownerId) return false;
      if (payload.preview || payload.kind === "free_review") {
        get().logSession("free_review", payload.day, seconds, { id: payload.id, thumunIds: payload.thumuns.map((t) => t.id) });
        return false;
      }
      const plan = data.dailyPlans[payload.planDate ?? localDateKey()];
      if (!plan || plan.journeyDay !== payload.day || payload.planDate !== localDateKey()) return false;
      const reading = ["khatma", "khatma_recite", "maintain_recite"].includes(payload.kind);
      const listening = ["khatma", "khatma_listen"].includes(payload.kind);
      if (reading && (payload.reciteJuzs ?? []).join(",") !== plan.reciteJuzs.join(",")) return false;
      if (listening && (payload.listenHizbs ?? []).join(",") !== plan.listenHizbs.join(",")) return false;
      if (payload.kind === "khatma") {
        const changed = mutate((before) => setTask(setTask(before, payload.day, "khatma_recite", true, plan.date), payload.day, "khatma_listen", true, plan.date));
        get().logSession("khatma_recite", payload.day, seconds, { id: payload.id }); return changed;
      }
      const task = payload.kind === "prep" ? "prep_weekly" : payload.kind;
      const performed = payload.thumuns.map((t) => t.id);
      const requiresMaterials = ["new_hifz", "prep_weekly", "review_near", "review_far"].includes(task);
      if (["review_near", "review_far"].includes(task) && performed.some((id) => !data.reviewAttempts[`${payload.id}:${id}`])) return false;
      const changed = get().completeTask(payload.day, task, payload.planDate ?? localDateKey(), requiresMaterials ? performed : undefined);
      // Record time once even when the task was already completed on another screen.
      get().logSession(task, payload.day, seconds, { id: payload.id, thumunIds: performed });
      return changed;
    },
    completeOnboarding: (opts = {}) => mutate((data) => {
      const stamp = nextStamp(data), memorization = { ...data.memorization };
      const ids = opts.memorizedIds ?? Array.from({ length: Math.max(0, Math.min(480, Math.floor(opts.startAtDay ?? 0))) }, (_, i) => i + 1);
      for (const id of ids.filter(validId)) if (!memorization[id]?.memorized) memorization[id] = { memorized: true, source: "prior", at: new Date().toISOString(), stamp };
      let currentDay = 1;
      while (currentDay < 480 && memorization[currentDay]?.memorized) currentDay++;
      const reminderTime = opts.reminderTime ?? null;
      const settings = settingsSchema.parse({ ...data.settings, reminderTime });
      return { ...data, memorization, currentDay, settings, showOnboarding: false,
        versions: { ...data.versions, currentDay: stamp, showOnboarding: stamp, "setting:reminderTime": stamp } };
    }),
    updateSettings: (patch) => {
      const settings = settingsSchema.parse({ ...get().settings, ...patch });
      mutate((data) => {
        const changed = Object.keys(patch) as (keyof Settings)[];
        if (changed.every((key) => data.settings[key] === settings[key])) return data;
        const stamp = nextStamp(data), versions = { ...data.versions };
        for (const key of changed) if (data.settings[key] !== settings[key]) versions[`setting:${key}`] = stamp;
        return { ...data, settings, versions };
      });
    },
    startMaintainMode: () => mutate((data) => {
      if (memorizedIds(data).length !== 480 || data.maintain.active) return data;
      const now = new Date(), today = localDateKey(now), plan = data.dailyPlans[today];
      if (plan?.mode === "journey") now.setDate(now.getDate() + 1);
      return { ...data, maintain: { active: true, day: 1, startedOn: localDateKey(now), cycleOffset: 0 }, versions: { ...data.versions, maintain: nextStamp(data) } };
    }),
    dismissCelebration: () => mutate((data) => ({ ...data, celebrationSeenAt: data.khatmaCompletedAt, versions: { ...data.versions, celebrationSeenAt: nextStamp(data) } })),
    setLastCloudSync: (iso) => { set({ lastCloudSyncAt: iso }); useAppStatusStore.getState().setStatus({ syncedAt: iso }); },
    resetProgress: () => {
      if (get().ownerId) error("إعادة ضبط الحساب تتطلب تأكيد الخادم لكل الأجهزة");
      const old = snapshotOf(get()); backupCurrent(old, "reset");
      useAppStatusStore.getState().setStatus({ storageError: null });
      set({ ...emptyProgress(), epoch: old.epoch + 1, lastCloudSyncAt: null });
    },
    hydrateFromCloud: (raw) => {
      const data = parseProgress(raw), current = get();
      if (data.ownerId !== current.ownerId) error("تغيّر الحساب؛ أُلغيت استعادة البيانات");
      if (data.epoch < current.epoch) error("رفض بيانات تسبق إعادة الضبط");
      if (data.epoch > current.epoch) backupCurrent(snapshotOf(current), "remote-reset");
      set(deriveProgress(data));
    },
    switchOwner: (ownerId) => {
      if (ownerId === get().ownerId) return;
      const fresh = parseProgress(emptyProgress(ownerId));
      const previous = snapshotOf(get());
      volatileWorkspaces.set(storageKey(previous.ownerId), { data: previous, storageError: useAppStatusStore.getState().storageError });
      if (canWrite()) { try { writeWorkspace(previous); volatileWorkspaces.delete(storageKey(previous.ownerId)); } catch { /* Keep unsaved data isolated in memory; never show it under another owner. */ } }
      useAppStatusStore.getState().setStatus({ storageError: null, syncPhase: ownerId ? "pending" : "local", syncError: null, syncedAt: null, ownerId, cloudReadReady: ownerId ? hasCloudProof(ownerId) : true });
      const cached = volatileWorkspaces.get(storageKey(ownerId));
      const loaded = cached?.data ?? readWorkspace(ownerId);
      const data = loaded ?? fresh;
      useAppStatusStore.getState().setStatus({ cloudReadReady: ownerId ? !!loaded && hasCloudProof(ownerId) : true });
      if (cached?.storageError) useAppStatusStore.getState().setStatus({ storageError: cached.storageError });
      useHifzStore.persist.setOptions({ name: storageKey(ownerId) });
      set({ ...deriveProgress(data), lastCloudSyncAt: null });
      const guest = ownerId ? peekWorkspace(null) : null;
      useAppStatusStore.getState().setStatus({ guestTransferAvailable: !!guest && (memorizedIds(guest).length > 0 || Object.values(guest.notes).some(Boolean) || Object.keys(guest.sessions).length > 0 || Object.keys(guest.editedThumuns).length > 0 || Object.keys(guest.thumunRatings).length > 0) });
    },
    restoreGuestBackup: (raw) => {
      if (get().ownerId) error("استيراد الحساب يجب أن يمر عبر الاستبدال المحمي في الخادم");
      const data = parseProgress(raw);
      backupCurrent(snapshotOf(get()), "import");
      useAppStatusStore.getState().setStatus({ storageError: null });
      set({ ...deriveProgress({ ...data, ownerId: null, epoch: get().epoch + 1 }), lastCloudSyncAt: null });
    },
  };
}, {
  name: storageKey(null), version: PROGRESS_VERSION,
  storage: createJSONStorage(() => progressStorage), partialize: (state) => snapshotOf(state),
  migrate: (raw, version) => migrateProgress(raw, version),
  merge: (persisted, current) => {
    if (!persisted) return current;
    try { return { ...current, ...deriveProgress(parseProgress(persisted)) }; }
    catch (err) { useAppStatusStore.getState().setStatus({ storageError: err instanceof Error ? err.message : "تعذّر الترحيل" }); return current; }
  },
}));

export function forgetVolatileOwner(owner: string) { volatileWorkspaces.delete(storageKey(owner)); }
