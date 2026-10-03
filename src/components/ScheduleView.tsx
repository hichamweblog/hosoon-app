"use client";
import dynamic from "next/dynamic";
import { BookOpen, CheckCircle2, ChevronDown, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { getAllThumuns, getSurah, getThumun } from "@/lib/quran-data";
import { formatNum, normalizeSearch } from "@/lib/format";
import { getHizbIncipit, getThumunIncipit, thumunRangeLabel, thumunShort } from "@/lib/quran-labels";
import { tasksForPlan } from "@/lib/progress/plan";
import { useHifzStore } from "@/store/useHifzStore";
import { useMushafStore } from "@/store/useMushafStore";
import { useSessionStore } from "@/store/useSessionStore";
import { Button } from "./ui/button";
import PlanHeader from "./tabs/PlanHeader";
const Preview = dynamic(() => import("./DayPreview"));

type Filter = "all" | "pending" | "saved";

export default function ScheduleView() {
  const state = useHifzStore(), arabic = state.settings.arabicNumerals, thumuns = getAllThumuns();
  const open = useSessionStore((s) => s.open), openReader = useMushafStore((s) => s.openReader);
  const [searchOpen, setSearchOpen] = useState(false), [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all"), [hizb, setHizb] = useState(Math.ceil(state.currentDay / 8));
  const [preview, setPreview] = useState<{ day: number; date?: string } | null>(null);
  const current = getThumun(state.currentDay) ?? thumuns[0];
  const currentSaved = !!state.memorization[state.currentDay]?.memorized;
  const partyIds = Array.from({ length: 8 }, (_, i) => (hizb - 1) * 8 + i + 1);
  const q = normalizeSearch(query);
  const ids = q ? thumuns.filter((t) => normalizeSearch(`${t.id} الثمن ${t.id} ${getSurah(t.startSura)?.name} ${getSurah(t.endSura)?.name} ${t.juz} ${t.hizb}`).includes(q)).map((t) => t.id) : partyIds;
  const visibleIds = ids.filter((id) => filter === "all" || (filter === "saved" ? !!state.memorization[id]?.memorized : !state.memorization[id]?.memorized));
  const recent = Object.values(state.dailyPlans).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  const startSession = () => {
    if (currentSaved) openReader(current.id);
    else open({ kind: "new_hifz", day: state.currentDay, thumuns: [current] });
  };
  const row = (id: number) => {
    const t = thumuns[id - 1], saved = !!state.memorization[id]?.memorized, today = id === state.currentDay;
    if (!t) return null;
    return <div key={id} className={`flex items-center gap-2 border-b border-border/70 px-2 py-3 last:border-b-0 ${today ? "bg-primary/[0.04]" : ""}`}>
      <span className={`grid size-7 shrink-0 place-items-center rounded-full border ${saved ? "border-primary bg-primary text-primary-foreground" : today ? "border-f-gold text-f-gold" : "border-muted-foreground/30 text-muted-foreground"}`} aria-label={saved ? "محفوظ" : today ? "ورد اليوم" : "لم يبدأ"}>{saved ? <CheckCircle2 className="size-4" aria-hidden /> : today ? <Sparkles className="size-3.5" aria-hidden /> : <span className="size-2 rounded-full bg-current" />}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">الثمن {formatNum(id, arabic)} · {getSurah(t.startSura)?.name}</p>
        <p className="truncate text-xs text-muted-foreground">{getThumunIncipit(id) || thumunShort(t, arabic)}</p>
      </div>
      <span className={`hidden shrink-0 text-[11px] sm:block ${saved ? "text-primary" : today ? "text-f-gold" : "text-muted-foreground"}`}>{saved ? "محفوظ" : today ? "ورد اليوم" : "لم يبدأ"}</span>
      <button type="button" className="grid size-9 shrink-0 place-items-center rounded-lg text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={`قراءة الثمن ${id}`} onClick={() => openReader(id)}><BookOpen className="size-4" aria-hidden /></button>
    </div>;
  };
  return <div className="space-y-4">
    <PlanHeader title="الخطة" description="وردك الحالي أولًا، ثم استكشف ما حوله عند الحاجة." helpTitle="عن الخطة" helpText="تبدأ الخطة بمحطة اليوم لتعرف ما عليك الآن. استخدم اختيار الحزب أو البحث لاستكشاف الأثمان السابقة والقادمة؛ فتح المصحف أو المعاينة لا يسجل إنجازًا." />
    <section className="surface-card border-primary/30 bg-primary/[0.04] p-4" aria-labelledby="current-station-title">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-primary">محطتك الحالية</p><h2 id="current-station-title" className="mt-1 text-lg font-bold">الثمن {formatNum(current.id, arabic)} · {getSurah(current.startSura)?.name}</h2><p className="mt-1 text-xs text-muted-foreground">{getThumunIncipit(current.id) || thumunRangeLabel(current, arabic)}</p><p className="mt-1 text-xs text-muted-foreground/80">{thumunRangeLabel(current, arabic)}</p></div><span className="text-xs text-muted-foreground">{formatNum(current.id, arabic)} / 480</span></div>
      <Button className="mt-4 min-h-11 w-full font-bold" onClick={startSession}>{currentSaved ? "افتح المصحف للمراجعة" : "ابدأ الحفظ والتسميع"}</Button>
    </section>
    <section className="surface-card overflow-hidden" aria-label="مستكشف الأثمان">
      <div className="flex items-center gap-2 border-b border-border/70 p-3">
        <div className="min-w-0 flex-1"><p className="text-sm font-bold">مستكشف الأثمان</p><p className="truncate text-xs text-muted-foreground">الحزب {formatNum(hizb, arabic)} · {getHizbIncipit(hizb) || "بداية الحزب"}</p></div>
        <button type="button" className="grid size-9 place-items-center rounded-lg hover:bg-muted" aria-label="فتح بحث الأثمان" aria-expanded={searchOpen} onClick={() => setSearchOpen((v) => !v)}><Search className="size-4" aria-hidden /></button>
        <label className="sr-only" htmlFor="plan-party">اختيار الحزب</label><select id="plan-party" value={hizb} onChange={(e) => setHizb(Number(e.target.value))} className="max-w-[7rem] rounded-lg border border-border bg-background px-2 py-2 text-xs"><option value={hizb}>الحزب {formatNum(hizb, arabic)}</option>{Array.from({ length: 60 }, (_, i) => i + 1).filter((n) => n !== hizb).map((n) => <option key={n} value={n}>الحزب {formatNum(n, arabic)}</option>)}</select>
      </div>
      {searchOpen && <div className="border-b border-border/70 p-2"><input autoFocus type="search" aria-label="البحث في خطة الأثمان" placeholder="رقم، سورة، أو حزب" value={query} onChange={(e) => setQuery(e.target.value)} className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" /></div>}
      <div className="grid grid-cols-3 gap-1 border-b border-border/70 p-2" role="tablist" aria-label="تصفية الأثمان">{([["all", "الكل"], ["pending", "قيد الحفظ"], ["saved", "المحفوظ"]] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={filter === id} className={`min-h-9 rounded-lg px-2 text-xs font-semibold ${filter === id ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`} onClick={() => setFilter(id)}>{label}</button>)}</div>
      {visibleIds.length ? <div>{visibleIds.map(row)}</div> : <p className="p-5 text-center text-sm text-muted-foreground">لا توجد أثمان مطابقة لهذا العرض.</p>}
    </section>
    {recent.length > 0 && <details className="surface-card p-4"><summary className="flex min-h-10 cursor-pointer items-center justify-between font-semibold">سجل الخطط السابقة <span className="text-xs text-muted-foreground">{formatNum(recent.length, arabic)} خطة</span><ChevronDown className="size-4" aria-hidden /></summary><ul className="mt-3 space-y-2">{recent.map((p) => { const flags = tasksForPlan(state, p), done = p.taskKeys.filter((k) => flags[k]).length; return <li key={p.date}><button className="flex min-h-12 w-full items-center justify-between gap-2 rounded-lg bg-surface px-3 text-right" aria-label={`عرض خطة ${p.date}`} onClick={() => setPreview({ day: p.journeyDay, date: p.date })}><span className="text-sm"><b>{p.date}</b><span className="mt-1 block text-xs text-muted-foreground">{p.mode === "maintenance" ? "تثبيت" : `محطة ${formatNum(p.journeyDay, arabic)}`}</span></span><span className="text-xs">{formatNum(done, arabic)}/{formatNum(p.taskKeys.length, arabic)}</span></button></li>; })}</ul></details>}
    {preview && <Preview day={preview.day} date={preview.date} onClose={() => setPreview(null)} />}
  </div>;
}
