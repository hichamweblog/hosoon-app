"use client";

import type { FortressTasks } from "@/lib/fortress-calculator";
import type { DailyTasks } from "@/store/useHifzStore";
import { useHifzStore } from "@/store/useHifzStore";
import { vibrateLight } from "@/lib/haptic";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, History } from "lucide-react";

interface Props {
  tasks: FortressTasks;
  dayTasks: DailyTasks;
  currentDay: number;
}

export default function ReviewTab({ tasks, dayTasks, currentDay }: Props) {
  const { toggleTask } = useHifzStore();

  const handleOpenReviewSession = () => {
    if (!dayTasks.review_near && tasks.reviewNear.length > 0) {
      window.dispatchEvent(new CustomEvent("openSession", {
        detail: { type: "review_near", target: tasks.reviewNear[0] },
      }));
    }
  };

  return (
    <div className="space-y-4">

      {/* ═══ مراجعة القريب ═══ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="surface-card p-5">
        <div className="flex items-center justify-between mb-5">
          <CheckBtn checked={dayTasks.review_near} onToggle={() => toggleTask(currentDay, "review_near")} />
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">مراجعة القريب</h3>
            <History className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {tasks.reviewNear.length > 0 ? (
          <div className="space-y-4">
            <ReviewBoundary
              label="من بداية"
              thumunId={tasks.reviewNear[tasks.reviewNear.length - 1].id}
              surah={tasks.reviewNear[tasks.reviewNear.length - 1].surah}
              startText={tasks.reviewNear[tasks.reviewNear.length - 1].startText}
            />
            <ReviewBoundary
              label="إلى نهاية"
              thumunId={tasks.reviewNear[0].id}
              surah={tasks.reviewNear[0].surah}
              startText={tasks.reviewNear[0].startText}
            />
            {!dayTasks.review_near && (
              <button onClick={handleOpenReviewSession}
                className="w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-sm hover:bg-emerald-500/20 transition-colors">
                ابدأ جلسة المراجعة القريبة
              </button>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">تبدأ من اليوم الثاني للحفظ</p>
        )}
      </motion.div>

      {/* ═══ مراجعة البعيد ═══ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="surface-card p-5">
        <div className="flex items-center justify-between mb-5">
          <CheckBtn checked={dayTasks.review_far} onToggle={() => toggleTask(currentDay, "review_far")} />
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">مراجعة البعيد</h3>
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        {tasks.reviewFar ? (
          <div className="space-y-4">
            <ReviewBoundary
              label="من بداية"
              thumunId={tasks.reviewFar.start.id}
              surah={tasks.reviewFar.start.surah}
              startText={tasks.reviewFar.start.startText}
            />
            <ReviewBoundary
              label="إلى نهاية"
              thumunId={tasks.reviewFar.end.id}
              surah={tasks.reviewFar.end.surah}
              startText={tasks.reviewFar.end.startText}
            />
            {!dayTasks.review_far && (
              <button onClick={() => toggleTask(currentDay, "review_far")}
                className="w-full py-3 rounded-xl bg-indigo-500/10 text-indigo-500 font-bold text-sm hover:bg-indigo-500/20 transition-colors">
                تحديد كمكتملة
              </button>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">تبدأ من اليوم التاسع للحفظ</p>
        )}
      </motion.div>
    </div>
  );
}

/* ═══ Review Boundary Display ═══ */
function ReviewBoundary({
  label, thumunId, surah, startText
}: {
  label: string; thumunId: number; surah: string; startText?: string;
}) {
  return (
    <div className="bg-surface rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-2">{label} (ثمن {thumunId}):</p>
      <p className="font-semibold text-foreground">{surah}</p>
      {startText && (
        <p className="font-quran text-foreground/80 text-base leading-loose mt-1.5 truncate">
          &quot;{startText}&quot;
        </p>
      )}
    </div>
  );
}

/* ═══ Checkbox helper ═══ */
function CheckBtn({ checked, onToggle }: { checked?: boolean; onToggle: () => void }) {
  const handleToggle = () => {
    vibrateLight();
    onToggle();
  };
  return (
    <button onClick={handleToggle}
      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
        checked ? "bg-primary border-primary" : "border-muted-foreground/30"
      }`}>
      {checked && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
    </button>
  );
}
