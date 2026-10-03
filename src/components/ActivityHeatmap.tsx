"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { formatNum, localDateKey } from "@/lib/format";
import { useHifzStore } from "@/store/useHifzStore";

const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const weekdayNames = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export default function ActivityHeatmap() {
  const state = useHifzStore();
  const arabic = state.settings.arabicNumerals;
  const [monthOffset, setMonthOffset] = useState(0);
  const month = useMemo(() => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() + monthOffset); return date; }, [monthOffset]);
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first.getDay()).fill(null), ...Array.from({ length: total }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
      const key = localDateKey(date);
      const sessions = Object.values(state.sessions).filter((s) => s.date === key && s.seconds >= 30).length;
      const attempts = Object.values(state.reviewAttempts).filter((a) => a.date === key).length;
      const tasks = state.dailyLog[key]?.tasks ?? 0;
      return { key, day: index + 1, tasks, sessions, attempts, active: tasks > 0 || sessions > 0 || attempts > 0 || !!state.versions[`activity:${key}`] };
    })];
  }, [month, state.dailyLog, state.reviewAttempts, state.sessions, state.versions]);
  const activeDays = cells.filter((cell) => cell?.active).length;
  return <section className="surface-card p-5 space-y-4" aria-labelledby="activity-title">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-wide text-primary">إيقاعك</p><h2 id="activity-title" className="mt-1 text-lg font-bold">تقويم النشاط</h2><p className="mt-1 text-sm text-muted-foreground">{formatNum(activeDays, arabic)} يومًا حاضرًا في {monthNames[month.getMonth()]} {month.getFullYear()}</p></div><span className="mt-1 size-3 rounded-full bg-primary" aria-hidden /></div>
    <div className="flex items-center justify-between rounded-xl bg-surface p-1">
      <button type="button" className="grid size-10 place-items-center rounded-lg hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40" aria-label="الشهر السابق" onClick={() => setMonthOffset((offset) => offset - 1)}><ChevronRight className="size-4" aria-hidden /></button>
      <span className="text-sm font-semibold">{monthNames[month.getMonth()]} {month.getFullYear()}</span>
      <button type="button" className="grid size-10 place-items-center rounded-lg hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40" aria-label="الشهر التالي" disabled={monthOffset >= 0} onClick={() => setMonthOffset((offset) => Math.min(0, offset + 1))}><ChevronLeft className="size-4" aria-hidden /></button>
    </div>
    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">{weekdayNames.map((day) => <span key={day} className="py-1">{day}</span>)}{cells.map((cell, index) => cell ? <div key={cell.key} title={`${cell.key}: ${cell.tasks} مهام، ${cell.sessions} جلسات، ${cell.attempts} محاولات`} className={`grid aspect-square place-items-center rounded-lg border text-xs ${cell.active ? "border-primary bg-primary text-primary-foreground font-semibold" : "border-border/50 bg-background"}`} aria-label={`${cell.key}${cell.active ? "، يوجد نشاط" : "، لا يوجد نشاط"}`}>{formatNum(cell.day, arabic)}</div> : <span key={`empty-${index}`} aria-hidden />)}</div>
    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>النشاط يشمل إنجازًا أو مراجعة أو جلسة فعلية (30 ثانية فأكثر).</span><span className="flex shrink-0 items-center gap-1.5"><i className="size-2.5 rounded-full bg-primary" aria-hidden />نشط</span></div>
  </section>;
}
