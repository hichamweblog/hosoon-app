"use client";

import { playDing, vibrateSuccess } from "@/lib/haptic";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Countdown timer based on an end timestamp (survives background-tab
 * throttling), with completion alerts (sound + vibration + notification).
 */
export function useSessionTimer(initialMinutes = 25) {
  const [duration, setDurationState] = useState(initialMinutes * 60);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(initialMinutes * 60);
  const [done, setDone] = useState(false);
  const firedRef = useRef(false);

  const isActive = endAt !== null;

  // tick
  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        vibrateSuccess();
        playDing();
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("حصون — انتهت الجلسة", {
              body: "أحسنت! انتقل للخطوة التالية في وردك.",
              tag: "hosoon-session",
            });
          }
        } catch {
          /* ignore */
        }
        setDone(true);
        setEndAt(null);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endAt]);

  const start = useCallback(() => {
    firedRef.current = false;
    setDone(false);
    setEndAt(Date.now() + remaining * 1000);
  }, [remaining]);

  const pause = useCallback(() => {
    if (endAt !== null) {
      setRemaining(Math.max(0, Math.round((endAt - Date.now()) / 1000)));
      setEndAt(null);
    }
  }, [endAt]);

  const reset = useCallback(() => {
    firedRef.current = false;
    setDone(false);
    setEndAt(null);
    setRemaining(duration);
  }, [duration]);

  const changeDuration = useCallback(
    (deltaMinutes: number) => {
      if (isActive) return;
      setDurationState((d) => {
        const next = Math.max(5 * 60, Math.min(120 * 60, d + deltaMinutes * 60));
        setRemaining(next);
        return next;
      });
      setDone(false);
    },
    [isActive],
  );

  return {
    remaining,
    duration,
    isActive,
    done,
    elapsed: duration - remaining,
    start,
    pause,
    reset,
    changeDuration,
  };
}
