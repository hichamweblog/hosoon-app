"use client";

import { fetchProgressFromCloud, mergeProgress, syncProgressToCloud } from "@/lib/supabase";
import { useHifzStore } from "@/store/useHifzStore";
import { useEffect, useRef } from "react";

/**
 * Automatic cloud sync: debounced push on state change (while signed in),
 * plus a pull-merge-push when the tab becomes visible again.
 */
export function useCloudSync(enabled: boolean) {
  const stateRef = useRef(useHifzStore.getState());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    useHifzStore.subscribe((s) => {
      stateRef.current = s;
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const snapshot = () => {
      const s = stateRef.current;
      return {
        currentDay: s.currentDay,
        streak: s.streak,
        bestStreak: s.bestStreak,
        totalXp: s.totalXp,
        completedTasks: s.completedTasks,
        dailyLog: s.dailyLog,
        sessionLog: s.sessionLog,
        notes: s.notes,
        thumunRatings: s.thumunRatings,
        editedThumuns: s.editedThumuns,
        khatma_completed_at: s.khatmaCompletedAt,
        maintain: s.maintain,
        settings: s.settings as unknown as Record<string, unknown>,
      };
    };

    const push = async () => {
      const { error } = await syncProgressToCloud({
        current_day: snapshot().currentDay,
        streak: snapshot().streak,
        best_streak: snapshot().bestStreak,
        total_xp: snapshot().totalXp,
        completed_tasks: snapshot().completedTasks,
        daily_log: snapshot().dailyLog,
        session_log: snapshot().sessionLog,
        notes: snapshot().notes,
        thumun_ratings: snapshot().thumunRatings as Record<string, string>,
        edited_thumuns: snapshot().editedThumuns,
        khatma_completed_at: snapshot().khatma_completed_at,
        maintain: snapshot().maintain,
        settings: snapshot().settings,
      });
      if (!error) useHifzStore.getState().setLastCloudSync(new Date().toISOString());
    };

    const pullMergePush = async () => {
      const { data } = await fetchProgressFromCloud();
      if (!data) return push();
      const local = useHifzStore.getState();
      const remoteShaped = {
        currentDay: data.current_day,
        streak: data.streak,
        bestStreak: data.best_streak,
        totalXp: data.total_xp,
        completedTasks: data.completed_tasks as Record<number, Record<string, boolean>>,
        dailyLog: data.daily_log as never,
        notes: data.notes as Record<number, string>,
        thumunRatings: data.thumun_ratings as Record<number, never>,
        editedThumuns: data.edited_thumuns as Record<number, never>,
      };
      const localShaped = {
        currentDay: local.currentDay,
        streak: local.streak,
        bestStreak: local.bestStreak,
        totalXp: local.totalXp,
        completedTasks: local.completedTasks,
        dailyLog: local.dailyLog as never,
        notes: local.notes,
        thumunRatings: local.thumunRatings as Record<number, never>,
        editedThumuns: local.editedThumuns as Record<number, never>,
      };
      const merged = mergeProgress(localShaped, remoteShaped);
      useHifzStore.getState().hydrateFromCloud(merged);
      await push();
    };

    const schedulePush = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(push, 5000);
    };

    const unsub = useHifzStore.subscribe(schedulePush);

    const onVisible = () => {
      if (document.visibilityState === "visible") void pullMergePush();
    };
    document.addEventListener("visibilitychange", onVisible);
    void pullMergePush();

    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onVisible);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled]);
}
