"use client";

import { MILESTONES, THUMUNS_PER_JUZ, TOTAL_THUMUNS } from "@/lib/constants";
import { useHifzStore } from "@/store/useHifzStore";
import ActivityHeatmap from "./ActivityHeatmap";
import JourneyRoadmap from "./JourneyRoadmap";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Flame,
  Share2,
  Target,
  Trophy,
} from "lucide-react";
import { useMemo } from "react";

import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 20 },
  },
};

export default function StatsDashboard() {
  const { streak, bestStreak, dailyLog, completedTasks, editedThumuns, currentDay, totalXp } = useHifzStore();

  const highestCompletedDay = useMemo(() => {
    const days = Object.keys(completedTasks)
      .map(Number)
      .filter((d) => {
        const t = completedTasks[d];
        return Object.values(t).some(Boolean);
      });
    return days.length > 0 ? Math.max(...days) : 0;
  }, [completedTasks]);

  const totalCompleted = highestCompletedDay;
  const progressPercentage = (totalCompleted / TOTAL_THUMUNS) * 100;
  const juzCount = Math.floor(totalCompleted / THUMUNS_PER_JUZ);

  const nextMilestone =
    MILESTONES.find((m) => totalCompleted < m.threshold) ||
    MILESTONES[MILESTONES.length - 1];

  const copyStats = () => {
    const text = `أكملت ${juzCount} جزء (${totalCompleted} ثمن) في مشروع حصون لحفظ القرآن!\nالسلسلة الحالية: ${streak} أيام 🔥\nالهدف القادم: ${nextMilestone.label}\n\n"وَفِي ذَلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ"`;
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ الإحصائيات بنجاح!", {
      description: "يمكنك الآن مشاركتها مع أصدقائك.",
    });
  };

  const perfectDaysCount = Object.values(dailyLog || {}).filter(log => log.completedAll).length;
  const editedCount = Object.keys(editedThumuns || {}).length;

  const specialAchievements = [
    { id: "streak_7", label: "شعلة لا تنطفئ", description: "الاستمرار لـ 7 أيام متتالية", icon: "🔥", isEarned: bestStreak >= 7 },
    { id: "streak_30", label: "أسد الحصون", description: "الاستمرار لـ 30 يوماً بلا انقطاع", icon: "🦁", isEarned: bestStreak >= 30 },
    { id: "streak_100", label: "المعسكر المغلق", description: "الاستمرار لـ 100 يوم متتالية", icon: "🏕️", isEarned: bestStreak >= 100 },
    { id: "perfect_10", label: "درع الالتزام", description: "إتمام 10 أيام مثالية", icon: "🛡️", isEarned: perfectDaysCount >= 10 },
    { id: "perfect_50", label: "حصن متين", description: "تحقيق 50 يوماً مثالياً", icon: "🏰", isEarned: perfectDaysCount >= 50 },
    { id: "xp_1000", label: "جامع الغنائم", description: "جمع 1,000 نقطة خبرة", icon: "💰", isEarned: totalXp >= 1000 },
    { id: "xp_10000", label: "صاحب الألفيات", description: "جمع 10,000 نقطة خبرة", icon: "💎", isEarned: totalXp >= 10000 },
    { id: "baqarah_imran", label: "حارس الزهراوين", description: "إتمام سورتي البقرة وآل عمران", icon: "🌸", isEarned: totalCompleted >= 70 },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
      dir="rtl">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div
          variants={item}
          className="glass-card-premium rounded-3xl p-5 border border-border/50 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3">
              <Trophy className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">الأجزاء المحفوظة</p>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold">{juzCount}</h3>
            <span className="text-sm text-muted-foreground">/ 30</span>
          </div>
        </motion.div>

        <motion.div
          variants={item}
          className="glass-card-premium rounded-3xl p-5 border border-border/50 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Target className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">الأثمان (التقدم)</p>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold">{totalCompleted}</h3>
            <span className="text-sm text-muted-foreground">/ 480</span>
          </div>
        </motion.div>

        <motion.div
          variants={item}
          className="glass-card-premium rounded-3xl p-5 border border-amber-500/30 bg-amber-500/5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
              <span className="text-xl font-bold font-mono">XP</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">نقاط الخبرة</p>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-amber-500 drop-shadow-sm">{totalXp || 0}</h3>
          </div>
        </motion.div>

        <motion.div
          variants={item}
          className="glass-card-premium rounded-3xl p-5 border border-border/50 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3">
              <Flame className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">السلسلة الحالية</p>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-orange-500">{streak}</h3>
              <span className="text-sm text-muted-foreground">أيام</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              الأفضل: {bestStreak}
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={item}
          className="glass-card-premium rounded-3xl p-5 border border-border/50 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-3">
              <CalendarDays className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">نسبة الإنجاز</p>
          </div>
          <h3 className="text-3xl font-bold text-gradient-primary">
            {progressPercentage.toFixed(1)}%
          </h3>

          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
        </motion.div>
      </div>

      {/* Main Stats Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Heatmap replaces old 30-day chart */}
        <motion.div
          variants={item}
          className="lg:col-span-2 min-w-0">
          <ActivityHeatmap />
        </motion.div>

        {/* Next Target */}
        <motion.div
          variants={item}
          className="glass-panel rounded-3xl p-6 border border-border/50 flex flex-col">
          <h3 className="text-lg font-bold mb-1">الهدف القادم</h3>
          <p className="text-sm text-muted-foreground mb-6">
            واصل التقدم للوصول للوسام التالي
          </p>

          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-background/40 rounded-2xl border border-border/50">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-3xl mb-4 relative">
              {nextMilestone.icon}
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse" />
            </div>
            <h4 className="font-bold text-lg mb-2">{nextMilestone.label}</h4>
            <div className="w-full bg-muted rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="bg-accent h-2.5 rounded-full"
                style={{
                  width: `${(totalCompleted / nextMilestone.threshold) * 100}%`,
                }}></div>
            </div>
            <p className="text-sm text-muted-foreground">
              متبقي {nextMilestone.threshold - totalCompleted} أثمان
            </p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <motion.div variants={item}>
          <JourneyRoadmap totalCompleted={totalCompleted} />
        </motion.div>
      </div>

      {/* Milestones / Badges Grid */}
      <motion.div variants={item}>
        <h3 className="text-lg font-bold mb-4 px-2">أوسمة الإنجاز</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MILESTONES.map((milestone) => {
            const isEarned = totalCompleted >= milestone.threshold;
            return (
              <div
                key={milestone.id}
                className={`relative p-4 rounded-2xl border ${
                  isEarned
                    ? "bg-card border-border/50 shadow-sm"
                    : "bg-background/50 border-transparent opacity-60 grayscale"
                }`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-2xl ${!isEarned && "opacity-50"}`}>
                    {milestone.icon}
                  </span>
                  {isEarned && (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  )}
                </div>
                <h4 className="font-bold text-sm mb-1">{milestone.label}</h4>
                <p className="text-xs text-muted-foreground">
                  {milestone.threshold} ثمن
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Special Achievements */}
      <motion.div variants={item}>
        <h3 className="text-lg font-bold mb-4 px-2">إنجازات خاصة</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {specialAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`relative p-5 rounded-2xl border flex items-center gap-4 transition-all ${
                achievement.isEarned
                  ? "bg-card border-border/50 shadow-sm"
                  : "bg-background/50 border-transparent opacity-60 grayscale"
              }`}>
              <div className="text-4xl flex-shrink-0 relative">
                {achievement.icon}
                {achievement.isEarned && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">{achievement.label}</h4>
                <p className="text-xs text-muted-foreground">
                  {achievement.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
