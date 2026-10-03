"use client";
import { useState } from "react";
import type { FortressTasks } from "@/lib/fortress-calculator";
import { useHifzStore, type DailyTasks } from "@/store/useHifzStore";
import { useSessionStore } from "@/store/useSessionStore";
import { formatNum } from "@/lib/format";
import { Button } from "../ui/button";
import TaskCheckbox from "../ui/task-checkbox";
import ThumunCard from "./ThumunCard";
import PlanHeader from "./PlanHeader";
export default function PrepTab({ tasks, dayTasks, currentDay }: { tasks: FortressTasks; dayTasks: DailyTasks; currentDay: number }) {
  const arabic = useHifzStore((s) => s.settings.arabicNumerals), toggle = useHifzStore((s) => s.toggleTask);
  const open = useSessionStore((s) => s.open), [show, setShow] = useState(false);
  return <section className="surface-card p-5 space-y-4">
    <PlanHeader title="التحضير" description="تهيئة الأذن واللسان لما سيأتي. التحضير محفوظ مع الخطة ولا يُحسب حفظًا." helpTitle="عن التحضير" helpText="التحضير يعرّفك بالمواد القادمة قبل جلسة الحفظ. يمكنك عرض كل ثمن وفتحه في المصحف، ثم تسجيل إتمام نافذة اليوم." />
    {tasks.prepWeekly.length ? <>
      <div className="flex items-center gap-3"><TaskCheckbox checked={dayTasks.prep_weekly === true} label="أتممت تحضير جميع مواد اليوم" onToggle={() => toggle(currentDay, "prep_weekly")} /><p className="text-sm">{formatNum(tasks.prepWeekly.length, arabic)} أثمان قادمة</p></div>
      <Button className="w-full min-h-12" onClick={() => open({ kind: "prep", day: currentDay, thumuns: tasks.prepWeekly })}>ابدأ جلسة التحضير</Button>
      <Button variant="outline" className="w-full" aria-expanded={show} onClick={() => setShow(!show)}>{show ? "إخفاء المواد" : "عرض المواد"}</Button>
      {show && <div className="space-y-3">{tasks.prepWeekly.map((t) => <ThumunCard key={t.id} thumun={t} compact />)}</div>}
    </> : <p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">لا تحضير مطلوب في خطة اليوم. يمكنك فتح المصحف للقراءة الحرة.</p>}
  </section>;
}
