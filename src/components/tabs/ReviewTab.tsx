"use client";

import { XP_TABLE } from "@/lib/constants";
import type { FortressTasks } from "@/lib/fortress-calculator";
import type { DailyTasks } from "@/store/useHifzStore";
import { useHifzStore } from "@/store/useHifzStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useXpStore } from "@/store/useXpStore";
import { motion } from "framer-motion";
import { BookOpen, History, Star, Undo2 } from "lucide-react";
import TaskCheckbox from "../ui/task-checkbox";
import ThumunCard from "./ThumunCard";
import { thumunShort, thumunTitle } from "@/lib/quran-labels";

interface Props {
  tasks: FortressTasks;
  dayTasks: DailyTasks;
  currentDay: number;
}

export default function ReviewTab({ tasks, dayTasks, currentDay }: Props) {
  const toggle = useHifzStore((s) => s.toggleTask);
  const setRating = useHifzStore((s) => s.setThumunRating);
  const addEvent = useXpStore((s) => s.addEvent);
  const openSession = useSessionStore((s) => s.open);

  return (
    <div className="space-y-4">
      {/* ─── مراجعة القريب ─── */}
      {tasks.reviewNear.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <TaskCheckbox
              checked={!!dayTasks.review_near}
              label="تمت مراجعة القريب"
              onToggle={(e) => {
                if (!dayTasks.review_near) addEvent(XP_TABLE.review_near, e.clientX, e.clientY);
                toggle(currentDay, "review_near");
              }}
            />
            <h3 className="font-bold text-lg flex items-center gap-2">
              مراجعة القريب
              <History className="w-5 h-5 text-f-near" aria-hidden />
            </h3>
          </div>

          <div className="space-y-3">
            <RangeBox
              label="من بداية"
              text={thumunShort(tasks.reviewNear[tasks.reviewNear.length - 1])}
            />
            <RangeBox label="إلى نهاية" text={thumunShort(tasks.reviewNear[0])} />
            {!dayTasks.review_near && (
              <button
                onClick={() =>
                  openSession({ kind: "review_near", day: currentDay, thumuns: tasks.reviewNear })
                }
                className="w-full py-3 rounded-xl bg-f-near/10 text-f-near font-bold text-sm hover:bg-f-near/20 transition-colors"
              >
                ابدأ جلسة المراجعة القريبة (ثمانية أثمان)
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <p className="text-center text-muted-foreground py-6 bg-surface rounded-2xl border border-border/50">
          تبدأ مراجعة القريب من يومك الثاني على الرحلة
        </p>
      )}

      {/* ─── مراجعة البعيد ─── */}
      {tasks.reviewFar ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="surface-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <TaskCheckbox
              checked={!!dayTasks.review_far}
              label="تمت مراجعة البعيد"
              onToggle={(e) => {
                if (!dayTasks.review_far) addEvent(XP_TABLE.review_far, e.clientX, e.clientY);
                toggle(currentDay, "review_far");
              }}
            />
            <h3 className="font-bold text-lg flex items-center gap-2">
              مراجعة البعيد
              <BookOpen className="w-5 h-5 text-f-far" aria-hidden />
            </h3>
          </div>

          <div className="space-y-3">
            <RangeBox label="من بداية" text={thumunShort(tasks.reviewFar.start)} />
            <RangeBox label="إلى نهاية" text={thumunShort(tasks.reviewFar.end)} />
            {!dayTasks.review_far && (
              <button
                onClick={() =>
                  openSession({ kind: "review_far", day: currentDay, thumuns: tasks.reviewFar!.list })
                }
                className="w-full py-3 rounded-xl bg-f-far/10 text-f-far font-bold text-sm hover:bg-f-far/20 transition-colors"
              >
                ابدأ جلسة المراجعة البعيدة ({tasks.reviewFar.list.length} أثمان)
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <p className="text-center text-muted-foreground py-6 bg-surface rounded-2xl border border-border/50">
          تبدأ مراجعة البعيد من اليوم التاسع على الرحلة
        </p>
      )}

      {/* ─── الأثمان الضعيفة ─── */}
      {tasks.weakList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="surface-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() =>
                openSession({
                  kind: "review_far",
                  day: currentDay,
                  thumuns: tasks.weakList,
                })
              }
              className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-3 py-1.5"
            >
              جلسة تثبيت
            </button>
            <h3 className="font-bold text-lg flex items-center gap-2">
              أثمان تحتاج تثبيتاً
              <Star className="w-5 h-5 text-red-400" aria-hidden />
            </h3>
          </div>
          <div className="space-y-2">
            {tasks.weakList.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <button
                  onClick={() => setRating(t.id, null)}
                  aria-label={`إزالة علامة الضعف عن ${thumunTitle(t)}`}
                  title="إزالة العلامة"
                  className="p-1.5 rounded-full hover:bg-muted shrink-0"
                >
                  <Undo2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                </button>
                <div className="flex-1 min-w-0">
                  <ThumunCard thumun={t} accentClass="bg-red-500/15 text-red-500" compact />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function RangeBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="bg-surface rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}:</p>
      <p className="font-semibold text-foreground text-sm">{text}</p>
    </div>
  );
}
