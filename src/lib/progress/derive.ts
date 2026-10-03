import { XP_TABLE } from "@/lib/constants";
import { daysBetweenLocal, localDateKey } from "@/lib/format";
import { compareStamps } from "./clock";
import { isDayCompleted, memorizedIds, tasksForPlan, materialIds } from "./plan";
import { DEFAULT_SETTINGS, PROGRESS_VERSION, type DailyLogEntry, type ProgressData, type SessionEntry } from "./types";

export function emptyProgress(ownerId: string | null = null, now = new Date()): ProgressData {
  return {
    schemaVersion: PROGRESS_VERSION, ownerId, epoch: 0, currentDay: 1,
    startDate: now.toISOString(), calendarStartDate: localDateKey(now), memorization: {},
    dailyPlans: {}, completions: {}, sessions: {}, reviewAttempts: {}, versions: {},
    legacyDailyLog: {}, legacyXp: 0, notes: {}, thumunRatings: {}, editedThumuns: {},
    settings: { ...DEFAULT_SETTINGS }, maintain: { active: false, day: 1, startedOn: null, cycleOffset: 0 },
    khatmaCompletedAt: null, celebrationSeenAt: null, showOnboarding: ownerId === null,
    completedTasks: {}, dailyLog: {}, sessionLog: {}, totalXp: 0, streak: 0,
    bestStreak: 0, lastActiveDate: "",
  };
}

/** Pure derived views. Never merge counters or award a second copy of an event. */
export function deriveProgress(data: ProgressData, today = localDateKey()): ProgressData {
  const completedTasks: ProgressData["completedTasks"] = {};
  let totalXp = data.legacyXp;
  const dailyLog: Record<string, DailyLogEntry> = Object.fromEntries(
    Object.entries(data.legacyDailyLog).map(([date, log]) => [date, { ...log, days: [...log.days], completedAll: false }]),
  );
  for (const c of Object.values(data.completions)) {
    const plan = c.date ? data.dailyPlans[c.date] : null;
    const applicable = !c.legacy && !!c.date && c.date <= today && plan?.id === c.planId && plan?.journeyDay === c.day && plan.taskKeys.includes(c.task) && materialIds(plan, c.task).join(",") === c.materialIds.join(",");
    if (c.done && (c.legacy || applicable)) {
      completedTasks[c.day] = { ...completedTasks[c.day], [c.task]: true };
      if (!c.legacy && c.task !== "new_hifz") totalXp += XP_TABLE[c.task];
    }
    if (c.date && applicable && c.done) {
      const entry = dailyLog[c.date] ?? { date: c.date, days: [], tasks: 0 };
      dailyLog[c.date] = {
        ...entry, days: [...new Set([...entry.days, c.day])].sort((a, b) => a - b),
        tasks: entry.tasks + 1,
      };
    }
  }
  const ids = memorizedIds(data);
  for (const m of Object.values(data.memorization)) if (m.memorized && m.source === "learned" && localDateKey(new Date(m.at)) <= today) totalXp += XP_TABLE.new_hifz;
  for (const plan of Object.values(data.dailyPlans)) {
    const complete = plan.date <= today && isDayCompleted(tasksForPlan(data, plan), plan.taskKeys);
    if (complete) totalXp += XP_TABLE.day_bonus;
    if (dailyLog[plan.date]) dailyLog[plan.date].completedAll = complete;
  }
  const sessionLog: Record<string, SessionEntry[]> = {};
  for (const session of Object.values(data.sessions).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))) {
    (sessionLog[session.date] ??= []).push(session);
  }
  const activity = new Set<string>();
  for (const key of Object.keys(data.versions)) if (key.startsWith("activity:")) activity.add(key.slice(9));
  for (const [date, log] of Object.entries(dailyLog)) if (log.tasks > 0) activity.add(date);
  for (const session of Object.values(data.sessions)) if (session.seconds >= 30) activity.add(session.date);
  for (const attempt of Object.values(data.reviewAttempts)) activity.add(attempt.date);
  const dates = [...activity].filter((date) => date <= today).sort();
  let run = 0, best = data.bestStreak, last = "";
  for (const date of dates) {
    const gap = last ? daysBetweenLocal(last, date) : Infinity;
    run = gap === 1 || gap === 2 ? run + 1 : 1;
    best = Math.max(best, run);
    last = date;
  }
  const streak = last && daysBetweenLocal(last, today) <= 1 ? run : 0;
  const allMemorized = ids.length === 480;
  // Deterministic completion time, including the last union of two devices.
  const latestMemorization = Object.values(data.memorization).filter((m) => m.memorized)
    .sort((a, b) => compareStamps(b.stamp, a.stamp))[0];
  const khatmaCompletedAt = data.khatmaCompletedAt ?? (allMemorized ? latestMemorization?.at ?? null : null);
  const maintainDay = data.maintain.active && data.maintain.startedOn
    ? Math.max(1, daysBetweenLocal(data.maintain.startedOn, today) + 1 + data.maintain.cycleOffset) : data.maintain.day;
  return {
    ...data, completedTasks, dailyLog, sessionLog, totalXp, streak, bestStreak: Math.max(best, streak),
    lastActiveDate: last, khatmaCompletedAt, maintain: { ...data.maintain, day: maintainDay },
  };
}

export function progressMetrics(data: ProgressData) {
  const ids = memorizedIds(data), known = new Set(ids);
  const completeBlocks = (size: number, total: number) => Array.from({ length: total }, (_, index) => index + 1)
    .filter((block) => Array.from({ length: size }, (_, i) => (block - 1) * size + i + 1).every((id) => known.has(id)));
  const juzs = completeBlocks(16, 30), hizbs = completeBlocks(8, 60);
  const perfectDays = Object.values(data.dailyPlans).filter((p) => p.date <= localDateKey() && isDayCompleted(tasksForPlan(data, p), p.taskKeys)).length;
  const legacyStations = Object.keys(data.completedTasks).filter((d) => isDayCompleted(data.completedTasks[Number(d)], Number(d))).length;
  const zahrawayn = Array.from({ length: 60 }, (_, i) => i + 1).every((id) => known.has(id));
  return { ids, count: ids.length, highest: ids.at(-1) ?? 0, juzs, hizbs, perfectDays, legacyStations, zahrawayn };
}

/** Explainable recommendations, not a silent change to the Five Fortresses. */
export function reviewDue(data: ProgressData, today = localDateKey()) {
  const latest = new Map<number, ProgressData["reviewAttempts"][string]>();
  for (const attempt of Object.values(data.reviewAttempts)) {
    const prev = latest.get(attempt.thumunId);
    if (!prev || compareStamps(attempt.stamp, prev.stamp) > 0) latest.set(attempt.thumunId, attempt);
  }
  return memorizedIds(data).map((id) => {
    const attempt = latest.get(id), rating = data.thumunRatings[id];
    const age = attempt ? Math.max(0, daysBetweenLocal(attempt.date, today)) : 999;
    const interval = rating === "weak" ? 1 : rating === "good" ? 7 : 21;
    return {
      id, due: !attempt || age >= interval, score: (rating === "weak" ? 10000 : 0) + age,
      lastDate: attempt?.date ?? null,
      reason: rating === "weak" ? "آخر تقييم: يحتاج تثبيتًا" : !attempt ? "لم تُسجّل مراجعة فردية بعد" : `مرّ ${age} يومًا منذ آخر مراجعة`,
    };
  }).filter((item) => item.due).sort((a, b) => b.score - a.score || a.id - b.id);
}
