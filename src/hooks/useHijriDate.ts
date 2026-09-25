"use client";

import { formatHijriDate } from "@/lib/hijri";
import { useMemo } from "react";

/**
 * تاريخ اليوم الهجري بصيغة عربية جاهزة للعرض.
 * مرّر `at` كمثيل Date ثابت الهوية (مثلاً useMemo) لإعادة الحساب عند الحاجة فقط.
 */
export function useHijriDate(arabicNumerals: boolean, at: Date = new Date()): string {
  return useMemo(() => formatHijriDate(at, arabicNumerals), [at, arabicNumerals]);
}
