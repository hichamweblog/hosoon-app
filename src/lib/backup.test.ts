import { describe, expect, it } from "vitest";
import { validateBackup, BACKUP_VERSION } from "@/lib/backup";

function envelope(state: Record<string, unknown>, version = BACKUP_VERSION): unknown {
  return {
    app: "hosoon",
    version,
    exportedAt: new Date().toISOString(),
    state,
  };
}

describe("النسخ الاحتياطي", () => {
  it("يقبل نسخة بالصيغة الحالية ويعرض ملخصاً", () => {
    const res = validateBackup(
      envelope({
        currentDay: 12,
        startDate: new Date().toISOString(),
        completedTasks: { 1: { new_hifz: true } },
        totalXp: 340,
        streak: 4,
        bestStreak: 9,
        notes: {},
        thumunRatings: {},
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.file.version).toBe(BACKUP_VERSION);
      expect(res.summary.currentDay).toBe(12);
      expect(res.summary.totalXp).toBe(340);
    }
  });

  it("يقبل الحالة الخام (legacy) ويصحّح الرقم", () => {
    const res = validateBackup({ currentDay: 5, completedTasks: {}, dailyLog: {}, notes: {} });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.file.version).toBe(BACKUP_VERSION);
  });

  it("يرفض غير كائن والنسخة المستقبلية والملفات الأجنبية والقيم الشاذة", () => {
    expect(validateBackup("not json").ok).toBe(false);
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup(envelope({ currentDay: 1 }, 999)).ok).toBe(false);
    expect(validateBackup({ app: "other-app", version: 2, state: { currentDay: 1 } }).ok).toBe(false);
    expect(validateBackup({ foo: 1 }).ok).toBe(false);
    expect(validateBackup(envelope({ currentDay: 9999 })).ok).toBe(false); // خارج 1..480
  });
});
