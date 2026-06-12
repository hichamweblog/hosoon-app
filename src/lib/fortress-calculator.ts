import quranData from './quran-thumuns.json';
import {
  TOTAL_THUMUNS,
  TOTAL_JUZS,
  TOTAL_HIZBS,
  PREP_WEEKLY_THUMUNS,
  REVIEW_NEAR_THUMUNS,
} from './constants';

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

export const getThumun = (id: number): Thumun | null => {
  if (id < 1 || id > TOTAL_THUMUNS) return null;
  return thumuns[id - 1];
};

export const getAllThumuns = (): Thumun[] => thumuns;

export const getFortressTasks = (day: number, farReviewPointer: number = 1) => {
  // الحصن الأول: الختمة — جزء واحد تلاوة + حزب واحد استماع
  const recitationJuz = ((day - 1) % TOTAL_JUZS) + 1;
  const listeningHizb = ((day - 1) % TOTAL_HIZBS) + 1;

  // الحصن الثاني: التحضير — 8 أثمان قادمة (أسبوعي) + ثمن الغد (ليلي) + ثمن اليوم (قبلي)
  const prepWeekly: Thumun[] = [];
  for (let i = 1; i <= PREP_WEEKLY_THUMUNS; i++) {
    const t = getThumun(day + i);
    if (t) prepWeekly.push(t);
  }
  const prepNight = getThumun(day + 1);
  const prepPre = getThumun(day);

  // الحصن الثالث: الحفظ الجديد — ثمن اليوم
  const newHifz = getThumun(day);

  // الحصن الرابع: مراجعة القريب — آخر 8 أثمان (حزب واحد)
  const reviewNear: Thumun[] = [];
  for (let i = 1; i <= REVIEW_NEAR_THUMUNS; i++) {
    const t = getThumun(day - i);
    if (t) reviewNear.push(t);
  }

  // الحصن الخامس: مراجعة البعيد — من الثمن 1 إلى ما قبل القريب
  let reviewFar = null;
  const poolSize = day - 9;
  if (poolSize > 0) {
    let rate = 16; // 2 hizbs (first half)
    if (day > 240 && day <= 360) rate = 24; // 3 hizbs (third quarter)
    else if (day > 360) rate = 32; // 4 hizbs (fourth quarter)

    const start = Math.min(farReviewPointer, poolSize);
    const end = Math.min(start + rate - 1, poolSize);

    const startThumun = getThumun(start);
    const endThumun = getThumun(end);
    if (startThumun && endThumun) {
      reviewFar = { start: startThumun, end: endThumun };
    }
  }

  // Count total tasks for this day
  const taskKeys = ['khatma', 'prep_weekly', 'prep_night', 'prep_pre', 'new_hifz'];
  if (reviewNear.length > 0) taskKeys.push('review_near');
  if (reviewFar) taskKeys.push('review_far');

  return {
    khatma: { recitation: `الجزء ${recitationJuz}`, listening: `الحزب ${listeningHizb}` },
    prepWeekly,
    prepNight,
    prepPre,
    newHifz,
    reviewNear,
    reviewFar,
    taskKeys: taskKeys as any[], // Using any to avoid complex TS type for dynamic keys
  };
};

export type FortressTasks = ReturnType<typeof getFortressTasks>;
