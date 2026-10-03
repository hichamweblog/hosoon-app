import { z } from "zod";
import { getSurah } from "@/lib/quran-data";
import { HIZB_RECITERS, THUMUN_RECITERS } from "@/lib/quran-audio";
import { PROGRESS_VERSION, type ProgressData } from "./types";

export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const thumun = z.number().int().min(1).max(480);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "تاريخ غير صالح");
const iso = z.string().datetime({ offset: true });
const id = z.string().min(1).max(220).regex(/^[a-zA-Z0-9:_.-]+$/);
const thumunKey = z.string().regex(/^[1-9]\d*$/).refine((k) => Number(k) <= 480);
const record = <T extends z.ZodType>(key: z.ZodString, value: T, max = 20000) =>
  z.record(key, value).refine((r) => Object.keys(r).length <= max, "عدد سجلات يتجاوز الحد");
const ids = z.array(thumun).max(480).refine((a) => new Set(a).size === a.length, "مواد مكررة");
export const taskSchema = z.enum([
  "khatma_recite", "khatma_listen", "prep_weekly", "new_hifz", "review_near",
  "review_far", "maintain_recite", "free_review",
]);
const plannedTask = taskSchema.exclude(["free_review"]);
export const stampSchema = z.object({ clock: integer, device: id.max(80) }).strict();
export const settingsSchema = z.object({
  reminderTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  arabicNumerals: z.boolean(),
  hizbReciterId: z.string().refine((s) => HIZB_RECITERS.some((r) => r.id === s)),
  thumunReciterId: z.string().refine((s) => THUMUN_RECITERS.some((r) => r.id === s)),
  reciterId: z.string().max(80).optional(),
  reciteJuzPerDay: z.number().int().min(1).max(3),
  listenHizbPerDay: z.number().int().min(1).max(3),
  quietMode: z.boolean(), fontScale: z.number().min(1).max(1.3),
}).strict();
const logEntry = z.object({ date, days: ids, tasks: integer.max(10000), completedAll: z.boolean().optional() }).strict();
const dailyTasks = z.partialRecord(taskSchema, z.boolean());
const session = z.object({
  id, task: taskSchema, day: thumun, seconds: integer.max(43200), at: iso, date,
  thumunIds: ids, abandoned: z.boolean(), stamp: stampSchema,
}).strict();
export const correctionFieldsSchema = z.object({
  startSura: z.number().int().min(1).max(114).optional(),
  startAya: z.number().int().min(1).max(286).optional(),
  endSura: z.number().int().min(1).max(114).optional(),
  endAya: z.number().int().min(1).max(286).optional(),
  text: z.string().max(3000).optional(),
}).strict().superRefine((p, ctx) => {
  if (p.startSura && p.startAya && p.startAya > (getSurah(p.startSura)?.verses ?? 0))
    ctx.addIssue({ code: "custom", message: "آية البداية خارج السورة" });
  if (p.endSura && p.endAya && p.endAya > (getSurah(p.endSura)?.verses ?? 0))
    ctx.addIssue({ code: "custom", message: "آية النهاية خارج السورة" });
  if (p.startSura && p.endSura && (p.startSura > p.endSura ||
      (p.startSura === p.endSura && p.startAya && p.endAya && p.startAya > p.endAya)))
    ctx.addIssue({ code: "custom", message: "البداية تسبق النهاية في ترتيب المصحف" });
});
export const correctionDraftSchema = correctionFieldsSchema.safeExtend({ note: z.string().max(2000).optional(), source: z.string().max(1000).optional() });
const plan = z.object({
  id, date, sequence: integer.min(1), journeyDay: thumun, mode: z.enum(["journey", "maintenance"]),
  reciteJuzs: z.array(z.number().int().min(1).max(30)).min(1).max(3),
  listenHizbs: z.array(z.number().int().min(1).max(60)).max(3), prepIds: ids,
  newHifzId: thumun.nullable(), nearIds: ids, farIds: ids, farOffset: integer.max(479),
  taskKeys: z.array(plannedTask).min(1).max(7).refine((a) => new Set(a).size === a.length),
  reviewOnly: z.boolean(), stamp: stampSchema,
}).strict().superRefine((p, ctx) => {
  const required = p.mode === "maintenance" ? ["maintain_recite"] : ["khatma_recite", "khatma_listen"];
  if (p.prepIds.length) required.push("prep_weekly");
  if (p.newHifzId !== null) required.push("new_hifz");
  if (p.nearIds.length) required.push("review_near");
  if (p.farIds.length) required.push("review_far");
  if (required.length !== p.taskKeys.length || required.some((k) => !p.taskKeys.includes(k as z.infer<typeof plannedTask>)))
    ctx.addIssue({ code: "custom", message: "المهام لا تطابق مواد الخطة" });
  if (p.mode === "maintenance" && (p.newHifzId !== null || p.prepIds.length || p.listenHizbs.length))
    ctx.addIssue({ code: "custom", message: "خطة تثبيت غير متسقة" });
  if (p.mode === "journey" && !p.listenHizbs.length)
    ctx.addIssue({ code: "custom", message: "ورد الاستماع مفقود" });
});
export const progressSchema = z.object({
  schemaVersion: z.literal(PROGRESS_VERSION), ownerId: z.uuid().nullable(), epoch: integer,
  currentDay: thumun, startDate: iso, calendarStartDate: date,
  memorization: record(thumunKey, z.object({
    memorized: z.boolean(), source: z.enum(["prior", "learned", "legacy"]), at: iso, stamp: stampSchema,
  }).strict(), 480),
  dailyPlans: record(date, plan),
  completions: record(id, z.object({
    id, planId: id.nullable(), task: plannedTask, day: thumun, date: date.nullable(), done: z.boolean(), materialIds: ids,
    legacy: z.boolean(), stamp: stampSchema,
  }).strict()),
  sessions: record(id, session),
  reviewAttempts: record(id, z.object({
    id, thumunId: thumun, rating: z.enum(["weak", "good", "strong"]), at: iso,
    date, sessionId: id, stamp: stampSchema,
  }).strict()),
  versions: record(id.refine((key) => {
    if (["currentDay", "calendarStartDate", "maintain", "showOnboarding", "celebrationSeenAt", "khatmaCompletedAt", "startDate"].includes(key)) return true;
    const parts = key.split(":");
    if (parts[0] === "activity") return date.safeParse(parts[1]).success && parts.length === 2;
    if (["note", "rating", "draft"].includes(parts[0])) return thumunKey.safeParse(parts[1]).success && parts.length === 2;
    if (parts[0] === "setting") return Object.keys(settingsSchema.shape).includes(parts[1]) && parts.length === 2;
    return false;
  }, "معرف إصدار غير معروف"), stampSchema), legacyDailyLog: record(date, logEntry), legacyXp: integer,
  notes: record(thumunKey, z.string().max(10000), 480),
  thumunRatings: record(thumunKey, z.enum(["weak", "good", "strong"]), 480),
  // Old personal edits are archival drafts. Their original JSON is also in the rollback backup.
  editedThumuns: record(thumunKey, z.object({
    startSura: z.number().int().min(1).max(114).optional(), startAya: z.number().int().min(1).max(286).optional(),
    endSura: z.number().int().min(1).max(114).optional(), endAya: z.number().int().min(1).max(286).optional(),
    text: z.string().max(3000).optional(), note: z.string().max(2000).optional(), source: z.string().max(1000).optional(),
  }).strict(), 480),
  settings: settingsSchema,
  maintain: z.object({ active: z.boolean(), day: integer.min(1), startedOn: date.nullable(), cycleOffset: integer }).strict(),
  khatmaCompletedAt: iso.nullable(), celebrationSeenAt: iso.nullable(), showOnboarding: z.boolean(),
  completedTasks: record(thumunKey, dailyTasks, 480), dailyLog: record(date, logEntry),
  sessionLog: record(date, z.array(session).max(10000)), totalXp: integer, streak: integer,
  bestStreak: integer, lastActiveDate: date.or(z.literal("")),
}).strict().superRefine((p, ctx) => {
  for (const [k, v] of Object.entries(p.dailyPlans)) if (k !== v.date)
    ctx.addIssue({ code: "custom", message: "معرف خطة غير متسق" });
  for (const name of ["completions", "sessions", "reviewAttempts"] as const)
    for (const [k, v] of Object.entries(p[name])) if (k !== v.id)
      ctx.addIssue({ code: "custom", message: "معرف سجل غير متسق" });
  for (const c of Object.values(p.completions)) {
    if (!c.legacy && (c.date === null || !p.dailyPlans[c.date]))
      ctx.addIssue({ code: "custom", message: "إنجاز بلا خطة مؤرخة" });
    if (!c.legacy && (!c.planId || c.id !== `daily:${c.date}:${c.task}:${c.planId}`))
      ctx.addIssue({ code: "custom", message: "معرف الإنجاز ليس فريدًا للمهمة واليوم" });
    if (c.legacy && (c.planId !== null || c.date !== null || c.id !== `legacy:${c.day}:${c.task}`))
      ctx.addIssue({ code: "custom", message: "سجل قديم غير متسق" });
  }
});

function hasUnsafeKeys(value: unknown, depth = 0): boolean {
  if (depth > 20) return true;
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) =>
    ["__proto__", "constructor", "prototype"].includes(key) || hasUnsafeKeys(child, depth + 1));
}
export function parseProgress(value: unknown): ProgressData {
  ensureSafeJson(value);
  if (new Blob([JSON.stringify(value)]).size > MAX_BACKUP_BYTES) throw new Error("بيانات تتجاوز 8 MiB — لم تُستورد");
  const result = progressSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`بيانات غير صالحة (${issue?.path.join(".") || "الحالة"}): ${issue?.message || "خطأ في البنية"}`);
  }
  return result.data as ProgressData;
}

export function ensureSafeJson(value: unknown): void { if (hasUnsafeKeys(value)) throw new Error("حقول غير آمنة في البيانات"); }
