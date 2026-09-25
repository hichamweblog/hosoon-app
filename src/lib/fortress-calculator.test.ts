import { describe, expect, it } from "vitest";
import {
  NEAR_REVIEW_ORDER,
  POINTER_TABLE,
  farReviewRate,
  getFarReviewStart,
  getFortressTasks,
  hizbThumunRange,
  juzThumunRange,
} from "@/lib/fortress-calculator";
import { XP_TABLE, type TaskType } from "@/lib/constants";
import { getThumun, TOTAL_THUMUNS } from "@/lib/quran-data";

describe("بنية الأثمان (المصاحف المغاربية)", () => {
  it("480 ثمناً متصلة بلا ثغرات", () => {
    for (let id = 1; id <= TOTAL_THUMUNS; id++) {
      const t = getThumun(id)!;
      expect(t.id).toBe(id);
      const next = getThumun(id + 1);
      if (next) {
        if (t.partialEnd) {
          expect(next.startSura).toBe(t.endSura);
          expect(next.startAya).toBe(t.endAya);
        } else {
          const sameSurah = next.startSura === t.endSura;
          expect(sameSurah ? next.startAya : 1).toBe(sameSurah ? t.endAya + 1 : 1);
        }
      }
    }
  });

  it("نطاقات الأحزاب والأجزاء صحيحة", () => {
    expect(hizbThumunRange(1)).toEqual([1, 8]);
    expect(hizbThumunRange(60)).toEqual([473, 480]);
    expect(juzThumunRange(1)).toEqual([1, 16]);
    expect(juzThumunRange(30)).toEqual([465, 480]);
  });
});

describe("مُحوِّل الحصون الخمسة", () => {
  it("جدول المؤشرات: POINTER[10]=1 والقفزات حسب المدة", () => {
    expect(POINTER_TABLE[10]).toBe(1);
    expect(farReviewRate(240)).toBe(16);
    expect(farReviewRate(241)).toBe(24);
    expect(farReviewStartSanity()).toBe(true);
  });

  function farReviewStartSanity(): boolean {
    // كل قيمة ضمن المخزون المتاح أو معاد ضبطها إلى 1
    for (let d = 10; d <= TOTAL_THUMUNS; d++) {
      const p = POINTER_TABLE[d];
      if (p !== 1 && p > d - 9) return false;
    }
    return true;
  }

  it("المراجعة القريبة — اليوم 25 = أسبوع 17..24 بالنظام الحفيف 8،2،4،6،1،3،5،7", () => {
    expect(NEAR_REVIEW_ORDER).toEqual([8, 2, 4, 6, 1, 3, 5, 7]);
    const t = getFortressTasks(25);
    expect(t.reviewNear.map((x) => x.id)).toEqual([24, 18, 20, 22, 17, 19, 21, 23]);
  });

  it("التحضير = الأثمان الثمانية القادمة", () => {
    const t = getFortressTasks(25);
    expect(t.prepWeekly.map((x) => x.id)).toEqual([26, 27, 28, 29, 30, 31, 32, 33]);
  });

  it("الختمة: تلاوة جزء + سماع حزب يتدوران 1..30 و1..60", () => {
    const t = getFortressTasks(25);
    expect(t.reciteJuz).toBe(25);
    expect(t.listenHizb).toBe(25);
    const t2 = getFortressTasks(31);
    expect(t2.reciteJuz).toBe(1); // بعد 30 يوماً يعود الجزء الأول
    expect(t2.listenHizb).toBe(31);
  });

  it("الوتيرة: جزءان/يوم ← ختمة 15 يوماً بلا تداخل", () => {
    const t = getFortressTasks(25, { reciteJuzPerDay: 2, listenHizbPerDay: 2 });
    expect(t.reciteJuzs).toEqual([19, 20]); // اليوم 25 من ختمة 15 يوماً
    expect(t.listenHizbs).toEqual([49, 50]); // اليوم 25 من ختمة استماع 30 يوماً
    const edge = getFortressTasks(15, { reciteJuzPerDay: 2 });
    expect(edge.reciteJuzs).toEqual([29, 30]); // نهاية الدورة
    const wrap = getFortressTasks(11, { reciteJuzPerDay: 3 });
    expect(wrap.reciteJuzs).toEqual([1, 2, 3]); // بداية دورة الثلاثين
  });

  it("المراجعة البعيدة: نافذة دوّارة بمدد 16←24←32", () => {
    expect(getFarReviewStart(1)).toBe(1);
    const t25 = getFortressTasks(25)!;
    expect(t25.reviewFar!.list.map((x) => x.id)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    ); // 1..16 (المخزون كله حتى اليوم 25)
    // بعد تقدّم المؤشر: اليوم 26 يبدأ من 17
    expect(getFarReviewStart(26)).toBe(17);
  });

  it("الأثمان الضعيفة تظهر في جلسة التثبيت", () => {
    const t = getFortressTasks(25, { weakIds: [5, 6] });
    expect(t.weakList.map((x) => x.id)).toEqual([5, 6]);
  });

  it("وضع التثبيت: جزء يومياً بالتناوب + المراجعة عند وجود الضعيف", () => {
    const t = getFortressTasks(31, { maintain: true });
    expect(t.reciteJuz).toBe(1);
    expect(t.taskKeys).toEqual(["maintain_recite"]);
    const t2 = getFortressTasks(31, { maintain: true, weakIds: [1] });
    expect(t2.taskKeys).toContain("review_near");
  });

  it("كل مهمة في taskKeys لها قيمة XP", () => {
    const t = getFortressTasks(25);
    for (const key of t.taskKeys) {
      expect(XP_TABLE[key as TaskType]).toBeGreaterThan(0);
    }
  });
});
