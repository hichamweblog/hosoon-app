"use client";
import { useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/store/useSessionStore";
import { useMushafStore } from "@/store/useMushafStore";
import { reportDiagnostic } from "@/lib/diagnostics";
import { Button } from "./ui/button";

export default function PwaManager() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null), [dismissed, setDismissed] = useState(false), requested = useRef(false);
  const session = useSessionStore((s) => s.payload), reader = useMushafStore((s) => s.isOpen);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let live = true;
    const controller = () => { if (requested.current) window.location.reload(); };
    const detect = (registration: ServiceWorkerRegistration) => { if (live && registration.waiting) setWaiting(registration.waiting); };
    const initialize = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (!live) return; detect(registration);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => { if (worker.state === "installed") detect(registration); });
        });
      } catch { reportDiagnostic("pwa-registration-failed"); }
    };
    navigator.serviceWorker.addEventListener("controllerchange", controller);
    const timeout = setTimeout(() => { void initialize(); }, 1000);
    return () => { live = false; clearTimeout(timeout); navigator.serviceWorker.removeEventListener("controllerchange", controller); };
  }, []);
  if (!waiting || dismissed) return null;
  return <aside className="fixed bottom-20 left-3 right-3 z-[70] max-w-lg mx-auto p-3 border border-primary rounded-2xl bg-card shadow-lg space-y-2" aria-label="تحديث التطبيق"><p className="text-sm">تحديث متاح؛ لن نقطع الجلسة أو نعيد تحميل التطبيق تلقائيًا.</p><Button size="sm" disabled={!!session || reader} onClick={() => { requested.current = true; waiting.postMessage({ type: "ACTIVATE_UPDATE" }); }}>تثبيت التحديث بعد الحفظ</Button><Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>لاحقًا</Button>{(session || reader) && <p className="text-xs text-muted-foreground">أغلق الجلسة والمصحف بعد الحفظ لتحديث آمن.</p>}</aside>;
}
