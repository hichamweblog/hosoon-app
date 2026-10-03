import type { ProgressData, Stamp } from "./types";

export const ZERO_STAMP: Stamp = { clock: 0, device: "legacy" };
let deviceId: string | null = null;
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}
export function getDeviceId(): string {
  if (deviceId) return deviceId;
  try {
    const saved = globalThis.localStorage?.getItem("hosoon-device-id");
    if (saved && /^[\w.-]{1,80}$/.test(saved)) return (deviceId = saved);
    deviceId = newId();
    globalThis.localStorage?.setItem("hosoon-device-id", deviceId);
  } catch { deviceId = newId(); }
  return deviceId;
}
export function compareStamps(a: Stamp = ZERO_STAMP, b: Stamp = ZERO_STAMP): number {
  return a.clock - b.clock || a.device.localeCompare(b.device, "en");
}
export function nextStamp(data: ProgressData): Stamp {
  const clocks = [
    ...Object.values(data.versions), ...Object.values(data.completions).map((v) => v.stamp),
    ...Object.values(data.memorization).map((v) => v.stamp),
    ...Object.values(data.dailyPlans).map((v) => v.stamp),
    ...Object.values(data.reviewAttempts).map((v) => v.stamp),
    ...Object.values(data.sessions).map((v) => v.stamp),
  ];
  // Lamport/hybrid clock advances past every observed edit, including deletions.
  const maxClock = clocks.reduce((max, s) => Math.max(max, s.clock), 0);
  if (maxClock >= Number.MAX_SAFE_INTEGER - 1) throw new Error("ساعة إصدار غير صالحة؛ لم تتغير البيانات");
  return { clock: Math.max(Date.now(), maxClock + 1), device: getDeviceId() };
}
