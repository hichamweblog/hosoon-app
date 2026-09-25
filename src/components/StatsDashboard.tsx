"use client";

import { MILESTONES, SPECIAL_ACHIEVEMENTS } from "@/lib/constants";
import { THUMUNS_PER_JUZ } from "@/lib/quran-data";
import { formatNum } from "@/lib/format";
import { isDayCompleted, useHifzStore } from "@/store/useHifzStore";
import ActivityHeatmap from "./ActivityHeatmap";
import JourneyRoadmap from "./JourneyRoadmap";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Castle,
  CheckCircle2,
  Clock,
  Coins,
  Crown,
  Flame,
  Flower,
  Gem,
  Hammer,
  Medal,
  Mountain,
  Share2,
  Shield,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 20 } },
};

const MILESTONE_ICONS = { sprout: Flower, mountain: Mountain, shield: Shield, medal: Medal, award: Award, gem: Gem, crown: Crown, book: BookOpen };
const ACHIEVEMENT_ICONS = { flame: Flame, shield: Shield, castle: Castle, hammer: Hammer, coins: Coins, sparkles: Sparkles, flower: Flower, clock: Clock };

export default function StatsDashboard() {
  const { streak, bestStreak, dailyLog, completedTasks, totalXp, sessionLog, thumunRatings, maintain } =
    useHifzStore();
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);

  const highestDay = useMemo(() => {
    const days = Object.keys(completedTasks)
      .map(Number)
      .filter((d) => Object.values(completedTasks[d] || {}).some(Boolean));
    return days.length > 0 ? Math.max(...days) : 0;
  }, [completedTasks]);

  const totalCompleted = highestDay;
  const completedDays = useMemo(
    () => Object.values(completedTasks).filter((t) => isDayCompleted(t, maintain.active)).length,
    [completedTasks, maintain.active],
  );
  const juzCount = Math.floor(totalCompleted / THUMUNS_PER_JUZ);

  const nextMilestone =
    MILESTONES.find((m) => totalCompleted < m.threshold) ?? MILESTONES[MILESTONES.length - 1];

  const perfectDaysCount = Object.values(dailyLog || {}).filter((l) => l.days.length > 0).length;
  const weakCount = Object.values(thumunRatings || {}).filter((r) => r === "weak").length;
  const sessionMinutes = useMemo(() => {
    const secs = Object.values(sessionLog || {})
      .flat()
      .reduce((acc, s) => acc + (s.seconds || 0), 0);
    return Math.round(secs / 60);
  }, [sessionLog]);

  const shareStats = async () => {
    const text = `أكملت ${juzCount} جزءاً (${totalCompleted} ثمناً) في مشروع حصون لحفظ القرآن — رواية ورش عن نافع.\nالسلسلة: ${streak} يوماً\nالهدف القادم: ${nextMilestone.label}\n\n«وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ»`;
    try {
      if (navigator.share) await navigator.share({ title: "حصون", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("تم نسخ الإحصائيات — شاركها مع أحبابك");
      }
    } catch {
      /* cancelled */
    }
  };

  const achievementsCtx = {
    bestStreak,
    perfectDays: perfectDaysCount,
    totalXp,
    highestDay: totalCompleted,
    sessionMinutes,
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6" dir="rtl">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat icon={Trophy} tone="text-f-gold" label="الأجزاء المحفوظة" value={formatNum(juzCount, arabic)} sub={`/ ${formatNum(30, arabic)}`} />
        <Stat icon={Target} tone="text-primary" label="أبعد محطة" value={formatNum(totalCompleted, arabic)} sub={`/ ${formatNum(480, arabic)} · أيام مكتملة: ${formatNum(completedDays, arabic)}`} />
        <Stat icon={Coins} tone="text-f-gold" label="نقاط الخبرة" value={formatNum(totalXp || 0, arabic)} />
        <Stat icon={Flame} tone="text-orange-500" label="السلسلة الحالية" value={formatNum(streak, arabic)} sub={`الأفضل: ${formatNum(bestStreak, arabic)}`} />
        <Stat icon={Clock} tone="text-f-prep" label="وقت الجلسات" value={`${formatNum(sessionMinutes, arabic)} د`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2 min-w-0">
          <ActivityHeatmap />
        </motion.div>

        <motion.div variants={item} className="glass-panel rounded-3xl p-6 border border-border/50 flex flex-col">
          <h3 className="text-lg font-bold mb-1">الهدف القادم</h3>
          <p className="text-sm text-muted-foreground mb-6">واصل التقدم للوصول للوسام التالي</p>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-background/40 rounded-2xl border border-border/50">
            <div className="w-16 h-16 rounded-full bg-f-gold/15 flex items-center justify-center text-f-gold mb-4">
              {(() => {
                const Icon = MILESTONE_ICONS[nextMilestone.icon];
                return <Icon className="w-8 h-8" aria-hidden />;
              })()}
            </div>
            <h4 className="font-bold text-lg mb-2">{nextMilestone.label}</h4>
            <div className="w-full bg-muted rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="bg-f-gold h-2.5 rounded-full"
                style={{ width: `${Math.min(100, (totalCompleted / nextMilestone.threshold) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              متبقي {formatNum(Math.max(0, nextMilestone.threshold - totalCompleted), arabic)} أثمان
            </p>
            {weakCount > 0 && (
              <p className="text-xs text-red-400 mt-3">{formatNum(weakCount, arabic)} أثمان تحتاج تثبيتاً</p>
            )}
          </div>
          <button
            onClick={shareStats}
            className="mt-4 w-full py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" aria-hidden /> مشاركة الإحصائيات
          </button>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <JourneyRoadmap totalCompleted={totalCompleted} />
      </motion.div>

      {/* Milestones */}
      <motion.div variants={item}>
        <h3 className="text-lg font-bold mb-4 px-2">أوسمة الإنجاز</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MILESTONES.map((milestone) => {
            const isEarned = totalCompleted >= milestone.threshold;
            const Icon = MILESTONE_ICONS[milestone.icon];
            return (
              <div
                key={milestone.id}
                className={`relative p-4 rounded-2xl border ${
                  isEarned ? "bg-card border-border/50 shadow-sm" : "bg-background/40 border-transparent opacity-50 grayscale"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <Icon className={`w-6 h-6 ${isEarned ? "text-f-gold" : "text-muted-foreground"}`} aria-hidden />
                  {isEarned && <CheckCircle2 className="w-4 h-4 text-success" aria-hidden />}
                </div>
                <h4 className="font-bold text-sm mb-1">{milestone.label}</h4>
                <p className="text-xs text-muted-foreground">{formatNum(milestone.threshold, arabic)} ثمناً</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div variants={item}>
        <h3 className="text-lg font-bold mb-4 px-2">إنجازات خاصة</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SPECIAL_ACHIEVEMENTS.map((a) => {
            const isEarned = a.check(achievementsCtx);
            const Icon = ACHIEVEMENT_ICONS[a.icon];
            return (
              <div
                key={a.id}
                className={`relative p-4 rounded-2xl border flex items-center gap-4 ${
                  isEarned ? "bg-card border-border/50 shadow-sm" : "bg-background/40 border-transparent opacity-50 grayscale"
                }`}
              >
                <div className="relative shrink-0">
                  <Icon className={`w-8 h-8 ${isEarned ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                  {isEarned && (
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full" aria-hidden>
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-0.5">{a.label}</h4>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="glass-card-premium rounded-2xl p-4 border border-border/50">
      <div className={`w-9 h-9 rounded-xl bg-surface flex items-center justify-center mb-2 ${tone}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <h3 className="text-2xl font-bold">{value}</h3>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
