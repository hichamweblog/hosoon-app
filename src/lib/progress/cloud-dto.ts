import { migrateProgress } from "./migrate";
import { deriveProgress } from "./derive";
import { parseProgress } from "./schema";
import { PROGRESS_VERSION, type ProgressData } from "./types";

export interface CloudRecord { snapshot: ProgressData | null; revision: number; epoch: number; needsUpgrade?: boolean }
/** A legacy SQL row is read once, then upgraded using the same protected RPC. */
export function decodeCloudRow(value: unknown, owner: string): CloudRecord {
  if (value === null) return { snapshot: null, revision: 0, epoch: 0 };
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("استجابة سحابية غير صالحة");
  const row = value as Record<string, unknown>;
  if (row.user_id !== owner) throw new Error("استجابة تخص حسابًا آخر");
  const revision = row.revision, epoch = row.epoch;
  if (!Number.isSafeInteger(revision) || Number(revision) < 0 || !Number.isSafeInteger(epoch) || Number(epoch) < 0)
    throw new Error("المزامنة الآمنة تتطلب نشر ترحيل قاعدة البيانات أولًا");
  let snapshot: ProgressData;
  if (row.snapshot !== null && row.snapshot !== undefined) {
    if (row.schema_version !== PROGRESS_VERSION) throw new Error("إصدار الخادم غير مدعوم — حدّث التطبيق قبل المزامنة");
    snapshot = parseProgress(row.snapshot);
    if (snapshot.ownerId !== owner || snapshot.epoch !== epoch) throw new Error("نسخة سحابية لا تطابق ملكية/حقبة الصف");
  } else {
    snapshot = migrateProgress({
      currentDay: row.current_day, startDate: row.created_at, streak: row.streak,
      bestStreak: row.best_streak, totalXp: row.total_xp, completedTasks: row.completed_tasks,
      dailyLog: row.daily_log, sessionLog: row.session_log, notes: row.notes,
      thumunRatings: row.thumun_ratings, editedThumuns: row.edited_thumuns,
      khatmaCompletedAt: row.khatma_completed_at, maintain: row.maintain, settings: row.settings,
      showOnboarding: false,
    }, 3, owner);
    snapshot.epoch = Number(epoch);
  }
  return { snapshot: deriveProgress(snapshot), revision: Number(revision), epoch: Number(epoch), needsUpgrade: row.snapshot === null || row.snapshot === undefined };
}
