"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, CheckCircle2, ChevronDown, Play, ArrowLeft } from "lucide-react";
import { TASK_META, MOTIVATIONAL_QUOTES, type TaskType } from "@/lib/constants";
import { formatNum } from "@/lib/format";
import type { FortressTasks } from "@/lib/fortress-calculator";
import { thumunRangeLabel } from "@/lib/quran-labels";
import { isDayCompleted, useHifzStore, type DailyTasks } from "@/store/useHifzStore";
import { useSessionStore, type SessionInput } from "@/store/useSessionStore";
import { useMushafStore } from "@/store/useMushafStore";
import { celebrate } from "@/lib/effects";
import { Button } from "../ui/button";
import TaskCheckbox from "../ui/task-checkbox";
import { toast } from "sonner";

interface Props { tasks: FortressTasks; dayTasks: DailyTasks; currentDay: number }
export function sessionForTask(task: TaskType, day: number, tasks: FortressTasks): SessionInput {
  const base = { day, thumuns: [] as FortressTasks["prepWeekly"] };
  if (task === "new_hifz") return { ...base, kind: "new_hifz", thumuns: tasks.newHifz ? [tasks.newHifz] : [] };
  if (task === "prep_weekly") return { ...base, kind: "prep", thumuns: tasks.prepWeekly };
  if (task === "review_near") return { ...base, kind: "review_near", thumuns: tasks.reviewNear };
  if (task === "review_far") return { ...base, kind: "review_far", thumuns: tasks.reviewFar?.list ?? [] };
  if (task === "khatma_listen") return { ...base, kind: "khatma_listen", listenHizbs: tasks.listenHizbs };
  return { ...base, kind: task === "maintain_recite" ? "maintain_recite" : "khatma_recite", reciteJuzs: tasks.reciteJuzs };
}
const ACTIONS: Record<TaskType, string> = { new_hifz: "ابدأ الحفظ", khatma_recite: "ابدأ التلاوة", khatma_listen: "ابدأ الاستماع", prep_weekly: "حضّر الأثمان", review_near: "راجع القريب", review_far: "راجع البعيد", maintain_recite: "ابدأ ورد التثبيت", free_review: "ثبّت المحفوظ" };

export default function HomeTab({ tasks, dayTasks, currentDay }: Props) {
  const state = useHifzStore(), open = useSessionStore((s) => s.open), openReader = useMushafStore((s) => s.openReader);
  const [expanded, setExpanded] = useState<TaskType | null>(null);
  const completed = isDayCompleted(dayTasks, tasks.taskKeys), celebrated = useRef(false);
  const next = tasks.taskKeys.find((key) => !dayTasks[key]);
  const arabic = state.settings.arabicNumerals;
  useEffect(() => {
    if (completed && !celebrated.current) { celebrated.current = true; toast.success("أتممت ورد هذا اليوم — تقبل الله منك"); void celebrate(); }
    if (!completed) celebrated.current = false;
  }, [completed]);
  const description = (task: TaskType) => {
    if (task === "new_hifz" && tasks.newHifz) return thumunRangeLabel(tasks.newHifz, arabic);
    if (task === "khatma_recite" || task === "maintain_recite") return `الجزء ${tasks.reciteJuzs.map((id) => formatNum(id, arabic)).join("، ")}`;
    if (task === "khatma_listen") return `الحزب ${tasks.listenHizbs.map((id) => formatNum(id, arabic)).join("، ")}`;
    const list = task === "prep_weekly" ? tasks.prepWeekly : task === "review_near" ? tasks.reviewNear : tasks.reviewFar?.list ?? [];
    const sorted = [...list].sort((a, b) => a.id - b.id);
    return sorted.length ? `${formatNum(sorted.length, arabic)} أثمان · من ${formatNum(sorted[0].id, arabic)} إلى ${formatNum(sorted.at(-1)!.id, arabic)}` : "";
  };
  return <div className="space-y-4">
    <section className="surface-card p-5 border-primary/40" aria-label="الخطوة التالية">
      <p className="text-sm font-semibold text-primary mb-2">{next ? "خطوتك التالية" : "ورد اليوم مكتمل"}</p>
      <h2 className="text-xl font-bold">{next ? TASK_META[next].label : "أحسنت، خذ وقتك للرسوخ"}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mt-1">{next ? description(next) : "لا نحتاج لتسريع المحطة. يمكنك العودة للمصحف أو مراجعة إضافية."}</p>
      {next ? <Button className="mt-4 w-full h-12 text-base font-bold rounded-xl" onClick={() => open(sessionForTask(next, currentDay, tasks))}><Play className="size-4" aria-hidden />{ACTIONS[next]}</Button> : <Button variant="outline" className="mt-4 w-full h-12" onClick={() => openReader(state.currentDay)}><BookOpen className="size-4" aria-hidden /> افتح المصحف</Button>}
    </section>
    {state.memorization[state.currentDay]?.memorized && state.currentDay < 480 && <Button variant="outline" className="w-full h-auto min-h-12 whitespace-normal" onClick={() => { state.advanceDay(); toast.info("انتقلت محطة الحفظ. يبقى ورد اليوم ومواده كما هو؛ الثمن الجديد يُدرج في يوم جديد."); }}>انتقل إلى محطة الحفظ التالية <ArrowLeft className="size-4" aria-hidden /></Button>}
    <section className="surface-card p-4" aria-label="مهام ورد اليوم">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><h2 className="font-bold text-lg">حصون اليوم</h2><span className="text-sm text-muted-foreground">تسجيل ذاتي بعد إنجاز المادة</span></div>
      <div className="divide-y divide-border">
        {tasks.taskKeys.map((task) => <div key={task} className="py-3 space-y-2">
          <div className="flex items-center gap-3">
            <TaskCheckbox checked={dayTasks[task] === true} label={`تم ${TASK_META[task].label}`} onToggle={() => state.toggleTask(currentDay, task)} />
            <div className="flex-1 min-w-0"><p className={`font-semibold text-sm ${dayTasks[task] ? "text-muted-foreground" : ""}`}>{TASK_META[task].label}</p><p className="text-xs text-muted-foreground leading-relaxed">{description(task)}</p></div>
            <button className="size-11 rounded-xl grid place-items-center shrink-0 hover:bg-muted" aria-label={`تفاصيل ${TASK_META[task].label}`} aria-expanded={expanded === task} onClick={() => setExpanded(expanded === task ? null : task)}><ChevronDown className={`size-4 ${expanded === task ? "rotate-180" : ""}`} aria-hidden /></button>
          </div>
          {expanded === task && <div className="p-3 rounded-xl bg-surface space-y-2">
            <p className="text-sm text-muted-foreground">{TASK_META[task].hint}</p><Button variant="outline" className="w-full min-h-11" onClick={() => open(sessionForTask(task, currentDay, tasks))}>{ACTIONS[task]}</Button>
          </div>}
        </div>)}
      </div>
      {completed && <p className="flex items-center gap-2 text-primary text-sm mt-3"><CheckCircle2 className="size-4" aria-hidden /> كل مهام الخطة الفعلية مكتملة</p>}
    </section>
    {tasks.taskKeys.includes("new_hifz") && !dayTasks.new_hifz && <button className="w-full rounded-xl border border-border p-3 text-sm text-muted-foreground min-h-11" onClick={() => { if (state.setReviewOnlyToday(true)) toast.info("أُجّل الحفظ الجديد. ورد التلاوة والمراجعة مستمر، ومحطة الحفظ لم تتغير."); }}>اليوم للمراجعة — أجّل الجديد فقط</button>}
    {state.dailyPlans[Object.keys(state.dailyPlans).sort().at(-1) ?? ""]?.reviewOnly && <button className="w-full text-sm text-primary min-h-11" onClick={() => state.setReviewOnlyToday(false)}>إعادة الحفظ الجديد إلى ورد اليوم</button>}
    {state.maintain.active && <p className="rounded-xl bg-primary/10 p-3 text-sm text-muted-foreground">مرحلة التثبيت مفعّلة؛ {state.maintain.startedOn} بداية الدورة. سجلات الرحلة السابقة محفوظة.</p>}
    <blockquote className="text-center p-4 text-sm text-muted-foreground leading-loose"><p className="font-quran text-lg text-foreground">«{MOTIVATIONAL_QUOTES[currentDay % MOTIVATIONAL_QUOTES.length].text}»</p><cite className="not-italic">{MOTIVATIONAL_QUOTES[currentDay % MOTIVATIONAL_QUOTES.length].source}</cite></blockquote>
  </div>;
}
