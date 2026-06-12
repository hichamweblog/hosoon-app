"use client";

import type { FortressTasks } from "@/lib/fortress-calculator";
import { getThumun } from "@/lib/fortress-calculator";
import type { DailyTasks } from "@/store/useHifzStore";
import { useHifzStore } from "@/store/useHifzStore";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CheckCircle2, ChevronDown, ClipboardList } from "lucide-react";
import { useState } from "react";
import { vibrateLight } from "@/lib/haptic";
import ThumunCard from "./ThumunCard";

interface Props {
  tasks: FortressTasks;
  dayTasks: DailyTasks;
  currentDay: number;
}

export default function PrepTab({ tasks, dayTasks, currentDay }: Props) {
  const { toggleTask } = useHifzStore();
  const [showWeekly, setShowWeekly] = useState(false);

  // Get the 8 upcoming thumuns for weekly prep
  const weeklyThumuns = Array.from({ length: 8 }, (_, i) => getThumun(currentDay + i + 1)).filter(Boolean);

  return (
    <div className="space-y-4">

      {/* ═══ الختمة ═══ */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <CheckBtn checked={dayTasks.khatma} onToggle={() => toggleTask(currentDay, "khatma")} />
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">الختمة</h3>
            <BookOpen className="w-5 h-5 text-sky-400" />
          </div>
        </div>

        {tasks.khatma && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">تلاوة</p>
              <p className="font-bold text-lg text-foreground">{tasks.khatma.recitation}</p>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">استماع</p>
              <p className="font-bold text-lg text-foreground">{tasks.khatma.listening}</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ التحضير ═══ */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <CheckBtn
            checked={dayTasks.prep_weekly && dayTasks.prep_night && dayTasks.prep_pre}
            onToggle={() => {
              if (!dayTasks.prep_weekly) toggleTask(currentDay, "prep_weekly");
              if (!dayTasks.prep_night) toggleTask(currentDay, "prep_night");
              if (!dayTasks.prep_pre) toggleTask(currentDay, "prep_pre");
            }}
          />
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">التحضير</h3>
            <ClipboardList className="w-5 h-5 text-violet-400" />
          </div>
        </div>

        <div className="space-y-5">
          {/* التحضير الأسبوعي */}
          <div>
            <div className="flex items-center justify-between">
              <button onClick={() => setShowWeekly(!showWeekly)}
                className="text-primary text-sm font-semibold flex items-center gap-1 hover:underline">
                عرض الأثمان ال 8 القادمة
                <ChevronDown className={`w-4 h-4 transition-transform ${showWeekly ? "rotate-180" : ""}`} />
              </button>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">التحضير الأسبوعي</p>
                <CheckBtn checked={dayTasks.prep_weekly} onToggle={() => toggleTask(currentDay, "prep_weekly")} small />
              </div>
            </div>

            <AnimatePresence>
              {showWeekly && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-2 mt-3">
                    {weeklyThumuns.map((t) => t && (
                      <ThumunCard key={t.id} thumun={t} accentColor="bg-violet-500/20 text-violet-400" />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border-t border-border" />

          {/* التحضير الليلي */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">(ليلة الغد)</span>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">التحضير الليلي</p>
                <CheckBtn checked={dayTasks.prep_night} onToggle={() => toggleTask(currentDay, "prep_night")} small />
              </div>
            </div>
            {tasks.prepNight && (
              <ThumunCard thumun={tasks.prepNight} accentColor="bg-indigo-500/20 text-indigo-400" />
            )}
          </div>

          <div className="border-t border-border" />

          {/* التحضير القبلي */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">(قبل الحفظ)</span>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">التحضير القبلي</p>
                <CheckBtn checked={dayTasks.prep_pre} onToggle={() => toggleTask(currentDay, "prep_pre")} small />
              </div>
            </div>
            {tasks.prepPre && (
              <ThumunCard thumun={tasks.prepPre} accentColor="bg-amber-500/20 text-amber-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Checkbox helper ═══ */
function CheckBtn({ checked, onToggle, small }: { checked?: boolean; onToggle: () => void; small?: boolean }) {
  const size = small ? "w-5 h-5" : "w-6 h-6";
  const handleToggle = () => {
    vibrateLight();
    onToggle();
  };
  return (
    <button onClick={handleToggle}
      className={`${size} rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
        checked ? "bg-primary border-primary" : "border-muted-foreground/30"
      }`}>
      {checked && <CheckCircle2 className={`${small ? "w-3 h-3" : "w-4 h-4"} text-primary-foreground`} />}
    </button>
  );
}
