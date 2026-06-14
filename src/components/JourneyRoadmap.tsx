import { TOTAL_HIZBS } from "@/lib/constants";
import { CheckCircle2, Lock, Star } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  totalCompleted: number;
}

export default function JourneyRoadmap({ totalCompleted }: Props) {
  const completedHizbs = Math.floor((totalCompleted || 0) / 8);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-border/50 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">خريطة الختمة (مسار الأحزاب)</h3>
          <p className="text-sm text-muted-foreground mt-1">
            أكملت {completedHizbs} من أصل 60 حزباً
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <Star className="w-6 h-6" />
        </div>
      </div>
      
      <div className="w-full max-h-80 overflow-y-auto custom-scrollbar pr-2" dir="rtl">
        <div className="flex flex-wrap justify-center gap-4 py-4">
          {Array.from({ length: TOTAL_HIZBS }).map((_, i) => {
            const isCompleted = i < completedHizbs;
            const isCurrent = i === completedHizbs;
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.01 }}
                className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 transition-all duration-300 ${
                  isCompleted 
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                    : isCurrent
                      ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(var(--color-primary),0.4)] animate-pulse"
                      : "bg-background/50 border-border text-muted-foreground opacity-50"
                }`}
              >
                <span className="font-bold text-lg font-mono">{i + 1}</span>
                {isCompleted && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  </div>
                )}
                {!isCompleted && !isCurrent && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
