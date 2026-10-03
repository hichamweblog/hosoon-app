import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelDailyReminder, reminderDelay, scheduleDailyReminder, showReminderNotification } from "./reminders";
let send: ReturnType<typeof vi.fn>, permission: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-02T12:00:00")); send = vi.fn(async () => {}); permission = vi.fn(async () => "granted");
  const notification = Object.assign(vi.fn(), { permission: "granted", requestPermission: permission });
  vi.stubGlobal("Notification", notification); vi.stubGlobal("window", { Notification: notification });
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration: vi.fn(async () => ({ showNotification: send })) } });
});
afterEach(() => { cancelDailyReminder(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("جدولة محلية واحدة دون طلب إذن تلقائي أو وعد خلفية", () => {
  it("تغيير الموعد/تعطيله يلغي القديم ولا يتضاعف", async () => {
    scheduleDailyReminder("12:01"); scheduleDailyReminder("12:02"); await vi.advanceTimersByTimeAsync(60000); expect(send).not.toHaveBeenCalled();
    cancelDailyReminder(); await vi.advanceTimersByTimeAsync(120000); expect(send).not.toHaveBeenCalled(); expect(permission).not.toHaveBeenCalled();
  });
  it("notification الهاتف تستعمل service worker لا new Notification", async () => {
    await showReminderNotification("اختبار"); expect(send).toHaveBeenCalledTimes(1); expect(vi.mocked(Notification)).not.toHaveBeenCalled();
  });
  it("عملية إذن/تسجيل معلقة لا تطلق التذكير بعد الإلغاء", async () => {
    let resolve!: (value: ServiceWorkerRegistration) => void;
    vi.mocked(navigator.serviceWorker.getRegistration).mockReturnValueOnce(new Promise((yes) => { resolve = yes; }) as Promise<ServiceWorkerRegistration>);
    scheduleDailyReminder("12:01"); await vi.advanceTimersByTimeAsync(60000); cancelDailyReminder(); resolve({ showNotification: send } as unknown as ServiceWorkerRegistration); await vi.advanceTimersByTimeAsync(0);
    expect(send).not.toHaveBeenCalled();
  });
  it("الموعد الماضي ينتقل للغد، والوقت غير صالح مرفوض", () => {
    expect(reminderDelay("12:01")).toBe(60000); expect(reminderDelay("11:00")).toBe(23 * 60 * 60 * 1000); expect(() => reminderDelay("25:00")).toThrow();
  });
});
