"use client";

import FloatingXpOverlay from "@/components/FloatingXpOverlay";
import KhatmaCelebration from "@/components/KhatmaCelebration";
import Onboarding from "@/components/Onboarding";
import ScheduleView from "@/components/ScheduleView";
import SessionOverlay from "@/components/SessionOverlay";
import SettingsModal from "@/components/SettingsModal";
import StatsDashboard from "@/components/StatsDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import HomeTab from "@/components/tabs/HomeTab";
import PrepTab from "@/components/tabs/PrepTab";
import ReviewTab from "@/components/tabs/ReviewTab";
import { Button } from "@/components/ui/button";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useBrowserFlag, useMounted } from "@/hooks/useMounted";
import { useHijriDate } from "@/hooks/useHijriDate";
import { formatNum } from "@/lib/format";
import { getFortressTasks, THUMUNS_PER_JUZ, TOTAL_THUMUNS } from "@/lib/fortress-calculator";
import { vibrateLight } from "@/lib/haptic";
import { scheduleDailyReminder } from "@/lib/reminders";
import { getCurrentUser, isSupabaseConfigured, onAuthChange } from "@/lib/supabase";
import { isDayCompleted, useHifzStore } from "@/store/useHifzStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart2,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Flame,
  Home,
  Settings as SettingsIcon,
  Shield,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSwipeable } from "react-swipeable";

type TabType = "home" | "prep" | "review" | "plan" | "stats";

export default function HosoonApp() {
  const showOnboarding = useHifzStore((s) => s.showOnboarding);
  const currentDay = useHifzStore((s) => s.currentDay);
  const streak = useHifzStore((s) => s.streak);
  const bestStreak = useHifzStore((s) => s.bestStreak);
  const completedTasks = useHifzStore((s) => s.completedTasks);
  const editedThumuns = useHifzStore((s) => s.editedThumuns);
  const thumunRatings = useHifzStore((s) => s.thumunRatings);
  const maintain = useHifzStore((s) => s.maintain) ?? { active: false, day: 1 };
  const settings = useHifzStore((s) => s.settings);
  const reminderTime = settings.reminderTime;

  const mounted = useMounted();
  const [signedIn, setSignedIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const notifDenied = useBrowserFlag(
    () => typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied",
  );

  useEffect(() => {
    if (isSupabaseConfigured) {
      getCurrentUser().then((u) => setSignedIn(!!u));
      return onAuthChange((u) => setSignedIn(!!u));
    }
  }, []);

  useCloudSync(signedIn);

  // daily reminder scheduling
  useEffect(() => {
    if (!reminderTime) return;
    void scheduleDailyReminder(reminderTime);
  }, [reminderTime]);

  const weakIds = useMemo(
    () =>
      Object.entries(thumunRatings)
        .filter(([, v]) => v === "weak")
        .map(([k]) => Number(k)),
    [thumunRatings],
  );

  const tasks = useMemo(
    () =>
      getFortressTasks(currentDay, {
        edited: editedThumuns,
        weakIds,
        maintain: maintain?.active ?? false,
        reciteJuzPerDay: settings.reciteJuzPerDay,
        listenHizbPerDay: settings.listenHizbPerDay,
      }),
    [currentDay, editedThumuns, weakIds, maintain?.active, settings.reciteJuzPerDay, settings.listenHizbPerDay],
  );

  const dayTasks = completedTasks[currentDay] || {};
  const completedCount = tasks.taskKeys.filter((k) => dayTasks[k]).length;
  const totalTasks = tasks.taskKeys.length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const highestDay = useMemo(() => {
    const days = Object.keys(completedTasks)
      .map(Number)
      .filter((d) => Object.values(completedTasks[d] || {}).some(Boolean));
    return days.length > 0 ? Math.max(...days) : 0;
  }, [completedTasks]);

  const arabic = settings.arabicNumerals;
  const overallPct = ((highestDay / TOTAL_THUMUNS) * 100).toFixed(1);
  const completedDays = useMemo(
    () =>
      Object.entries(completedTasks).filter(([, t]) => isDayCompleted(t, maintain?.active)).length,
    [completedTasks, maintain?.active],
  );
  const juzCount = Math.floor(highestDay / THUMUNS_PER_JUZ);

  const hijriDate = useHijriDate(settings.arabicNumerals);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "قياماً مقبولاً";
    if (h < 12) return "صباح الهمة";
    if (h < 17) return "مساء الخير";
    return "مساء السكينة";
  }, []);

  const rankInfo = useMemo(() => {
    const ranks = [
      { max: 10, label: "محب للقرآن" },
      { max: 40, label: "صاحب الهمة" },
      { max: 100, label: "طالب علم" },
      { max: 240, label: "حامل الأجزاء" },
      { max: 400, label: "مشروع حافظ" },
      { max: 480, label: "حافظ متقن" },
    ];
    if (highestDay >= 480) return { label: ranks[5].label, progress: 100 };
    let currentIdx = 0;
    for (let i = 0; i < ranks.length; i++) {
      if (highestDay < ranks[i].max) {
        currentIdx = i;
        break;
      }
    }
    const current = ranks[currentIdx];
    const prevMax = currentIdx > 0 ? ranks[currentIdx - 1].max : 0;
    const progress = Math.min(
      100,
      Math.max(0, Math.round(((highestDay - prevMax) / (current.max - prevMax)) * 100)),
    );
    return { label: current.label, progress };
  }, [highestDay]);

  const streakTone = useMemo(() => {
    if (streak < 3) return "text-orange-400/80";
    if (streak < 7) return "text-orange-500";
    if (streak < 15) return "text-f-gold";
    if (streak < 30) return "text-f-prep";
    return "text-primary drop-shadow-[0_0_8px_rgba(62,146,109,0.5)]";
  }, [streak]);

  const tabs: { id: TabType; label: string; icon: typeof Home }[] = useMemo(
    () => [
      { id: "home", label: "اليوم", icon: Home },
      { id: "prep", label: "التحضير", icon: BookOpenCheck },
      { id: "review", label: "المراجعة", icon: Shield },
      { id: "plan", label: "الخطة", icon: CalendarDays },
      { id: "stats", label: "إحصائيات", icon: BarChart2 },
    ],
    [],
  );

  const swipeHandlers = useSwipeable({
    // RTL: "next" content sits to the left → swipe right advances
    onSwipedRight: () => {
      const i = tabs.findIndex((t) => t.id === activeTab);
      if (i < tabs.length - 1) {
        setActiveTab(tabs[i + 1].id);
        vibrateLight();
      }
    },
    onSwipedLeft: () => {
      const i = tabs.findIndex((t) => t.id === activeTab);
      if (i > 0) {
        setActiveTab(tabs[i - 1].id);
        vibrateLight();
      }
    },
    trackMouse: false,
    delta: 60,
    preventScrollOnSwipe: false,
  });

  const R = 38;
  const SW = 5;
  const C = 2 * Math.PI * R;
  const offset = C - (progressPct / 100) * C;

  if (!mounted) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div
          className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
          aria-label="جارٍ التحميل"
        />
      </div>
    );
  }
  if (showOnboarding) return <Onboarding />;

  return (
    <main {...swipeHandlers} className="min-h-[100dvh] pb-28 bg-background text-foreground relative" dir="rtl">
      {/* Glow background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
        <div className="absolute top-[-5%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[100px] sm:blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-f-gold/10 blur-[100px] sm:blur-[120px]" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-5 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center" aria-hidden>
              <span className="text-primary-foreground font-bold text-sm">ح</span>
            </div>
            <div>
              <span className="font-bold text-lg text-foreground tracking-tight block leading-tight">حصون</span>
              <span className="text-[9px] text-muted-foreground">رواية ورش عن نافع</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {notifDenied && (
              <span className="text-[9px] text-red-400 max-w-[90px] leading-tight">
                الإشعارات معطّلة في المتصفح
              </span>
            )}
            {reminderTime && !notifDenied && (
              <span
                className="w-8 h-8 rounded-full bg-f-near/10 text-f-near flex items-center justify-center"
                title={`التذكير ${reminderTime}`}
                aria-label={`التذكير اليومي الساعة ${reminderTime}`}
              >
                <Bell className="w-4 h-4" aria-hidden />
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              aria-label="الإعدادات"
              onClick={() => {
                vibrateLight();
                setShowSettings(true);
              }}
            >
              <SettingsIcon className="w-[20px] h-[20px]" aria-hidden />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {/* Hero */}
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-primary text-sm font-semibold">{greeting}</p>
                <div className="relative overflow-hidden bg-primary/10 rounded-full">
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-primary/20 transition-all duration-1000 ease-out"
                    style={{ width: `${rankInfo.progress}%` }}
                  />
                  <span className="text-[10px] text-primary px-2 py-0.5 font-bold relative z-10">
                    {rankInfo.label}
                  </span>
                </div>
              </div>
              <h1 className="text-foreground flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold">
                  {maintain?.active ? "ختمة التثبيت" : `الثمن ${formatNum(currentDay, arabic)}`}
                </span>
                <span className="text-base font-medium text-muted-foreground">
                  {maintain?.active ? "ورد الرسوخ" : "من الرحلة"}
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">
                أبعد محطة: الثمن {formatNum(highestDay, arabic)} ({formatNum(overallPct, arabic)}%) ·
                أيام مكتملة: {formatNum(completedDays, arabic)}
              </p>
              <p className="text-xs text-muted-foreground/80">{hijriDate}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs text-muted-foreground">الحصون</p>
              <div className="relative w-20 h-20">
                <svg width="80" height="80" className="-rotate-90" aria-hidden>
                  <circle cx="40" cy="40" r={R} strokeWidth={SW} className="stroke-border" fill="none" />
                  <motion.circle
                    cx="40"
                    cy="40"
                    r={R}
                    strokeWidth={SW}
                    className="stroke-primary"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    initial={{ strokeDashoffset: C }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center">
                  <span className="text-lg font-bold">
                    {formatNum(completedCount, arabic)}
                    <span className="text-muted-foreground text-xs font-normal">
                      /{formatNum(totalTasks, arabic)}
                    </span>
                  </span>
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">{formatNum(progressPct, arabic)}%</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Flame, label: "السلسلة", value: `${formatNum(streak, arabic)} يوم`, color: streakTone },
              { icon: Trophy, label: "أفضل سلسلة", value: `${formatNum(bestStreak, arabic)} يوم`, color: "text-f-gold" },
              { icon: BookOpenCheck, label: "أبعد محطة", value: `${formatNum(highestDay, arabic)} ثمن`, color: "text-primary" },
              { icon: CalendarDays, label: "الأجزاء", value: `${formatNum(juzCount, arabic)} جزء`, color: "text-f-khatma" },
            ].map((s) => (
              <div key={s.label} className="bg-surface rounded-xl p-2.5 flex flex-col items-center gap-1.5 text-center">
                <s.icon className={`w-4 h-4 ${s.color}`} aria-hidden />
                <p className="text-[10px] text-muted-foreground leading-none">{s.label}</p>
                <p className={`text-xs font-bold leading-none ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "home" && <HomeTab tasks={tasks} dayTasks={dayTasks} currentDay={currentDay} />}
            {activeTab === "prep" && <PrepTab tasks={tasks} dayTasks={dayTasks} currentDay={currentDay} />}
            {activeTab === "review" && <ReviewTab tasks={tasks} dayTasks={dayTasks} currentDay={currentDay} />}
            {activeTab === "plan" && <ScheduleView />}
            {activeTab === "stats" && <StatsDashboard />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-lg z-50 pb-safe"
        aria-label="التنقل الرئيسي"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2 px-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                vibrateLight();
              }}
              aria-current={activeTab === t.id ? "page" : undefined}
              aria-label={t.label}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                activeTab === t.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <t.icon className="w-5 h-5" strokeWidth={activeTab === t.id ? 2.5 : 1.5} aria-hidden />
              <span className="text-[10px] font-medium leading-none">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <SessionOverlay />
      <KhatmaCelebration />
      <FloatingXpOverlay />
    </main>
  );
}
