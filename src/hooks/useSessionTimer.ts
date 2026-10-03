"use client";
import { useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT = 60_000;

/** Tracks active study time without forcing the user to start or stop a countdown. */
export function useSessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const lastActivity = useRef(Date.now());
  const countedUntil = useRef(Date.now());

  useEffect(() => {
    const markActivity = () => {
      lastActivity.current = Date.now();
      setIsActive(true);
    };
    const update = () => {
      const now = Date.now();
      const active = document.visibilityState === "visible" && now - lastActivity.current < IDLE_TIMEOUT;
      if (active) {
        setElapsed((current) => current + Math.max(0, now - countedUntil.current) / 1000);
      }
      countedUntil.current = now;
      setIsActive(active);
    };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    document.addEventListener("visibilitychange", update);
    const interval = window.setInterval(update, 1000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, markActivity));
      document.removeEventListener("visibilitychange", update);
      window.clearInterval(interval);
    };
  }, []);

  return { elapsed: Math.floor(elapsed), isActive };
}
