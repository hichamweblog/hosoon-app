"use client";
import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHifzStore } from "@/store/useHifzStore";
import { AppThemeProvider } from "./theme-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const quiet = useHifzStore((s) => s.settings.quietMode), scale = useHifzStore((s) => s.settings.fontScale);
  useEffect(() => {
    document.documentElement.dataset.quiet = String(quiet);
    document.documentElement.style.fontSize = `${scale * 100}%`;
  }, [quiet, scale]);
  return <AppThemeProvider>
    <MotionConfig reducedMotion={quiet ? "always" : "user"}><TooltipProvider>{children}</TooltipProvider></MotionConfig>
  </AppThemeProvider>;
}
