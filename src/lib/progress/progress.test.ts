import { describe, expect, it } from "vitest";
import { emptyProgress, deriveProgress, progressMetrics, reviewDue } from "./derive";
import { mergeProgress } from "./merge";
import { makeDailyPlan, completionId, tasksForPlan, materialIds, planToFortress } from "./plan";
import { migrateProgress } from "./migrate";
import { parseProgress, correctionFieldsSchema } from "./schema";
import { canonicalStringify } from "./json";
import type { ProgressData } from "./types";
import { SPECIAL_ACHIEVEMENTS } from "@/lib/constants";
import { localDateKey, normalizeSearch } from "@/lib/format";
import { getThumun } from "@/lib/quran-data";
const now = new Date(), date = localDateKey(now), owner = "11111111-1111-4111-8111-111111111111";
const stamp = (clock: number, device = "a") => ({ clock, device });
function learned(id: number, device: string, clock = 10): ProgressData {
  const data = emptyProgress(owner, now); data.currentDay = id; data.showOnboarding = false;
  const plan = makeDailyPlan(data, date, stamp(clock, device)); data.dailyPlans[date] = plan;
  data.memorization[id] = { memorized: true, source: "learned", at: now.toISOString(), stamp: stamp(clock + 1, device) };
  const key = completionId(date, "new_hifz", plan.id);
  data.completions[key] = { id: key, planId: plan.id, task: "new_hifz", day: id, date, materialIds: [id], done: true, legacy: false, stamp: stamp(clock + 1, device) };
  data.versions.currentDay = stamp(clock, device);
  return deriveProgress(data);
}
describe("دمج سجل فريد قابل للتراجع ومتقارب", () => {
  it("ثمنان من جهازين 50 + 50 = 100، لا max(50,50)", () => {
    const a = learned(1, "a"), b = learned(2, "b"); const merged = mergeProgress(a, b);
    expect(merged.totalXp).toBe(100); expect(progressMetrics(merged).ids).toEqual([1, 2]); expect(Object.keys(merged.completions)).toHaveLength(2);
  });
  it("commutative / associative / idempotent حتى مع خطط متزامنة مختلفة", () => {
    const a = learned(1, "a", 10), b = learned(2, "b", 20), c = learned(3, "c", 30);
    expect(canonicalStringify(mergeProgress(a, b))).toBe(canonicalStringify(mergeProgress(b, a)));
    expect(canonicalStringify(mergeProgress(mergeProgress(a, b), c))).toBe(canonicalStringify(mergeProgress(a, mergeProgress(b, c))));
    const merged = mergeProgress(mergeProgress(a, b), c); expect(canonicalStringify(mergeProgress(merged, merged))).toBe(canonicalStringify(merged));
    expect(Object.keys(merged.completions)).toHaveLength(3); expect(merged.totalXp).toBe(150); parseProgress(merged);
  });
  it("تناقض علامة الإنجاز يفوز فيه التراجع الأحدث، وليس OR", () => {
    const a = learned(1, "a"), b = structuredClone(a), id = Object.keys(b.completions)[0];
    b.completions[id] = { ...b.completions[id], done: false, stamp: stamp(99, "b") };
    b.memorization[1] = { ...b.memorization[1], memorized: false, stamp: stamp(99, "b") };
    expect(mergeProgress(a, b).totalXp).toBe(0); expect(mergeProgress(b, a).memorization[1].memorized).toBe(false);
  });
  it("ملاحظة أحدث وفقد التقييم/المسودة لا يعودان من جهاز قديم", () => {
    const a = emptyProgress(owner, now), b = structuredClone(a);
    a.notes[1] = "old"; a.thumunRatings[1] = "weak"; a.editedThumuns[1] = { text: "old draft" };
    for (const field of ["note", "rating", "draft"]) a.versions[`${field}:1`] = stamp(10);
    b.notes[1] = "new"; b.versions["note:1"] = stamp(11, "b"); b.versions["rating:1"] = stamp(12, "b"); b.versions["draft:1"] = stamp(13, "b");
    const merged = mergeProgress(a, b); expect(merged.notes[1]).toBe("new"); expect(merged.thumunRatings[1]).toBeUndefined(); expect(merged.editedThumuns[1]).toBeUndefined();
    delete b.notes[1]; b.versions["note:1"] = stamp(14, "b"); expect(mergeProgress(a, b).notes[1]).toBeUndefined();
  });
  it("الحقبة الجديدة حاجز كامل يمنع بعث كل البيانات القديمة", () => {
    const old = learned(1, "a"); old.notes[1] = "deleted"; const reset = emptyProgress(owner, now); reset.epoch = 1;
    expect(mergeProgress(old, reset).memorization).toEqual({}); expect(mergeProgress(reset, old).notes).toEqual({}); expect(mergeProgress(old, reset).epoch).toBe(1);
  });
  it("المالك حاجز قبل أي اندماج، حتى عند اختلاف الحقبة", () => {
    const b = emptyProgress("22222222-2222-4222-8222-222222222222", now); b.epoch = 999;
    expect(() => mergeProgress(emptyProgress(owner, now), b)).toThrow(); expect(() => mergeProgress(emptyProgress(), b)).toThrow();
  });
  it("يستعيد الإعدادات والجلسات والتثبيت ويختار إصدار الحقل لا لقطة قديمة", () => {
    const a = emptyProgress(owner, now), b = structuredClone(a);
    b.settings.quietMode = true; b.settings.fontScale = 1.2; b.versions["setting:quietMode"] = stamp(30); b.versions["setting:fontScale"] = stamp(30);
    b.maintain = { active: true, day: 1, startedOn: date, cycleOffset: 0 }; b.versions.maintain = stamp(30);
    b.sessions.s1 = { id: "s1", task: "free_review", day: 1, seconds: 120, date, at: now.toISOString(), thumunIds: [1], abandoned: false, stamp: stamp(31) };
    const merged = mergeProgress(a, b); expect(merged.settings.quietMode).toBe(true); expect(merged.settings.fontScale).toBe(1.2); expect(merged.maintain.active).toBe(true); expect(merged.sessions.s1.seconds).toBe(120);
  });
  it("ترتيب مفاتيح JSONB المختلف ليس تغييرًا أو تناقضًا", () => {
    const a = learned(1, "a"); a.versions["setting:quietMode"] = stamp(1); a.versions["note:1"] = stamp(2);
    const b = { ...a, versions: Object.fromEntries(Object.entries(a.versions).reverse()) };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });
});
describe("ترحيل وحقائق دون اختلاق", () => {
  it("الجلسات القديمة معرفاتها مستقرة، المسودات باقية والنص المعتمد ثابت", () => {
    const old = { currentDay: 2, totalXp: 50, startDate: now.toISOString(), completedTasks: { 1: { new_hifz: true } }, notes: { 1: "note" }, editedThumuns: { 1: { text: "changed", startAya: 3 } }, sessionLog: { [date]: [{ day: 1, task: "new_hifz", seconds: 60, at: now.toISOString() }] } };
    const a = migrateProgress(old), b = migrateProgress(old);
    expect(Object.keys(a.sessions)).toEqual(Object.keys(b.sessions)); expect(mergeProgress(a, b).totalXp).toBe(50); expect(a.editedThumuns[1].text).toBe("changed");
    expect(getThumun(1, a.editedThumuns)?.text).not.toBe("changed"); expect(Object.isFrozen(getThumun(1))).toBe(true);
    expect(a.dailyPlans).toEqual({}); expect(progressMetrics(a).perfectDays).toBe(0);
  });
  it("التثبيت القديم يحتفظ برقم الدورة كإزاحة، لا يعاد إلى يوم 1", () => {
    const migrated = migrateProgress({ currentDay: 480, maintain: { active: true, day: 31 } }); expect(migrated.maintain.day).toBe(31);
    expect(makeDailyPlan(migrated, date, stamp(1)).reciteJuzs).toEqual([1]);
  });
  it("ثمانية أثمان متفرقة لا تساوي حزبًا مكتملًا، والزهراوان لا تعتمد على أكبر محطة", () => {
    const data = emptyProgress(); for (const id of [1, 3, 5, 7, 9, 11, 13, 105]) data.memorization[id] = { memorized: true, source: "prior", at: now.toISOString(), stamp: stamp(1) };
    expect(progressMetrics(data).hizbs).toEqual([]); expect(progressMetrics(data).zahrawayn).toBe(false);
    const badge = SPECIAL_ACHIEVEMENTS.find((i) => i.id === "baqarah_imran")!;
    expect(badge.check({ bestStreak: 0, perfectDays: 0, totalXp: 0, highestDay: 105, zahrawayn: false, sessionMinutes: 0 })).toBe(false);
    for (let id = 1; id <= 60; id++) data.memorization[id] = { memorized: true, source: "prior", at: now.toISOString(), stamp: stamp(2) };
    expect(progressMetrics(data).zahrawayn).toBe(true);
  });
  it("ترتيب المراجعة القريبة ومدى العرض منفصلان، والبعيد من المحفوظ فقط", () => {
    const data = emptyProgress(); data.currentDay = 25; for (let id = 1; id < 25; id++) data.memorization[id] = { memorized: true, source: "prior", at: now.toISOString(), stamp: stamp(1) };
    const p = makeDailyPlan(data, date, stamp(2)); expect(p.nearIds).toEqual([24, 18, 20, 22, 17, 19, 21, 23]); expect(p.farIds).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(planToFortress(p).reviewFar?.list).toHaveLength(16); expect(materialIds(p, "review_near")).toEqual(p.nearIds);
  });
  it("اقتراحات التثبيت قابلة للتفسير، وفي المحفوظ فقط", () => {
    const data = emptyProgress(); data.memorization[7] = { memorized: true, source: "prior", at: now.toISOString(), stamp: stamp(1) }; data.thumunRatings[7] = "weak"; data.thumunRatings[9] = "weak";
    expect(reviewDue(data).map((r) => r.id)).toEqual([7]); expect(reviewDue(data)[0].reason).toContain("تثبيت");
  });
  it("رفض كسور الأرقام وحدود السور الحقيقية والترتيب العكسي", () => {
    expect(correctionFieldsSchema.safeParse({ startSura: 1, startAya: 8 }).success).toBe(false);
    expect(correctionFieldsSchema.safeParse({ startSura: 3, startAya: 1, endSura: 2, endAya: 15 }).success).toBe(false);
    expect(correctionFieldsSchema.safeParse({ startSura: 2, startAya: 16, endSura: 2, endAya: 15 }).success).toBe(false);
    expect(correctionFieldsSchema.safeParse({ startAya: 1.5 }).success).toBe(false);
  });
  it("الأرقام العربية/الفارسية والتشكيل تعطي نتيجة البحث نفسها", () => {
    expect(normalizeSearch("٢")).toBe(normalizeSearch("2")); expect(normalizeSearch("۲")).toBe("2");
    expect(normalizeSearch("آلِ عِمْرَان")).toBe(normalizeSearch("ال عمران"));
  });
  it("الخطة الصحيحة تستعمل كل موادها، ولا تعني قراءة المجموعة حفظها", () => {
    const data = emptyProgress(), plan = makeDailyPlan(data, date, stamp(1)); data.dailyPlans[date] = plan;
    expect(tasksForPlan(data, plan)).toEqual({ khatma_recite: false, khatma_listen: false, prep_weekly: false, new_hifz: false });
    expect(materialIds(plan, "khatma_recite")).toHaveLength(16); expect(progressMetrics(data).count).toBe(0);
  });
});
