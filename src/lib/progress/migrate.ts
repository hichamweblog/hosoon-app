import { z } from "zod";
import { localDateKey } from "@/lib/format";
import { HIZB_RECITERS, THUMUN_RECITERS } from "@/lib/quran-audio";
import { ZERO_STAMP } from "./clock";
import { deriveProgress, emptyProgress } from "./derive";
import { parseProgress, taskSchema, ensureSafeJson } from "./schema";
import { PROGRESS_VERSION, type ProgressData } from "./types";

const int = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const unit = z.number().int().min(1).max(480);
const unitKey = z.string().regex(/^[1-9]\d*$/).refine((k) => Number(k) <= 480);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s);
const iso = z.string().datetime({ offset: true });
const oldLog = z.object({
  date: date.optional(), days: z.array(unit).max(480).optional(), tasks: int.max(10000).optional(),
  day: unit.optional(), completedAll: z.boolean().optional(), tasksCompleted: int.max(10000).optional(),
}).strict();
const legacySchema = z.object({
  currentDay: unit, startDate: iso.optional(),
  completedTasks: z.record(unitKey, z.partialRecord(taskSchema, z.boolean())).optional(),
  totalXp: int.optional(), streak: int.optional(), bestStreak: int.optional(),
  lastActiveDate: date.or(z.literal("")).optional(),
  dailyLog: z.record(date, oldLog).optional(),
  sessionLog: z.record(date, z.array(z.object({ task: taskSchema, day: unit, seconds: int.max(43200), at: iso }).strict()).max(10000)).optional(),
  notes: z.record(unitKey, z.string().max(10000)).optional(),
  thumunRatings: z.record(unitKey, z.enum(["weak", "good", "strong"])).optional(),
  editedThumuns: z.record(unitKey, z.object({
    startSura: z.number().int().min(1).max(114).optional(), startAya: z.number().int().min(1).max(286).optional(),
    endSura: z.number().int().min(1).max(114).optional(), endAya: z.number().int().min(1).max(286).optional(),
    text: z.string().max(3000).optional(),
  }).strict()).optional(),
  settings: z.object({
    reminderTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
    arabicNumerals: z.boolean().optional(), hizbReciterId: z.string().max(80).optional(),
    thumunReciterId: z.string().max(80).optional(), reciterId: z.string().max(80).optional(),
    reciteJuzPerDay: z.number().int().min(1).max(3).optional(), listenHizbPerDay: z.number().int().min(1).max(3).optional(),
  }).strict().optional(),
  maintain: z.object({ active: z.boolean(), day: int }).strict().optional(),
  khatmaCompletedAt: iso.nullable().optional(), lastCloudSyncAt: iso.nullable().optional(),
  showOnboarding: z.boolean().optional(), farReviewPointer: int.max(480).optional(),
}).strict();

/** Supported v0..3: preserve data, NEVER manufacture dates or past daily fortresses. */
export function migrateProgress(value: unknown, version = 3, ownerId: string | null = null): ProgressData {
  ensureSafeJson(value);
  if (version === PROGRESS_VERSION) return parseProgress(value);
  if (!Number.isInteger(version) || version < 0 || version > PROGRESS_VERSION)
    throw new Error("إصدار بيانات غير مدعوم — حدّث التطبيق");
  const result = legacySchema.safeParse(value);
  if (!result.success) throw new Error(`النسخة القديمة غير صالحة (${result.error.issues[0]?.path.join(".") || "الحالة"})`);
  const old = result.data, out = emptyProgress(ownerId);
  out.currentDay = old.currentDay;
  out.startDate = old.startDate ?? out.startDate;
  // Legacy journey counters have no trustworthy calendar origin. New dates start now.
  out.calendarStartDate = localDateKey();
  out.notes = old.notes ?? {};
  out.thumunRatings = old.thumunRatings ?? {};
  out.editedThumuns = old.editedThumuns ?? {};
  out.legacyXp = old.totalXp ?? 0;
  out.bestStreak = Math.max(old.bestStreak ?? 0, old.streak ?? 0);
  out.showOnboarding = old.showOnboarding ?? false;
  out.settings = { ...out.settings, ...old.settings };
  if (!HIZB_RECITERS.some((r) => r.id === out.settings.hizbReciterId)) out.settings.hizbReciterId = "husary";
  if (!THUMUN_RECITERS.some((r) => r.id === out.settings.thumunReciterId)) out.settings.thumunReciterId = "sayed";
  if (old.maintain?.active) out.maintain = {
    active: true, day: Math.max(1, old.maintain.day), startedOn: localDateKey(), cycleOffset: Math.max(0, old.maintain.day - 1),
  };
  for (const [dayKey, tasks] of Object.entries(old.completedTasks ?? {})) {
    const day = Number(dayKey);
    if (tasks.new_hifz) out.memorization[day] = {
      memorized: true, source: "legacy", at: out.startDate, stamp: ZERO_STAMP,
    };
    for (const [taskKey, done] of Object.entries(tasks)) {
      if (taskKey === "free_review") continue;
      const task = taskKey as ProgressData["completions"][string]["task"];
      const id = `legacy:${day}:${task}`;
      out.completions[id] = { id, planId: null, task, day, date: null, done: done === true, materialIds: [], legacy: true, stamp: ZERO_STAMP };
    }
  }
  for (const [key, log] of Object.entries(old.dailyLog ?? {})) out.legacyDailyLog[key] = {
    date: key, days: [...new Set(log.days ?? (log.completedAll && log.day ? [log.day] : []))],
    tasks: log.tasks ?? log.tasksCompleted ?? 0, completedAll: false,
  };
  for (const [date, sessions] of Object.entries(old.sessionLog ?? {})) sessions.forEach((s, index) => {
    const id = `legacy-session:${date}:${index}:${s.task}:${s.day}:${Date.parse(s.at)}`;
    out.sessions[id] = { ...s, id, date, thumunIds: [], abandoned: false, stamp: ZERO_STAMP };
  });
  for (const id of Object.keys(out.notes)) out.versions[`note:${id}`] = ZERO_STAMP;
  for (const id of Object.keys(out.thumunRatings)) out.versions[`rating:${id}`] = ZERO_STAMP;
  for (const id of Object.keys(out.editedThumuns)) out.versions[`draft:${id}`] = ZERO_STAMP;
  out.khatmaCompletedAt = Object.values(out.memorization).filter((m) => m.memorized).length === 480 ? old.khatmaCompletedAt ?? null : null;
  return parseProgress(deriveProgress(out));
}
