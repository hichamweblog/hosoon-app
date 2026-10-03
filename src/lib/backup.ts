import { z } from "zod";
import { deriveProgress, progressMetrics } from "./progress/derive";
import { migrateProgress } from "./progress/migrate";
import { MAX_BACKUP_BYTES, parseProgress } from "./progress/schema";
import { PROGRESS_VERSION, snapshotOf, type ProgressData } from "./progress/types";

export const BACKUP_VERSION = PROGRESS_VERSION;
export { MAX_BACKUP_BYTES };
export interface BackupFile { app: "hosoon"; version: number; exportedAt: string; state: ProgressData }
export interface BackupSummary { currentDay: number; totalXp: number; streak: number; daysCompleted: number; notes: number; ratings: number; memorized: number; sessions: number }
const envelopeSchema = z.object({
  app: z.literal("hosoon").optional(), version: z.number().int().min(0).max(PROGRESS_VERSION).optional(),
  exportedAt: z.string().datetime({ offset: true }).optional(), state: z.unknown(),
}).strict();
export function createBackup(state: ProgressData): BackupFile {
  return { app: "hosoon", version: BACKUP_VERSION, exportedAt: new Date().toISOString(), state: parseProgress(snapshotOf(state)) };
}
export function validateBackup(parsed: unknown): { ok: true; file: BackupFile; summary: BackupSummary } | { ok: false; error: string } {
  try {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("ملف غير صالح");
    if (new Blob([JSON.stringify(parsed)]).size > MAX_BACKUP_BYTES) throw new Error("الملف أكبر من 8 MiB");
    const p = parsed as Record<string, unknown>;
    if (p.app !== undefined && p.app !== "hosoon") throw new Error("هذا الملف ليس نسخة احتياطية من حصون");
    if (typeof p.version === "number" && p.version > PROGRESS_VERSION) throw new Error("نسخة أحدث — حدّث التطبيق أولًا");
    const raw = "currentDay" in p && !p.state;
    const envelope = raw ? { version: typeof p.schemaVersion === "number" ? p.schemaVersion : 3, state: parsed } : envelopeSchema.parse(parsed);
    const version = envelope.version ?? 3;
    const data = parseProgress(deriveProgress(version === PROGRESS_VERSION ? parseProgress(envelope.state) : migrateProgress(envelope.state, version)));
    const metrics = progressMetrics(data);
    const file: BackupFile = { app: "hosoon", version: BACKUP_VERSION, exportedAt: "exportedAt" in envelope && typeof envelope.exportedAt === "string" ? envelope.exportedAt : new Date().toISOString(), state: data };
    return { ok: true, file, summary: {
      currentDay: data.currentDay, totalXp: data.totalXp, streak: data.streak, daysCompleted: metrics.perfectDays,
      memorized: metrics.count, notes: Object.values(data.notes).filter(Boolean).length,
      ratings: Object.keys(data.thumunRatings).length, sessions: Object.keys(data.sessions).length,
    } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "بيانات غير صالحة" };
  }
}
export type { TaskType } from "./constants";
