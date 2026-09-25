"use client";

import { TOTAL_THUMUNS } from "@/lib/quran-data";
import { formatNum } from "@/lib/format";
import { getAllSurahs, getThumun, THUMUNS_PER_JUZ, type EditedThumuns } from "@/lib/fortress-calculator";
import { thumunShort, surahName } from "@/lib/quran-labels";
import { isDayCompleted, useHifzStore } from "@/store/useHifzStore";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CheckCircle2, ChevronDown, Lock, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import DayPreviewModal from "./DayPreviewModal";
import { vibrateLight } from "@/lib/haptic";

interface DayData {
  day: number;
  isCompleted: boolean;
  isToday: boolean;
  isReviewOnly: boolean;
  surah: string;
  range: string;
  searchText: string;
}

interface JuzMilestone {
  juz: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  days: DayData[];
}

/** Static journey plan (thumun per day) computed ONCE — labels only recompute on edits. */
function dayInfo(day: number, edited: EditedThumuns): DayData {
  const t = getThumun(day, edited);
  return {
    day,
    isCompleted: false,
    isToday: false,
    isReviewOnly: !t,
    surah: t ? surahName(t.startSura) : "مراجعة فقط",
    range: t ? thumunShort(t) : "",
    searchText: `${day} ${t ? surahName(t.startSura) + " " + surahName(t.endSura) : ""}`,
  };
}

export default function ScheduleView() {
  const completedTasks = useHifzStore((s) => s.completedTasks);
  const currentDay = useHifzStore((s) => s.currentDay);
  const editedThumuns = useHifzStore((s) => s.editedThumuns);
  const maintain = useHifzStore((s) => s.maintain);
  const arabic = useHifzStore((s) => s.settings.arabicNumerals);
  const [previewDay, setPreviewDay] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [showSurahs, setShowSurahs] = useState(false);

  const q = query.trim();

  // Weekly window: yesterday .. +5
  const weeklyDays = useMemo(() => {
    const startWeek = Math.max(1, currentDay - 1);
    const out: DayData[] = [];
    for (let d = startWeek; d <= startWeek + 6 && d <= TOTAL_THUMUNS; d++) {
      const info = dayInfo(d, editedThumuns);
      info.isCompleted =
        isDayCompleted(completedTasks[d], maintain.active);
      info.isToday = d === currentDay;
      out.push(info);
    }
    return out.filter((d) => !q || d.searchText.includes(q));
  }, [currentDay, completedTasks, editedThumuns, q, maintain.active]);

  // Juz milestones (static boundaries + completion state)
  const { juzMilestones, currentJuz } = useMemo(() => {
    const highestCompleted = Object.keys(completedTasks)
      .map(Number)
      .filter((d) => isDayCompleted(completedTasks[d], maintain.active))
      .reduce((m, d) => Math.max(m, d), 0);
    const currJuz = Math.min(30, Math.floor(Math.max(currentDay - 1, highestCompleted) / THUMUNS_PER_JUZ) + 1);

    const milestones: JuzMilestone[] = [];
    for (let j = 1; j <= 30; j++) {
      const days: DayData[] = [];
      let allDone = true;
      const from = (j - 1) * THUMUNS_PER_JUZ + 1;
      for (let d = from; d < from + THUMUNS_PER_JUZ; d++) {
        const info = dayInfo(d, editedThumuns);
        info.isCompleted =
          isDayCompleted(completedTasks[d], maintain.active);
        info.isToday = d === currentDay;
        if (!info.isCompleted) allDone = false;
        days.push(info);
      }
      milestones.push({
        juz: j,
        isUnlocked: j <= currJuz + 1,
        isCompleted: allDone,
        days: days.filter((d) => !q || d.searchText.includes(q)),
      });
    }
    return { juzMilestones: milestones, currentJuz: currJuz };
  }, [completedTasks, currentDay, editedThumuns, q, maintain.active]);

  // فهرس السور: عدد الأثمان المكتملة في نطاق كل سورة
  const surahProgress = useMemo(() => {
    return getAllSurahs()
      .map((sura) => {
        const span = sura.lastEighth - sura.firstEighth + 1;
        let done = 0;
        for (let d = sura.firstEighth; d <= sura.lastEighth; d++) {
          if (isDayCompleted(completedTasks[d], maintain.active)) done++;
        }
        return {
          number: sura.number,
          name: sura.name,
          span,
          done,
          pct: span > 0 ? Math.round((done / span) * 100) : 0,
        };
      })
      .filter((s) => !q || s.name.includes(q) || String(s.number) === q);
  }, [completedTasks, maintain.active, q]);

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* search */}
      <div className="relative">
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بسورة أو رقم ثمن…"
          aria-label="البحث في الخطة"
          className="w-full bg-surface border border-border rounded-xl pr-10 pl-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* ─── الأسبوع ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-2">
          <Sparkles className="w-5 h-5 text-primary" aria-hidden />
          <h2 className="font-bold text-lg">هذا الأسبوع</h2>
        </div>
        <div className="flex flex-col gap-3 px-2">
          {weeklyDays.map((d) => (
            <div
              key={`week-${d.day}`}
              onClick={() => {
                vibrateLight();
                setPreviewDay(d.day);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") setPreviewDay(d.day);
              }}
              aria-label={`خطة الثمن ${d.day}`}
              className={`w-full p-4 rounded-2xl border cursor-pointer transition-all ${
                d.isToday
                  ? "bg-surface-raised border-primary shadow-lg ring-1 ring-primary/30"
                  : d.isCompleted
                    ? "bg-surface/50 border-border opacity-70"
                    : "bg-surface border-border hover:border-primary/50"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className={`text-sm font-bold ${d.isToday ? "text-primary" : "text-muted-foreground"}`}>
                  الثمن {formatNum(d.day, arabic)}
                </span>
                {d.isCompleted && <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden />}
              </div>
              <h3 className={`font-bold text-lg ${d.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                {d.surah}
              </h3>
              {d.range && <p className="text-sm text-secondary mt-1 font-quran">{d.range}</p>}
            </div>
          ))}
          {weeklyDays.length === 0 && (
            <p className="text-center text-muted-foreground py-6">لا نتائج مطابقة</p>
          )}
        </div>
      </section>

      {/* ─── محطات الأجزاء ─── */}
      <section className="px-2">
        <h2 className="font-bold text-lg mb-4">محطات الرحلة</h2>
        <div className="space-y-4">
          {juzMilestones.map((m) => (
            <JuzCard
              key={`juz-${m.juz}`}
              milestone={m}
              isCurrent={m.juz === currentJuz}
              onDayClick={(day) => {
                vibrateLight();
                setPreviewDay(day);
              }}
              arabic={arabic}
            />
          ))}
        </div>
      </section>


      {/* ─── فهرس السور — تقدّم كل سورة ─── */}
      <section className="bg-surface rounded-[20px] p-4">
        <button
          type="button"
          onClick={() => {
            setShowSurahs((v: boolean) => !v);
            vibrateLight();
          }}
          className="w-full flex items-center justify-between"
          aria-expanded={showSurahs}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-f-gold" aria-hidden />
            <h2 className="font-bold text-lg">فهرس السور</h2>
            <span className="text-xs text-muted-foreground">تقدّمك في كل سورة</span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform ${showSurahs ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {showSurahs && (
          <div className="mt-3 space-y-1 custom-scrollbar" style={{ maxHeight: "24rem", overflowY: "auto" }}>
            {surahProgress.map((sura) => (
              <div key={sura.number} className="flex items-center gap-3 py-1.5 px-1">
                <span className="text-xs text-muted-foreground w-6">{formatNum(sura.number, arabic)}</span>
                <span className="text-sm font-medium w-28 truncate">{sura.name}</span>
                <div
                  className="flex-1 h-2 bg-background rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={sura.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${sura.name}: ${sura.done} من ${sura.span}`}
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${sura.pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-left" dir="rtl">
                  {formatNum(sura.done, arabic)}/{formatNum(sura.span, arabic)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {previewDay !== null && <DayPreviewModal day={previewDay} onClose={() => setPreviewDay(null)} />}
    </div>
  );
}

function JuzCard({
  milestone,
  isCurrent,
  onDayClick,
  arabic,
}: {
  milestone: JuzMilestone;
  isCurrent: boolean;
  onDayClick: (d: number) => void;
  arabic: boolean;
}) {
  const [isOpen, setIsOpen] = useState(isCurrent);

  if (!milestone.isUnlocked) {
    return (
      <div className="bg-surface/40 rounded-2xl p-5 border border-border/50 flex items-center justify-between opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
            <Lock className="w-4 h-4 text-muted-foreground" aria-hidden />
          </div>
          <span className="font-bold text-muted-foreground">الجزء {formatNum(milestone.juz, arabic)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface rounded-2xl border transition-all ${isCurrent ? "border-primary/50 shadow-md" : "border-border"}`}
    >
      <button
        onClick={() => {
          vibrateLight();
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
        className="w-full p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              milestone.isCompleted
                ? "bg-primary text-primary-foreground"
                : isCurrent
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {formatNum(milestone.juz, arabic)}
          </div>
          <div className="text-right">
            <h3 className="font-bold text-lg">الجزء {formatNum(milestone.juz, arabic)}</h3>
            <p className="text-xs text-muted-foreground">
              {milestone.isCompleted
                ? "مكتمل بالكامل"
                : `${formatNum(milestone.days.filter((d) => d.isCompleted).length, arabic)} من ${formatNum(milestone.days.length, arabic)} أثمان`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 border-t border-border/50">
              <div className="flex flex-wrap gap-2 mt-4">
                {milestone.days.map((d) => (
                  <button
                    key={d.day}
                    onClick={() => onDayClick(d.day)}
                    aria-label={`الثمن ${d.day} — ${d.surah}`}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all relative ${
                      d.isToday
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110 z-10"
                        : d.isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-background text-muted-foreground border border-border hover:border-primary/50"
                    }`}
                  >
                    {d.isCompleted && !d.isToday ? (
                      <CheckCircle2 className="w-5 h-5" aria-hidden />
                    ) : (
                      formatNum(d.day, arabic)
                    )}
                    {d.isReviewOnly && !d.isCompleted && !d.isToday && (
                      <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-f-far/60" aria-hidden />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
