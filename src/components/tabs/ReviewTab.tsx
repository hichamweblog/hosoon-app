"use client";
import { BookOpen, History, Sparkles } from "lucide-react";
import type { FortressTasks } from "@/lib/fortress-calculator";
import { useHifzStore, type DailyTasks } from "@/store/useHifzStore";
import { useSessionStore } from "@/store/useSessionStore";
import { reviewDue } from "@/lib/progress/derive";
import { getThumun } from "@/lib/quran-data";
import { formatNum } from "@/lib/format";
import { thumunShort } from "@/lib/quran-labels";
import { Button } from "../ui/button";
import TaskCheckbox from "../ui/task-checkbox";

export default function ReviewTab({ tasks, dayTasks, currentDay }: { tasks: FortressTasks; dayTasks: DailyTasks; currentDay: number }) {
  const state = useHifzStore(), open = useSessionStore((s) => s.open), arabic = state.settings.arabicNumerals;
  const recommended = reviewDue(state).slice(0, 5);
  const cards = [{ task: "review_near" as const, title: "مراجعة القريب", list: tasks.reviewNear, icon: History }, { task: "review_far" as const, title: "مراجعة البعيد", list: tasks.reviewFar?.list ?? [], icon: BookOpen }];
  return <div className="space-y-4">
    <h1 className="text-xl font-bold">المراجعة والرسوخ</h1>
    {cards.map(({ task, title, list, icon: Icon }) => {
      const sorted = [...list].sort((a, b) => a.id - b.id);
      return <section key={task} className="surface-card p-5 space-y-3">
        <div className="flex items-center gap-3"><Icon className="size-5 text-primary" aria-hidden /><h2 className="font-bold text-lg flex-1">{title}</h2>{list.length > 0 && <TaskCheckbox checked={dayTasks[task] === true} label={`أنجزت جميع مواد ${title}`} onToggle={() => state.toggleTask(currentDay, task)} />}</div>
        {list.length ? <>
          <p className="text-sm text-muted-foreground">{formatNum(list.length, arabic)} أثمان · المدى: {formatNum(sorted[0].id, arabic)}–{formatNum(sorted.at(-1)!.id, arabic)}</p>
          <p className="text-sm">من {thumunShort(sorted[0], arabic)} إلى {thumunShort(sorted.at(-1)!, arabic)}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">ترتيب المرور: {list.map((t) => formatNum(t.id, arabic)).join("، ")}. تُقيّم كل ثمن على حدة.</p>
          <Button variant="outline" className="w-full min-h-12" onClick={() => open({ kind: task, day: currentDay, thumuns: list })}>ابدأ {title}</Button>
        </> : <p className="text-sm text-muted-foreground">لا مادة مطلوبة هنا في خطة اليوم؛ تُراجع الأثمان المحفوظة بالفعل فقط.</p>}
      </section>;
    })}
    <section className="surface-card p-5 space-y-3">
      <h2 className="font-bold text-lg flex items-center gap-2"><Sparkles className="size-5 text-f-gold" aria-hidden /> تثبيت إضافي مقترح</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">اقتراحات بسيطة بحسب تقييمك ووقت آخر مراجعة. لا تستبدل مراجعة القريب أو البعيد، ولا تغيّر المنهج تلقائيًا.</p>
      {recommended.length ? <>
        <Button className="w-full min-h-12" onClick={() => open({ kind: "free_review", day: currentDay, thumuns: recommended.map((item) => getThumun(item.id)!), minutes: 15 })}>لدي 15 دقيقة — جلسة تثبيت حرة</Button>
        <ul className="space-y-2">{recommended.map((item) => <li key={item.id} className="rounded-xl bg-surface p-3 space-y-1">
          <p className="font-semibold text-sm">الثمن {formatNum(item.id, arabic)} · {thumunShort(getThumun(item.id)!, arabic)}</p>
          <p className="text-xs text-muted-foreground">{item.reason}{item.lastDate ? ` · آخر مراجعة ${item.lastDate}` : ""}</p>
          <button className="text-sm text-primary font-semibold min-h-11" onClick={() => open({ kind: "free_review", day: currentDay, thumuns: [getThumun(item.id)!], minutes: 5 })}>ثبّت هذا الثمن</button>
        </li>)}</ul>
      </> : <p className="text-sm text-muted-foreground">لا مراجعات إضافية مستحقة الآن. لا نعرض غير المحفوظ كأنه يحتاج تثبيتًا.</p>}
    </section>
  </div>;
}
