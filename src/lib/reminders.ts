import { localDateKey } from "./format";
let timer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;
let lastFired = "";
const validTime = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try { return await Notification.requestPermission() === "granted"; } catch { return false; }
}
export async function showReminderNotification(body: string, stillValid: () => boolean = () => true): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    const options: NotificationOptions = { body, tag: "hosoon-daily", icon: "/icon-192.png", lang: "ar", dir: "rtl" };
    // Mobile browsers commonly reject `new Notification`; use the registered worker.
    const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (!stillValid()) return false;
    if (registration) await registration.showNotification("حصون — وردك اليوم", options);
    else new Notification("حصون — وردك اليوم", options);
    return true;
  } catch { return false; }
}
export function reminderDelay(hhmm: string, now = new Date()): number {
  if (!validTime(hhmm)) throw new Error("وقت غير صالح");
  const [hour, minute] = hhmm.split(":").map(Number), at = new Date(now);
  at.setHours(hour, minute, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);
  return at.getTime() - now.getTime();
}
export function cancelDailyReminder() { generation++; if (timer) clearTimeout(timer); timer = null; }
/** This coordinator NEVER prompts for permission and makes no background-delivery promise. */
export function scheduleDailyReminder(hhmm: string | null): void {
  cancelDailyReminder();
  if (!hhmm || !validTime(hhmm) || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  const current = generation;
  const schedule = () => { timer = setTimeout(() => { void fire(); }, reminderDelay(hhmm)); };
  const fire = async () => {
    if (current !== generation) return;
    const key = `${localDateKey()}:${hhmm}`;
    if (lastFired !== key) {
      const shown = await showReminderNotification("وقت وردك — اقرأ وراجع على وتيرتك.", () => current === generation);
      if (shown) lastFired = key;
    }
    if (current === generation) schedule();
  };
  schedule();
}
