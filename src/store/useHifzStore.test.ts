import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHifzStore, isDayCompleted } from "./useHifzStore";
import { useSessionStore } from "./useSessionStore";
import { useAppStatusStore } from "./useAppStatusStore";
import { emptyProgress, progressMetrics } from "@/lib/progress/derive";
import { completionId, tasksForPlan } from "@/lib/progress/plan";
import { storageKey, recoveryCopies } from "@/lib/progress/storage";
import { snapshotOf } from "@/lib/progress/types";
import { getThumun } from "@/lib/quran-data";
import { localDateKey } from "@/lib/format";
import { testStorage } from "@/test/setup";
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
function onboard(prior = 0) {
  useHifzStore.getState().completeOnboarding({ startAtDay: prior }); useHifzStore.getState().ensureTodayPlan();
  return useHifzStore.getState().dailyPlans[localDateKey()];
}
function completeToday() {
  const p = useHifzStore.getState().dailyPlans[localDateKey()];
  for (const task of p.taskKeys) useHifzStore.getState().completeTask(p.journeyDay, task);
  return useHifzStore.getState();
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-02T12:00:00Z"));
  useAppStatusStore.getState().setStatus({ storageError: null, syncPhase: "local", syncError: null, ownerId: null, migrationNotice: null });
  useHifzStore.persist.setOptions({ name: storageKey(null) }); useHifzStore.setState(emptyProgress()); useSessionStore.getState().close();
});
afterEach(() => vi.useRealTimers());

describe("الإتمام والمحفوظ والنقاط: رصيد مشتق لا عدّادات متراكمة", () => {
  it("أول يوم 4/4: 85 نقاط المهام + 25 مكافأة، ويوم مؤرخ مكتمل", () => {
    const plan = onboard(); expect(plan.taskKeys).toHaveLength(4);
    const data = completeToday(); expect(isDayCompleted(tasksForPlan(data, plan), plan.taskKeys)).toBe(true);
    expect(data.totalXp).toBe(110); expect(progressMetrics(data).perfectDays).toBe(1); expect(progressMetrics(data).count).toBe(1);
  });
  it.each([[1, 5, 130], [8, 5, 130], [9, 6, 150], [478, 6, 150], [479, 5, 140]])("بعد %i ثمن سابق: %i مهام ونقاط %i", (prior, keys, xp) => {
    const plan = onboard(prior); expect(plan.taskKeys).toHaveLength(keys);
    const data = completeToday(); expect(data.totalXp).toBe(xp); expect(progressMetrics(data).perfectDays).toBe(1);
  });
  it("إعادة علامة الحفظ لا تستزرع نقاطًا أو سجل مهام أو نشاطًا مضاعفًا", () => {
    const p = onboard(); const task = "new_hifz";
    useHifzStore.getState().toggleTask(1, task); expect(useHifzStore.getState().totalXp).toBe(50);
    expect(useHifzStore.getState().streak).toBe(1); expect(useHifzStore.getState().bestStreak).toBe(1);
    useHifzStore.getState().toggleTask(1, task); expect(useHifzStore.getState().totalXp).toBe(0);
    useHifzStore.getState().toggleTask(1, task); const data = useHifzStore.getState();
    expect(data.totalXp).toBe(50); expect(data.dailyLog[localDateKey()].tasks).toBe(1);
    expect(Object.keys(data.completions)).toEqual([completionId(p.date, task, p.id)]); expect(data.streak).toBe(1);
  });
  it("الاستماع في المحطة 16 لا يصنع حفظ جزء أو حزب", () => {
    useHifzStore.setState({ currentDay: 16, showOnboarding: false }); useHifzStore.getState().ensureTodayPlan();
    useHifzStore.getState().completeTask(16, "khatma_listen");
    expect(progressMetrics(useHifzStore.getState())).toMatchObject({ count: 0, juzs: [], hizbs: [] });
  });
  it("محفوظ سابق، حتى غير المتصل: لا حصون تاريخية ولا XP أو نشاط", () => {
    useHifzStore.getState().completeOnboarding({ memorizedIds: [1, 3, 477] }); const data = useHifzStore.getState();
    expect(progressMetrics(data).ids).toEqual([1, 3, 477]); expect(data.currentDay).toBe(2);
    expect(data.completedTasks).toEqual({}); expect(data.totalXp).toBe(0); expect(data.streak).toBe(0);
    expect(data.dailyLog).toEqual({});
  });
  it("تكرار تصريح النطاق لا يكرر النقاط", () => {
    useHifzStore.getState().markRangeComplete(40); useHifzStore.getState().markRangeComplete(40);
    expect(useHifzStore.getState().totalXp).toBe(0); expect(progressMetrics(useHifzStore.getState()).count).toBe(40);
  });
  it("الانتقال مشروط بإتقان المحطة، لا بإتمام القراءة أو الضغط فقط", () => {
    onboard(); useHifzStore.getState().advanceDay(); expect(useHifzStore.getState().currentDay).toBe(1);
    useHifzStore.getState().completeTask(1, "new_hifz"); useHifzStore.getState().advanceDay(); expect(useHifzStore.getState().currentDay).toBe(2);
  });
  it("وجود فجوة يمنع الختمة رغم اكتمال مهام المحطة 480", () => {
    useHifzStore.getState().completeOnboarding({ memorizedIds: Array.from({ length: 479 }, (_, i) => i + 1).filter((id) => id !== 3) });
    useHifzStore.setState({ currentDay: 480 }); useHifzStore.getState().ensureTodayPlan(); const data = completeToday();
    expect(data.khatmaCompletedAt).toBeNull(); expect(progressMetrics(data).count).toBe(479); expect(progressMetrics(data).perfectDays).toBe(1);
  });
  it("ختمة كل 480: حدث واحد وتذكّر الاحتفال، وليس شهادة إتقان", () => {
    onboard(479); completeToday(); const event = useHifzStore.getState().khatmaCompletedAt; expect(event).toBeTruthy();
    useHifzStore.getState().dismissCelebration(); useHifzStore.getState().toggleTask(480, "new_hifz"); useHifzStore.getState().toggleTask(480, "new_hifz");
    expect(useHifzStore.getState().khatmaCompletedAt).toBe(event); expect(useHifzStore.getState().celebrationSeenAt).toBe(event);
  });
});

describe("خطط مستقلة مؤرخة وثابتة", () => {
  it("اليوم التالي يتجدد حتى مع بقاء محطة الحفظ في 1", () => {
    const first = onboard(); useHifzStore.getState().completeTask(1, "khatma_recite");
    vi.setSystemTime(new Date("2026-10-03T12:00:00Z")); useHifzStore.getState().ensureTodayPlan();
    const data = useHifzStore.getState(), next = data.dailyPlans[localDateKey()];
    expect(data.currentDay).toBe(1); expect(next.reciteJuzs).toEqual([2]); expect(next.listenHizbs).toEqual([2]);
    expect(tasksForPlan(data, next).khatma_recite).toBe(false); expect(data.dailyPlans[first.date]).toEqual(first);
  });
  it("تغيير الوتيرة يبدأ غدًا دون قفز مادة أو تغيير الماضي", () => {
    const first = onboard(); useHifzStore.getState().updateSettings({ reciteJuzPerDay: 2, listenHizbPerDay: 2 });
    expect(useHifzStore.getState().dailyPlans[first.date]).toEqual(first);
    vi.setSystemTime(new Date("2026-10-03T12:00:00Z")); useHifzStore.getState().ensureTodayPlan();
    const next = useHifzStore.getState().dailyPlans[localDateKey()]; expect(next.reciteJuzs).toEqual([2, 3]); expect(next.listenHizbs).toEqual([2, 3]);
  });
  it("اليوم للمراجعة يؤجل الجديد فقط ولا يسجل تقدمًا وهميًا", () => {
    onboard(); expect(useHifzStore.getState().setReviewOnlyToday(true)).toBe(true);
    const p = useHifzStore.getState().dailyPlans[localDateKey()]; expect(p.newHifzId).toBeNull(); expect(p.taskKeys).not.toContain("new_hifz");
    const data = completeToday(); expect(progressMetrics(data).count).toBe(0); expect(data.currentDay).toBe(1); expect(data.totalXp).toBe(60);
  });
  it("التثبيت دورة مستقلة: اليوم 1 ثم 2 دون لمس إتقان 480", () => {
    useHifzStore.getState().completeOnboarding({ startAtDay: 480 }); useHifzStore.getState().startMaintainMode(); useHifzStore.getState().ensureTodayPlan();
    const first = useHifzStore.getState().dailyPlans[localDateKey()]; expect(first.mode).toBe("maintenance"); expect(first.taskKeys).toEqual(["maintain_recite"]); expect(first.reciteJuzs).toEqual([1]);
    completeToday(); vi.setSystemTime(new Date("2026-10-03T12:00:00Z")); useHifzStore.getState().ensureTodayPlan(); const data = useHifzStore.getState();
    expect(data.maintain.day).toBe(2); expect(data.dailyPlans[localDateKey()].reciteJuzs).toEqual([2]); expect(tasksForPlan(data, data.dailyPlans[localDateKey()]).maintain_recite).toBe(false);
    expect(data.dailyPlans[first.date]).toEqual(first); expect(progressMetrics(data).count).toBe(480); expect(data.currentDay).toBe(480);
  });
});

describe("حواجز المعاينة والتقييم الفردي", () => {
  it("الإنجاز المستقبلي والمهمة غير المطلوبة لا يغيران الحالة", () => {
    onboard(); const before = snapshotOf(useHifzStore.getState());
    expect(useHifzStore.getState().toggleTask(7, "new_hifz")).toBe(false); expect(useHifzStore.getState().completeTask(1, "review_far")).toBe(false);
    expect(snapshotOf(useHifzStore.getState())).toEqual(before);
  });
  it("تثبيت ضعيف واحد في المحطة 25 لا يكمل مراجعة البعيد ذات 16", () => {
    onboard(24); useSessionStore.getState().open({ kind: "free_review", day: 25, thumuns: [getThumun(1)!] }); const p = useSessionStore.getState().payload!;
    expect(useHifzStore.getState().recordReviewAttempt(1, "weak", p.id)).toBe(true); useHifzStore.getState().finishSession(p, 90);
    const data = useHifzStore.getState(); expect(data.thumunRatings[1]).toBe("weak"); expect(Object.keys(data.thumunRatings)).toEqual(["1"]);
    expect(tasksForPlan(data, data.dailyPlans[localDateKey()]).review_far).toBe(false); expect(data.totalXp).toBe(0); expect(Object.keys(data.sessions)).toHaveLength(1);
  });
  it("لا تكمل جلسة بعيد إن كانت المادة جزءًا من الخطة فقط", () => {
    onboard(24); useSessionStore.getState().open({ kind: "review_far", day: 25, thumuns: [getThumun(1)!] }); const p = useSessionStore.getState().payload!;
    useHifzStore.getState().recordReviewAttempt(1, "good", p.id); expect(useHifzStore.getState().finishSession(p, 60)).toBe(false);
    expect(useHifzStore.getState().totalXp).toBe(0);
  });
  it("كل مادة مراجعة فردية تُقيّم قبل اعتماد المهمة الكاملة", () => {
    const plan = onboard(24); const list = plan.farIds.map((id) => getThumun(id)!);
    useSessionStore.getState().open({ kind: "review_far", day: 25, thumuns: list }); const p = useSessionStore.getState().payload!;
    expect(useHifzStore.getState().finishSession(p, 60)).toBe(false);
    for (const t of list) useHifzStore.getState().recordReviewAttempt(t.id, t.id === 1 ? "weak" : "good", p.id);
    expect(useHifzStore.getState().finishSession(p, 60)).toBe(true); expect(useHifzStore.getState().totalXp).toBe(20);
    useHifzStore.getState().finishSession(p, 60); expect(useHifzStore.getState().totalXp).toBe(20); expect(Object.keys(useHifzStore.getState().sessions)).toHaveLength(1);
  });
  it("المعاينة المستقبلية تحفظ الوقت فقط، دون إتقان أو XP", () => {
    onboard(); useSessionStore.getState().open({ kind: "new_hifz", day: 7, thumuns: [getThumun(7)!] }); const p = useSessionStore.getState().payload!;
    expect(p.preview).toBe(true); expect(useHifzStore.getState().finishSession(p, 60)).toBe(false);
    expect(useHifzStore.getState().memorization[7]).toBeUndefined(); expect(useHifzStore.getState().totalXp).toBe(0);
  });
  it("سجل جلسة مغادرة مؤقت يمكن إنهاؤه دون مضاعفة الهوية أو الوقت", () => {
    onboard(); const store = useHifzStore.getState(); store.logSession("free_review", 1, 30, { id: "session-1", abandoned: true }); store.logSession("free_review", 1, 90, { id: "session-1" }); store.logSession("free_review", 1, 90, { id: "session-1" });
    const sessions = Object.values(useHifzStore.getState().sessions); expect(sessions).toHaveLength(1); expect(sessions[0]).toMatchObject({ seconds: 90, abandoned: false });
  });
});

describe("الملكية والتخزين والأفعال لا تستورد من JSON", () => {
  it("حساب جديد قبل أول قراءة سحابية لا ينشئ خطة افتراضية فوق خطته الحقيقية", () => {
    useHifzStore.getState().switchOwner(A); useHifzStore.getState().ensureTodayPlan();
    expect(useHifzStore.getState().dailyPlans).toEqual({}); expect(useHifzStore.getState().toggleTask(1, "new_hifz")).toBe(false);
    useHifzStore.getState().setNote(1, "unverified"); expect(useHifzStore.getState().notes).toEqual({});
  });

  it("ضيف ثم A ثم B ثم ضيف: بيانات مستقلة وترجع البيانات الأصلية", () => {
    onboard(); useHifzStore.getState().setNote(1, "G"); useHifzStore.getState().switchOwner(A); useAppStatusStore.getState().setStatus({ cloudReadReady: true }); useHifzStore.getState().setNote(1, "A");
    useHifzStore.getState().switchOwner(B); useAppStatusStore.getState().setStatus({ cloudReadReady: true }); expect(useHifzStore.getState().notes).toEqual({}); useHifzStore.getState().setNote(1, "B");
    useHifzStore.getState().switchOwner(A); expect(useHifzStore.getState().notes[1]).toBe("A");
    useHifzStore.getState().switchOwner(null); expect(useHifzStore.getState().notes[1]).toBe("G");
    expect(testStorage.getItem(storageKey(B))).toContain('"B"');
  });
  it("الاستعادة من مالك مختلف مرفوضة ولا تستبدل الأفعال", () => {
    onboard(); const action = useHifzStore.getState().resetProgress;
    expect(() => useHifzStore.getState().hydrateFromCloud(emptyProgress(A))).toThrow();
    expect(useHifzStore.getState().resetProgress).toBe(action);
  });
  it("إعادة ضبط حساب تحتاج الخادم وتفشل دون تغيير محلي", () => {
    useHifzStore.getState().switchOwner(A); useAppStatusStore.getState().setStatus({ cloudReadReady: true }); useHifzStore.getState().setNote(1, "keep");
    expect(() => useHifzStore.getState().resetProgress()).toThrow(); expect(useHifzStore.getState().notes[1]).toBe("keep");
  });
  it("إعادة ضبط الضيف ترفع epoch وتحفظ نسخة رجوع بكل المسودات", () => {
    onboard(); useHifzStore.getState().setNote(1, "note"); useHifzStore.getState().editThumun(1, { text: "proposal", note: "سبب تصحيح واضح", source: "نسخة موثقة" });
    useHifzStore.getState().resetProgress(); const data = useHifzStore.getState(); expect(data.epoch).toBe(1); expect(data.notes).toEqual({});
    expect(recoveryCopies(null).some((r) => r.raw.includes("proposal"))).toBe(true);
  });
  it("تعذر التخزين لا يظهر باسم حساب آخر ويحافظ على العمل غير المحفوظ منفصلًا", () => {
    onboard(); useHifzStore.getState().switchOwner(A); useAppStatusStore.getState().setStatus({ cloudReadReady: true }); testStorage.failWrite = true; useHifzStore.getState().setNote(1, "UNSAVED_A");
    expect(useAppStatusStore.getState().storageError).toBeTruthy(); useHifzStore.getState().switchOwner(B); useAppStatusStore.getState().setStatus({ cloudReadReady: true }); expect(useHifzStore.getState().notes[1]).toBeUndefined();
    testStorage.failWrite = false; useHifzStore.getState().switchOwner(A); expect(useHifzStore.getState().notes[1]).toBe("UNSAVED_A");
  });
});
