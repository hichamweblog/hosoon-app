"use client";

import { formatNum, localDateKey } from "@/lib/format";
import { useHifzStore } from "@/store/useHifzStore";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const MONTHS = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

interface Cell {
  date: Date;
  key: string;
  tasks: number;
  colorClass: string;
  label: string;
}

/** GitHub-style commitment wall: week columns, RTL flow (oldest at right). */
export default function ActivityHeatmap() {
  const dailyLog = useHifzStore((s) => s.dailyLog);
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logged = Object.keys(dailyLog || {}).sort();
    const oldestLogged = logged.length > 0 ? new Date(`${logged[0]}T00:00:00`) : today;

    // at least 18 weeks of history
    const earliest = new Date(today);
    earliest.setDate(today.getDate() - 125);
    const start = oldestLogged < earliest ? oldestLogged : earliest;

    // align to Saturday (start of week)
    const aligned = new Date(start);
    aligned.setDate(start.getDate() - ((start.getDay() + 1) % 7));

    const cells: Cell[] = [];
    const cursor = new Date(aligned);
    while (cursor <= today) {
      const key = localDateKey(cursor);
      const log = dailyLog?.[key];
      const tasks = log?.tasks ?? 0;
      let colorClass = "bg-muted/30";
      if (tasks >= 1 && tasks <= 2) colorClass = "bg-f-near/30";
      else if (tasks >= 3 && tasks <= 4) colorClass = "bg-f-near/50";
      else if (tasks >= 5 && tasks <= 6) colorClass = "bg-f-near/80";
      else if (tasks >= 7) colorClass = "bg-f-near shadow-[0_0_6px_rgba(62,146,109,0.45)]";
      cells.push({
        date: new Date(cursor),
        key,
        tasks,
        colorClass,
        label: `${cursor.toLocaleDateString("ar", { weekday: "long" })} ${formatNum(cursor.getDate(), arabic)} ${MONTHS[cursor.getMonth()]} — ${tasks} مهمة`,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // pad to full weeks
    while (cells.length % 7 !== 0) {
      const d = new Date(cells[cells.length - 1].date);
      d.setDate(d.getDate() + 1);
      cells.push({
        date: d,
        key: localDateKey(d),
        tasks: -1,
        colorClass: "bg-transparent",
        label: "",
      });
    }

    // chunk into week columns (Sat..Fri rows), oldest week first
    const cols: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
    // months: label when a column's Saturday month differs from previous
    const labels: (string | null)[] = cols.map((col, i) => {
      const m = col[0].date.getMonth();
      const prevM = i > 0 ? cols[i - 1][0].date.getMonth() : -1;
      return m !== prevM ? MONTHS[m] : null;
    });

    return { weeks: cols, monthLabels: labels };
  }, [dailyLog, arabic]);

  return (
    <div className="glass-panel w-full rounded-3xl p-6 border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">جدار الالتزام</h3>
          <p className="text-sm text-muted-foreground mt-1">
            نشاطك اليومي في الحفظ والمراجعة
          </p>
        </div>
      </div>

      <TooltipProvider delay={100}>
        <div className="overflow-x-auto custom-scrollbar pb-2" dir="rtl">
          {/* month labels */}
          <div className="flex gap-[3px] mb-1 min-w-max">
            {weeks.map((col, i) => (
              <div key={`m-${col[0].key}`} className="w-3.5 text-[8px] text-muted-foreground overflow-visible whitespace-nowrap">
                {monthLabels[i] ?? ""}
              </div>
            ))}
          </div>
          {/* week columns */}
          <div className="flex gap-[3px] min-w-max">
            {weeks.map((col) => (
              <div key={col[0].key} className="flex flex-col gap-[3px]">
                {col.map((cell) =>
                  cell.tasks < 0 ? (
                    <div key={cell.key} className="w-3.5 h-3.5" />
                  ) : (
                    <Tooltip key={cell.key}>
                      <TooltipTrigger
                        aria-label={cell.label}
                        className={`block w-3.5 h-3.5 rounded-[3px] cursor-pointer transition-transform hover:scale-125 ${cell.colorClass}`}
                      />
                      <TooltipContent side="top" className="text-xs">
                        <p dir="rtl">{cell.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>

      <div className="flex justify-end items-center gap-1.5 mt-4 text-xs text-muted-foreground" dir="rtl">
        <span>أقل</span>
        <div className="w-3 h-3 rounded-[3px] bg-muted/30" aria-hidden />
        <div className="w-3 h-3 rounded-[3px] bg-f-near/30" aria-hidden />
        <div className="w-3 h-3 rounded-[3px] bg-f-near/50" aria-hidden />
        <div className="w-3 h-3 rounded-[3px] bg-f-near/80" aria-hidden />
        <div className="w-3 h-3 rounded-[3px] bg-f-near" aria-hidden />
        <span>أكثر</span>
      </div>
    </div>
  );
}
