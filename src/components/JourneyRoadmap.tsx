"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { formatNum } from "@/lib/format";
import { useHifzStore } from "@/store/useHifzStore";
const Preview = dynamic(() => import("./DayPreview"));
export default function JourneyRoadmap({ memorized, currentDay }: { memorized: number[]; currentDay: number }) {
  const known = new Set(memorized), arabic = useHifzStore((s) => s.settings.arabicNumerals), [selected, setSelected] = useState<number | null>(null);
  return <section className="surface-card p-5 space-y-3"><h2 className="font-bold text-lg">خارطة الأحزاب</h2><p className="text-sm text-muted-foreground">تغطية فعلية، لا أكبر رقم وصلت إليه. اضغط حزبًا لمعاينة مادته.</p><div className="grid grid-cols-4 sm:grid-cols-6 gap-2">{Array.from({ length: 60 }, (_, i) => i + 1).map((hizb) => {
    const ids = Array.from({ length: 8 }, (_, i) => (hizb - 1) * 8 + i + 1), count = ids.filter((id) => known.has(id)).length, active = ids.includes(currentDay);
    return <button key={hizb} type="button" aria-label={`الحزب ${hizb}، ${count} من 8 أثمان محفوظة${count === 8 ? "، مكتمل" : ""}`} className={`min-h-16 rounded-xl border p-2 text-center ${count === 8 ? "bg-primary/15 border-primary" : active ? "bg-surface border-primary" : "bg-surface border-border"}`} onClick={() => setSelected(ids.find((id) => !known.has(id)) ?? ids[0])}><span className="font-bold block text-base">{formatNum(hizb, arabic)}</span><span className="text-xs text-muted-foreground block">{formatNum(count, arabic)}/{formatNum(8, arabic)}</span></button>;
  })}</div>{selected !== null && <Preview day={selected} onClose={() => setSelected(null)} />}</section>;
}
