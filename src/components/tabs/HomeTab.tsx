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
import { vibrateLight, vibrateSuccess, playDing } from "@/lib/haptic";
import ThumunCard from "./ThumunCard";
import { useXpStore } from "@/store/useXpStore";

interface Props {
  tasks: FortressTasks;
  dayTasks: DailyTasks;
  currentDay: number;
}

export default function HomeTab({ tasks, dayTasks, currentDay }: Props) {
  const { toggleTask, advanceDay, recordDailyCompletion, addXp } = useHifzStore();
  const { addEvent } = useXpStore();
  const celebratedRef = useRef(false);
  const quote = MOTIVATIONAL_QUOTES[currentDay % MOTIVATIONAL_QUOTES.length];

  const isAllDone = tasks.taskKeys.every((k) => dayTasks[k]);

  useEffect(() => {
    if (isAllDone && !celebratedRef.current) {
      celebratedRef.current = true;
      toast.success("تم إنجاز مهام هذا الثمن!", { description: "تقبل الله منك." });
      setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: ["#4F9D7E", "#D4A85B", "#FFF"] }), 300);
    }
    if (!isAllDone) celebratedRef.current = false;
  }, [isAllDone]);

  const handleAdvance = () => {
    vibrateSuccess();
    recordDailyCompletion(currentDay, true, tasks.taskKeys.length);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4f9d7e', '#fbbf24', '#3b82f6', '#f43f5e'],
      zIndex: 9999
    });
    advanceDay();
    celebratedRef.current = false;
    toast("تم الانتقال للثمن التالي", { icon: "✨" });
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
              <button onClick={(e) => { 
                  vibrateLight(); 
                  if (!dayTasks.new_hifz) {
                    playDing(); 
                    addEvent(50, e.clientX, e.clientY);
                    addXp(50);
                  }
                  toggleTask(currentDay, "new_hifz"); 
                }}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                  dayTasks.new_hifz ? "bg-primary border-primary scale-110 shadow-[0_0_12px_rgba(79,157,126,0.5)]" : "border-muted-foreground/30 hover:border-primary/50 hover:scale-105"
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
            إتمام الثمن والانتقال للتالي
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
