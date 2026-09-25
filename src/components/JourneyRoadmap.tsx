"use client";

import { TOTAL_HIZBS } from "@/lib/quran-data";
import { formatNum } from "@/lib/format";
import { hizbThumunRange } from "@/lib/fortress-calculator";
import { useHifzStore } from "@/store/useHifzStore";
import { CheckCircle2, Lock, Star } from "lucide-react";

interface Props {
  totalCompleted: number;
}

export default function JourneyRoadmap({ totalCompleted }: Props) {
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);
  const completedHizbs = Math.floor((totalCompleted || 0) / 8);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-border/50 flex flex-col">
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">خريطة الختمة (مسار الأحزاب)</h3>
          <p className="text-sm text-muted-foreground mt-1">
            أكملت {formatNum(completedHizbs, arabic)} من {formatNum(TOTAL_HIZBS, arabic)} حزباً
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-f-gold/10 text-f-gold flex items-center justify-center">
          <Star className="w-6 h-6" aria-hidden />
        </div>
      </div>

      <div className="w-full max-h-80 overflow-y-auto custom-scrollbar pl-2">
        <div className="flex flex-wrap gap-3 py-2" dir="rtl">
          {Array.from({ length: TOTAL_HIZBS }).map((_, i) => {
            const isCompleted = i < completedHizbs;
            const isCurrent = i === completedHizbs;
            const [from, to] = hizbThumunRange(i + 1);
            return (
              <div
                key={i}
                title={`الحزب ${i + 1} — الأثمان ${from} إلى ${to}`}
                className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 transition-all ${
                  isCompleted
                    ? "bg-f-gold/15 border-f-gold/40 text-f-gold shadow-sm"
                    : isCurrent
                      ? "bg-primary/15 border-primary text-primary shadow-md shadow-primary/20"
                      : "bg-background/40 border-border text-muted-foreground opacity-50"
                }`}
              >
                <span className="font-bold text-lg">{formatNum(i + 1, arabic)}</span>
                {isCompleted && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full" aria-hidden>
                    <CheckCircle2 className="w-4 h-4 text-f-gold" />
                  </div>
                )}
                {!isCompleted && !isCurrent && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full" aria-hidden>
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
