"use client";
import { formatNum, localDateKey } from "@/lib/format";
import { useHifzStore } from "@/store/useHifzStore";
/** A bounded visualization: importing an ancient date must never render centuries of cells. */
export default function ActivityHeatmap() {
  const state = useHifzStore(), arabic = state.settings.arabicNumerals, today = new Date(); today.setHours(12, 0, 0, 0);
  const cells = Array.from({ length: 126 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - 125 + i); const date = localDateKey(d);
    const sessions = Object.values(state.sessions).filter((s) => s.date === date && s.seconds >= 30).length;
    const attempts = Object.values(state.reviewAttempts).filter((a) => a.date === date).length;
    const tasks = state.dailyLog[date]?.tasks ?? 0;
    const active = tasks > 0 || sessions > 0 || attempts > 0 || !!state.versions[`activity:${date}`];
    return { date, tasks, sessions, attempts, active };
  });
  const activeDays = cells.filter((c) => c.active).length, latest = cells.filter((c) => c.active).reverse().slice(0, 14);
  return <section className="surface-card p-5 space-y-3"><h2 className="text-lg font-bold">جدار النشاط</h2><p className="text-sm text-muted-foreground">{formatNum(activeDays, arabic)} يوم نشاط خلال آخر {formatNum(126, arabic)} يومًا. الخانات لا تعني إتمام الورد.</p>
    <div className="overflow-x-auto pb-2" role="img" aria-label={`${activeDays} يوم نشاط في آخر 126 يومًا؛ تفاصيل الأيام متاحة أسفل الرسم`}><div className="grid grid-rows-7 grid-flow-col gap-1 min-w-max" aria-hidden>{cells.map((c) => <div key={c.date} title={`${c.date}: ${c.tasks} مهام، ${c.sessions} جلسات، ${c.attempts} محاولات`} className={`size-3.5 rounded-sm border ${c.active ? "bg-primary border-primary" : "bg-background border-muted-foreground"}`} />)}</div></div>
    <p className="text-xs text-muted-foreground">الخانة الملوّنة: نشاط. الفارغة: لا نشاط مسجل. التقييم الفردي والجلسة الحرة لا يكملان مهام الورد المخططة.</p>
    <details><summary className="text-sm cursor-pointer font-semibold min-h-11">تفاصيل أحدث أيام النشاط</summary>{latest.length ? <ul className="space-y-2 mt-2 text-sm">{latest.map((c) => <li key={c.date} className="rounded-xl bg-surface p-3"><b>{c.date}</b><span className="block text-xs text-muted-foreground">{formatNum(c.tasks, arabic)} مهام حالية · {formatNum(c.sessions, arabic)} جلسات · {formatNum(c.attempts, arabic)} محاولات</span></li>)}</ul> : <p className="text-sm text-muted-foreground">لا نشاط فعلي مسجل بعد.</p>}</details>
  </section>;
}
