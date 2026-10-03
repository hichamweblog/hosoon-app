"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { formatNum } from "@/lib/format";
import { useHifzStore } from "@/store/useHifzStore";
import { useMushafStore } from "@/store/useMushafStore";

const Preview = dynamic(() => import("./DayPreview"));

export default function JourneyRoadmap({ memorized, currentDay }: { memorized: number[]; currentDay: number }) {
  const known = new Set(memorized);
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);
  const openReader = useMushafStore((s) => s.openReader);
  const [selected, setSelected] = useState<number | null>(null);
  const [range, setRange] = useState<1 | 2 | 3>(1);
  const rangeStart = (range - 1) * 20 + 1;
  const rangeEnd = range * 20;

  return <section className="surface-card overflow-hidden">
    <div className="border-b border-border/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold tracking-wide text-primary">خريطة الطريق</p><h2 className="mt-1 text-lg font-bold">خريطة الأحزاب</h2><p className="mt-1 text-sm text-muted-foreground">كل نقطة تمثل ثمنًا محفوظًا. اضغط على حزب للعودة إلى مادته.</p></div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">60 حزبًا</span>
      </div>
    </div>
    <div className="sticky top-2 z-10 border-y border-border/60 bg-card/95 p-2 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-1" role="tablist" aria-label="نطاقات خارطة الأحزاب">
        {([1, 2, 3] as const).map((value) => {
          const start = (value - 1) * 20 + 1;
          const end = value * 20;
          return <button key={value} type="button" role="tab" aria-selected={range === value} className={`min-h-10 rounded-lg border px-2 text-xs font-semibold transition-colors ${range === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground"}`} onClick={() => setRange(value)}>{formatNum(start, arabic)}–{formatNum(end, arabic)}</button>;
        })}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-5" dir="rtl">
      {Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => i + rangeStart).map((hizb) => {
        const ids = Array.from({ length: 8 }, (_, index) => (hizb - 1) * 8 + index + 1);
        const count = ids.filter((id) => known.has(id)).length;
        const active = ids.includes(currentDay);
        return <article key={hizb} className={`group p-2 text-right transition-colors ${count === 8 ? "bg-primary text-primary-foreground" : `bg-card ${active ? "border-2 border-primary" : "border border-transparent"}`}`}>
          <button type="button" aria-label={`معاينة الحزب ${hizb}، ${count} من 8 أثمان محفوظة${count === 8 ? "، مكتمل" : ""}${active ? "، المحطة الحالية" : ""}`} aria-current={active ? "step" : undefined} className="w-full text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => setSelected(ids.find((id) => !known.has(id)) ?? ids[0])}>
            <span className="flex items-center justify-between gap-1"><span className={`text-sm font-bold ${active && count !== 8 ? "text-primary" : ""}`}>{formatNum(hizb, arabic)}</span><span className={`text-[11px] ${count === 8 ? "text-primary-foreground/85" : "text-muted-foreground"}`}>{formatNum(count, arabic)}/{formatNum(8, arabic)} محفوظ</span></span>
          </button>
          <span className="mt-1 grid grid-cols-4 gap-1" aria-label={`أثمان الحزب ${hizb}`}>
            {ids.map((id) => <button key={id} type="button" aria-label={`فتح الثمن ${id}`} onClick={() => openReader(id)} className={`grid size-8 place-items-center rounded-full border text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${known.has(id) ? count === 8 ? "border-primary-foreground bg-primary-foreground text-primary" : "border-primary bg-primary text-primary-foreground" : count === 8 ? "border-primary-foreground/60 bg-transparent" : "border-muted-foreground/30 bg-transparent text-muted-foreground"}`}>{formatNum(id, arabic)}</button>)}
          </span>
        </article>;
      })}
    </div>
    {selected !== null && <Preview day={selected} onClose={() => setSelected(null)} />}
  </section>;
}
