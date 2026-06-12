'use client';

import { useState } from 'react';
import { useHifzStore, TaskType } from '@/store/useHifzStore';
import { getFortressTasks, Thumun } from '@/lib/fortress-calculator';
import { MOTIVATIONAL_QUOTES, FORTRESS_COLORS } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  BookOpen,
  CalendarDays,
  Moon,
  Sunrise,
  History,
  RotateCcw,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 },
  },
};

export default function DailyChecklist() {
  const {
    currentDay,
    completedTasks,
    toggleTask,
    advanceDay,
    recordDailyCompletion,
    farReviewPointer,
  } = useHifzStore();

  const [showWeeklyPrep, setShowWeeklyPrep] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  const tasks = getFortressTasks(currentDay, farReviewPointer || 1);
  const dayTasks = completedTasks[currentDay] || {};

  const handleToggle = (taskKey: TaskType) => {
    toggleTask(currentDay, taskKey);
  };

  const isAllCompleted = tasks.taskKeys.every((key) => dayTasks[key]);

  // Trigger celebration when all tasks completed
  if (isAllCompleted && !celebrated) {
    setCelebrated(true);
    toast.success('تم إنجاز جميع مهام اليوم!', {
      description: 'ما شاء الله تبارك الله، عمل رائع.',
    });
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: [FORTRESS_COLORS.khatma.hex, FORTRESS_COLORS.newHifz.hex, FORTRESS_COLORS.reviewNear.hex],
      });
    }, 300);
  }
  if (!isAllCompleted && celebrated) {
    setCelebrated(false);
  }

  const handleAdvance = () => {
    recordDailyCompletion(currentDay, true, tasks.taskKeys.length);
    advanceDay();
    setCelebrated(false);
    toast('تم الانتقال لليوم التالي', {
      icon: '🌅',
    });
  };

  const dailyQuote = MOTIVATIONAL_QUOTES[currentDay % MOTIVATIONAL_QUOTES.length];

  const renderThumun = (t: Thumun, isHero = false) => (
    <div
      key={t.id}
      className={`relative mt-3 rounded-2xl ${
        isHero 
          ? 'bg-gradient-to-br from-background/80 to-background/40 border-border/50 p-5' 
          : 'bg-muted/30 border-transparent p-4'
      } border backdrop-blur-sm`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className={`font-bold ${isHero ? 'text-lg text-foreground' : 'text-sm text-foreground/90'}`}>{t.surah}</span>
          <span className={`block ${isHero ? 'text-sm text-muted-foreground mt-1' : 'text-xs text-muted-foreground mt-0.5'}`}>
            الآيات {t.startAyah} إلى {t.endAyah} • الجزء {t.juz} • الحزب {t.hizb}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
          {t.id}
        </div>
      </div>
      <div className="relative">
        <MessageSquareText className="absolute top-0.5 right-0 w-4 h-4 text-muted-foreground/40 hidden sm:block" />
        <p className={`verse-text text-foreground/80 sm:pr-6 ${isHero ? 'text-lg sm:text-xl leading-relaxed' : 'text-base'} select-none`}>
          "{t.startText}"
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Motivational Quote */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-4 px-6 rounded-2xl bg-card border border-border/40 shadow-sm"
      >
        <p className="verse-text text-foreground/90 text-lg sm:text-xl leading-loose">
          "{dailyQuote.text}"
        </p>
        <p className="text-sm text-muted-foreground mt-2 font-medium">
          — {dailyQuote.source}
        </p>
      </motion.div>

      {/* Fortress Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        {/* الحصن الثالث (Hero Card) */}
        <motion.div variants={cardItem} className="w-full">
          <PremiumTaskCard
            title={FORTRESS_COLORS.newHifz.label}
            icon={<Sunrise className="w-5 h-5" />}
            colorHex={FORTRESS_COLORS.newHifz.hex}
            checked={!!dayTasks.new_hifz}
            onToggle={() => handleToggle('new_hifz')}
            isHero
          >
            {tasks.newHifz ? renderThumun(tasks.newHifz, true) : (
              <p className="text-muted-foreground text-center py-4">لا يوجد حفظ جديد اليوم</p>
            )}
          </PremiumTaskCard>
        </motion.div>

        {/* Masonry Grid for the rest of the cards */}
        <div className="columns-1 md:columns-2 gap-5">
          {/* الحصن الأول */}
          <motion.div variants={cardItem} className="break-inside-avoid mb-5">
            <PremiumTaskCard
              title={FORTRESS_COLORS.khatma.label}
            icon={<BookOpen className="w-5 h-5" />}
            colorHex={FORTRESS_COLORS.khatma.hex}
            checked={!!dayTasks.khatma}
            onToggle={() => handleToggle('khatma')}
          >
            <div className="flex gap-4 items-center">
              <div className="flex-1 bg-background/50 rounded-xl p-3 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">تلاوة</p>
                <p className="font-semibold">{tasks.khatma.recitation}</p>
              </div>
              <div className="flex-1 bg-background/50 rounded-xl p-3 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">استماع</p>
                <p className="font-semibold">{tasks.khatma.listening}</p>
              </div>
            </div>
          </PremiumTaskCard>
          </motion.div>

          {/* الحصن الثاني */}
          <motion.div variants={cardItem} className="break-inside-avoid mb-5">
            <PremiumTaskCard
              title={FORTRESS_COLORS.prep.label}
            icon={<CalendarDays className="w-5 h-5" />}
            colorHex={FORTRESS_COLORS.prep.hex}
            checked={!!dayTasks.prep_weekly && !!dayTasks.prep_night && !!dayTasks.prep_pre}
            onToggle={() => {
              const allDone = dayTasks.prep_weekly && dayTasks.prep_night && dayTasks.prep_pre;
              ['prep_weekly', 'prep_night', 'prep_pre'].forEach(t => {
                if (allDone || !dayTasks[t]) handleToggle(t as TaskType);
              });
            }}
          >
            <div className="space-y-4">
              <SubTask
                label="التحضير الأسبوعي"
                checked={!!dayTasks.prep_weekly}
                onChange={() => handleToggle('prep_weekly')}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setShowWeeklyPrep(!showWeeklyPrep); }}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-2 font-medium"
                >
                  {showWeeklyPrep ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  عرض الأثمان الـ 8 القادمة
                </button>
                <AnimatePresence>
                  {showWeeklyPrep && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {tasks.prepWeekly.map(t => renderThumun(t))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </SubTask>
              <SubTask
                label="التحضير الليلي (ليلة الغد)"
                checked={!!dayTasks.prep_night}
                onChange={() => handleToggle('prep_night')}
              >
                {tasks.prepNight && renderThumun(tasks.prepNight)}
              </SubTask>
              <SubTask
                label="التحضير القبلي (قبل الحفظ)"
                checked={!!dayTasks.prep_pre}
                onChange={() => handleToggle('prep_pre')}
              >
                {tasks.prepPre && renderThumun(tasks.prepPre)}
              </SubTask>
            </div>
          </PremiumTaskCard>
          </motion.div>

          {/* الحصن الرابع */}
          {tasks.reviewNear.length > 0 && (
            <motion.div variants={cardItem} className="break-inside-avoid mb-5">
              <PremiumTaskCard
                title={FORTRESS_COLORS.reviewNear.label}
              icon={<History className="w-5 h-5" />}
              colorHex={FORTRESS_COLORS.reviewNear.hex}
              checked={!!dayTasks.review_near}
              onToggle={() => handleToggle('review_near')}
            >
              <div className="bg-background/50 rounded-xl p-4 border border-border/50 text-sm space-y-4">
                <div className="flex flex-col gap-2">
                  <span className="text-muted-foreground text-xs">من بداية (ثمن {tasks.reviewNear[tasks.reviewNear.length - 1].id}):</span>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">سورة {tasks.reviewNear[tasks.reviewNear.length - 1].surah} <span className="text-muted-foreground font-normal ml-1">(آية {tasks.reviewNear[tasks.reviewNear.length - 1].startAyah})</span></span>
                  </div>
                  <p className="verse-text text-foreground/80 text-base leading-relaxed pr-3 border-r-2 border-primary/40">
                    "{tasks.reviewNear[tasks.reviewNear.length - 1].startText}"
                  </p>
                </div>
                <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
                  <span className="text-muted-foreground text-xs">إلى نهاية (ثمن {tasks.reviewNear[0].id}):</span>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">سورة {tasks.reviewNear[0].surah} <span className="text-muted-foreground font-normal ml-1">(إلى آية {tasks.reviewNear[0].endAyah})</span></span>
                  </div>
                  <p className="verse-text text-foreground/80 text-base leading-relaxed pr-3 border-r-2 border-primary/40">
                    "{tasks.reviewNear[0].startText}"
                  </p>
                </div>
              </div>
            </PremiumTaskCard>
            </motion.div>
          )}

          {/* الحصن الخامس */}
          {tasks.reviewFar && (
            <motion.div variants={cardItem} className="break-inside-avoid mb-5">
              <PremiumTaskCard
                title={FORTRESS_COLORS.reviewFar.label}
              icon={<RotateCcw className="w-5 h-5" />}
              colorHex={FORTRESS_COLORS.reviewFar.hex}
              checked={!!dayTasks.review_far}
              onToggle={() => handleToggle('review_far')}
            >
              <div className="bg-background/50 rounded-xl p-4 border border-border/50 text-sm space-y-4">
                <div className="flex flex-col gap-2">
                  <span className="text-muted-foreground text-xs">من بداية (ثمن {tasks.reviewFar.start.id}):</span>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">سورة {tasks.reviewFar.start.surah} <span className="text-muted-foreground font-normal ml-1">(آية {tasks.reviewFar.start.startAyah})</span></span>
                  </div>
                  <p className="verse-text text-foreground/80 text-base leading-relaxed pr-3 border-r-2 border-primary/40">
                    "{tasks.reviewFar.start.startText}"
                  </p>
                </div>
                <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
                  <span className="text-muted-foreground text-xs">إلى نهاية (ثمن {tasks.reviewFar.end.id}):</span>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">سورة {tasks.reviewFar.end.surah} <span className="text-muted-foreground font-normal ml-1">(إلى آية {tasks.reviewFar.end.endAyah})</span></span>
                  </div>
                  <p className="verse-text text-foreground/80 text-base leading-relaxed pr-3 border-r-2 border-primary/40">
                    "{tasks.reviewFar.end.startText}"
                  </p>
                </div>
              </div>
              </PremiumTaskCard>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Floating Advance Button */}
      <AnimatePresence>
        {isAllCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed bottom-6 left-0 right-0 mx-auto w-[calc(100%-2rem)] max-w-sm z-50"
          >
            <button
              onClick={handleAdvance}
              className="w-full flex items-center justify-between bg-success text-success-foreground p-4 rounded-2xl shadow-2xl shadow-success/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-success-foreground/20 rounded-full p-1">
                  <CheckCircle2 className="w-5 h-5 text-success-foreground" />
                </div>
                <span className="font-bold">أكملت اليوم بنجاح</span>
              </div>
              <div className="flex items-center gap-1 text-sm bg-success-foreground/10 px-3 py-1.5 rounded-full">
                اليوم التالي
                <ChevronLeft className="w-4 h-4" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PremiumTaskCardProps {
  title: string;
  icon: React.ReactNode;
  colorHex: string;
  children: React.ReactNode;
  checked: boolean;
  onToggle: () => void;
  isHero?: boolean;
}

function PremiumTaskCard({
  title,
  icon,
  colorHex,
  children,
  checked,
  onToggle,
  isHero,
}: PremiumTaskCardProps) {
  return (
    <div
      onClick={onToggle}
      className={`group relative rounded-3xl p-[1px] cursor-pointer transition-all duration-500 hover:-translate-y-1 ${
        checked ? 'opacity-80' : ''
      }`}
    >
      {/* Animated gradient border */}
      <div 
        className={`absolute inset-0 rounded-3xl opacity-20 transition-opacity duration-500 ${checked ? 'opacity-50' : 'group-hover:opacity-100'}`}
        style={{ background: `linear-gradient(135deg, ${colorHex}40, transparent 40%, transparent 60%, ${colorHex}40)` }}
      />
      
      <div className={`relative h-full rounded-3xl p-5 sm:p-6 transition-colors duration-500 ${
        checked 
          ? 'bg-card/40 backdrop-blur-md' 
          : 'bg-card shadow-sm hover:shadow-xl'
      } border border-border/50 overflow-hidden`}>
        
        {/* Glow behind the icon */}
        <div 
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40"
          style={{ backgroundColor: colorHex }}
        />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner"
                style={{ backgroundColor: `${colorHex}15`, color: colorHex }}
              >
                {icon}
              </div>
              <h3 className={`font-bold ${isHero ? 'text-xl' : 'text-lg'}`}>{title}</h3>
            </div>
            
            {/* Custom Checkbox */}
            <div 
              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                checked 
                  ? 'bg-success border-success text-success-foreground scale-100' 
                  : 'border-border/60 text-transparent scale-95 group-hover:border-border'
              }`}
            >
              <Check className="w-4 h-4" />
            </div>
          </div>
          
          <div className="flex-1" onClick={(e) => e.stopPropagation()}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubTask({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: () => void; children?: React.ReactNode }) {
  return (
    <div className="mt-1">
      <div 
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className="flex items-center gap-3 py-2 cursor-pointer group/sub"
      >
        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
          checked ? 'bg-success border-success text-success-foreground' : 'border-border/60 group-hover/sub:border-border'
        }`}>
          {checked && <Check className="w-3 h-3" />}
        </div>
        <span className={`text-sm font-medium transition-colors ${checked ? 'text-muted-foreground line-through decoration-muted-foreground/30' : 'text-foreground/90'}`}>
          {label}
        </span>
      </div>
      {children && (
        <div className="pr-8 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}
