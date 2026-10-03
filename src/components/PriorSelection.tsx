"use client";
import { useState } from "react";
import { getAllSurahs, getAllThumuns } from "@/lib/quran-data";
import { formatNum, normalizeSearch } from "@/lib/format";

/** Explicit prior knowledge, including non-contiguous surahs. No historical task credits. */
export default function PriorSelection({ selected, onChange, arabic = true }: { selected: Set<number>; onChange: (ids: Set<number>) => void; arabic?: boolean }) {
  const [mode, setMode] = useState<"prefix" | "surahs" | "units">("prefix");
  const [query, setQuery] = useState("");
  const [surahs, setSurahs] = useState<Set<number>>(new Set());
  const thumuns = getAllThumuns();
  let prefix = 0;
  while (selected.has(prefix + 1) && prefix < 480) prefix++;
  const selectPrefix = (count: number) => onChange(new Set(Array.from({ length: Math.max(0, Math.min(480, count)) }, (_, i) => i + 1)));
  const selectSurah = (number: number) => {
    const next = new Set(surahs); if (next.has(number)) next.delete(number); else next.add(number);
    setSurahs(next);
    const ids = thumuns.filter((t) => Array.from({ length: t.endSura - t.startSura + 1 }, (_, i) => t.startSura + i).every((s) => next.has(s))).map((t) => t.id);
    onChange(new Set(ids));
  };
  const q = normalizeSearch(query);
  return <div className="space-y-3 text-right">
    <div className="flex flex-wrap gap-2" aria-label="طريقة تحديد المحفوظ">
      {([["prefix", "من البداية"], ["surahs", "سور متفرقة"], ["units", "أثمان محددة"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} className={`px-3 min-h-11 rounded-xl border text-sm ${mode === value ? "border-primary bg-primary/10 text-primary" : "border-border"}`} onClick={() => setMode(value)}>{label}</button>)}
    </div>
    {mode === "prefix" ? <>
      <label className="block text-sm">الأجزاء المكتملة من البداية<select className="w-full mt-1 p-3 rounded-xl bg-background border border-border" value={Math.floor(prefix / 16)} onChange={(e) => selectPrefix(Number(e.target.value) * 16)} aria-label="الأجزاء المحفوظة سابقًا"><option value={0}>لم أحفظ جزءًا كاملًا بعد</option>{Array.from({ length: 30 }, (_, i) => i + 1).map((j) => <option key={j} value={j}>{formatNum(j, arabic)} أجزاء من البداية</option>)}</select></label>
      <label className="block text-sm">أو إلى نهاية سورة<select className="w-full mt-1 p-3 rounded-xl bg-background border border-border" defaultValue="" aria-label="آخر سورة محفوظة من البداية" onChange={(e) => { const last = Number(e.target.value); if (last) selectPrefix(thumuns.filter((t) => t.endSura <= last).at(-1)?.id ?? 0); }}><option value="">اختر سورة…</option>{getAllSurahs().map((s) => <option key={s.number} value={s.number}>{s.name}</option>)}</select></label>
      <label className="block text-sm">دقة إضافية: عدد الأثمان المتصلة<input className="w-full mt-1 p-3 rounded-xl bg-background border border-border" type="number" min={0} max={480} value={prefix} aria-label="عدد الأثمان المحفوظة من البداية" onChange={(e) => { const n = Number(e.target.value); if (Number.isInteger(n)) selectPrefix(n); }} /></label>
    </> : <>
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="البحث في المحفوظ السابق" placeholder="سورة أو رقم…" className="w-full p-3 rounded-xl bg-background border border-border" />
      <div className="max-h-52 overflow-y-auto rounded-xl border border-border p-2 space-y-1" tabIndex={0} aria-label="اختيارات المحفوظ">
        {mode === "surahs" ? getAllSurahs().filter((s) => !q || normalizeSearch(`${s.name} ${s.number}`).includes(q)).map((s) => <label key={s.number} className="flex gap-3 items-center min-h-11 px-2 text-sm cursor-pointer"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={surahs.has(s.number)} onChange={() => selectSurah(s.number)} />{s.name}</label>) : thumuns.filter((t) => !q || normalizeSearch(`${t.id} ${getAllSurahs()[t.startSura - 1]?.name} ${getAllSurahs()[t.endSura - 1]?.name}`).includes(q)).map((t) => <label key={t.id} className="flex gap-3 items-center min-h-11 px-2 text-sm cursor-pointer"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={selected.has(t.id)} onChange={() => { const ids = new Set(selected); if (ids.has(t.id)) ids.delete(t.id); else ids.add(t.id); onChange(ids); }} />الثمن {formatNum(t.id, arabic)} · {getAllSurahs()[t.startSura - 1]?.name}</label>)}
      </div>
      {mode === "surahs" && <p className="text-xs text-muted-foreground">الثمن المشترك بين سور لا يُحتسب إلا إذا اخترت جميع سور مادته. استخدم «أثمان محددة» للدقة.</p>}
    </>}
    <p className="text-sm font-semibold">المحدد: {formatNum(selected.size, arabic)} من {formatNum(480, arabic)} ثمناً</p>
    <p className="text-xs text-muted-foreground">هذا تصريح بالمحفوظ السابق؛ لا يصنع نشاطًا أو أورادًا تاريخية أو نقاطًا جديدة.</p>
  </div>;
}
