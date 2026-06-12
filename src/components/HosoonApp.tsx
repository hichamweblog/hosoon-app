'use client';

import { useEffect, useState, useMemo } from 'react';
import { useHifzStore } from '@/store/useHifzStore';
import DailyChecklist from '@/components/DailyChecklist';
import StatsDashboard from '@/components/StatsDashboard';
import ScheduleView from '@/components/ScheduleView';
import Onboarding from '@/components/Onboarding';
import ThemeToggle from '@/components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, Flame, Sparkles, Trophy, BookOpen } from 'lucide-react';
import { getFortressTasks } from '@/lib/fortress-calculator';
import { TOTAL_THUMUNS, THUMUNS_PER_JUZ } from '@/lib/constants';

type TabType = 'daily' | 'schedule' | 'stats';

export default function HosoonApp() {
  const { showOnboarding, resetProgress, currentDay, streak, bestStreak, completedTasks, farReviewPointer } = useHifzStore();
  const [hydrated, setHydrated] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('daily');

  useEffect(() => setHydrated(true), []);

  const tasks = getFortressTasks(currentDay, farReviewPointer || 1);
  const dayTasks = completedTasks[currentDay] || {};
  const completedCount = tasks.taskKeys.filter((key) => dayTasks[key]).length;
  const progressPercentage = (completedCount / tasks.taskKeys.length) * 100 || 0;
  
  const highestCompletedDay = useMemo(() => {
    const days = Object.keys(completedTasks).map(Number).filter(d => {
      const t = completedTasks[d];
      return Object.values(t).some(Boolean);
    });
    return days.length > 0 ? Math.max(...days) : 0;
  }, [completedTasks]);

  const overallPercentage = (highestCompletedDay / TOTAL_THUMUNS) * 100;
  const juzCount = Math.floor(highestCompletedDay / THUMUNS_PER_JUZ);

  // Greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return 'قياماً مقبولاً';
    if (hour < 12) return 'صباح الهمة';
    if (hour < 17) return 'مساء الخير';
    return 'مساء السكينة';
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding />;
  }

  // Ring calculations for the Hero section
  const ringSize = 64;
  const ringStroke = 4;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (progressPercentage / 100) * ringCircumference;

  return (
    <main className="min-h-screen pb-24 lg:pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-4xl mx-auto space-y-8 pt-6">
        
        {/* Top Navbar */}
        <nav className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg shadow-primary/20">
              ح
            </div>
            <span className="font-bold text-lg hidden sm:block">حصون</span>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 backdrop-blur-md border border-border/50">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-9 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowReset(true)}
              title="إعادة تعيين التقدم"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="glass-card-premium rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          {/* Decorative background blur */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="font-medium">{greeting}</span>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                  اليوم {currentDay} <span className="text-muted-foreground font-normal text-xl sm:text-2xl">من رحلتك</span>
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>{overallPercentage.toFixed(1)}% من الختمة</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{highestCompletedDay} ثمن منجز</span>
                </p>
              </div>
            </div>

            {/* Daily Progress Ring */}
            <div className="flex items-center gap-4 bg-background/50 rounded-2xl p-4 border border-border/50 backdrop-blur-sm">
              <div>
                <p className="text-sm font-medium mb-1">مهام اليوم</p>
                <p className="text-xs text-muted-foreground">{completedCount} من {tasks.taskKeys.length} مكتملة</p>
              </div>
              <div className="relative">
                <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke="currentColor"
                    strokeWidth={ringStroke}
                    fill="none"
                    className="text-muted/20"
                  />
                  <motion.circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke="url(#heroGrad)"
                    strokeWidth={ringStroke}
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: ringCircumference, strokeDashoffset: ringCircumference }}
                    animate={{ strokeDashoffset: ringOffset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-secondary)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {Math.round(progressPercentage)}%
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/20 relative z-10">
            {/* Stat 1: Current Streak */}
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-background/40 backdrop-blur-md rounded-2xl p-3 border border-border/40 flex items-center gap-3 transition-colors hover:bg-background/60"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 shadow-inner">
                <Flame className="w-5 h-5 animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium leading-none mb-1">السلسلة الحالية</p>
                <p className="text-sm font-bold text-orange-500 leading-none">
                  {streak} {streak === 1 || streak >= 11 ? 'يوم' : streak === 2 ? 'يومان' : streak >= 3 && streak <= 10 ? 'أيام' : 'يوم'}
                </p>
              </div>
            </motion.div>

            {/* Stat 2: Best Streak */}
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-background/40 backdrop-blur-md rounded-2xl p-3 border border-border/40 flex items-center gap-3 transition-colors hover:bg-background/60"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium leading-none mb-1">أفضل سلسلة</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 leading-none">
                  {bestStreak} {bestStreak === 1 || bestStreak >= 11 ? 'يوم' : bestStreak === 2 ? 'يومان' : bestStreak >= 3 && bestStreak <= 10 ? 'أيام' : 'يوم'}
                </p>
              </div>
            </motion.div>

            {/* Stat 3: Memorized Juz */}
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-background/40 backdrop-blur-md rounded-2xl p-3 border border-border/40 flex items-center gap-3 transition-colors hover:bg-background/60"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium leading-none mb-1">الأجزاء المحفوظة</p>
                <p className="text-sm font-bold text-foreground leading-none">
                  {juzCount} <span className="text-xs text-muted-foreground font-normal">/ 30</span>
                </p>
              </div>
            </motion.div>


          </div>
        </section>

        {/* Modern Segmented Control */}
        <div className="flex p-1 bg-muted/40 backdrop-blur-md rounded-2xl border border-border/50 max-w-[400px] mx-auto relative">
          {(['daily', 'schedule', 'stats'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 py-2.5 text-sm font-medium transition-colors z-10 ${
                activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
              }`}
            >
              {tab === 'daily' ? 'مهام اليوم' : tab === 'schedule' ? 'الجدول' : 'الإحصائيات'}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-card rounded-xl shadow-sm border border-border/50 -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'daily' && <DailyChecklist />}
              {activeTab === 'schedule' && <ScheduleView />}
              {activeTab === 'stats' && <StatsDashboard />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Reset confirmation */}
      <AlertDialog open={showReset} onOpenChange={setShowReset}>
        <AlertDialogContent dir="rtl" className="rounded-3xl border-border/50 glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>إعادة تعيين التقدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد؟ سيتم حذف جميع بيانات التقدم والملاحظات. هذا
              الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:gap-0 mt-6">
            <AlertDialogAction
              onClick={() => {
                resetProgress();
                setShowReset(false);
              }}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl"
            >
              نعم، أعد التعيين
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-xl border-border/50">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
