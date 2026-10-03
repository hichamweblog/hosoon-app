"use client";
import { useState } from "react";
import type { FortressTasks } from "@/lib/fortress-calculator";
import { useHifzStore, type DailyTasks } from "@/store/useHifzStore";
import { useSessionStore } from "@/store/useSessionStore";
import { formatNum, localDateKey } from "@/lib/format";
import { Button } from "../ui/button";
import TaskCheckbox from "../ui/task-checkbox";
import ThumunCard from "./ThumunCard";
import PlanHeader from "./PlanHeader";
export default function PrepTab({ tasks, dayTasks, currentDay }: { tasks: FortressTasks; dayTasks: DailyTasks; currentDay: number }) {
  const state = useHifzStore(), arabic = state.settings.arabicNumerals, toggle = state.toggleTask;
  const open = useSessionStore((s) => s.open), [show, setShow] = useState(false);
  const preparedIds = new Set(Object.values(state.sessions).filter((session) => session.task === "prep_weekly" && session.day === currentDay && session.date === localDateKey()).flatMap((session) => session.thumunIds));
  const preparedCount = tasks.prepWeekly.filter((thumun) => preparedIds.has(thumun.id)).length;
  const prepProgress = tasks.prepWeekly.length ? (preparedCount / tasks.prepWeekly.length) * 360 : 0;
  return <section className="surface-card p-5 space-y-4">
    <PlanHeader title="التحضير" description="تهيئة الأذن واللسان لما سيأتي. التحضير محفوظ مع الخطة ولا يُحسب حفظًا." helpTitle="عن التحضير" helpText="التحضير يعرّفك بالمواد القادمة قبل جلسة الحفظ. يمكنك عرض كل ثمن وفتحه في المصحف، ثم تسجيل إتمام نافذة اليوم." />
    {tasks.prepWeekly.length ? <>
      <div className="flex items-center gap-3"><span className="relative grid size-14 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${prepProgress}deg, color-mix(in oklab, var(--primary) 12%, transparent) 0deg)` }} aria-label={`${formatNum(preparedCount, arabic)} من ${formatNum(tasks.prepWeekly.length, arabic)} أثمان محضرة`}><span className="grid size-11 place-items-center rounded-full bg-card text-xs font-bold" dir="ltr">{formatNum(preparedCount, arabic)}/{formatNum(tasks.prepWeekly.length, arabic)}</span></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{formatNum(tasks.prepWeekly.length, arabic)} أثمان قادمة</p><p className="text-xs text-muted-foreground">تعرّف على المواد القادمة بهدوء</p></div><TaskCheckbox checked={dayTasks.prep_weekly === true} label="أتممت تحضير جميع مواد اليوم" onToggle={() => toggle(currentDay, "prep_weekly")} /></div>
      <Button className="w-full min-h-12" onClick={() => open({ kind: "prep", day: currentDay, thumuns: tasks.prepWeekly })}>ابدأ جلسة التحضير</Button>
      <Button variant="outline" className="w-full" aria-expanded={show} onClick={() => setShow(!show)}>{show ? "إخفاء المواد" : "عرض المواد"}</Button>
      {show && <div className="space-y-3">{tasks.prepWeekly.map((t) => <ThumunCard key={t.id} thumun={t} compact showStatus={false} />)}</div>}
    </> : <p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">لا تحضير مطلوب في خطة اليوم. يمكنك فتح المصحف للقراءة الحرة.</p>}
  </section>;
}
