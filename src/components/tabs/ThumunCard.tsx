"use client";
import { BookOpen } from "lucide-react";
import { formatNum } from "@/lib/format";
import { thumunShort, thumunTitle } from "@/lib/quran-labels";
import type { Thumun } from "@/lib/quran-data";
import { useHifzStore } from "@/store/useHifzStore";
import { useMushafStore } from "@/store/useMushafStore";
interface Props { thumun: Thumun; accentClass?: string; onClick?: () => void; actionLabel?: string; showNote?: boolean; compact?: boolean; showReadButton?: boolean }
export default function ThumunCard({ thumun, accentClass = "bg-primary/10 text-primary", onClick, actionLabel, showNote = true, compact = false, showReadButton = true }: Props) {
  const arabic = useHifzStore((s) => s.settings.arabicNumerals), note = useHifzStore((s) => s.notes[thumun.id]);
  const rating = useHifzStore((s) => s.thumunRatings[thumun.id]), open = useMushafStore((s) => s.openReader);
  return <article className="rounded-2xl bg-surface p-4 space-y-3">
    <div className="flex gap-3"><span className={`size-10 rounded-xl shrink-0 grid place-items-center font-bold ${accentClass}`}>{formatNum(thumun.id, arabic)}</span><div className="min-w-0 space-y-1"><h3 className="font-semibold text-base break-words">{thumunTitle(thumun, arabic)}</h3><p className="text-sm text-muted-foreground">{thumunShort(thumun, arabic)}</p><p className="text-xs text-muted-foreground">الجزء {formatNum(thumun.juz, arabic)} · الحزب {formatNum(thumun.hizb, arabic)}</p></div></div>
    {!compact && <p className="font-quran text-lg leading-loose">{thumun.partialStart ? "…" : ""}{thumun.text}</p>}
    {rating && <p className="text-xs text-muted-foreground">آخر تقييم: {rating === "weak" ? "يحتاج تثبيتًا" : rating === "good" ? "جيد" : "متقن"}</p>}
    {showNote && note && <p className="text-xs text-f-gold">لديك ملاحظة</p>}
    <div className="flex flex-wrap gap-2">
      {showReadButton && <button type="button" className="flex-1 min-h-11 rounded-xl border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2" aria-label={`قراءة ${thumunTitle(thumun, arabic)}`} onClick={() => open(thumun.id)}><BookOpen className="size-4" aria-hidden /> قراءة الثمن</button>}
      {onClick && <button type="button" className="flex-1 min-h-11 rounded-xl bg-primary/10 text-primary font-semibold text-sm px-3" onClick={onClick}>{actionLabel ?? "عرض التفاصيل"}</button>}
    </div>
  </article>;
}
