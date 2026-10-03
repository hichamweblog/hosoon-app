"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { CheckCircle2, ChevronDown, Search } from "lucide-react";
import { getAllThumuns, getSurah } from "@/lib/quran-data";
import { formatNum, normalizeSearch } from "@/lib/format";
import { thumunShort } from "@/lib/quran-labels";
import { tasksForPlan } from "@/lib/progress/plan";
import { useHifzStore } from "@/store/useHifzStore";
import { Button } from "./ui/button";
const Preview = dynamic(() => import("./DayPreview"));
export default function ScheduleView() {
  const state = useHifzStore(), arabic = state.settings.arabicNumerals, thumuns = getAllThumuns();
  const [query, setQuery] = useState(""), [limit, setLimit] = useState(24), [hizb, setHizb] = useState<number | null>(Math.ceil(state.currentDay / 8)), [preview, setPreview] = useState<{ day: number; date?: string } | null>(null);
  const q = normalizeSearch(query), numeric = /^\d+$/.test(q);
  const filtered = thumuns.filter((t) => numeric ? t.id === Number(q) : normalizeSearch(`${t.id} الثمن ${t.id} الجزء ${t.juz} الحزب ${t.hizb} ${getSurah(t.startSura)?.name} ${getSurah(t.endSura)?.name}`).includes(q));
  const station = (id: number) => {
    const t = thumuns[id - 1], memorized = state.memorization[id]?.memorized;
    return <button key={id} type="button" aria-label={`معاينة الثمن ${id}`} className={`w-full rounded-xl border p-3 min-h-14 text-right flex items-center gap-3 ${id === state.currentDay ? "border-primary bg-primary/10" : "border-border bg-surface"}`} onClick={() => setPreview({ day: id })}>
      <span className="font-bold text-primary shrink-0">{formatNum(id, arabic)}</span><span className="min-w-0 flex-1 text-sm leading-relaxed"><span className="block font-semibold">الثمن {formatNum(id, arabic)} · {getSurah(t.startSura)?.name}</span><span className="block text-xs text-muted-foreground mt-1">{thumunShort(t, arabic)}</span></span><span className="text-xs shrink-0">{memorized ? <span className="text-primary flex items-center gap-1"><CheckCircle2 className="size-4" aria-hidden /> محفوظ</span> : id === state.currentDay ? "محطتك" : "معاينة"}</span>
    </button>;
  };
  const recent = Object.values(state.dailyPlans).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  return <div className="space-y-4">
    <h1 className="text-xl font-bold">خطة الأثمان وسجل الأيام</h1><p className="text-sm text-muted-foreground">480 محطة حفظ، وليست أيامًا مفروضة. جميع المواد قابلة للمعاينة؛ الإنجاز المؤرخ من ورد يومه فقط.</p>
    <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3"><Search className="size-4 text-muted-foreground" aria-hidden /><input type="search" aria-label="البحث في خطة الأثمان" placeholder="رقم الثمن (٢ أو 2)، سورة، حزب…" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(24); }} className="w-full min-h-12 bg-transparent outline-none text-sm" /></label>
    {q ? <div className="space-y-2" aria-live="polite"><p className="text-sm text-muted-foreground">{formatNum(filtered.length, arabic)} نتيجة</p>{filtered.slice(0, limit).map((t) => station(t.id))}{limit < filtered.length && <Button variant="outline" className="w-full" onClick={() => setLimit(limit + 24)}>عرض المزيد</Button>}{!filtered.length && <p className="text-sm p-4">لا توجد نتائج؛ جرّب رقمًا أو اسم سورة.</p>}</div> : <>
      {recent.length > 0 && <details className="surface-card p-4"><summary className="font-bold min-h-11 cursor-pointer">الخطط اليومية المحفوظة ({recent.length} الأحدث)</summary><ul className="space-y-2 mt-3">{recent.map((p) => {
        const flags = tasksForPlan(state, p), done = p.taskKeys.filter((k) => flags[k]).length;
        return <li key={p.date}><button className="w-full text-right rounded-xl bg-surface p-3 min-h-14 flex items-center justify-between gap-2" aria-label={`عرض خطة ${p.date}`} onClick={() => setPreview({ day: p.journeyDay, date: p.date })}><span className="text-sm"><b>{p.date}</b><span className="block text-xs text-muted-foreground">{p.mode === "maintenance" ? "تثبيت" : `محطة ${formatNum(p.journeyDay, arabic)}`} · مواد محفوظة لا تتغير مع الوتيرة</span></span><span className="text-sm">{formatNum(done, arabic)}/{formatNum(p.taskKeys.length, arabic)}</span></button></li>;
      })}</ul></details>}
      <div className="space-y-2">{Array.from({ length: 60 }, (_, i) => i + 1).map((n) => {
        const ids = Array.from({ length: 8 }, (_, i) => (n - 1) * 8 + i + 1), known = ids.filter((id) => state.memorization[id]?.memorized).length;
        return <section key={n} className="surface-card overflow-hidden"><button type="button" aria-expanded={hizb === n} aria-controls={`hizb-${n}`} className="w-full flex items-center justify-between gap-2 text-right p-4 min-h-14" onClick={() => setHizb(hizb === n ? null : n)}><span className="font-semibold text-sm">الحزب {formatNum(n, arabic)} · الأثمان {formatNum(ids[0], arabic)}–{formatNum(ids[7], arabic)}</span><span className="text-xs text-muted-foreground flex gap-2 items-center">{formatNum(known, arabic)}/{formatNum(8, arabic)} محفوظ<ChevronDown className={`size-4 ${hizb === n ? "rotate-180" : ""}`} aria-hidden /></span></button>{hizb === n && <div id={`hizb-${n}`} className="p-3 pt-0 space-y-2">{ids.map(station)}</div>}</section>;
      })}</div>
    </>}
    {preview && <Preview day={preview.day} date={preview.date} onClose={() => setPreview(null)} />}
  </div>;
}
