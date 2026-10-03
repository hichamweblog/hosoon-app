import { describe, expect, it } from "vitest";
import { validateBackup, createBackup, BACKUP_VERSION } from "./backup";
import { emptyProgress } from "./progress/derive";
import { snapshotOf } from "./progress/types";
const legacy = { currentDay: 12, startDate: "2026-10-02T12:00:00Z", totalXp: 340, streak: 4, bestStreak: 9, completedTasks: { 1: { new_hifz: true } }, dailyLog: {}, notes: { 1: "ملاحظة قديمة" }, thumunRatings: { 1: "weak" }, editedThumuns: { 1: { startAya: 3 } } };
const envelope = (state: unknown, version: number = BACKUP_VERSION) => ({ app: "hosoon", version, exportedAt: "2026-10-02T12:00:00Z", state });
describe("نقل v4، ترحيل v0..3، وفصل البيانات عن الأفعال", () => {
  it("round-trip حالي مع المسودات وسببها ومصدرها والإعدادات", () => {
    const state = emptyProgress(); state.notes[1] = "خاص"; state.editedThumuns[1] = { text: "اقتراح", note: "سبب موثق", source: "مصحف" }; state.settings.quietMode = true;
    const result = validateBackup(JSON.parse(JSON.stringify(createBackup(state)))); expect(result.ok).toBe(true);
    if (result.ok) expect(snapshotOf(result.file.state)).toEqual(snapshotOf(state));
  });
  it.each([0, 1, 2, 3])("يحفظ رصيد وملاحظات ومسودات النسخة القديمة %i دون اختلاق تواريخ", (version) => {
    const result = validateBackup(envelope(legacy, version)); expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.version).toBe(4); expect(result.summary.totalXp).toBe(340); expect(result.summary.memorized).toBe(1);
      expect(result.summary.daysCompleted).toBe(0); expect(result.file.state.dailyPlans).toEqual({});
      expect(result.file.state.notes[1]).toBe("ملاحظة قديمة"); expect(result.file.state.editedThumuns[1].startAya).toBe(3);
    }
  });
  it("يقبل raw legacy وraw v4 واضحَي البنية", () => {
    expect(validateBackup({ currentDay: 5, completedTasks: {}, dailyLog: {}, notes: {} }).ok).toBe(true);
    expect(validateBackup(emptyProgress()).ok).toBe(true);
  });
  it.each([null, [], "text", { foo: 1 }, envelope({}, 999), { app: "other", version: 3, state: legacy }, envelope(legacy, -1)])("يرفض بنية/إصدارًا غير مدعوم: %j", (value) => { expect(validateBackup(value).ok).toBe(false); });
  it.each([
    { ...legacy, currentDay: 1.2 }, { ...legacy, currentDay: 0 }, { ...legacy, currentDay: 481 },
    { ...legacy, notes: [] }, { ...legacy, notes: { 0: "x" } }, { ...legacy, notes: { 481: "x" } },
    { ...legacy, completedTasks: { 1: { new_hifz: "true" } } }, { ...legacy, completedTasks: { 1: { unknown: true } } },
    { ...legacy, totalXp: -1 }, { ...legacy, streak: -1 }, { ...legacy, bestStreak: 0.5 },
    { ...legacy, settings: { reminderTime: "25:70" } }, { ...legacy, dailyLog: { "2026-02-31": { day: 1, tasks: 1 } } },
    { ...legacy, resetProgress: "override" }, { ...legacy, setNote: {} }, { ...legacy, ownerId: "invalid" },
  ])("التحقق العميق يرفض القيمة القديمة الفاسدة: %j", (value) => { expect(validateBackup(envelope(value, 3)).ok).toBe(false); });
  it.each(["resetProgress", "toggleTask", "hydrateFromCloud", "updateSettings"])("لا يقبل تغطية فعل Zustand: %s", (action) => {
    expect(validateBackup(envelope({ ...emptyProgress(), [action]: "replace" })).ok).toBe(false);
    expect(typeof createBackup(emptyProgress()).state).toBe("object");
  });
  it("رفض prototype pollution في v4 وفي النسخ القديمة", () => {
    const bad = JSON.parse('{"currentDay":1,"notes":{"__proto__":{"polluted":true}}}');
    expect(validateBackup(envelope(bad, 3)).ok).toBe(false);
    expect(validateBackup(envelope({ ...emptyProgress(), notes: bad.notes })).ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it("الحد قبل الاستيراد 8 MiB ولا يسمح بتحويل/حفظ الملف الكبير", () => {
    expect(validateBackup(envelope({ ...legacy, notes: { 1: "a".repeat(8 * 1024 * 1024) } }, 3)).ok).toBe(false);
  });
});
