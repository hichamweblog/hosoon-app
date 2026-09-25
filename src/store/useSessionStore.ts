import type { TaskType } from "@/lib/constants";
import type { Thumun } from "@/lib/quran-data";
import { create } from "zustand";

export type SessionKind =
  | "new_hifz"
  | "review_near"
  | "review_far"
  | "prep"
  | "khatma"
  | "maintain_recite";

export interface SessionPayload {
  kind: SessionKind;
  day: number;
  thumuns: Thumun[];
  /** khatma/maintain extras — block lists (pace may be >1) */
  reciteJuzs?: number[];
  listenHizbs?: number[];
}

/** TaskType credited when the session completes (khatma handles its own two). */
export const SESSION_TASK: Record<SessionKind, TaskType | null> = {
  new_hifz: "new_hifz",
  review_near: "review_near",
  review_far: "review_far",
  prep: "prep_weekly",
  khatma: null,
  maintain_recite: "maintain_recite",
};

interface SessionState {
  payload: SessionPayload | null;
  open: (payload: SessionPayload) => void;
  close: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  payload: null,
  open: (payload) => set({ payload }),
  close: () => set({ payload: null }),
}));
