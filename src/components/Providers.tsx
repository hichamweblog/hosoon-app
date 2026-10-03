"use client";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHifzStore } from "@/store/useHifzStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const quiet = useHifzStore((s) => s.settings.quietMode), scale = useHifzStore((s) => s.settings.fontScale);
  useEffect(() => {
    document.documentElement.dataset.quiet = String(quiet);
    document.documentElement.style.fontSize = `${scale * 100}%`;
  }, [quiet, scale]);
  return <ThemeProvider attribute="class" defaultTheme="dark" themes={["dark", "ocean", "ocean-dark", "warm", "light"]} enableSystem={false} disableTransitionOnChange>
    <MotionConfig reducedMotion={quiet ? "always" : "user"}><TooltipProvider>{children}</TooltipProvider></MotionConfig>
  </ThemeProvider>;
}
