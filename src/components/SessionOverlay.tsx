"use client";

import { useSessionTimer } from "@/hooks/useSessionTimer";
import { XP_TABLE, type TaskType } from "@/lib/constants";
import { formatClock, formatNum } from "@/lib/format";
import { juzThumunRange } from "@/lib/fortress-calculator";
import { getThumun } from "@/lib/quran-data";
import { surahSpan, thumunShort, thumunTitle, type SurahSpan } from "@/lib/quran-labels";
import { vibrateLight, vibrateSuccess } from "@/lib/haptic";
import { useSessionStore, SESSION_TASK, type SessionPayload } from "@/store/useSessionStore";
import { useHifzStore, type ThumunRating } from "@/store/useHifzStore";
import { useXpStore } from "@/store/useXpStore";
import QuranAudioPlayer from "./audio/QuranAudioPlayer";
import { Button } from "./ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const TITLES: Record<string, string> = {
  new_hifz: "جلسة الحفظ",
  review_near: "جلسة مراجعة القريب",
  review_far: "جلسة مراجعة البعيد",
  prep: "جلسة التحضير",
  khatma: "جلسة الختمة",
  maintain_recite: "الورد التثبيتي",
};

function spanOfRange(a: number, b: number): SurahSpan[] {
  const from = getThumun(a);
  const to = getThumun(b);
  return from && to ? surahSpan(from, to) : [];
}

export default function SessionOverlay() {
  const payload = useSessionStore((s) => s.payload);
  return (
    <AnimatePresence>
      {payload && (
        <SessionInner
          key={`${payload.kind}-${payload.day}`}
          payload={payload}
        />
      )}
    </AnimatePresence>
  );
}

function SessionInner({ payload }: { payload: SessionPayload }) {
  const close = useSessionStore((s) => s.close);
  const toggleTask = useHifzStore((s) => s.toggleTask);
  const logSession = useHifzStore((s) => s.logSession);
  const setThumunRating = useHifzStore((s) => s.setThumunRating);
  const completedTasks = useHifzStore((s) => s.completedTasks);
  const settings = useHifzStore((s) => s.settings);
  const notes = useHifzStore((s) => s.notes);
  const addEvent = useXpStore((s) => s.addEvent);
  const timer = useSessionTimer(25);
  const [confirmClose, setConfirmClose] = useState(false);
  const arabic = settings.arabicNumerals;

  const day = payload?.day ?? 1;
  const kind = payload?.kind ?? "new_hifz";
  const thumuns = payload?.thumuns ?? [];
  const reciteJuzs = payload?.reciteJuzs;
  const listenHizbs = payload?.listenHizbs;

  const dayTasks = completedTasks[day] || {};

  const reciteSpan = useMemo(
    () =>
      (reciteJuzs ?? []).flatMap((j) => spanOfRange(...juzThumunRange(j))),
    [reciteJuzs],
  );
  const note = thumuns[0] ? notes[thumuns[0].id] : undefined;

  const requestClose = () => {
    if ((timer.elapsed > 30 || timer.isActive) && !confirmClose) {
      setConfirmClose(true);
      return;
    }
    close();
  };

  const completeTasks = (tasks: TaskType[], rating?: ThumunRating) => {
    vibrateSuccess();
    let gained = 0;
    for (const task of tasks) {
      if (!dayTasks[task]) {
        toggleTask(day, task);
        gained += XP_TABLE[task] ?? 0;
      }
    }
    if (rating) {
      for (const t of thumuns) setThumunRating(t.id, rating);
    }
    logSession(tasks[0] ?? "new_hifz", day, Math.max(1, timer.elapsed));
    if (gained > 0) addEvent(gained, window.innerWidth / 2, window.innerHeight / 2);
    close();
  };

  const taskOf = SESSION_TASK[kind];

  if (!payload) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={TITLES[kind]}
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="bg-surface rounded-3xl w-full max-w-lg max-h-[90dvh] flex flex-col min-h-0 border border-border shadow-2xl relative overflow-hidden my-auto"
      >
        {/* Fixed Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-border/40 shrink-0 bg-surface/95 backdrop-blur-sm z-10 flex justify-between items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={requestClose}
            aria-label="إغلاق الجلسة"
            className="rounded-full hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-lg">{TITLES[kind]}</span>
          <div className="w-9" aria-hidden />
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 overscroll-contain custom-scrollbar">
          {confirmClose && (
            <div className="p-3 rounded-xl bg-destructive/10 text-sm flex items-center justify-between gap-2 border border-destructive/20">
              <span>إنهاء الجلسة دون إتمام؟</span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmClose(false)}>
                  بقائي
                </Button>
                <Button size="sm" variant="destructive" onClick={close}>
                  إنهاء
                </Button>
              </span>
            </div>
          )}

          {note ? (
            <div className="bg-f-gold/10 border border-f-gold/30 text-foreground/90 rounded-xl px-3 py-2 text-xs leading-relaxed">
              <b className="text-f-gold">ملاحظتك:</b> {note}
            </div>
          ) : null}

          {kind === "khatma" ? (
            <div className="space-y-4">
              <SpanSection
                title={`تلاوة: ${(reciteJuzs ?? []).length > 1 ? "الأجزاء" : "الجزء"} ${(reciteJuzs ?? [])
                  .map((j) => formatNum(j, arabic))
                  .join("، ")}`}
                rows={reciteSpan}
                arabic={arabic}
              />
              <div className="space-y-3">
                <p className="font-bold text-sm text-foreground">
                  سماع: {(listenHizbs ?? []).length > 1 ? "الأحزاب" : "الحزب"} {(listenHizbs ?? [])
                    .map((h) => formatNum(h, arabic))
                    .join("، ")}
                </p>
                {(listenHizbs ?? []).map((h) => (
                  <QuranAudioPlayer
                    key={h}
                    mode="hizb"
                    targetId={h}
                    title={`سماع الحزب ${formatNum(h, arabic)}`}
                    subtitle="ورد الاستماع لليوم"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {thumuns.map((t) => (
                <div key={t.id} className="bg-background/50 rounded-2xl p-4 border border-border/50 space-y-3">
                  <div>
                    <p className="font-bold text-base text-foreground">{thumunTitle(t, arabic)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{thumunShort(t, arabic)}</p>
                  </div>
                  <p className="font-quran text-foreground/90 text-lg leading-loose">
                    {t.partialStart ? "…" : ""}
                    {t.text}
                  </p>
                  {(kind === "new_hifz" || kind === "prep") && (
                    <QuranAudioPlayer
                      mode="thumun"
                      targetId={t.id}
                      compact={kind === "prep"}
                      title={`سماع ${thumunTitle(t, arabic)}`}
                      subtitle={kind === "new_hifz" ? "استمع وكرر لتثبيت الحفظ الجديد" : "تحضير الثمن بالسماع"}
                    />
                  )}
                </div>
              ))}
              {thumuns.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا مادة لهذا اليوم</p>
              )}
            </div>
          )}

          {/* Timer */}
          <div className="bg-background/50 rounded-2xl p-5 border border-border">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="إنقاص خمس دقائق"
                onClick={() => {
                  vibrateLight();
                  timer.changeDuration(-5);
                }}
                disabled={timer.isActive || timer.duration <= 300}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div
                className="text-5xl font-mono font-bold tracking-widest text-primary w-40 text-center"
                aria-live="polite"
              >
                {formatClock(timer.remaining)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="زيادة خمس دقائق"
                onClick={() => {
                  vibrateLight();
                  timer.changeDuration(5);
                }}
                disabled={timer.isActive}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={timer.isActive ? "outline" : "default"}
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={() => {
                  vibrateLight();
                  if (timer.isActive) timer.pause();
                  else timer.start();
                }}
                aria-label={timer.isActive ? "إيقاف مؤقت" : "بدء المؤقت"}
              >
                {timer.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={() => {
                  vibrateLight();
                  timer.reset();
                }}
                aria-label="إعادة ضبط المؤقت"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 sm:p-5 pt-3 border-t border-border/40 bg-surface/95 backdrop-blur-sm shrink-0 space-y-3">
          {(kind === "new_hifz" || kind === "maintain_recite") && taskOf && (
            <Button
              size="lg"
              className="w-full text-lg font-bold h-12 rounded-xl"
              onClick={(e) => {
                addEvent(XP_TABLE[taskOf] ?? 0, e.clientX, e.clientY);
                completeTasks([taskOf]);
              }}
            >
              {kind === "new_hifz" ? "تم إنجاز الحفظ" : "تم الورد"}
            </Button>
          )}

          {(kind === "review_near" || kind === "review_far") && (
            <>
              <p className="text-sm text-muted-foreground text-center">كيف كان مستوى الحفظ؟</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="h-11 bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                  onClick={() => completeTasks(taskOf ? [taskOf] : [], "weak")}
                >
                  ضعيف
                </Button>
                <Button
                  variant="outline"
                  className="h-11 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                  onClick={() => completeTasks(taskOf ? [taskOf] : [], "good")}
                >
                  جيد
                </Button>
                <Button
                  variant="outline"
                  className="h-11 bg-f-near/10 text-f-near border-f-near/20 hover:bg-f-near/20"
                  onClick={() => completeTasks(taskOf ? [taskOf] : [], "strong")}
                >
                  ممتاز
                </Button>
              </div>
            </>
          )}

          {kind === "prep" && taskOf && (
            <Button
              size="lg"
              className="w-full text-lg font-bold h-12 rounded-xl"
              onClick={(e) => {
                addEvent(XP_TABLE[taskOf] ?? 0, e.clientX, e.clientY);
                completeTasks([taskOf]);
              }}
            >
              إتمام التحضير
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SpanSection({
  title,
  rows,
  arabic,
}: {
  title: string;
  rows: SurahSpan[];
  arabic: boolean;
}) {
  return (
    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
      <p className="font-bold text-sm mb-2">{title}</p>
      <ul className="space-y-1.5 text-sm">
        {rows.map((row) => (
          <li key={row.sura} className="flex items-center justify-between gap-2">
            <span className="text-foreground/90">
              {row.name} — من الآية {formatNum(row.fromAya, arabic)} إلى {formatNum(row.toAya, arabic)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
