"use client";

import { useSyncExternalStore } from "react";

/** اشتراك فارغ — لا يُطلق أي تحديثات (مرجع ثابت لتفادي إعادة الإنشاء). */
const emptySubscribe = () => () => {};

/**
 * علم "تم التركيب" آمن للـ hydration بدون setState داخل useEffect
 * (يلبي قاعدة react-hooks/set-state-in-effect مع React Compiler).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

/** قراءة قيمة من نظام خارجي (المتصفح) عند الرندر — آمنة للـ hydration. */
export function useBrowserFlag(read: () => boolean): boolean {
  return useSyncExternalStore(emptySubscribe, read, () => false);
}
