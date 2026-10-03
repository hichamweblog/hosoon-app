"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { BookOpen, Pencil } from "lucide-react";
import { getThumun } from "@/lib/quran-data";
import { getFortressTasks } from "@/lib/fortress-calculator";
import { TASK_META } from "@/lib/constants";
import { planToFortress, tasksForPlan } from "@/lib/progress/plan";
import { localDateKey, formatNum } from "@/lib/format";
import { thumunRangeLabel, thumunTitle } from "@/lib/quran-labels";
import { useHifzStore } from "@/store/useHifzStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useMushafStore } from "@/store/useMushafStore";
import { sessionForTask } from "./tabs/HomeTab";
import { useAppStatusStore } from "@/store/useAppStatusStore";
import { AppModal } from "./ui/app-modal";
import { Button } from "./ui/button";
const Editor = dynamic(() => import("./ThumunEditor"));
export default function DayPreview({ day, date, onClose }: { day: number; date?: string; onClose: () => void }) {
  const state = useHifzStore(), status = useAppStatusStore(), open = useSessionStore((s) => s.open), openReader = useMushafStore((s) => s.openReader), [editing, setEditing] = useState(false);
  const t = getThumun(day);
  if (!t) return null;
  const plan = state.dailyPlans[date ?? localDateKey()], stored = !!plan && (!!date || plan.journeyDay === day), actual = stored && plan.date === localDateKey() && plan.journeyDay === day;
  const tasks = stored ? planToFortress(plan) : getFortressTasks(day, { reciteJuzPerDay: state.settings.reciteJuzPerDay, listenHizbPerDay: state.settings.listenHizbPerDay });
  const arabic = state.settings.arabicNumerals;
  return <AppModal title={date ? `خطة ${date}` : `محطة الثمن ${formatNum(day, arabic)}`} onClose={onClose}>
    <div className="p-5 overflow-y-auto space-y-4 min-h-0">
      <div className="rounded-xl bg-primary/10 p-3 text-sm leading-relaxed">{actual ? "هذه مواد خطة اليوم الفعلية؛ تسجيل الإنجاز يتم من جلساتها أو من ورد اليوم." : stored ? "خطة يوم محفوظة بموادها الأصلية. المعاينة لا تعيد كتابة التاريخ ولا تسجّل إنجازًا أو نقاطًا لذلك اليوم." : "معاينة نظرية عند بلوغ هذه المحطة، وليست خطة مؤرخة أو يوم إنجاز. الورد الفعلي يعتمد على المحفوظ ووتيرتك آنذاك؛ لا نقاط أو تقييم دائم من هذه المعاينة."}</div>
      <h2 className="font-bold text-lg break-words">{thumunTitle(t, arabic)}</h2><p className="text-sm text-muted-foreground">{thumunRangeLabel(t, arabic)}</p><p className="font-quran text-xl leading-loose">{t.partialStart ? "…" : ""}{t.text}</p>
      <p className="text-sm">حالة المحفوظ: {state.memorization[day]?.memorized ? "موثّق كمحفوظ" : "غير موثّق بعد"}</p>
      <Button variant="outline" className="w-full min-h-12" onClick={() => openReader(day)}><BookOpen className="size-4" aria-hidden /> قراءة هذا الثمن</Button>
      <div className="space-y-2"><h3 className="font-bold text-base">{stored ? "مواد الخطة المحفوظة" : "مثال الحصون في هذه المحطة"}</h3>{tasks.taskKeys.map((task) => <Button key={task} variant="outline" className="w-full min-h-11 justify-start" onClick={() => open({ ...sessionForTask(task, day, tasks), planDate: date, preview: !actual })}>{stored && tasksForPlan(state, plan)[task] ? "✓ " : ""}{TASK_META[task].label}{!actual ? " — معاينة" : ""}</Button>)}</div>
      <label className="block text-sm">ملاحظة شخصية (ليست إنجازًا)<textarea disabled={!!status.storageError || (!!state.ownerId && !status.cloudReadReady)} rows={3} value={state.notes[day] ?? ""} maxLength={10000} aria-label={`ملاحظتي على الثمن ${day}`} className="w-full mt-1 p-3 rounded-xl bg-background border border-border" onChange={(e) => state.setNote(day, e.target.value)} /></label>
      <Button variant="ghost" className="w-full min-h-11" onClick={() => setEditing(true)}><Pencil className="size-4" aria-hidden /> اقتراح تصحيح للمراجعة{state.editedThumuns[day] ? " · لديك مسودة" : ""}</Button>
    </div>
    {editing && <Editor thumunId={day} onClose={() => setEditing(false)} />}
  </AppModal>;
}
