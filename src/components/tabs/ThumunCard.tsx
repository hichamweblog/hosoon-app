"use client";

import type { Thumun } from "@/lib/fortress-calculator";

interface Props {
  thumun: Thumun;
  accentColor?: string;
  onClick?: () => void;
  actionLabel?: string;
}

export default function ThumunCard({ thumun, accentColor = "bg-primary text-primary-foreground", onClick, actionLabel }: Props) {
  return (
    <div
      className={`bg-surface rounded-xl p-4 ${onClick ? "cursor-pointer active:scale-[0.99] transition-transform" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}>
      <div className="flex items-start gap-3">
        {/* Thumun Number Badge */}
        <div className={`w-10 h-10 rounded-xl ${accentColor} flex items-center justify-center font-bold text-sm shrink-0 mt-0.5`}>
          {thumun.id}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base text-foreground">{thumun.surah}</h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            الجزء {thumun.juz} · الحزب {thumun.hizb} · الثمن {thumun.id}
          </p>
          {thumun.startText && (
            <p className="font-quran text-foreground/80 text-base leading-loose mt-2 truncate">
              &quot;{thumun.startText}&quot;
            </p>
          )}
        </div>
      </div>

      {actionLabel && (
        <button className="mt-4 w-full py-3 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
