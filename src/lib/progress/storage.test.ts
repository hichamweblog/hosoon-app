import { beforeEach, describe, expect, it } from "vitest";
import { useHifzStore } from "@/store/useHifzStore";
import { useAppStatusStore } from "@/store/useAppStatusStore";
import { emptyProgress } from "./derive";
import { progressStorage, storageKey, recoveryCopies, backupCurrent } from "./storage";
import { testStorage } from "@/test/setup";
import { snapshotOf } from "./types";
beforeEach(() => {
  useAppStatusStore.getState().setStatus({ storageError: null, migrationNotice: null });
  useHifzStore.persist.setOptions({ name: storageKey(null) }); useHifzStore.setState(emptyProgress());
});
describe("Zustand persist حقيقي مضبوط وتحقق حتى عند تطابق الإصدار", () => {
  it("يحمل hifz-storage v3 إلى مساحة الضيف مع أصل رجوع وبقاء الأفعال", async () => {
    testStorage.removeItem(storageKey(null)); const original = JSON.stringify({ version: 3, state: { currentDay: 2, completedTasks: { 1: { new_hifz: true } }, totalXp: 50, notes: { 1: "keep" }, editedThumuns: { 1: { text: "old draft" } } } }); testStorage.setItem("hifz-storage", original);
    const action = useHifzStore.getState().setNote; await useHifzStore.persist.rehydrate();
    expect(useHifzStore.getState().notes[1]).toBe("keep"); expect(useHifzStore.getState().memorization[1].memorized).toBe(true); expect(useHifzStore.getState().setNote).toBe(action);
    expect(recoveryCopies(null).some((r) => r.raw === original)).toBe(true); expect(testStorage.getItem("hifz-storage")).toBe(original);
  });
  it.each([4, 99])("نسخة فاسدة/غير مدعومة %i لا تُستبدل بالافتراضيات", async (version) => {
    const raw = JSON.stringify({ version, state: { ...emptyProgress(), currentDay: 1.5, resetProgress: "fake" } }); testStorage.setItem(storageKey(null), raw);
    await useHifzStore.persist.rehydrate(); expect(useAppStatusStore.getState().storageError).toBeTruthy(); useHifzStore.getState().setNote(1, "would overwrite");
    expect(testStorage.getItem(storageKey(null))).toBe(raw); expect(typeof useHifzStore.getState().resetProgress).toBe("function");
  });
  it("استرجاع صالح ينشئ نسخة من الأصل الفاسد لا من الافتراضيات المعروضة", async () => {
    const raw = '{"version":99,"state":{"secret":"original"}}'; testStorage.setItem(storageKey(null), raw); await useHifzStore.persist.rehydrate();
    const restored = emptyProgress(); restored.notes[1] = "restored"; useHifzStore.getState().restoreGuestBackup(restored);
    expect(useHifzStore.getState().notes[1]).toBe("restored"); expect(recoveryCopies(null).some((r) => r.raw === raw)).toBe(true);
  });
  it("فشل نسخة الرجوع يمنع إعادة الضبط ويحفظ الأصل", () => {
    useHifzStore.getState().setNote(1, "must keep"); const before = snapshotOf(useHifzStore.getState()); testStorage.failWrite = true;
    expect(() => useHifzStore.getState().resetProgress()).toThrow(); expect(snapshotOf(useHifzStore.getState())).toEqual(before);
  });
  it("قص النسخ يحافظ على آخر ثلاث فقط ومعزولة حسب مالكها", () => {
    const data = emptyProgress(); for (let i = 0; i < 5; i++) { data.notes[1] = String(i); backupCurrent(data, "test"); }
    expect(recoveryCopies(null)).toHaveLength(3); expect(recoveryCopies("11111111-1111-4111-8111-111111111111")).toHaveLength(0);
  });
  it("قراءة ممنوعة تظهر حالة خطأ وليس نجاح حفظ وهميًا", () => {
    testStorage.failRead = true; expect(progressStorage.getItem(storageKey(null))).toBeNull(); expect(useAppStatusStore.getState().storageError).toBeTruthy();
  });
});
