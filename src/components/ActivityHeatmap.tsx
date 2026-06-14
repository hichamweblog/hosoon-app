import { useHifzStore } from "@/store/useHifzStore";
import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export default function ActivityHeatmap() {
  const { dailyLog } = useHifzStore();

  const { heatmapWeeks, totalMonthsSpan } = useMemo(() => {
    const today = new Date();

    // Find oldest logged date
    const loggedDates = Object.keys(dailyLog || {})
      .filter(
        (dateStr) => dailyLog[dateStr] && dailyLog[dateStr].tasksCompleted > 0,
      )
      .sort();

    const oldestLoggedDate =
      loggedDates.length > 0 ? new Date(loggedDates[0]) : today;
    const startOfCurrentMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );
    const startOfOldestMonth = new Date(
      oldestLoggedDate.getFullYear(),
      oldestLoggedDate.getMonth(),
      1,
    );

    const startDate =
      startOfOldestMonth < startOfCurrentMonth
        ? startOfOldestMonth
        : startOfCurrentMonth;

    // Calculate total days to generate
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Ensure we generate a multiple of 7 to form complete columns
    // Minimum 18 weeks (126 days) so the grid looks full and beautiful even for new users
    const totalDaysToGenerate = Math.max(
      Math.ceil((diffDays + 1) / 7) * 7,
      126,
    );

    const days = [];
    for (let i = totalDaysToGenerate - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const log = dailyLog[dateStr];
      const tasksCompleted = log ? log.tasksCompleted : 0;

      let colorClass = "bg-muted/30";
      if (tasksCompleted === 1) colorClass = "bg-emerald-500/30";
      else if (tasksCompleted === 2) colorClass = "bg-emerald-500/50";
      else if (tasksCompleted === 3) colorClass = "bg-emerald-500/80";
      else if (tasksCompleted >= 4)
        colorClass = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";

      days.push({
        date: d,
        dateStr,
        tasksCompleted,
        colorClass,
      });
    }

    // Chunk into weeks
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    // Reverse weeks so the newest week is first (for RTL layout)
    weeks.reverse();

    // Calculate months span for the title
    const monthsSpan =
      (today.getFullYear() - startDate.getFullYear()) * 12 +
      (today.getMonth() - startDate.getMonth()) +
      1;

    return { heatmapWeeks: weeks, totalMonthsSpan: monthsSpan };
  }, [dailyLog]);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-border/50 overflow-hidden flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">جدار الالتزام</h3>
          <p className="text-sm text-muted-foreground mt-1">
            تتبع نشاطك اليومي في الحفظ والمراجعة
          </p>
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-2 custom-scrollbar" dir="rtl">
        <div className="flex gap-1.5 min-w-max">
          {heatmapWeeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1.5">
              {week.map((dayData) => {
                if (!dayData) return null;

                return (
                  <TooltipProvider key={dayData.dateStr} delay={100}>
                    <Tooltip>
                      <TooltipTrigger
                        className={`block w-4 h-4 rounded-[4px] cursor-pointer transition-transform hover:scale-125 ${dayData.colorClass}`}
                      />
                      <TooltipContent
                        className="bg-popover text-popover-foreground border-border text-xs"
                        side="top">
                        <p className="font-bold mb-1" dir="rtl">
                          {dayData.date.toLocaleDateString("ar-DZ", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p dir="rtl">مهام منجزة: {dayData.tasksCompleted}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div
        className="w-full flex justify-end items-center gap-2 mt-4 text-xs text-muted-foreground"
        dir="rtl">
        <span>أقل</span>
        <div className="w-3 h-3 rounded-[3px] bg-muted/30" />
        <div className="w-3 h-3 rounded-[3px] bg-emerald-500/30" />
        <div className="w-3 h-3 rounded-[3px] bg-emerald-500/50" />
        <div className="w-3 h-3 rounded-[3px] bg-emerald-500/80" />
        <div className="w-3 h-3 rounded-[3px] bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
        <span>أكثر</span>
      </div>
    </div>
  );
}
