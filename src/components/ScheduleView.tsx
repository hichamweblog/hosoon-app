"use client";

import { TOTAL_THUMUNS } from "@/lib/constants";
import { getFortressTasks } from "@/lib/fortress-calculator";
import { useHifzStore } from "@/store/useHifzStore";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, Lock, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import DayPreviewModal from "./DayPreviewModal";
import { Button } from "./ui/button";
import { vibrateLight } from "@/lib/haptic";

interface DayData {
  day: number;
  isCompleted: boolean;
  isToday: boolean;
  isReviewOnly: boolean;
  surah: string;
  range: string;
  startText: string;
}

interface JuzMilestone {
  juz: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  days: DayData[];
}

export default function ScheduleView() {
  const { currentDay, completedTasks, farReviewPointer } = useHifzStore();
  const [previewDay, setPreviewDay] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Calculate the full journey
  const maxDays = useMemo(() => {
    let last = currentDay;
    for (let i = 1; i <= TOTAL_THUMUNS * 1.5; i++) {
      const tasks = getFortressTasks(i, 1);
      if (tasks.newHifz) last = i;
    }
    return Math.max(last, currentDay + 30);
  }, [currentDay]);

  const { weeklyDays, juzMilestones, currentJuz } = useMemo(() => {
    const weekly: DayData[] = [];
    const milestones: Record<number, JuzMilestone> = {};
    let activeJuz = 1;

    // Build the weekly window (Current day - 1 up to + 5)
    const startWeek = Math.max(1, currentDay - 1);
    for (let d = startWeek; d <= startWeek + 6; d++) {
      const tasks = getFortressTasks(d, farReviewPointer || 1);
      weekly.push({
        day: d,
        isCompleted: completedTasks[d] !== undefined,
        isToday: d === currentDay,
        isReviewOnly: !tasks.newHifz,
        surah: tasks.newHifz?.surah || "مراجعة فقط",
        range: tasks.newHifz ? `الجزء ${tasks.newHifz.juz} · الحزب ${tasks.newHifz.hizb} · الثمن ${tasks.newHifz.id}` : "",
        startText: tasks.newHifz?.startText || "",
      });
    }

    // Build the Juz milestones
    for (let d = 1; d <= maxDays; d++) {
      const tasks = getFortressTasks(d, 1);
      if (tasks.newHifz) activeJuz = tasks.newHifz.juz;

      if (!milestones[activeJuz]) {
        milestones[activeJuz] = {
          juz: activeJuz,
          isUnlocked: false,
          isCompleted: true, // Will set to false if any day is incomplete
          days: [],
        };
      }

      const isCompleted = completedTasks[d] !== undefined;
      if (!isCompleted) milestones[activeJuz].isCompleted = false;

      milestones[activeJuz].days.push({
        day: d,
        isCompleted,
        isToday: d === currentDay,
        isReviewOnly: !tasks.newHifz,
        surah: tasks.newHifz?.surah || "مراجعة فقط",
        range: tasks.newHifz ? `الجزء ${tasks.newHifz.juz} · الحزب ${tasks.newHifz.hizb} · الثمن ${tasks.newHifz.id}` : "",
        startText: tasks.newHifz?.startText || "",
      });
    }

    // Determine unlocks
    let currJuz = 1;
    for (const key in milestones) {
      const m = milestones[key];
      if (m.days.some((d) => d.isToday || d.isCompleted)) {
        m.isUnlocked = true;
        currJuz = Math.max(currJuz, m.juz);
      }
    }
    // Unlock the immediate next Juz as well
    if (milestones[currJuz + 1]) milestones[currJuz + 1].isUnlocked = true;

    return { weeklyDays: weekly, juzMilestones: Object.values(milestones), currentJuz: currJuz };
  }, [maxDays, currentDay, completedTasks, farReviewPointer]);

  // Scroll weekly slider to current day
  useEffect(() => {
    if (scrollRef.current) {
      const todayEl = scrollRef.current.querySelector('[data-today="true"]');
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [currentDay]);

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      
      {/* ─── القسم الأول: نافذة الأسبوع ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">هذا الأسبوع</h2>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 pb-4 px-2"
        >
          {weeklyDays.map((d) => (
            <div 
              key={`week-${d.day}`}
              data-today={d.isToday}
              onClick={() => { vibrateLight(); setPreviewDay(d.day); }}
              className={`snap-center shrink-0 w-[240px] p-4 rounded-2xl border cursor-pointer transition-all ${
                d.isToday 
                  ? "bg-surface-raised border-primary shadow-lg ring-1 ring-primary/30" 
                  : d.isCompleted
                    ? "bg-surface/50 border-border opacity-70"
                    : "bg-surface border-border hover:border-primary/50"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`text-sm font-bold ${d.isToday ? "text-primary" : "text-muted-foreground"}`}>
                  اليوم {d.day}
                </span>
                {d.isCompleted && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </div>
              <h3 className={`font-bold text-lg mb-1 ${d.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                {d.surah}
              </h3>
              {d.range && <p className="text-sm text-secondary mb-2">{d.range}</p>}
              {d.startText && (
                <p className="font-quran text-foreground/80 leading-loose text-sm truncate">
                  &quot;{d.startText}&quot;
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── القسم الثاني: محطات الأجزاء ─── */}
      <section className="px-2">
        <h2 className="font-bold text-lg mb-4">محطات الرحلة</h2>
        <div className="space-y-4">
          {juzMilestones.map((m) => (
            <JuzCard 
              key={`juz-${m.juz}`} 
              milestone={m} 
              isCurrent={m.juz === currentJuz}
              onDayClick={(day) => { vibrateLight(); setPreviewDay(day); }}
            />
          ))}
        </div>
      </section>

      {/* ─── نافذة التفاصيل ─── */}
      {previewDay !== null && (
        <DayPreviewModal
          day={previewDay}
          farReviewPointer={farReviewPointer || 1}
          onClose={() => setPreviewDay(null)}
        />
      )}
    </div>
  );
}

function JuzCard({ milestone, isCurrent, onDayClick }: { milestone: JuzMilestone; isCurrent: boolean; onDayClick: (d: number) => void }) {
  const [isOpen, setIsOpen] = useState(isCurrent);

  if (!milestone.isUnlocked) {
    return (
      <div className="bg-surface/40 rounded-2xl p-5 border border-border/50 flex items-center justify-between opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="font-bold text-muted-foreground">الجزء {milestone.juz}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-2xl border transition-all ${isCurrent ? "border-primary/50 shadow-md" : "border-border"}`}>
      <button 
        onClick={() => { vibrateLight(); setIsOpen(!isOpen); }}
        className="w-full p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            milestone.isCompleted ? "bg-primary text-primary-foreground" : isCurrent ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {milestone.juz}
          </div>
          <div className="text-right">
            <h3 className="font-bold text-lg">الجزء {milestone.juz}</h3>
            <p className="text-xs text-muted-foreground">
              {milestone.isCompleted ? "مكتمل بالكامل 🎉" : `${milestone.days.filter(d => d.isCompleted).length} من ${milestone.days.length} يوماً`}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 border-t border-border/50">
              <div className="flex flex-wrap gap-2 mt-4">
                {milestone.days.map((d) => (
                  <button
                    key={d.day}
                    onClick={() => onDayClick(d.day)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all relative ${
                      d.isToday 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110 z-10" 
                        : d.isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-background text-muted-foreground border border-border hover:border-primary/50"
                    }`}
                  >
                    {d.isCompleted && !d.isToday ? <CheckCircle2 className="w-5 h-5" /> : d.day}
                    
                    {/* Small dot indicator for review-only days */}
                    {d.isReviewOnly && !d.isCompleted && !d.isToday && (
                      <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary/20" /> حفظ منجز</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500/50" /> مراجعة فقط</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
