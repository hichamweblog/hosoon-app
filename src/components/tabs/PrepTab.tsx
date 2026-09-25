"use client";

import { XP_TABLE } from "@/lib/constants";
import { vibrateLight } from "@/lib/haptic";
import type { FortressTasks } from "@/lib/fortress-calculator";
import type { DailyTasks } from "@/store/useHifzStore";
import { useHifzStore } from "@/store/useHifzStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useXpStore } from "@/store/useXpStore";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ClipboardList, GraduationCap } from "lucide-react";
import { useState } from "react";
import TaskCheckbox from "../ui/task-checkbox";
import ThumunCard from "./ThumunCard";

interface Props {
  tasks: FortressTasks;
  dayTasks: DailyTasks;
  currentDay: number;
}

export default function PrepTab({ tasks, dayTasks, currentDay }: Props) {
  const toggle = useHifzStore((s) => s.toggleTask);
  const addEvent = useXpStore((s) => s.addEvent);
  const openSession = useSessionStore((s) => s.open);
  const [showWeekly, setShowWeekly] = useState(false);

  return (
    <div className="space-y-4">
      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <TaskCheckbox
            checked={!!dayTasks.prep_weekly}
            label="تم التحضير الأسبوعي"
            onToggle={(e) => {
              if (!dayTasks.prep_weekly) addEvent(XP_TABLE.prep_weekly, e.clientX, e.clientY);
              toggle(currentDay, "prep_weekly");
            }}
          />
          <h3 className="font-bold text-lg flex items-center gap-2">
            التحضير
            <ClipboardList className="w-5 h-5 text-f-prep" aria-hidden />
          </h3>
        </div>

        <div className="bg-f-prep/5 border border-f-prep/20 rounded-xl p-3 text-xs text-muted-foreground mb-4 leading-relaxed">
          التحضير في الحصون: أسبوعي (تلاوة ما سيأتي هذا الأسبوع)، وليلي (تلاوة غداً قبل
          النوم)، وقبلي (تلاوة الثمن قبل الحفظ). هنا تجد نافذتك الأسبوعية — وللتحضير
          الليلي والقبلي ابدأ جلسة بالتلاوة المطلوبة.
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowWeekly(!showWeekly)}
            className="text-primary text-sm font-semibold flex items-center gap-1 hover:underline"
            aria-expanded={showWeekly}
          >
            عرض الأثمان الثمانية القادمة
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showWeekly ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          <button
            onClick={() => {
              vibrateLight();
              openSession({ kind: "prep", day: currentDay, thumuns: tasks.prepWeekly });
            }}
            className="bg-f-prep hover:opacity-90 text-white text-xs font-bold py-1.5 px-3 rounded-full transition-opacity"
          >
            بدء جلسة
          </button>
        </div>

        <AnimatePresence>
          {showWeekly && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 mt-3">
                {tasks.prepWeekly.map((t) => (
                  <ThumunCard
                    key={t.id}
                    thumun={t}
                    accentClass="bg-f-prep/20 text-f-prep"
                    compact
                  />
                ))}
                {tasks.prepWeekly.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    اقتربت من نهاية الرحلة — لا أثمان قادمة
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="surface-card p-5 flex items-start gap-3">
        <GraduationCap className="w-5 h-5 text-f-prep mt-0.5" aria-hidden />
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-bold text-foreground">لماذا نحضّر؟ </span>
          التحضير يهيئ الأذن واللسان للحفظ الجديد، فيسهل التلاوة ويقل اللحن في الحفظ.
          خذ وقتك في الاستماع والتلاوة السريعة دون حفظ.
        </p>
      </div>
    </div>
  );
}
