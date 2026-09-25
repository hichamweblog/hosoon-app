import {
  LISTENING_HIZBS_PER_DAY,
  PREP_WEEKLY_THUMUNS,
  RECITATION_JUZS_PER_DAY,
  type TaskType,
} from "./constants";
import {
  getThumun,
  THUMUNS_PER_HIZB,
  TOTAL_THUMUNS,
  THUMUNS_PER_JUZ,
  TOTAL_JUZS,
  type EditedThumuns,
  type Thumun,
} from "./quran-data";
import { surahSpan, type SurahSpan } from "./quran-labels";

export type { Thumun, EditedThumuns, EditedThumun, SurahInfo, Reciter } from "./quran-data";
export {
  getThumun,
  getAllThumuns,
  getSurah,
  getAllSurahs,
  getReciters,
  surahAudioUrl,
  TOTAL_THUMUNS,
  THUMUNS_PER_HIZB,
  THUMUNS_PER_JUZ,
  TOTAL_HIZBS,
  TOTAL_JUZS,
  TOTAL_SURAHS,
} from "./quran-data";

/** First thumun id of a hizb (1..60) */
export function hizbThumunRange(hizb: number): [number, number] {
  return [(hizb - 1) * THUMUNS_PER_HIZB + 1, hizb * THUMUNS_PER_HIZB];
}

/** First thumun id of a juz (1..30) */
export function juzThumunRange(juz: number): [number, number] {
  return [(juz - 1) * THUMUNS_PER_JUZ + 1, juz * THUMUNS_PER_JUZ];
}

/**
 * مدة المراجعة البعيدة (بالأثمان): 16 حتى الثمن 240، ثم 24 حتى 360، ثم 32.
 */
export function farReviewRate(day: number): number {
  return day > 360 ? 32 : day > 240 ? 24 : 16;
}

/**
 * جدول مؤشرات المراجعة البعيدة (مصدر واحد للحقيقة — لا حالة مخزّنة).
 * pointer[1..10] = 1؛ pointer[d+1] = pointer[d] + rate(d)، وإذا تجاوز المخزون
 * المتاح (d+1-9) يعود إلى 1.
 */
export const POINTER_TABLE: number[] = (() => {
  const t = new Array<number>(TOTAL_THUMUNS + 2).fill(1);
  for (let d = 10; d <= TOTAL_THUMUNS + 1; d++) {
    const rate = farReviewRate(d);
    let p = t[d] + rate;
    const nextPool = d + 1 - 9;
    if (p > nextPool) p = 1;
    t[d + 1] = p;
  }
  return t;
})();

export function getFarReviewStart(day: number): number {
  return POINTER_TABLE[Math.min(Math.max(day, 1), TOTAL_THUMUNS + 1)] ?? 1;
}

/**
 * ترتيب «النظام الحفيف» لمراجعة القريب: أثمان الأسبوع الماضي
 * (المواضع 1..8 من الأقدم للأحدث) مرتّبة 8، 2، 4، 6، 1، 3، 5، 7.
 * مثال اليوم 25: الأسبوع 17..24 ← [24, 18, 20, 22, 17, 19, 21, 23].
 */
export const NEAR_REVIEW_ORDER = [8, 2, 4, 6, 1, 3, 5, 7] as const;

export interface FarReviewSet {
  start: Thumun;
  end: Thumun;
  list: Thumun[];
}

export interface FortressTasks {
  /** Juz assigned for daily khatma recitation (first of today's block) */
  reciteJuz: number;
  /** All juzs of today's recitation block (pace may be >1) */
  reciteJuzs: number[];
  reciteSpan: SurahSpan[];
  /** Hizb assigned for daily listening (first of today's block) */
  listenHizb: number;
  listenHizbs: number[];
  listenSpan: SurahSpan[];
  /** Weekly preparation: the coming 8 thumuns */
  prepWeekly: Thumun[];
  /** Today's new memorization */
  newHifz: Thumun | null;
  /** Near review — week arranged by النظام الحفيف */
  reviewNear: Thumun[];
  /** Far review: rotating window over earlier material */
  reviewFar: FarReviewSet | null;
  /** Weak thumuns needing extra fixation (from self-ratings) */
  weakList: Thumun[];
  /** Applicable task keys today (ring denominator) */
  taskKeys: TaskType[];
}

function blockStart(day: number, perDay: number, total: number): number {
  return (((day - 1) * perDay) % total) + 1;
}

function blockOf(day: number, perDay: number, total: number): number[] {
  const start = blockStart(day, perDay, total);
  const out: number[] = [];
  for (let i = 0; i < perDay; i++) out.push(((start - 1 + i) % total) + 1);
  return out;
}

function spansOfJuzes(juzes: number[], edited?: EditedThumuns): SurahSpan[] {
  const out: SurahSpan[] = [];
  for (const juz of juzes) {
    const [s, e] = juzThumunRange(juz);
    const a = getThumun(s, edited);
    const b = getThumun(e, edited);
    if (a && b) out.push(...surahSpan(a, b));
  }
  return out;
}

function spansOfHizbs(hizbs: number[], edited?: EditedThumuns): SurahSpan[] {
  const out: SurahSpan[] = [];
  for (const hizb of hizbs) {
    const [s, e] = hizbThumunRange(hizb);
    const a = getThumun(s, edited);
    const b = getThumun(e, edited);
    if (a && b) out.push(...surahSpan(a, b));
  }
  return out;
}

export function getFortressTasks(
  day: number,
  opts: {
    edited?: EditedThumuns;
    weakIds?: number[];
    maintain?: boolean;
    reciteJuzPerDay?: number;
    listenHizbPerDay?: number;
  } = {},
): FortressTasks {
  const {
    edited,
    weakIds = [],
    maintain = false,
    reciteJuzPerDay = RECITATION_JUZS_PER_DAY,
    listenHizbPerDay = LISTENING_HIZBS_PER_DAY,
  } = opts;
  const paceR = Math.min(Math.max(1, Math.round(reciteJuzPerDay)), 3);
  const paceL = Math.min(Math.max(1, Math.round(listenHizbPerDay)), 3);

  if (maintain) {
    const reciteJuz = ((day - 1) % TOTAL_JUZS) + 1;
    const reciteSpan = spansOfJuzes([reciteJuz], edited);
    const weakList = weakIds
      .map((id) => getThumun(id, edited))
      .filter((t): t is Thumun => t !== null)
      .slice(0, 8);
    return {
      reciteJuz,
      reciteJuzs: [reciteJuz],
      reciteSpan,
      listenHizb: 0,
      listenHizbs: [],
      listenSpan: [],
      prepWeekly: [],
      newHifz: null,
      reviewNear: [],
      reviewFar: null,
      weakList,
      taskKeys: weakList.length > 0
        ? ["maintain_recite", "review_near"]
        : ["maintain_recite"],
    };
  }

  // ─── الحصن الأول: الختمة — تلاوة جزء (بوتيرة) + سماع حزب ───
  const reciteJuzs = blockOf(day, paceR, TOTAL_JUZS);
  const reciteJuz = reciteJuzs[0];
  const reciteSpan = spansOfJuzes(reciteJuzs, edited);

  const listenHizbs = blockOf(day, paceL, 60);
  const listenHizb = listenHizbs[0];
  const listenSpan = spansOfHizbs(listenHizbs, edited);

  // ─── الحصن الثاني: التحضير — 8 أثمان قادمة ───
  const prepWeekly: Thumun[] = [];
  for (let i = 1; i <= PREP_WEEKLY_THUMUNS; i++) {
    const t = getThumun(day + i, edited);
    if (t) prepWeekly.push(t);
  }

  // ─── الحصن الثالث: الحفظ الجديد — ثمن اليوم ───
  const newHifz = getThumun(day, edited);

  // ─── الحصن الرابع: مراجعة القريب — أسبوع أمس بالنظام الحفيف ───
  const reviewNear: Thumun[] = [];
  for (const pos of NEAR_REVIEW_ORDER) {
    const t = getThumun(day - 9 + pos, edited);
    if (t) reviewNear.push(t);
  }

  // ─── الحصن الخامس: مراجعة البعيد — نافذة دوّارة على المتقدم ───
  let reviewFar: FarReviewSet | null = null;
  const poolSize = day - 9;
  if (poolSize > 0) {
    const start = Math.min(getFarReviewStart(day), poolSize);
    const end = Math.min(start + farReviewRate(day) - 1, poolSize);
    const list: Thumun[] = [];
    for (let i = start; i <= end; i++) {
      const t = getThumun(i, edited);
      if (t) list.push(t);
    }
    if (list.length > 0) {
      reviewFar = { start: list[0], end: list[list.length - 1], list };
    }
  }

  const weakList = weakIds
    .map((id) => getThumun(id, edited))
    .filter((t): t is Thumun => t !== null)
    .slice(0, 8);

  const taskKeys: TaskType[] = ["khatma_recite", "khatma_listen"];
  if (prepWeekly.length > 0) taskKeys.push("prep_weekly");
  if (newHifz) taskKeys.push("new_hifz");
  if (reviewNear.length > 0) taskKeys.push("review_near");
  if (reviewFar) taskKeys.push("review_far");

  return {
    reciteJuz,
    reciteJuzs,
    reciteSpan,
    listenHizb,
    listenHizbs,
    listenSpan,
    prepWeekly,
    newHifz,
    reviewNear,
    reviewFar,
    weakList,
    taskKeys,
  };
}

export type FortressTasksResult = ReturnType<typeof getFortressTasks>;
