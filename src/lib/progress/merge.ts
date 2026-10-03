import { compareStamps, ZERO_STAMP } from "./clock";
import { deriveProgress } from "./derive";
import { canonicalStringify } from "./json";
import { snapshotOf, type ProgressData, type Stamp } from "./types";

const stableValue = canonicalStringify;
function choose<T>(a: T, b: T, sa = ZERO_STAMP, sb = ZERO_STAMP): T {
  const cmp = compareStamps(sa, sb);
  return cmp > 0 ? a : cmp < 0 ? b : stableValue(a) >= stableValue(b) ? a : b;
}
function records<T extends { stamp: Stamp }>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort())
    out[key] = a[key] && b[key] ? choose(a[key], b[key], a[key].stamp, b[key].stamp) : a[key] ?? b[key];
  return out;
}
function versionedMap<T>(a: Record<string, T>, b: Record<string, T>, prefix: string, local: ProgressData, remote: ProgressData): Record<string, T> {
  const out: Record<string, T> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b), ...Object.keys(local.versions).filter((k) => k.startsWith(`${prefix}:`)).map((k) => k.slice(prefix.length + 1)), ...Object.keys(remote.versions).filter((k) => k.startsWith(`${prefix}:`)).map((k) => k.slice(prefix.length + 1))]);
  for (const key of [...keys].sort()) {
    const value = choose(a[key], b[key], local.versions[`${prefix}:${key}`], remote.versions[`${prefix}:${key}`]);
    // Undefined plus a newer version is a tombstone, NOT permission to resurrect a key.
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** Commutative LWW registers + unique events. Epoch and owner are hard barriers. */
export function mergeProgress(local: ProgressData, remote: ProgressData): ProgressData {
  if (local.ownerId !== remote.ownerId) throw new Error("لا يمكن دمج بيانات حسابين مختلفين");
  if (local.epoch !== remote.epoch) return deriveProgress(snapshotOf(local.epoch > remote.epoch ? local : remote));
  const out = snapshotOf(local);
  out.versions = {};
  for (const key of [...new Set([...Object.keys(local.versions), ...Object.keys(remote.versions)])].sort())
    out.versions[key] = choose(local.versions[key], remote.versions[key], local.versions[key], remote.versions[key]);
  for (const key of ["currentDay", "maintain", "showOnboarding", "celebrationSeenAt"] as const) {
    // Each editable scalar has its own version, never a stale whole-snapshot timestamp.
    Object.assign(out, { [key]: choose(local[key], remote[key], local.versions[key], remote.versions[key]) });
  }
  out.startDate = local.startDate < remote.startDate ? local.startDate : remote.startDate;
  out.calendarStartDate = local.calendarStartDate < remote.calendarStartDate ? local.calendarStartDate : remote.calendarStartDate;
  out.legacyXp = Math.max(local.legacyXp, remote.legacyXp); // One documented, imported adjustment.
  out.bestStreak = Math.max(local.bestStreak, remote.bestStreak);
  out.khatmaCompletedAt = [local.khatmaCompletedAt, remote.khatmaCompletedAt].filter((v): v is string => !!v).sort()[0] ?? null;
  out.memorization = records(local.memorization, remote.memorization);
  out.dailyPlans = records(local.dailyPlans, remote.dailyPlans);
  out.completions = records(local.completions, remote.completions);
  out.reviewAttempts = records(local.reviewAttempts, remote.reviewAttempts);
  out.sessions = records(local.sessions, remote.sessions);
  out.notes = versionedMap(local.notes, remote.notes, "note", local, remote);
  out.thumunRatings = versionedMap(local.thumunRatings, remote.thumunRatings, "rating", local, remote);
  out.editedThumuns = versionedMap(local.editedThumuns, remote.editedThumuns, "draft", local, remote);
  out.settings = { ...local.settings };
  for (const key of Object.keys(out.settings) as (keyof ProgressData["settings"])[])
    Object.assign(out.settings, { [key]: choose(local.settings[key], remote.settings[key], local.versions[`setting:${key}`], remote.versions[`setting:${key}`]) });
  out.legacyDailyLog = Object.fromEntries([...new Set([...Object.keys(local.legacyDailyLog), ...Object.keys(remote.legacyDailyLog)])].sort().map((date) => {
    const a = local.legacyDailyLog[date], b = remote.legacyDailyLog[date];
    return [date, a && b ? { date, days: [...new Set([...a.days, ...b.days])].sort((x, y) => x - y), tasks: Math.max(a.tasks, b.tasks), completedAll: false } : a ?? b];
  }));
  // Completion IDs include the immutable plan ID. Concurrent alternative plans remain
  // archived, and pure derivation credits ONLY the chosen plan. No events are discarded:
  // merge remains associative, commutative and idempotent, including future plan forks.
  return deriveProgress(out);
}
