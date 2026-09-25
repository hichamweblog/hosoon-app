import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { XP_TABLE } from "@/lib/constants";

// بيئة محلية وهمية قبل استيراد المتجر (zustand persist يتطلب localStorage)
const mem = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
});

let useHifzStore: typeof import("@/store/useHifzStore").useHifzStore;
let isDayCompleted: typeof import("@/store/useHifzStore").isDayCompleted;

beforeAll(async () => {
  const mod = await import("@/store/useHifzStore");
  useHifzStore = mod.useHifzStore;
  isDayCompleted = mod.isDayCompleted;
});

const SIX = [
  "khatma_recite",
  "khatma_listen",
  "prep_weekly",
  "new_hifz",
  "review_near",
  "review_far",
] as const;

function fillDay(day: number) {
  for (const k of SIX) useHifzStore.getState().toggleTask(day, k);
}

describe("انتقالات XP في المتجر (§4.2)", () => {
  beforeEach(() => {
    useHifzStore.getState().resetProgress();
  });

  it("إتمام مهمة يضيف XP المهمة مرة واحدة فقط (لا استزراع)", () => {
    useHifzStore.getState().toggleTask(1, "new_hifz");
    expect(useHifzStore.getState().totalXp).toBe(XP_TABLE.new_hifz);
    useHifzStore.getState().toggleTask(1, "new_hifz"); // إلغاء
    expect(useHifzStore.getState().totalXp).toBe(0);
    useHifzStore.getState().toggleTask(1, "new_hifz"); // إعادة
    expect(useHifzStore.getState().totalXp).toBe(XP_TABLE.new_hifz);
  });

  it("إكمال اليوم كاملاً يمنح بونص 25 مرة واحدة", () => {
    const sum = SIX.reduce((a, k) => a + XP_TABLE[k], 0);
    fillDay(1);
    expect(useHifzStore.getState().totalXp).toBe(sum + XP_TABLE.day_bonus);
    // فك مهمة واحدة يخصم بونص اليوم + XP المهمة
    useHifzStore.getState().toggleTask(1, "new_hifz");
    expect(useHifzStore.getState().totalXp).toBe(sum + XP_TABLE.day_bonus - XP_TABLE.new_hifz - XP_TABLE.day_bonus);
  });

  it("مُوحَّد: isDayCompleted تتطلب كل المهام لا أي مهمة", () => {
    expect(isDayCompleted({ new_hifz: true })).toBe(false);
    expect(isDayCompleted(undefined)).toBe(false);
    fillDay(1);
    const tasks = useHifzStore.getState().completedTasks[1];
    expect(isDayCompleted(tasks)).toBe(true);
  });

  it("toggleDayCompletion لا يُفسد المهام الجزئية (§4.1)", () => {
    useHifzStore.getState().toggleTask(3, "new_hifz");
    useHifzStore.getState().toggleTask(3, "new_hifz"); // فك الكل → سجل فارغ
    useHifzStore.getState().toggleDayCompletion(3); // تحديد كمكتمل ← لا حذف!
    expect(isDayCompleted(useHifzStore.getState().completedTasks[3])).toBe(true);
  });

  it("الانتقال لليوم التالي", () => {
    useHifzStore.getState().advanceDay();
    expect(useHifzStore.getState().currentDay).toBe(2);
  });

  it("قاعدة الختمة الصارمة: يوم 480 + كل المهام", () => {
    useHifzStore.setState({ currentDay: 480 });
    for (const k of SIX.slice(0, 5)) useHifzStore.getState().toggleTask(480, k);
    expect(useHifzStore.getState().khatmaCompletedAt).toBeNull();
    useHifzStore.getState().toggleTask(480, "review_far");
    expect(useHifzStore.getState().khatmaCompletedAt).toBeTruthy();
  });

  it("markRangeComplete تسبق أيام الإتقان عند بدء من المنتصف", () => {
    useHifzStore.getState().markRangeComplete(40);
    expect(useHifzStore.getState().currentDay).toBe(41);
  });

  it("resetProgress يمسح XP والتصحيحات أيضاً (§4.2)", () => {
    useHifzStore.getState().toggleTask(1, "new_hifz");
    useHifzStore.getState().editThumun(1, { startAya: 3 });
    useHifzStore.getState().resetProgress();
    expect(useHifzStore.getState().totalXp).toBe(0);
    expect(useHifzStore.getState().editedThumuns).toEqual({});
  });
});
