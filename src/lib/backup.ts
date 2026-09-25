import type { DailyLogEntry, SessionEntry, Settings, ThumunRating } from "@/store/useHifzStore";
import type { TaskType } from "./constants";

export const BACKUP_VERSION = 2;

export interface BackupFile {
  app: "hosoon";
  version: number;
  exportedAt: string;
  state: {
    currentDay: number;
    startDate: string;
    completedTasks: Record<string, Record<string, boolean>>;
    khatmaCompletedAt: string | null;
    maintain: { active: boolean; day: number };
    streak: number;
    bestStreak: number;
    lastActiveDate: string;
    dailyLog: Record<string, DailyLogEntry>;
    sessionLog: Record<string, SessionEntry[]>;
    notes: Record<string, string>;
    thumunRatings: Record<string, ThumunRating>;
    editedThumuns: Record<string, unknown>;
    totalXp: number;
    settings: Settings;
    lastCloudSyncAt: string | null;
    showOnboarding: boolean;
  };
}

export interface BackupSummary {
  currentDay: number;
  totalXp: number;
  streak: number;
  daysCompleted: number;
  notes: number;
  ratings: number;
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function validateBackup(
  parsed: unknown,
): { ok: true; file: BackupFile; summary: BackupSummary } | { ok: false; error: string } {
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "ملف غير صالح" };
  const appTag = (parsed as Record<string, unknown>).app;
  if (appTag !== undefined && appTag !== "hosoon")
    return { ok: false, error: "هذا الملف ليس نسخة احتياطية من حُصون" };
  const fileVersion = (parsed as Record<string, unknown>).version;
  if (typeof fileVersion === "number" && Number.isFinite(fileVersion) && fileVersion > BACKUP_VERSION)
    return { ok: false, error: "نسخة أحدث من نسخة التطبيق — حدّث التطبيق أولاً" };

  // Accept both the versioned envelope and a raw persisted zustand dump (legacy).
  let state: unknown = (parsed as Record<string, unknown>).state;
  let version = (parsed as Record<string, unknown>).version;
  if (state && typeof state === "object" && "currentDay" in (state as object) === false) {
    // envelope with nested state that isn't ours
    state = undefined;
  }
  if (state === undefined && parsed && typeof parsed === "object" && "currentDay" in parsed) {
    state = parsed; // raw state
    version = BACKUP_VERSION;
  }
  if (!state || typeof state !== "object") return { ok: false, error: "لا توجد بيانات تقدم في الملف" };

  const s = state as Record<string, unknown>;
  if (!isNum(s.currentDay) || s.currentDay < 1 || s.currentDay > 480)
    return { ok: false, error: "قيمة اليوم غير منطقية" };
  if (s.completedTasks !== undefined && (typeof s.completedTasks !== "object" || s.completedTasks === null))
    return { ok: false, error: "بنية المهام غير صالحة" };
  if (s.totalXp !== undefined && !isNum(s.totalXp))
    return { ok: false, error: "قيمة الخبرة غير صالحة" };
  if (s.streak !== undefined && !isNum(s.streak))
    return { ok: false, error: "قيمة السلسلة غير صالحة" };
  if (s.startDate !== undefined && !isStr(s.startDate))
    return { ok: false, error: "تاريخ البداية غير صالح" };

  const completedTasks = (s.completedTasks ?? {}) as Record<string, Record<string, boolean>>;
  const notes = (s.notes ?? {}) as Record<string, string>;
  const thumunRatings = (s.thumunRatings ?? {}) as Record<string, ThumunRating>;

  const summary: BackupSummary = {
    currentDay: s.currentDay,
    totalXp: (s.totalXp as number) ?? 0,
    streak: (s.streak as number) ?? 0,
    daysCompleted: Object.values(completedTasks).filter((t) => t && Object.values(t).some(Boolean))
      .length,
    notes: Object.keys(notes).length,
    ratings: Object.keys(thumunRatings).length,
  };

  const file: BackupFile = {
    app: "hosoon",
    version: isNum(version) ? version : BACKUP_VERSION,
    exportedAt: isStr((parsed as Record<string, unknown>).exportedAt)
      ? ((parsed as Record<string, unknown>).exportedAt as string)
      : new Date().toISOString(),
    state: s as BackupFile["state"],
  };
  return { ok: true, file, summary };
}

export type { TaskType };
