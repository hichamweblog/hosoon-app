import { describe, expect, it } from "vitest";
import { deriveProgress, emptyProgress } from "./derive";
function activity(dates: string[], today: string) {
  const data = emptyProgress(null, new Date(`${today}T12:00:00Z`));
  data.versions = Object.fromEntries(dates.map((d, i) => [`activity:${d}`, { clock: i + 1, device: "test" }]));
  return deriveProgress(data, today);
}
describe("سلسلة من تاريخ النشاط لا عداد ضغطات", () => {
  it("أول نشاط يجعل السلسلة وأفضلها 1", () => { expect(activity(["2026-10-02"], "2026-10-02")).toMatchObject({ streak: 1, bestStreak: 1 }); });
  it("الأيام المتصلة تزيد مرة واحدة، وفتح يوم الراحة لا يصنع نشاطًا", () => {
    expect(activity(["2026-09-30", "2026-10-01"], "2026-10-02")).toMatchObject({ streak: 2, bestStreak: 2, lastActiveDate: "2026-10-01" });
  });
  it("فجوة يوم راحة واحدة بين الدراسة لا تقطع، ولا تحتسب الراحة", () => {
    expect(activity(["2026-09-29", "2026-09-30", "2026-10-02"], "2026-10-02")).toMatchObject({ streak: 3, bestStreak: 3 });
  });
  it("يومان دون نشاط يقطعان الحالية ولا يمحوان الأفضل", () => {
    expect(activity(["2026-09-29", "2026-09-30"], "2026-10-02")).toMatchObject({ streak: 0, bestStreak: 2 });
    expect(activity(["2026-09-29", "2026-09-30", "2026-10-03"], "2026-10-03")).toMatchObject({ streak: 1, bestStreak: 2 });
  });
  it("لا أحداث المستقبل ولا البيانات الخالية تزيد السلسلة", () => {
    expect(activity(["2026-10-03"], "2026-10-02")).toMatchObject({ streak: 0, bestStreak: 0 }); expect(activity([], "2026-10-02").streak).toBe(0);
  });
});
