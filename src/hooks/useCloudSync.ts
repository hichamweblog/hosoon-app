"use client";
import { useEffect } from "react";
import { startCloudSync, synchronizeNow } from "@/lib/sync/service";
import { useAppStatusStore } from "@/store/useAppStatusStore";

export function useCloudSync(ownerId: string | null) {
  const storageError = useAppStatusStore((s) => s.storageError);
  useEffect(() => {
    if (!ownerId || storageError) return;
    const stop = startCloudSync(ownerId);
    const refresh = () => {
      if (document.visibilityState === "visible") void synchronizeNow().catch(() => {});
    };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { stop(); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [ownerId, storageError]);
}
