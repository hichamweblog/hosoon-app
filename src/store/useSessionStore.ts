import { create } from "zustand";
import type { TaskType } from "@/lib/constants";
import type { Thumun } from "@/lib/quran-data";
import { newId } from "@/lib/progress/clock";
import { localDateKey } from "@/lib/format";
import { useHifzStore } from "./useHifzStore";

export type SessionKind = "new_hifz" | "review_near" | "review_far" | "free_review" | "prep" | "khatma" | "khatma_recite" | "khatma_listen" | "maintain_recite";
export interface SessionPayload {
  id: string;
  ownerId: string | null;
  kind: SessionKind;
  day: number;
  thumuns: Thumun[];
  reciteJuzs?: number[];
  listenHizbs?: number[];
  planDate?: string;
  preview: boolean;
  minutes?: number;
}
export type SessionInput = Omit<SessionPayload, "id" | "ownerId" | "preview"> & { preview?: boolean };
export const SESSION_TASK: Record<SessionKind, TaskType | null> = {
  new_hifz: "new_hifz", review_near: "review_near", review_far: "review_far", free_review: null,
  prep: "prep_weekly", khatma: null, khatma_recite: "khatma_recite", khatma_listen: "khatma_listen", maintain_recite: "maintain_recite",
};
interface SessionState { payload: SessionPayload | null; elapsed: number; setElapsed: (id: string, seconds: number) => void; open: (payload: SessionInput) => void; close: () => void }
export const useSessionStore = create<SessionState>((set, get) => ({
  payload: null, elapsed: 0,
  setElapsed: (id, seconds) => { if (get().payload?.id === id) set({ elapsed: seconds }); },
  open: (input) => {
    if (get().payload) return; // Do not replace a running session without its leave confirmation.
    useHifzStore.getState().ensureTodayPlan();
    const data = useHifzStore.getState(), planDate = input.planDate ?? localDateKey();
    const plan = data.dailyPlans[planDate];
    const preview = input.preview === true || input.day > data.currentDay || (input.kind !== "free_review" && plan?.journeyDay !== input.day);
    set({ elapsed: 0, payload: { ...input, planDate, preview, id: newId(), ownerId: data.ownerId } });
  },
  close: () => set({ payload: null, elapsed: 0 }),
}));
