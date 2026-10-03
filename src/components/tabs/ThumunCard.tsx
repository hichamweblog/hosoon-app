"use client";
import { BookOpen, CheckCircle2, CircleAlert, StickyNote } from "lucide-react";
import { formatNum } from "@/lib/format";
import { thumunShort, thumunTitle } from "@/lib/quran-labels";
import type { Thumun } from "@/lib/quran-data";
import { useHifzStore } from "@/store/useHifzStore";
import { useMushafStore } from "@/store/useMushafStore";
interface Props { thumun: Thumun; accentClass?: string; onClick?: () => void; actionLabel?: string; showNote?: boolean; compact?: boolean; showReadButton?: boolean; showStatus?: boolean }
export default function ThumunCard({ thumun, accentClass = "bg-primary/10 text-primary", onClick, actionLabel, showNote = true, compact = false, showReadButton = true, showStatus = true }: Props) {
  const arabic = useHifzStore((s) => s.settings.arabicNumerals), note = useHifzStore((s) => s.notes[thumun.id]);
  const rating = useHifzStore((s) => s.thumunRatings[thumun.id]), open = useMushafStore((s) => s.openReader);
  const status = rating === "weak" ? "يحتاج تثبيتًا" : rating === "good" ? "جيد" : rating === "strong" ? "متقن" : "لم يُقيّم";
  const statusIcon = rating === "weak" ? <CircleAlert className="size-3.5" aria-hidden /> : rating ? <CheckCircle2 className="size-3.5" aria-hidden /> : null;
  return <article className={`rounded-2xl bg-surface ${compact ? "p-3" : "p-4"} space-y-3`}>
    <div className="flex gap-3 items-center"><span className={`size-9 rounded-xl shrink-0 grid place-items-center font-bold text-sm ${accentClass}`}>{formatNum(thumun.id, arabic)}</span><div className="min-w-0 flex-1 space-y-0.5"><h3 className="font-semibold text-sm break-words">{thumunTitle(thumun, arabic)}</h3><p className="text-xs text-muted-foreground truncate">{thumunShort(thumun, arabic)}</p><p className="text-[11px] text-muted-foreground">الجزء {formatNum(thumun.juz, arabic)} · الحزب {formatNum(thumun.hizb, arabic)}</p></div>{compact && showStatus && <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] ${rating === "weak" ? "text-destructive" : rating ? "text-primary" : "text-muted-foreground"}`}>{statusIcon}{status}</span>}</div>
    {!compact && <p className="font-quran text-lg leading-loose">{thumun.partialStart ? "…" : ""}{thumun.text}</p>}
    {!compact && rating && <p className="text-xs text-muted-foreground">آخر تقييم: {status}</p>}
    {showNote && note && <p className="text-xs text-f-gold flex items-center gap-1"><StickyNote className="size-3.5" aria-hidden /> لديك ملاحظة</p>}
    <div className="flex flex-wrap gap-2">
      {showReadButton && <button type="button" className="flex-1 min-h-11 rounded-xl border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2" aria-label={`قراءة ${thumunTitle(thumun, arabic)}`} onClick={() => open(thumun.id)}><BookOpen className="size-4" aria-hidden /> قراءة الثمن</button>}
      {onClick && <button type="button" className="flex-1 min-h-11 rounded-xl bg-primary/10 text-primary font-semibold text-sm px-3" onClick={onClick}>{actionLabel ?? "عرض التفاصيل"}</button>}
    </div>
  </article>;
}
