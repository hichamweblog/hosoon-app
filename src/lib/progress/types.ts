import type { TaskType } from "@/lib/constants";
import type { EditedThumun } from "@/lib/quran-data";

export const PROGRESS_VERSION = 4 as const;
export type ThumunRating = "weak" | "good" | "strong";
export type DailyTasks = Partial<Record<TaskType, boolean>>;
export interface CorrectionDraft extends EditedThumun { note?: string; source?: string }
export interface Stamp { clock: number; device: string }
export interface Settings {
  reminderTime: string | null;
  arabicNumerals: boolean;
  hizbReciterId: string;
  thumunReciterId: string;
  reciterId?: string;
  reciteJuzPerDay: number;
  listenHizbPerDay: number;
  quietMode: boolean;
  fontScale: number;
}
export interface DailyLogEntry {
  date: string;
  days: number[];
  tasks: number;
  /** Only true for an actually completed, dated plan. Legacy activity is not proof. */
  completedAll?: boolean;
}
export interface SessionEntry {
  id: string;
  task: TaskType;
  day: number;
  seconds: number;
  at: string;
  date: string;
  thumunIds: number[];
  abandoned: boolean;
  stamp: Stamp;
}
export interface Memorization {
  memorized: boolean;
  source: "prior" | "learned" | "legacy";
  at: string;
  stamp: Stamp;
}
export interface DailyPlan {
  id: string;
  date: string;
  sequence: number;
  journeyDay: number;
  mode: "journey" | "maintenance";
  reciteJuzs: number[];
  listenHizbs: number[];
  prepIds: number[];
  newHifzId: number | null;
  nearIds: number[];
  farIds: number[];
  farOffset: number;
  taskKeys: TaskType[];
  reviewOnly: boolean;
  stamp: Stamp;
}
export interface Completion {
  id: string;
  planId: string | null;
  task: TaskType;
  day: number;
  date: string | null;
  done: boolean;
  materialIds: number[];
  /** Already covered by the preserved legacy XP adjustment. */
  legacy: boolean;
  stamp: Stamp;
}
export interface ReviewAttempt {
  id: string;
  thumunId: number;
  rating: ThumunRating;
  at: string;
  date: string;
  sessionId: string;
  stamp: Stamp;
}

/** JSON-only portable contract. Zustand actions and sync runtime never belong here. */
export interface ProgressData {
  schemaVersion: typeof PROGRESS_VERSION;
  ownerId: string | null;
  epoch: number;
  currentDay: number;
  startDate: string;
  calendarStartDate: string;
  memorization: Record<number, Memorization>;
  dailyPlans: Record<string, DailyPlan>;
  completions: Record<string, Completion>;
  sessions: Record<string, SessionEntry>;
  reviewAttempts: Record<string, ReviewAttempt>;
  versions: Record<string, Stamp>;
  /** Retained separately: dates cannot be invented for old journey flags. */
  legacyDailyLog: Record<string, DailyLogEntry>;
  legacyXp: number;
  notes: Record<number, string>;
  thumunRatings: Record<number, ThumunRating>;
  /** Archived proposals only; these MUST NOT alter the canonical Quran. */
  editedThumuns: Record<number, CorrectionDraft>;
  settings: Settings;
  maintain: { active: boolean; day: number; startedOn: string | null; cycleOffset: number };
  khatmaCompletedAt: string | null;
  celebrationSeenAt: string | null;
  showOnboarding: boolean;
  // Derived compatibility views; rebuilt at every mutation/merge/restore.
  completedTasks: Record<number, DailyTasks>;
  dailyLog: Record<string, DailyLogEntry>;
  sessionLog: Record<string, SessionEntry[]>;
  totalXp: number;
  streak: number;
  bestStreak: number;
  lastActiveDate: string;
}

export const DEFAULT_SETTINGS: Settings = {
  reminderTime: null, arabicNumerals: true, hizbReciterId: "husary",
  thumunReciterId: "sayed", reciterId: "husary", reciteJuzPerDay: 1,
  listenHizbPerDay: 1, quietMode: false, fontScale: 1,
};

export const DATA_KEYS = [
  "schemaVersion", "ownerId", "epoch", "currentDay", "startDate", "calendarStartDate",
  "memorization", "dailyPlans", "completions", "sessions", "reviewAttempts", "versions",
  "legacyDailyLog", "legacyXp", "notes", "thumunRatings", "editedThumuns", "settings",
  "maintain", "khatmaCompletedAt", "celebrationSeenAt", "showOnboarding", "completedTasks",
  "dailyLog", "sessionLog", "totalXp", "streak", "bestStreak", "lastActiveDate",
] as const satisfies readonly (keyof ProgressData)[];

export function snapshotOf(state: ProgressData): ProgressData {
  return Object.fromEntries(DATA_KEYS.map((key) => [key, state[key]])) as unknown as ProgressData;
}
