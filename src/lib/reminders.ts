/**
 * Daily reminder scheduling (best-effort local notifications).
 * Works while the app is open or in a kept-alive PWA window; true background
 * push would need a push server — documented limitation in README.
 */
import { localDateKey } from "./format";

let timer: ReturnType<typeof setTimeout> | null = null;
let scheduledFor: string | null = null;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

export function showReminderNotification(body: string) {
  try {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("حصون — وردك اليوم", {
        body,
        tag: "hosoon-daily",
        icon: "/icon-192.png",
        lang: "ar",
        dir: "rtl",
      });
    }
  } catch {
    // ignore
  }
}

function msUntil(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const at = new Date();
  at.setHours(h, m, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at.getTime() - now.getTime();
}

/** Schedule (or reschedule) the daily reminder at "HH:MM". */
export async function scheduleDailyReminder(hhmm: string | null) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
    scheduledFor = null;
  }
  if (!hhmm || typeof window === "undefined") return;
  const ok = await ensureNotificationPermission();
  if (!ok) return;

  const fire = () => {
    const today = localDateKey();
    if (scheduledFor !== today) {
      scheduledFor = today;
      showReminderNotification("حان وقت الحصون الخمسة — تلاوة، تحضيراً، حفظاً، ومراجعة.");
    }
    // reschedule for tomorrow
    timer = setTimeout(fire, msUntil(hhmm));
  };
  // setTimeout maxes out at ~24.8 days — always fine for a daily loop
  timer = setTimeout(fire, Math.min(msUntil(hhmm), 2_000_000_000));
}
