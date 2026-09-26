import { XP_TABLE, type TaskType } from "@/lib/constants";
import { daysBetweenLocal, localDateKey } from "@/lib/format";
import { TOTAL_THUMUNS, type EditedThumuns } from "@/lib/quran-data";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type { TaskType };

export interface DailyTasks {
  [taskType: string]: boolean;
}

export interface DailyLogEntry {
  date: string; // LOCAL YYYY-MM-DD
  days: number[]; // journey days worked this calendar day
  tasks: number; // tasks credited today (heatmap intensity)
}

export interface SessionEntry {
  task: TaskType;
  day: number;
  seconds: number;
  at: string;
}

export type ThumunRating = "weak" | "good" | "strong";

export interface Settings {
  reminderTime: string | null; // "HH:MM" or null
  arabicNumerals: boolean;
  hizbReciterId: string; // "husary" | "abdulbasit" | "benkiran"
  thumunReciterId: string; // "sayed" | "hassaine" | "qazabri_fast" | "sayed_fast" | "benkiran_fast"
  reciterId?: string; // legacy fallback
  /** وتيرة الختمة: أجزاء التلاوة في اليوم (1..3) */
  reciteJuzPerDay: number;
  /** وتيرة الختمة: أحزاب الاستماع في اليوم (1..3) */
  listenHizbPerDay: number;
}

/** مهام الرحلة الست (الحصون الخمسة — حصنا المراجعة مهمتان) */
export const JOURNEY_TASKS: TaskType[] = [
  "khatma_recite",
  "khatma_listen",
  "prep_weekly",
  "new_hifz",
  "review_near",
  "review_far",
];

/**
 * مُوحَّد: اليوم مكتمل iff كل مهامه متُمة (لا "أي مهمة" ولا "وجود سجل").
 * §4.1 — يُستعمل في كل الواجهات.
 */
export function isDayCompleted(tasks: DailyTasks | undefined, maintain = false): boolean {
  if (!tasks) return false;
  const keys: TaskType[] = maintain ? ["maintain_recite"] : JOURNEY_TASKS;
  return keys.every((k) => !!tasks[k]);
}

interface HifzState {
  // Journey
  currentDay: number;
  startDate: string;
  completedTasks: Record<number, DailyTasks>;
  khatmaCompletedAt: string | null;
  maintain: { active: boolean; day: number };

  // Streak (credited on activity, LOCAL dates)
  streak: number;
  bestStreak: number;
  lastActiveDate: string;

  // Logs
  dailyLog: Record<string, DailyLogEntry>;
  sessionLog: Record<string, SessionEntry[]>;

  // Per-thumun data
  notes: Record<number, string>;
  thumunRatings: Record<number, ThumunRating>;
  editedThumuns: EditedThumuns;

  // Meta
  showOnboarding: boolean;
  totalXp: number;
  settings: Settings;
  lastCloudSyncAt: string | null;

  // Actions
  toggleTask: (day: number, task: TaskType) => void;
  toggleDayCompletion: (day: number) => void;
  markRangeComplete: (upToDay: number) => void;
  advanceDay: () => void;
  setNote: (thumunId: number, note: string) => void;
  setThumunRating: (thumunId: number, rating: ThumunRating | null) => void;
  editThumun: (
    id: number,
    data: { startSura?: number; startAya?: number; endSura?: number; endAya?: number; text?: string },
  ) => void;
  logSession: (task: TaskType, day: number, seconds: number) => void;
  completeOnboarding: (opts?: { startAtDay?: number; reminderTime?: string | null }) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  startMaintainMode: () => void;
  setLastCloudSync: (iso: string) => void;
  resetProgress: () => void;
  hydrateFromCloud: (data: Partial<HifzState>) => void;
}

const initialState = {
  currentDay: 1,
  startDate: new Date().toISOString(),
  completedTasks: {} as Record<number, DailyTasks>,
  khatmaCompletedAt: null as string | null,
  maintain: { active: false, day: 1 },
  streak: 0,
  bestStreak: 0,
  lastActiveDate: "",
  dailyLog: {} as Record<string, DailyLogEntry>,
  sessionLog: {} as Record<string, SessionEntry[]>,
  notes: {} as Record<number, string>,
  thumunRatings: {} as Record<number, ThumunRating>,
  editedThumuns: {},
  showOnboarding: true,
  totalXp: 0,
  settings: {
    reminderTime: null,
    arabicNumerals: true,
    hizbReciterId: "husary",
    thumunReciterId: "sayed",
    reciterId: "husary",
    reciteJuzPerDay: 1,
    listenHizbPerDay: 1,
  } as Settings,
  lastCloudSyncAt: null as string | null,
};

/** Streak credit: first activity of a LOCAL calendar day. */
function withActivity(s: Pick<HifzState, "streak" | "lastActiveDate">) {
  const today = localDateKey();
  if (s.lastActiveDate === today) return { streak: s.streak, lastActiveDate: s.lastActiveDate };
  const gap =
    s.lastActiveDate && s.lastActiveDate !== today
      ? daysBetweenLocal(s.lastActiveDate, today)
      : Infinity;
  // سياسة «يوم راحة»: فتور يوم واحد (gap=2) لا يكسر السلسلة (تبقى كما هي).
  const streak = gap === 1 ? s.streak + 1 : gap === 2 ? Math.max(1, s.streak) : 1;
  return { streak, lastActiveDate: today };
}

function creditDailyLog(
  dailyLog: Record<string, DailyLogEntry>,
  day: number,
  tasks: number,
): Record<string, DailyLogEntry> {
  const today = localDateKey();
  const prev = dailyLog[today];
  const days = prev ? prev.days : [];
  return {
    ...dailyLog,
    [today]: {
      date: today,
      days: days.includes(day) ? days : [...days, day].sort((a, b) => a - b),
      tasks: (prev?.tasks ?? 0) + tasks,
    },
  };
}

function xpOf(task: TaskType | "day_bonus"): number {
  return XP_TABLE[task] ?? 0;
}

export const useHifzStore = create<HifzState>()(
  persist(
    (set) => ({
      ...initialState,

      toggleTask: (day, task) =>
        set((state) => {
          const before = state.completedTasks[day] || {};
          const was = !!before[task];
          const next = { ...before, [task]: !was };
          const activity = withActivity(state);
          // XP عند الانتقالات فقط (false→true يضيف، العكس يخصم) — §4.2
          const wasFull = isDayCompleted(before, state.maintain?.active);
          const isFull = isDayCompleted(next, state.maintain?.active);
          let delta = was ? -xpOf(task) : xpOf(task);
          if (!wasFull && isFull) delta += xpOf("day_bonus");
          if (wasFull && !isFull) delta -= xpOf("day_bonus");
          // قاعدة الختمة الصارمة: يوم 480 + كل المهام — §10.6
          const khatmaCompletedAt =
            !state.khatmaCompletedAt && day === TOTAL_THUMUNS && isFull
              ? new Date().toISOString()
              : state.khatmaCompletedAt;
          return {
            completedTasks: { ...state.completedTasks, [day]: next },
            totalXp: Math.max(0, (state.totalXp || 0) + delta),
            khatmaCompletedAt,
            dailyLog: was ? state.dailyLog : creditDailyLog(state.dailyLog, day, 1),
            ...activity,
          };
        }),

      toggleDayCompletion: (day) =>
        set((state) => {
          // مُوحَّد: الإكمال = كل المهام (§4.1) — لا حذف بالخطأ عند فك كل المهام.
          const existing = state.completedTasks[day] || {};
          const isCompleted = isDayCompleted(existing, state.maintain?.active);
          const activity = withActivity(state);
          const keys: TaskType[] = state.maintain?.active ? ["maintain_recite"] : JOURNEY_TASKS;
          if (isCompleted) {
            // تفكيك اليوم: خصم مجموع XP المهام المتُمة + بونص اليوم
            let delta = xpOf("day_bonus");
            for (const k of keys) if (existing[k]) delta += xpOf(k);
            const tasks = { ...state.completedTasks };
            delete tasks[day];
            return {
              completedTasks: tasks,
              totalXp: Math.max(0, (state.totalXp || 0) - delta),
              dailyLog: state.dailyLog,
              ...activity,
            };
          }
          // إكمال اليوم: اعتماد كل المهام المتبقية فقط (المتُمة لا تُمنح مرتين)
          const full: DailyTasks = { ...existing };
          let delta = 0;
          for (const k of keys) {
            if (!full[k]) {
              full[k] = true;
              delta += xpOf(k);
            }
          }
          delta += xpOf("day_bonus");
          const khatmaCompletedAt =
            !state.khatmaCompletedAt && day === TOTAL_THUMUNS
              ? new Date().toISOString()
              : state.khatmaCompletedAt;
          return {
            completedTasks: { ...state.completedTasks, [day]: full },
            totalXp: (state.totalXp || 0) + delta,
            khatmaCompletedAt,
            dailyLog: creditDailyLog(state.dailyLog, day, 1),
            ...activity,
          };
        }),

      markRangeComplete: (upToDay) =>
        set((state) => {
          const target = Math.max(0, Math.min(upToDay, TOTAL_THUMUNS));
          const completedTasks = { ...state.completedTasks };
          for (let d = 1; d <= target; d++) {
            if (!completedTasks[d] || !Object.values(completedTasks[d]).some(Boolean)) {
              completedTasks[d] = {
                khatma_recite: true,
                khatma_listen: true,
                prep_weekly: true,
                new_hifz: true,
                review_near: true,
                review_far: true,
              };
            }
          }
          const activity = withActivity(state);
          return {
            completedTasks,
            currentDay: Math.min(target + 1, TOTAL_THUMUNS),
            totalXp: (state.totalXp || 0) + target * xpOf("day_bonus"),
            ...activity,
          };
        }),

      advanceDay: () =>
        set((state) => {
          const activity = withActivity(state);
          const nextDay = state.currentDay + 1;
          if (nextDay > TOTAL_THUMUNS) {
            return {
              ...activity,
              currentDay: TOTAL_THUMUNS,
            };
          }
          return {
            ...activity,
            currentDay: nextDay,
            dailyLog: creditDailyLog(state.dailyLog, state.currentDay, 0),
          };
        }),

      setNote: (thumunId, note) =>
        set((state) => ({ notes: { ...state.notes, [thumunId]: note } })),

      setThumunRating: (thumunId, rating) =>
        set((state) => {
          const next = { ...state.thumunRatings };
          if (rating === null) delete next[thumunId];
          else next[thumunId] = rating;
          return { thumunRatings: next };
        }),

      editThumun: (id, data) =>
        set((state) => ({
          editedThumuns: {
            ...state.editedThumuns,
            [id]: { ...(state.editedThumuns[id] || {}), ...data },
          },
        })),

      logSession: (task, day, seconds) =>
        set((state) => {
          const today = localDateKey();
          const activity = withActivity(state);
          return {
            sessionLog: {
              ...state.sessionLog,
              [today]: [
                ...(state.sessionLog[today] || []),
                { task, day, seconds, at: new Date().toISOString() },
              ],
            },
            ...activity,
          };
        }),

      completeOnboarding: (opts) =>
        set((state) => {
          const base = {
            showOnboarding: false,
            startDate: new Date().toISOString(),
            ...withActivity(state),
          };
          const start = Math.min(Math.max(opts?.startAtDay ?? 0, 0), TOTAL_THUMUNS - 1);
          const reminder = opts?.reminderTime ?? state.settings.reminderTime;
          const withStart =
            start > 0
              ? (() => {
                  const completedTasks = { ...state.completedTasks };
                  for (let d = 1; d <= start; d++) {
                    completedTasks[d] = {
                      khatma_recite: true,
                      khatma_listen: true,
                      prep_weekly: true,
                      new_hifz: true,
                      review_near: true,
                      review_far: true,
                    };
                  }
                  return { completedTasks, currentDay: Math.min(start + 1, TOTAL_THUMUNS) };
                })()
              : {};
          return {
            ...base,
            ...withStart,
            settings: { ...state.settings, reminderTime: reminder ?? null },
          };
        }),

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      startMaintainMode: () =>
        set(() => ({ maintain: { active: true, day: 1 } })),

      setLastCloudSync: (iso) => set(() => ({ lastCloudSyncAt: iso })),

      resetProgress: () =>
        set(() => ({ ...initialState, startDate: new Date().toISOString() })),

      hydrateFromCloud: (data) =>
        set((state) => {
          const rawMaintain = data.maintain ?? state.maintain;
          const maintain =
            rawMaintain && typeof rawMaintain === "object"
              ? {
                  active: Boolean((rawMaintain as { active?: boolean }).active),
                  day:
                    typeof (rawMaintain as { day?: number }).day === "number" &&
                    (rawMaintain as { day?: number }).day! > 0
                      ? (rawMaintain as { day?: number }).day!
                      : 1,
                }
              : { active: false, day: 1 };
          return {
            ...state,
            ...data,
            maintain,
            settings: { ...state.settings, ...(data.settings ?? {}) },
            showOnboarding: false,
          };
        }),
    }),
    {
      name: "hifz-storage",
      version: 3,
      migrate: (persisted: unknown, version) => {
        const p = (persisted || {}) as Record<string, unknown>;
        // v1 → v2: local-date dailyLog reshape, drop dead farReviewPointer,
        // merge per-task XP into totalXp-free state, coerce numeric keys.
        if ((version ?? 0) < 2) {
          const oldLog = (p.dailyLog || {}) as Record<
            string,
            { day?: number; completedAll?: boolean; tasksCompleted?: number; date?: string }
          >;
          const dailyLog: Record<string, DailyLogEntry> = {};
          for (const [k, v] of Object.entries(oldLog)) {
            dailyLog[k] = {
              date: v.date ?? k,
              days: v.day != null && v.completedAll ? [v.day] : [],
              tasks: v.tasksCompleted ?? 0,
            };
          }
          p.dailyLog = dailyLog;
          delete p.farReviewPointer;
          // legacy edit shapes targeted the old flat schema — drop them
          p.editedThumuns = {};
          if (p.settings === undefined) p.settings = initialState.settings;
          if (p.sessionLog === undefined) p.sessionLog = {};
          if (p.thumunRatings === undefined) p.thumunRatings = {};
          if (p.khatmaCompletedAt === undefined) p.khatmaCompletedAt = null;
          if (p.maintain === undefined) p.maintain = { active: false, day: 1 };
          if (p.lastCloudSyncAt === undefined) p.lastCloudSyncAt = null;
        }
        // v2 → v3: وتيرة الختمة (إعدادات جديدة بقيم افتراضية)
        if ((version ?? 0) < 3) {
          const s = (p.settings || {}) as Record<string, unknown>;
          p.settings = {
            ...initialState.settings,
            ...s,
            reciteJuzPerDay: typeof s.reciteJuzPerDay === "number" ? s.reciteJuzPerDay : 1,
            listenHizbPerDay: typeof s.listenHizbPerDay === "number" ? s.listenHizbPerDay : 1,
          };
        }
        // Ensure maintain is always a valid object with active and day
        if (!p.maintain || typeof p.maintain !== "object") {
          p.maintain = { active: false, day: 1 };
        } else {
          const m = p.maintain as Record<string, unknown>;
          p.maintain = {
            active: Boolean(m.active),
            day: typeof m.day === "number" && m.day > 0 ? m.day : 1,
          };
        }
        return p;
      },
    },
  ),
);
