import { create } from "zustand";
export type SyncPhase = "local" | "pending" | "syncing" | "synced" | "error";
interface AppStatus {
  storageError: string | null;
  migrationNotice: string | null;
  syncPhase: SyncPhase;
  syncError: string | null;
  syncedAt: string | null;
  ownerId: string | null;
  cloudReadReady: boolean;
  guestTransferAvailable: boolean;
  setStatus: (patch: Partial<Omit<AppStatus, "setStatus">>) => void;
}
export const useAppStatusStore = create<AppStatus>((set) => ({
  storageError: null, migrationNotice: null, syncPhase: "local", syncError: null,
  syncedAt: null, ownerId: null, cloudReadReady: false, guestTransferAvailable: false,
  setStatus: (patch) => set(patch),
}));
