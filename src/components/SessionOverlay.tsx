"use client";

import { useSessionTimer } from "@/hooks/useSessionTimer";
import { XP_TABLE, type TaskType } from "@/lib/constants";
import { formatClock, formatNum } from "@/lib/format";
import { hizbThumunRange, juzThumunRange } from "@/lib/fortress-calculator";
import { getReciters, getThumun, surahAudioUrl } from "@/lib/quran-data";
import { surahSpan, thumunShort, thumunTitle, type SurahSpan } from "@/lib/quran-labels";
import { vibrateLight, vibrateSuccess } from "@/lib/haptic";
import { useSessionStore, SESSION_TASK } from "@/store/useSessionStore";
import { useHifzStore, type ThumunRating } from "@/store/useHifzStore";
import { useXpStore } from "@/store/useXpStore";
import { Button } from "./ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  Headphones,
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
      {payload && <SessionInner key={`${payload.kind}-${payload.day}`} />}
    </AnimatePresence>
  );
}

function SessionInner() {
  const payload = useSessionStore((s) => s.payload)!;
  const close = useSessionStore((s) => s.close);
  const { toggleTask, logSession, setThumunRating, completedTasks, settings, updateSettings, notes } =
    useHifzStore();
  const addEvent = useXpStore((s) => s.addEvent);
  const timer = useSessionTimer(25);
  const [confirmClose, setConfirmClose] = useState(false);
  const arabic = settings.arabicNumerals;
  const dayTasks = completedTasks[payload.day] || {};

  const reciters = useMemo(() => getReciters(), []);

  const reciteSpan = useMemo(
    () =>
      (payload.reciteJuzs ?? []).flatMap((j) => spanOfRange(...juzThumunRange(j))),
    [payload.reciteJuzs],
  );
  const listenSpan = useMemo(
    () =>
      (payload.listenHizbs ?? []).flatMap((h) => spanOfRange(...hizbThumunRange(h))),
    [payload.listenHizbs],
  );
  const note = payload.thumuns[0] ? notes[payload.thumuns[0].id] : undefined;

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
        toggleTask(payload.day, task);
        gained += XP_TABLE[task] ?? 0;
      }
    }
    if (rating) {
      for (const t of payload.thumuns) setThumunRating(t.id, rating);
    }
    logSession(tasks[0] ?? "new_hifz", payload.day, Math.max(1, timer.elapsed));
    if (gained > 0) addEvent(gained, window.innerWidth / 2, window.innerHeight / 2);
    close();
  };

  const taskOf = SESSION_TASK[payload.kind];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={TITLES[payload.kind]}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-surface rounded-3xl p-6 sm:p-8 w-full max-w-md border border-border shadow-2xl relative my-8"
      >
        <div className="flex justify-between items-center mb-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={requestClose}
            aria-label="إغلاق الجلسة"
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-lg">{TITLES[payload.kind]}</span>
          <div className="w-9" aria-hidden />
        </div>

        {confirmClose && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-sm flex items-center justify-between gap-2">
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
          <div className="mb-4 bg-f-gold/10 border border-f-gold/30 text-foreground/90 rounded-xl px-3 py-2 text-xs leading-relaxed">
            <b className="text-f-gold">ملاحظتك:</b> {note}
          </div>
        ) : null}

        <div className="space-y-4 mb-6">
          {payload.kind === "khatma" ? (
            <div className="space-y-4">
              <SpanSection
                title={`تلاوة: ${(payload.reciteJuzs ?? []).length > 1 ? "الأجزاء" : "الجزء"} ${(payload.reciteJuzs ?? [])
                  .map((j) => formatNum(j, arabic))
                  .join("، ")}`}
                rows={reciteSpan}
                arabic={arabic}
              />
              <SpanSection
                title={`سماع: ${(payload.listenHizbs ?? []).length > 1 ? "الأحزاب" : "الحزب"} ${(payload.listenHizbs ?? [])
                  .map((h) => formatNum(h, arabic))
                  .join("، ")}`}
                rows={listenSpan}
                arabic={arabic}
                audio={
                  <>
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        className="bg-background border border-border rounded-lg px-2 py-1 text-xs"
                        value={settings.reciterId}
                        onChange={(e) => updateSettings({ reciterId: e.target.value })}
                        aria-label="اختيار القارئ"
                      >
                        {reciters.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-muted-foreground">
                        رواية ورش عن نافع
                      </span>
                    </div>
                  </>
                }
              />
            </div>
          ) : (
            <div className="space-y-2">
              {payload.thumuns.map((t) => (
                <div key={t.id} className="bg-background/50 rounded-xl p-3 border border-border/50">
                  <p className="font-bold text-sm">{thumunTitle(t, arabic)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{thumunShort(t, arabic)}</p>
                  <p className="font-quran text-foreground/85 text-base leading-loose mt-1.5 line-clamp-2">
                    {t.partialStart ? "…" : ""}
                    {t.text}
                  </p>
                </div>
              ))}
              {payload.thumuns.length === 0 && (
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

        {/* Footer */}
        <div className="space-y-3">
          {(payload.kind === "new_hifz" || payload.kind === "maintain_recite") && taskOf && (
            <Button
              size="lg"
              className="w-full text-lg font-bold h-14 rounded-xl"
              onClick={(e) => {
                addEvent(XP_TABLE[taskOf] ?? 0, e.clientX, e.clientY);
                completeTasks([taskOf]);
              }}
            >
              {payload.kind === "new_hifz" ? "تم إنجاز الحفظ" : "تم الورد"}
            </Button>
          )}

          {(payload.kind === "review_near" || payload.kind === "review_far") && (
            <>
              <p className="text-sm text-muted-foreground text-center">كيف كان مستوى الحفظ؟</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="h-12 bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                  onClick={() => completeTasks(taskOf ? [taskOf] : [], "weak")}
                >
                  ضعيف
                </Button>
                <Button
                  variant="outline"
                  className="h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                  onClick={() => completeTasks(taskOf ? [taskOf] : [], "good")}
                >
                  جيد
                </Button>
                <Button
                  variant="outline"
                  className="h-12 bg-f-near/10 text-f-near border-f-near/20 hover:bg-f-near/20"
                  onClick={() => completeTasks(taskOf ? [taskOf] : [], "strong")}
                >
                  ممتاز
                </Button>
              </div>
            </>
          )}

          {payload.kind === "prep" && taskOf && (
            <Button
              size="lg"
              className="w-full text-lg font-bold h-14 rounded-xl"
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
  audio,
}: {
  title: string;
  rows: SurahSpan[];
  arabic: boolean;
  audio?: React.ReactNode;
}) {
  const reciterId = useHifzStore((s) => s.settings.reciterId);
  const reciters = getReciters();
  const reciter = reciters.find((r) => r.id === reciterId) ?? reciters[0];
  return (
    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
      <p className="font-bold text-sm mb-2">{title}</p>
      <ul className="space-y-1.5 text-sm">
        {rows.map((row) => (
          <li key={row.sura} className="flex items-center justify-between gap-2">
            <span className="text-foreground/90">
              {row.name} — من الآية {formatNum(row.fromAya, arabic)} إلى {formatNum(row.toAya, arabic)}
            </span>
            {audio && (
              <a
                href={surahAudioUrl(reciter, row.sura)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-f-khatma hover:underline text-xs flex items-center gap-1 shrink-0"
                aria-label={`استماع سورة ${row.name} بصوت ${reciter.name}`}
              >
                <Headphones className="w-3.5 h-3.5" /> استماع
              </a>
            )}
          </li>
        ))}
      </ul>
      {audio}
    </div>
  );
}
