import { TOTAL_THUMUNS } from "@/lib/constants";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TaskType =
  | "khatma"
  | "prep_weekly"
  | "prep_night"
  | "prep_pre"
  | "new_hifz"
  | "review_near"
  | "review_far";

export interface DailyTasks {
  [taskType: string]: boolean;
}

interface DailyLogEntry {
  day: number;
  completedAll: boolean;
  tasksCompleted: number;
  date: string; // ISO date string
}

interface HifzState {
  // Core
  currentDay: number;
  startDate: string;
  completedTasks: Record<number, DailyTasks>;
  farReviewPointer: number;

  // Streak
  streak: number;
  bestStreak: number;
  lastActiveDate: string;

  // Daily log for calendar heatmap
  dailyLog: Record<string, DailyLogEntry>;

  // Notes per thumun
  notes: Record<number, string>;

  // Onboarding
  showOnboarding: boolean;

  // Actions
  toggleTask: (day: number, task: TaskType) => void;
  advanceDay: () => void;
  goToDay: (day: number) => void;
  resetProgress: () => void;
  setNote: (thumunId: number, note: string) => void;
  completeOnboarding: () => void;
  recordDailyCompletion: (
    day: number,
    completedAll: boolean,
    tasksCompleted: number,
  ) => void;
}

const getToday = () => new Date().toISOString().split("T")[0];

const calculateStreak = (
  lastActiveDate: string,
  currentStreak: number,
): { streak: number; resetStreak: boolean } => {
  const today = getToday();
  if (lastActiveDate === today) {
    return { streak: currentStreak, resetStreak: false };
  }

  const last = new Date(lastActiveDate);
  const now = new Date(today);
  const diffDays = Math.floor(
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 1) {
    return { streak: currentStreak + 1, resetStreak: false };
  } else if (diffDays > 1) {
    return { streak: 1, resetStreak: true };
  }
  return { streak: currentStreak, resetStreak: false };
};

export const useHifzStore = create<HifzState>()(
  persist(
    (set) => ({
      currentDay: 1,
      startDate: new Date().toISOString(),
      completedTasks: {},
      streak: 0,
      bestStreak: 0,
      lastActiveDate: "",
      dailyLog: {},
      notes: {},
      showOnboarding: true,
      farReviewPointer: 1,

      toggleTask: (day, task) =>
        set((state) => ({
          completedTasks: {
            ...state.completedTasks,
            [day]: {
              ...(state.completedTasks[day] || {}),
              [task]: !state.completedTasks[day]?.[task],
            },
          },
        })),

      advanceDay: () =>
        set((state) => {
          const today = getToday();
          const { streak: newStreak } = calculateStreak(
            state.lastActiveDate,
            state.streak,
          );
          const updatedStreak =
            state.lastActiveDate === today ? state.streak : newStreak;

          const currentDay = state.currentDay;
          const currentPoolSize = currentDay - 9;
          let nextPointer = state.farReviewPointer || 1;

          if (currentPoolSize > 0) {
            const rate = currentDay <= 240 ? 16 : currentDay <= 360 ? 24 : 32;
            nextPointer += rate;
            const nextPoolSize = currentDay + 1 - 9;
            if (nextPointer > nextPoolSize) {
              nextPointer = 1;
            }
          }

          return {
            currentDay: Math.min(state.currentDay + 1, TOTAL_THUMUNS),
            streak: updatedStreak,
            bestStreak: Math.max(state.bestStreak, updatedStreak),
            lastActiveDate: today,
            farReviewPointer: nextPointer,
          };
        }),

      goToDay: (day) =>
        set(() => ({
          currentDay: Math.max(1, Math.min(day, TOTAL_THUMUNS)),
        })),

      resetProgress: () =>
        set(() => ({
          currentDay: 1,
          completedTasks: {},
          startDate: new Date().toISOString(),
          streak: 0,
          dailyLog: {},
          notes: {},
          farReviewPointer: 1,
        })),

      setNote: (thumunId, note) =>
        set((state) => ({
          notes: {
            ...state.notes,
            [thumunId]: note,
          },
        })),

      completeOnboarding: () =>
        set(() => ({
          showOnboarding: false,
          startDate: new Date().toISOString(),
          lastActiveDate: getToday(),
        })),

      recordDailyCompletion: (day, completedAll, tasksCompleted) =>
        set((state) => {
          const today = getToday();
          return {
            dailyLog: {
              ...state.dailyLog,
              [today]: { day, completedAll, tasksCompleted, date: today },
            },
          };
        }),
    }),
    {
      name: "hifz-storage",
    },
  ),
);

// Hydration helper for SSR safety
export const useHifzHydrated = () => {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(id);
  }, []);
  return hydrated;
};
