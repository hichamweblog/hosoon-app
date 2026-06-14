"use client";

import type { FortressTasks } from "@/lib/fortress-calculator";
import { getThumun } from "@/lib/fortress-calculator";
import type { DailyTasks } from "@/store/useHifzStore";
import { useHifzStore } from "@/store/useHifzStore";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CheckCircle2, ChevronDown, ClipboardList } from "lucide-react";
import { useState } from "react";
import { vibrateLight, playDing } from "@/lib/haptic";
import ThumunCard from "./ThumunCard";
import { useXpStore } from "@/store/useXpStore";

interface Props {
  tasks: FortressTasks;
  dayTasks: DailyTasks;
  currentDay: number;
}

export default function PrepTab({ tasks, dayTasks, currentDay }: Props) {
  const { toggleTask, addXp } = useHifzStore();
  const { addEvent } = useXpStore();
  const [showWeekly, setShowWeekly] = useState(false);

  // Get the 8 upcoming thumuns for weekly prep
  const weeklyThumuns = Array.from({ length: 8 }, (_, i) => getThumun(currentDay + i + 1)).filter(Boolean);

  return (
    <div className="space-y-4">

      {/* ═══ التحضير ═══ */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <CheckBtn
            checked={dayTasks.prep_weekly}
            onToggle={(e) => {
              if (!dayTasks.prep_weekly) {
                addEvent(10, e.clientX, e.clientY);
                addXp(10);
              }
              toggleTask(currentDay, "prep_weekly");
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
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("openSession", {
                        detail: { type: "prep", target: { thumuns: weeklyThumuns } },
                      })
                    );
                  }}
                  className="bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold py-1.5 px-3 rounded-full transition-colors"
                >
                  بدء جلسة
                </button>
                <CheckBtn checked={dayTasks.prep_weekly} onToggle={(e) => {
                  if (!dayTasks.prep_weekly) {
                    addEvent(10, e.clientX, e.clientY);
                    addXp(10);
                  }
                  toggleTask(currentDay, "prep_weekly");
                }} small />
              </div>
            </div>

            <AnimatePresence>
              {showWeekly && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-2 mt-3">
                    {weeklyThumuns.map((t) => t && (
                      <ThumunCard 
                        key={t.id} 
                        thumun={t} 
                        accentColor="bg-violet-500/20 text-violet-400"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ═══ Checkbox helper ═══ */
function CheckBtn({ checked, onToggle, small }: { checked?: boolean; onToggle: (e: React.MouseEvent) => void; small?: boolean }) {
  const size = small ? "w-5 h-5" : "w-6 h-6";
  const handleToggle = (e: React.MouseEvent) => {
    vibrateLight();
    if (!checked) playDing();
    onToggle(e);
  };
  return (
    <button onClick={handleToggle}
      className={`${size} rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
        checked ? "bg-primary border-primary scale-110 shadow-[0_0_12px_rgba(79,157,126,0.5)]" : "border-muted-foreground/30 hover:scale-105 hover:border-primary/50"
      }`}>
      {checked && <CheckCircle2 className={`${small ? "w-3 h-3" : "w-4 h-4"} text-primary-foreground`} />}
    </button>
  );
}
