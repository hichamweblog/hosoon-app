"use client";
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { onAuthChange, supabase } from "@/lib/supabase";
import { stopAudio } from "@/lib/audio-engine";
import { stopCloudSync } from "@/lib/sync/service";
import { useAuthStore } from "@/store/useAuthStore";
import { useHifzStore } from "@/store/useHifzStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useMushafStore } from "@/store/useMushafStore";
import { useAppStatusStore } from "@/store/useAppStatusStore";

export function useAccount() {
  useEffect(() => {
    let cancelled = false;
    const change = (user: User | null, recovery = false) => {
      if (cancelled) return;
      const owner = user?.id ?? null;
      if (useHifzStore.getState().ownerId !== owner) {
        stopCloudSync(); stopAudio();
        const active = useSessionStore.getState(), previous = useHifzStore.getState();
        if (active.payload && active.elapsed > 0 && active.payload.ownerId === previous.ownerId) previous.logSession("free_review", active.payload.day, active.elapsed, { id: active.payload.id, thumunIds: active.payload.thumuns.map((t) => t.id), abandoned: true });
        useSessionStore.getState().close(); useMushafStore.getState().closeReader();
        try { useHifzStore.getState().switchOwner(owner); }
        catch {
          useAppStatusStore.getState().setStatus({ storageError: "تعذر فتح مساحة الحساب. صدّر بياناتك قبل إعادة تحميل الصفحة." });
          // Never expose the previous owner's data under the new login.
          useAuthStore.getState().setAuth({ user: null, initialized: true });
          return;
        }
      }
      useAuthStore.getState().setAuth({ user: user ? { id: user.id, email: user.email } : null, initialized: true, recovery: user ? recovery || useAuthStore.getState().recovery : false });
    };
    if (!supabase) { change(null); return () => { cancelled = true; }; }
    const unsubscribe = onAuthChange((user, event) => change(user, event === "PASSWORD_RECOVERY"));
    // Cached session permits cold offline opening. Backend writes still verify getUser().
    void supabase.auth.getSession().then(({ data }) => change(data.session?.user ?? null));
    return () => { cancelled = true; unsubscribe(); };
  }, []);
}
