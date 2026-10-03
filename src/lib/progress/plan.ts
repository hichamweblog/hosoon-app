import { getFortressTasks, farReviewRate, NEAR_REVIEW_ORDER, juzThumunRange, hizbThumunRange, type FortressTasks } from "@/lib/fortress-calculator";
import { daysBetweenLocal, localDateKey } from "@/lib/format";
import { getThumun, type Thumun } from "@/lib/quran-data";
import { surahSpan } from "@/lib/quran-labels";
import type { TaskType } from "@/lib/constants";
import type { DailyPlan, DailyTasks, ProgressData, Stamp } from "./types";

export function applicableTaskKeys(day: number, maintain = false): TaskType[] {
  return getFortressTasks(day, { maintain }).taskKeys;
}
export function isDayCompleted(tasks: DailyTasks | undefined, dayOrKeys: number | TaskType[] | boolean = 1, maintain = false): boolean {
  const keys = Array.isArray(dayOrKeys) ? dayOrKeys : applicableTaskKeys(typeof dayOrKeys === "number" ? dayOrKeys : 1, typeof dayOrKeys === "boolean" ? dayOrKeys : maintain);
  return keys.length > 0 && keys.every((key) => tasks?.[key] === true);
}
export function memorizedIds(data: Pick<ProgressData, "memorization">): number[] {
  return Object.entries(data.memorization).filter(([, m]) => m.memorized).map(([id]) => Number(id)).sort((a, b) => a - b);
}
function block(start: number, count: number, total: number): number[] {
  return Array.from({ length: count }, (_, i) => ((start - 1 + i) % total) + 1);
}
function priorPlan(data: ProgressData, date: string): DailyPlan | undefined {
  return Object.values(data.dailyPlans).filter((p) => p.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** A material snapshot. Pace and memorization changes never reinterpret a past plan. */
export function makeDailyPlan(data: ProgressData, date = localDateKey(), stamp: Stamp, reviewOnly = false): DailyPlan {
  const sequence = Math.max(1, daysBetweenLocal(data.calendarStartDate, date) + 1);
  const prior = priorPlan(data, date);
  const gap = prior ? Math.max(1, daysBetweenLocal(prior.date, date)) : sequence;
  const advanceStart = (previous: number[] | undefined, pace: number, total: number) =>
    previous?.length ? ((previous[previous.length - 1] + (gap - 1) * pace) % total) + 1 : (((sequence - 1) * pace) % total) + 1;
  const recitePace = data.settings.reciteJuzPerDay;
  const reciteJuzs = block(advanceStart(prior?.reciteJuzs, recitePace, 30), recitePace, 30);
  const known = memorizedIds(data);
  const knownSet = new Set(known);
  const maintain = data.maintain.active;
  // Only material actually memorized can be assigned to review.
  const nearPool = known.filter((id) => id <= data.currentDay).slice(-8);
  const nearIds = NEAR_REVIEW_ORDER.map((position) => nearPool[position - 1]).filter((id): id is number => id !== undefined);
  const farPool = known.filter((id) => !nearPool.includes(id));
  const rate = farReviewRate(data.currentDay);
  // Step by the method's review rate, then reset at the available stock boundary.
  // Modulo the number of windows (not modulo individual units) keeps the final
  // truncated window from repeatedly dragging the next window backwards.
  let offset = 0;
  if (prior && farPool.length) {
    const untilWrap = Math.max(1, Math.ceil((farPool.length - prior.farOffset) / rate));
    offset = gap < untilWrap ? prior.farOffset + gap * rate : ((gap - untilWrap) % Math.ceil(farPool.length / rate)) * rate;
  }
  const farIds = farPool.slice(offset, offset + rate);
  const prepIds: number[] = [];
  if (!maintain) for (let id = data.currentDay + 1; id <= Math.min(480, data.currentDay + 8); id++) if (!knownSet.has(id)) prepIds.push(id);
  const newHifzId = maintain || reviewOnly || knownSet.has(data.currentDay) ? null : data.currentDay;
  const listenPace = data.settings.listenHizbPerDay;
  const listenHizbs = maintain ? [] : block(advanceStart(prior?.listenHizbs, listenPace, 60), listenPace, 60);
  // Maintenance has its own reading cycle and no mandatory weak extra task.
  const taskKeys: TaskType[] = maintain ? ["maintain_recite"] : ["khatma_recite", "khatma_listen"];
  if (prepIds.length) taskKeys.push("prep_weekly");
  if (newHifzId !== null) taskKeys.push("new_hifz");
  if (!maintain && nearIds.length) taskKeys.push("review_near");
  if (!maintain && farIds.length) taskKeys.push("review_far");
  const maintainSequence = data.maintain.startedOn ? Math.max(1, daysBetweenLocal(data.maintain.startedOn, date) + 1 + data.maintain.cycleOffset) : data.maintain.day;
  return {
    id: `${date}:${stamp.device}:${stamp.clock}`, date, sequence, journeyDay: data.currentDay, mode: maintain ? "maintenance" : "journey",
    reciteJuzs: maintain ? block(((maintainSequence - 1) * recitePace) % 30 + 1, recitePace, 30) : reciteJuzs,
    listenHizbs, prepIds, newHifzId, nearIds: maintain ? [] : nearIds, farIds: maintain ? [] : farIds, farOffset: maintain ? 0 : offset,
    taskKeys, reviewOnly, stamp,
  };
}
export function completionId(date: string, task: TaskType, planId: string): string { return `daily:${date}:${task}:${planId}`; }
export function tasksForPlan(data: ProgressData, plan: DailyPlan | undefined): DailyTasks {
  if (!plan) return {};
  return Object.fromEntries(plan.taskKeys.map((task) => {
    const c = data.completions[completionId(plan.date, task, plan.id)];
    return [task, c?.done === true && c.day === plan.journeyDay && c.materialIds.join(",") === materialIds(plan, task).join(",")];
  }));
}
export function materialIds(plan: DailyPlan, task: TaskType): number[] {
  if (task === "new_hifz") return plan.newHifzId ? [plan.newHifzId] : [];
  if (task === "prep_weekly") return plan.prepIds;
  if (task === "review_near") return plan.nearIds;
  if (task === "review_far") return plan.farIds;
  const units = task === "khatma_listen" ? plan.listenHizbs : plan.reciteJuzs;
  const size = task === "khatma_listen" ? 8 : 16;
  return units.flatMap((unit) => Array.from({ length: size }, (_, i) => (unit - 1) * size + i + 1));
}
export function planToFortress(plan: DailyPlan, weakIds: number[] = []): FortressTasks {
  const thumuns = (ids: number[]) => ids.map((id) => getThumun(id)).filter((t): t is Thumun => !!t);
  const far = thumuns(plan.farIds);
  const spans = (units: number[], listening: boolean) => units.flatMap((unit) => {
    const [a, b] = listening ? hizbThumunRange(unit) : juzThumunRange(unit);
    const from = getThumun(a), to = getThumun(b);
    return from && to ? surahSpan(from, to) : [];
  });
  return {
    reciteJuz: plan.reciteJuzs[0], reciteJuzs: plan.reciteJuzs, reciteSpan: spans(plan.reciteJuzs, false),
    listenHizb: plan.listenHizbs[0] ?? 0, listenHizbs: plan.listenHizbs, listenSpan: spans(plan.listenHizbs, true),
    prepWeekly: thumuns(plan.prepIds), newHifz: plan.newHifzId ? getThumun(plan.newHifzId) : null,
    reviewNear: thumuns(plan.nearIds), reviewFar: far.length ? { start: far[0], end: far[far.length - 1], list: far } : null,
    weakList: thumuns(weakIds), taskKeys: plan.taskKeys,
  };
}
