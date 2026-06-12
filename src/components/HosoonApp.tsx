"use client";

import Onboarding from "@/components/Onboarding";
import ReviewSessionView from "@/components/ReviewSessionView";
import ScheduleView from "@/components/ScheduleView";
import SessionView from "@/components/SessionView";
import StatsDashboard from "@/components/StatsDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import HomeTab from "@/components/tabs/HomeTab";
import PrepTab from "@/components/tabs/PrepTab";
import ReviewTab from "@/components/tabs/ReviewTab";
import SettingsModal from "@/components/SettingsModal";
import { Button } from "@/components/ui/button";
import { THUMUNS_PER_JUZ, TOTAL_THUMUNS } from "@/lib/constants";
import { getFortressTasks } from "@/lib/fortress-calculator";
import { useHifzStore } from "@/store/useHifzStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart2, BookOpenCheck, CalendarDays, Flame, Home, Settings as SettingsIcon, Shield, Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSwipeable } from "react-swipeable";
import { vibrateLight } from "@/lib/haptic";

type ActiveSession = { type: string; target: Record<string, unknown> } | null;
type TabType = "home" | "prep" | "review" | "plan" | "stats";

export default function HosoonApp() {
  const {
    showOnboarding, resetProgress, toggleTask, currentDay,
    streak, bestStreak, completedTasks, farReviewPointer,
  } = useHifzStore();

  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [activeSession, setActiveSession] = useState<ActiveSession>(null);

  useEffect(() => {
    const handler = (e: Event) => setActiveSession((e as CustomEvent).detail ?? null);
    window.addEventListener("openSession", handler);
    return () => window.removeEventListener("openSession", handler);
  }, []);

  const tasks = useMemo(
    () => getFortressTasks(currentDay, farReviewPointer || 1),
    [currentDay, farReviewPointer],
  );
  const dayTasks = completedTasks[currentDay] || {};
  const completedCount = tasks.taskKeys.filter((k) => dayTasks[k]).length;
  const totalTasks = tasks.taskKeys.length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const highestDay = useMemo(() => {
    const days = Object.keys(completedTasks).map(Number)
      .filter((d) => Object.values(completedTasks[d]).some(Boolean));
    return days.length > 0 ? Math.max(...days) : 0;
  }, [completedTasks]);

  const overallPct = ((highestDay / TOTAL_THUMUNS) * 100).toFixed(1);
  const juzCount = Math.floor(highestDay / THUMUNS_PER_JUZ);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "قياماً مقبولاً";
    if (h < 12) return "صباح الهمة";
    if (h < 17) return "مساء الخير";
    return "مساء السكينة";
  }, []);

  // Progress ring
  const R = 38, SW = 5, C = 2 * Math.PI * R;
  const offset = C - (progressPct / 100) * C;

  const tabs: { id: TabType; label: string; icon: typeof Home }[] = useMemo(() => [
    { id: "home", label: "الرئيسية", icon: Home },
    { id: "prep", label: "التحضير", icon: BookOpenCheck },
    { id: "review", label: "المراجعة", icon: Shield },
    { id: "plan", label: "الخطة", icon: CalendarDays },
    { id: "stats", label: "إحصائيات", icon: BarChart2 },
  ], []);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = tabs.findIndex(t => t.id === activeTab);
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1].id);
        vibrateLight();
      }
    },
    onSwipedRight: () => {
      const currentIndex = tabs.findIndex(t => t.id === activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1].id);
        vibrateLight();
      }
    },
    trackMouse: false,
    preventScrollOnSwipe: true,
  });


  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (showOnboarding) return <Onboarding />;


  return (
    <main {...swipeHandlers} className="min-h-screen pb-28 bg-background text-foreground relative" dir="rtl">
      {/* ─── Glow Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-5%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[100px] sm:blur-[120px] mix-blend-screen" />
        <div className="absolute top-[40%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/10 blur-[100px] sm:blur-[120px] mix-blend-screen" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-5 relative z-10">

        {/* ─── Header ─── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">ح</span>
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">حصون</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => { vibrateLight(); setShowSettings(true); }}>
              <SettingsIcon className="w-[20px] h-[20px]" />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {/* ─── Hero Card ─── */}
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="space-y-1">
              <p className="text-primary text-sm font-semibold">{greeting}</p>
              <h1 className="text-foreground">
                <span className="text-3xl sm:text-4xl font-extrabold">اليوم {currentDay}</span>
                <span className="text-base font-medium text-muted-foreground mr-2">من الرحلة</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {overallPct}% المنجز كلياً · {highestDay} ثمن مكتمل
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs text-muted-foreground">مهام اليوم</p>
              <div className="relative w-20 h-20">
                <svg width="80" height="80" className="-rotate-90">
                  <circle cx="40" cy="40" r={R} strokeWidth={SW} className="stroke-border" fill="none" />
                  <motion.circle cx="40" cy="40" r={R} strokeWidth={SW} className="stroke-primary"
                    fill="none" strokeLinecap="round" strokeDasharray={C}
                    initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.6, ease: "easeOut" }} />
                </svg>
                <span className="absolute inset-0 grid place-items-center">
                  <span className="text-lg font-bold">{completedCount}<span className="text-muted-foreground text-xs font-normal">/{totalTasks}</span></span>
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">{progressPct}%</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Flame, label: "السلسلة", value: `${streak} أيام`, color: "text-orange-400" },
              { icon: Trophy, label: "أفضل سلسلة", value: `${bestStreak} أيام`, color: "text-amber-400" },
              { icon: BookOpenCheck, label: "المنجز", value: `${highestDay} ثمن`, color: "text-primary" },
              { icon: CalendarDays, label: "الأجزاء", value: `${juzCount} جزء`, color: "text-sky-400" },
            ].map((s) => (
              <div key={s.label} className="bg-surface rounded-xl p-2.5 flex flex-col items-center gap-1.5 text-center">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <p className="text-[10px] text-muted-foreground leading-none">{s.label}</p>
                <p className={`text-xs font-bold leading-none ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Tab Content ─── */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {activeTab === "home" && <HomeTab tasks={tasks} dayTasks={dayTasks} currentDay={currentDay} />}
            {activeTab === "prep" && <PrepTab tasks={tasks} dayTasks={dayTasks} currentDay={currentDay} />}
            {activeTab === "review" && <ReviewTab tasks={tasks} dayTasks={dayTasks} currentDay={currentDay} />}
            {activeTab === "plan" && <ScheduleView />}
            {activeTab === "stats" && <StatsDashboard />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Bottom Nav (5 tabs) ─── */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-lg z-50 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2 px-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); vibrateLight(); }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                activeTab === t.id ? "text-primary" : "text-muted-foreground"
              }`}>
              <t.icon className="w-5 h-5" strokeWidth={activeTab === t.id ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium leading-none">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ─── Settings Modal ─── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ─── Session Overlays ─── */}
      <AnimatePresence>
        {activeSession?.type === "new_hifz" && (
          <SessionView key="s_new" surah={activeSession.target.surah}
            juz={activeSession.target.juz} hizb={activeSession.target.hizb} id={activeSession.target.id}
            startText={activeSession.target.startText}
            onComplete={() => { toggleTask(currentDay, "new_hifz"); setActiveSession(null); }}
            onClose={() => setActiveSession(null)} />
        )}
        {activeSession?.type === "review_near" && (
          <ReviewSessionView key="s_rev" surah={activeSession.target.surah}
            juz={activeSession.target.juz} hizb={activeSession.target.hizb} id={activeSession.target.id}
            startText={activeSession.target.startText}
            onComplete={() => { toggleTask(currentDay, "review_near"); setActiveSession(null); }}
            onClose={() => setActiveSession(null)} />
        )}
      </AnimatePresence>
    </main>
  );
}
