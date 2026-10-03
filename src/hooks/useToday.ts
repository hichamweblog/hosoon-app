"use client";
import { useEffect, useState } from "react";
import { localDateKey } from "@/lib/format";
/** Midnight/foreground rollover; one immutable plan per local calendar date. */
export function useToday() {
  const [today, setToday] = useState(localDateKey);
  useEffect(() => {
    const refresh = () => setToday(localDateKey());
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return today;
}
