import {
  PREP_WEEKLY_THUMUNS,
  REVIEW_NEAR_THUMUNS,
  TOTAL_HIZBS,
  TOTAL_JUZS,
  TOTAL_THUMUNS,
} from "./constants";
import quranData from "./quran-thumuns.json";

export interface Thumun {
  id: number;
  hizb: number;
  juz: number;
  surah: string;
  surahNumber: number;
  startAyah: number;
  endAyah: number;
  startText: string;
}

const thumuns = quranData as Thumun[];

export const getThumun = (id: number, editedThumuns?: Record<number, Partial<Thumun>>): Thumun | null => {
  if (id < 1 || id > TOTAL_THUMUNS) return null;
  const base = thumuns[id - 1];
  if (!base) return null;
  if (editedThumuns && editedThumuns[id]) {
    return { ...base, ...editedThumuns[id] };
  }
  return base;
};

export const getAllThumuns = (): Thumun[] => thumuns;

export function getFarReviewPointerForDay(targetDay: number): number {
  if (targetDay < 10) return 1;
  let pointer = 1;
  for (let d = 10; d < targetDay; d++) {
    const rate = d <= 240 ? 16 : d <= 360 ? 24 : 32;
    pointer += rate;
    const nextPoolSize = d + 1 - 9;
    if (pointer > nextPoolSize) {
      pointer = 1;
    }
  }
  return pointer;
}

export const getFortressTasks = (day: number, farReviewPointer: number = 1, editedThumuns?: Record<number, Partial<Thumun>>) => {
  // الحصن الثاني: التحضير — 8 أثمان قادمة (أسبوعي)
  const prepWeekly: Thumun[] = [];
  for (let i = 1; i <= PREP_WEEKLY_THUMUNS; i++) {
    const t = getThumun(day + i, editedThumuns);
    if (t) prepWeekly.push(t);
  }

  // الحصن الثالث: الحفظ الجديد — ثمن اليوم
  const newHifz = getThumun(day, editedThumuns);

  // الحصن الرابع: مراجعة القريب — آخر 8 أثمان (حزب واحد)
  const reviewNear: Thumun[] = [];
  for (let i = 1; i <= REVIEW_NEAR_THUMUNS; i++) {
    const t = getThumun(day - i, editedThumuns);
    if (t) reviewNear.push(t);
  }

  // الحصن الخامس: مراجعة البعيد — من الثمن 1 إلى ما قبل القريب
  let reviewFar = null;
  const poolSize = day - 9;
  if (poolSize > 0) {
    const actualPointer = getFarReviewPointerForDay(day);
    let rate = 16; // 2 hizbs (first half)
    if (day > 240 && day <= 360)
      rate = 24; // 3 hizbs (third quarter)
    else if (day > 360) rate = 32; // 4 hizbs (fourth quarter)

    const start = Math.min(actualPointer, poolSize);
    const end = Math.min(start + rate - 1, poolSize);

    const startThumun = getThumun(start, editedThumuns);
    const endThumun = getThumun(end, editedThumuns);
    if (startThumun && endThumun) {
      reviewFar = { start: startThumun, end: endThumun };
    }
  }

  // Count total tasks for this day dynamically
  const taskKeys: string[] = [];
  if (prepWeekly.length > 0) taskKeys.push("prep_weekly");
  if (newHifz) taskKeys.push("new_hifz");
  if (reviewNear.length > 0) taskKeys.push("review_near");
  if (reviewFar !== null) taskKeys.push("review_far");

  return {
    prepWeekly,
    newHifz,
    reviewNear,
    reviewFar,
    taskKeys,
  };
};

export type FortressTasks = ReturnType<typeof getFortressTasks>;
