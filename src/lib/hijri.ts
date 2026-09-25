import { formatNum } from "@/lib/format";
import { toHijri } from "hijri-date/lib/safe";

/** أسماء الأشهر الهجرية (التقويم المدني / أم القرى) */
export const HIJRI_MONTHS = [
  "محرّم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
] as const;

export interface HijriParts {
  day: number;
  month: number; // 1-12
  year: number;
  monthName: string;
}

/** تحويل تاريخ ميلادي إلى أجزاء هجرية (التقويم الهجري — أم القرى تقريباً). */
export function hijriParts(gregorian: Date = new Date()): HijriParts {
  const h = toHijri(gregorian);
  const month = h.getMonth();
  return {
    day: h.getDate(),
    month,
    year: h.getFullYear(),
    monthName: HIJRI_MONTHS[Math.min(11, Math.max(0, month - 1))],
  };
}

/**
 * صيغة عربية: «12 رمضان 1447 هـ» — بالأرقام العربية عند الطلب.
 */
export function formatHijriDate(gregorian: Date = new Date(), arabicNumerals = true): string {
  const p = hijriParts(gregorian);
  return `${formatNum(p.day, arabicNumerals)} ${p.monthName} ${formatNum(p.year, arabicNumerals)} هـ`;
}
