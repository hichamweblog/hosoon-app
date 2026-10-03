"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { playDing, vibrateSuccess } from "@/lib/haptic";
import { showReminderNotification } from "@/lib/reminders";

/** Wall-clock countdown; studying time survives pauses, duration changes and nested reader. */
export function useSessionTimer(initialMinutes = 25) {
  const [duration, setDuration] = useState(initialMinutes * 60), [remaining, setRemaining] = useState(initialMinutes * 60);
  const [run, setRun] = useState<{ started: number; end: number } | null>(null);
  const [accumulated, setAccumulated] = useState(0), [pastCycles, setPastCycles] = useState(0), [now, setNow] = useState(Date.now), [done, setDone] = useState(false);
  const fired = useRef(false);
  const activeSeconds = run ? Math.max(0, Math.min(run.end, now) - run.started) / 1000 : 0;
  const elapsed = Math.floor(pastCycles + accumulated + activeSeconds);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      const time = Date.now(); setNow(time);
      setRemaining(Math.max(0, Math.ceil((run.end - time) / 1000)));
      if (time >= run.end && !fired.current) {
        fired.current = true; setAccumulated((value) => value + (run.end - run.started) / 1000);
        setRun(null); setDone(true); vibrateSuccess(); playDing();
        if (document.documentElement.dataset.quiet !== "true") void showReminderNotification("انتهى وقت الجلسة. قيّم ما راجعته أو خذ استراحة.");
      }
    }, 500);
    return () => clearInterval(id);
  }, [run]);
  const start = useCallback(() => {
    if (remaining <= 0 || run) return;
    const time = Date.now(); fired.current = false; setDone(false); setNow(time); setRun({ started: time, end: time + remaining * 1000 });
  }, [remaining, run]);
  const pause = useCallback(() => {
    if (!run) return;
    const time = Math.min(Date.now(), run.end);
    setAccumulated((value) => value + Math.max(0, time - run.started) / 1000);
    setRemaining(Math.max(0, Math.ceil((run.end - time) / 1000))); setRun(null);
  }, [run]);
  const reset = useCallback(() => {
    const time = run ? Math.max(0, Math.min(Date.now(), run.end) - run.started) / 1000 : 0;
    setPastCycles((value) => value + accumulated + time); setAccumulated(0); setRun(null);
    setRemaining(duration); setDone(false); fired.current = false;
  }, [run, duration, accumulated]);
  const changeDuration = useCallback((minutes: number) => {
    if (run) return;
    const next = Math.max(300, Math.min(7200, duration + minutes * 60));
    setDuration(next); setRemaining(Math.max(0, Math.ceil(next - accumulated))); setDone(false);
  }, [run, duration, accumulated]);
  return { duration, remaining, elapsed, done, isActive: run !== null, start, pause, reset, changeDuration };
}
