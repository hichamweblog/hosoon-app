declare module "hijri-date/lib/safe" {
  export interface HijriDateInstance {
    getFullYear(): number;
    /** مرقّم من 1 (محرم = 1) */
    getMonth(): number;
    /** مرقّم من 0 (السبت = 0 حسب تقويم المكتبة) */
    getMonthIndex(): number;
    getDate(): number;
    getDay(): number;
    toGregorian(): Date;
  }

  export interface HijriDateConstructor {
    new (year?: number, month?: number, date?: number): HijriDateInstance;
  }

  const HijriDate: HijriDateConstructor;
  export default HijriDate;
  export function toHijri(gregorian: Date | HijriDateInstance): HijriDateInstance;
}
