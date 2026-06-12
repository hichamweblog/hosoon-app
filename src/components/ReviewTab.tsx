"use client";

import { MOTIVATIONAL_QUOTES } from "@/lib/constants";
import { getFortressTasks } from "@/lib/fortress-calculator";
import { TaskType, useHifzStore } from "@/store/useHifzStore";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, History } from "lucide-react";
import { Button } from "./ui/button";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 25, stiffness: 300 },
  },
};

export default function ReviewTab() {
  const { currentDay, completedTasks, farReviewPointer, toggleTask } =
    useHifzStore();

  const tasks = getFortressTasks(currentDay, farReviewPointer || 1);
  const dayTasks = completedTasks[currentDay] || {};

  const dailyQuote =
    MOTIVATIONAL_QUOTES[(currentDay + 3) % MOTIVATIONAL_QUOTES.length]; // Give it a different offset or standard quote

  const handleToggle = (taskKey: TaskType) => {
    toggleTask(currentDay, taskKey);
  };

  const handleOpenSession = (type: string, target: any) => {
    const event = new CustomEvent("openSession", {
      detail: { type, target },
    });
    window.dispatchEvent(event);
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
      dir="rtl">
      {/* Header */}
      <motion.section variants={item} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mb-2">
          حصون المراجعة
        </h1>
        <p className="text-secondary text-sm">
          تعهد القرآن كما أمرنا النبي صلى الله عليه وسلم. المراجعة هي سر الرسوخ.
        </p>
      </motion.section>

      {/* Near Review */}
      {tasks.reviewNear.length > 0 ? (
        <motion.section
          variants={item}
          className="bg-surface rounded-xl p-5 relative shadow-sm border border-border/50">
          <div className="absolute top-4 right-0 bottom-4 w-1 bg-[#34D399] rounded-r-full" />
          <div className="pr-4">
            <div className="flex justify-between items-center mb-5 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#34D399]/20 p-2 rounded-lg">
                  <History className="w-5 h-5 text-[#34D399]" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">المراجعة القريبة</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    آخر وحداث حفظتها لضمان تثبيتها
                  </p>
                </div>
              </div>
              <span className="bg-muted text-secondary text-xs px-2.5 py-1 rounded-full font-bold">
                {tasks.reviewNear.length} اليوم
              </span>
            </div>

            <div className="space-y-5">
              <div className="bg-background/50 rounded-xl p-4 border border-border/50 text-sm space-y-4">
                <div className="flex flex-col gap-2">
                  <span className="text-muted-foreground text-xs">
                    من بداية (ثمن{" "}
                    {tasks.reviewNear[tasks.reviewNear.length - 1].id}):
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">
                      سورة {tasks.reviewNear[tasks.reviewNear.length - 1].surah}{" "}
                      <span className="text-muted-foreground font-normal ml-1">
                        (آية{" "}
                        {
                          tasks.reviewNear[tasks.reviewNear.length - 1]
                            .startAyah
                        }
                        )
                      </span>
                    </span>
                  </div>
                  <p className="font-quran text-foreground/80 text-base leading-loose pr-3 border-r-2 border-primary/40">
                    &quot;
                    {tasks.reviewNear[tasks.reviewNear.length - 1].startText}
                    &quot;
                  </p>
                </div>
                <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
                  <span className="text-muted-foreground text-xs">
                    إلى نهاية (ثمن {tasks.reviewNear[0].id}):
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">
                      سورة {tasks.reviewNear[0].surah}{" "}
                      <span className="text-muted-foreground font-normal ml-1">
                        (إلى آية {tasks.reviewNear[0].endAyah})
                      </span>
                    </span>
                  </div>
                  <p className="font-quran text-foreground/80 text-base leading-loose pr-3 border-r-2 border-primary/40">
                    &quot;{tasks.reviewNear[0].startText}&quot;
                  </p>
                </div>
              </div>

              <Button
                className="w-full h-12 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold shadow-none"
                onClick={() => {
                  if (!dayTasks.review_near) {
                    handleOpenSession("review_near", tasks.reviewNear[0]);
                  } else {
                    handleToggle("review_near");
                  }
                }}>
                {dayTasks.review_near ? "مكتملة" : "ابدأ جلسة المراجعة القريبة"}
                {dayTasks.review_near && (
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                )}
              </Button>
            </div>
          </div>
        </motion.section>
      ) : (
        <p className="text-secondary text-center py-4 bg-surface rounded-xl border border-border/50">
          لا يوجد مراجعة قريبة اليوم
        </p>
      )}

      {/* Far Review */}
      {tasks.reviewFar ? (
        <motion.section
          variants={item}
          className="bg-surface rounded-xl p-5 relative shadow-sm border border-border/50">
          <div className="absolute top-4 right-0 bottom-4 w-1 bg-[#818CF8] rounded-r-full" />
          <div className="pr-4">
            <div className="flex justify-between items-center mb-5 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#818CF8]/20 p-2 rounded-lg">
                  <BookOpen className="w-5 h-5 text-[#818CF8]" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">المراجعة البعيدة</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    المرور الدوري على ما تم حفظه سابقاً
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-background/50 rounded-xl p-4 border border-border/50 text-sm space-y-4">
                <span className="text-muted-foreground text-xs block mb-1">
                  من بداية (ثمن {tasks.reviewFar.start.id}):
                </span>
                <div className="flex justify-between items-center bg-surface/50 p-2.5 rounded-lg border border-border/30">
                  <span className="font-medium text-foreground">
                    سورة {tasks.reviewFar.start.surah}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    آية {tasks.reviewFar.start.startAyah}
                  </span>
                </div>

                <span className="text-muted-foreground text-xs block mt-4 mb-1">
                  إلى نهاية (ثمن {tasks.reviewFar.end.id}):
                </span>
                <div className="flex justify-between items-center bg-surface/50 p-2.5 rounded-lg border border-border/30">
                  <span className="font-medium text-foreground">
                    سورة {tasks.reviewFar.end.surah}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    إلى آية {tasks.reviewFar.end.endAyah}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold shadow-none"
                onClick={() => {
                  if (!dayTasks.review_far) {
                    handleOpenSession("review_far", tasks.reviewFar);
                  } else {
                    handleToggle("review_far");
                  }
                }}>
                {dayTasks.review_far ? "مكتملة" : "تحديد كمكتملة"}
                {dayTasks.review_far && (
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                )}
              </Button>
            </div>
          </div>
        </motion.section>
      ) : (
        <p className="text-secondary text-center py-4 bg-surface rounded-xl border border-border/50">
          لا يوجد مراجعة بعيدة اليوم
        </p>
      )}

      {/* Reflection Quote */}
      <motion.section variants={item} className="text-center py-8">
        <p className="font-quran text-foreground opacity-90 text-[24px] leading-loose">
          {dailyQuote.text}
        </p>
      </motion.section>
    </motion.div>
  );
}
