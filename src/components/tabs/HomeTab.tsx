"use client";

import { MOTIVATIONAL_QUOTES } from "@/lib/constants";
import type { FortressTasks } from "@/lib/fortress-calculator";
import type { DailyTasks } from "@/store/useHifzStore";
import { useHifzStore } from "@/store/useHifzStore";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { vibrateLight, vibrateSuccess } from "@/lib/haptic";
import ThumunCard from "./ThumunCard";

interface Props {
  tasks: FortressTasks;
  dayTasks: DailyTasks;
  currentDay: number;
}

export default function HomeTab({ tasks, dayTasks, currentDay }: Props) {
  const { toggleTask, advanceDay, recordDailyCompletion } = useHifzStore();
  const celebratedRef = useRef(false);
  const quote = MOTIVATIONAL_QUOTES[currentDay % MOTIVATIONAL_QUOTES.length];

  const isAllDone = tasks.taskKeys.every((k) => dayTasks[k]);

  useEffect(() => {
    if (isAllDone && !celebratedRef.current) {
      celebratedRef.current = true;
      toast.success("تم إنجاز جميع مهام اليوم!", { description: "تقبل الله منك." });
      setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: ["#4F9D7E", "#D4A85B", "#FFF"] }), 300);
    }
    if (!isAllDone) celebratedRef.current = false;
  }, [isAllDone]);

  const handleAdvance = () => {
    vibrateSuccess();
    recordDailyCompletion(currentDay, true, tasks.taskKeys.length);
    advanceDay();
    celebratedRef.current = false;
    toast("تم الانتقال لليوم التالي", { icon: "🌅" });
  };

  const handleOpenSession = () => {
    if (!dayTasks.new_hifz && tasks.newHifz) {
      window.dispatchEvent(new CustomEvent("openSession", { detail: { type: "new_hifz", target: tasks.newHifz } }));
    }
  };

  return (
    <div className="space-y-5">
      {/* Quote */}
      <div className="text-center py-5 px-3">
        <p className="font-quran text-foreground/90 text-xl sm:text-2xl leading-[2.2]">
          &quot;{quote.text}&quot;
        </p>
        <p className="text-xs text-muted-foreground mt-2">— {quote.source}</p>
      </div>

      {/* New Hifz Card */}
      {tasks.newHifz && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="surface-card p-5 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => { vibrateLight(); toggleTask(currentDay, "new_hifz"); }}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  dayTasks.new_hifz ? "bg-primary border-primary" : "border-muted-foreground/30"
                }`}>
                {dayTasks.new_hifz && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground">الجديد</h3>
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
          </div>

          <ThumunCard
            thumun={tasks.newHifz}
            accentColor="bg-accent text-accent-foreground"
            onClick={handleOpenSession}
            actionLabel={dayTasks.new_hifz ? undefined : "ابدأ الجلسة"}
          />
        </motion.div>
      )}

      {/* Advance Day */}
      {isAllDone && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pt-4">
          <button onClick={handleAdvance}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            إنهاء يومك والانتقال للغد
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
