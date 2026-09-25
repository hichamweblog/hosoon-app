"use client";

import { formatNum } from "@/lib/format";
import { thumunShort, thumunTitle } from "@/lib/quran-labels";
import type { Thumun } from "@/lib/quran-data";
import { useHifzStore } from "@/store/useHifzStore";

interface Props {
  thumun: Thumun;
  accentClass?: string;
  onClick?: () => void;
  actionLabel?: string;
  showNote?: boolean;
  compact?: boolean;
}

export default function ThumunCard({
  thumun,
  accentClass = "bg-primary text-primary-foreground",
  onClick,
  actionLabel,
  showNote = true,
  compact = false,
}: Props) {
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);
  const note = useHifzStore((s) => s.notes[thumun.id]);
  const rating = useHifzStore((s) => s.thumunRatings[thumun.id]);

  const ratingChip =
    rating === "weak"
      ? { label: "يحتاج تثبيتاً", cls: "bg-red-500/10 text-red-500" }
      : rating === "good"
        ? { label: "جيد", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" }
        : rating === "strong"
          ? { label: "متقن", cls: "bg-f-near/10 text-f-near" }
          : null;

  return (
    <div
      className={`bg-surface rounded-xl p-4 ${onClick ? "cursor-pointer active:scale-[0.99] transition-transform" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl ${accentClass} flex items-center justify-center font-bold text-sm shrink-0 mt-0.5`}
          aria-hidden
        >
          {formatNum(thumun.id, arabic)}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base text-foreground truncate">
            {thumunTitle(thumun, arabic)}
          </h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            {thumunShort(thumun, arabic)} · الجزء {formatNum(thumun.juz, arabic)} · الحزب{" "}
            {formatNum(thumun.hizb, arabic)}
          </p>
          {thumun.text && !compact && (
            <p className="font-quran text-foreground/80 text-base leading-loose mt-2 line-clamp-2">
              {thumun.partialStart ? "…" : ""}
              {thumun.text}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {ratingChip && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ratingChip.cls}`}>
                {ratingChip.label}
              </span>
            )}
            {showNote && note && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-fgold/10 text-fgold">
                ملاحظة
              </span>
            )}
          </div>
        </div>
      </div>

      {actionLabel && (
        <button
          type="button"
          className="mt-4 w-full py-3 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
