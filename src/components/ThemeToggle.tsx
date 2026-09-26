"use client";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/useMounted";
import { vibrateLight } from "@/lib/haptic";
import { APP_THEMES } from "@/lib/themes";
import { Compass, Moon, Scroll, Sun, Waves } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) return <div className="w-9 h-9" aria-hidden />;

  const currentTheme = APP_THEMES.find((t) => t.id === theme) ?? APP_THEMES[0];

  const cycleTheme = () => {
    vibrateLight();
    const currentIndex = APP_THEMES.findIndex((t) => t.id === theme);
    const nextIndex = (currentIndex + 1) % APP_THEMES.length;
    const nextTheme = APP_THEMES[nextIndex];
    setTheme(nextTheme.id);
    toast.success(`السمة: ${nextTheme.name}`, { duration: 1400 });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="rounded-full w-9 h-9 text-muted-foreground hover:text-primary transition-colors"
      title={`السمة الحالية: ${currentTheme.name} — اضغط للتبديل`}
      aria-label={`المظهر: ${currentTheme.name} — اضغط للتبديل`}
    >
      {currentTheme.id === "dark" && <Moon className="h-4 w-4" aria-hidden />}
      {currentTheme.id === "ocean" && <Waves className="h-4 w-4 text-[#0d7ea9]" aria-hidden />}
      {currentTheme.id === "ocean-dark" && <Compass className="h-4 w-4 text-[#7fcdff]" aria-hidden />}
      {currentTheme.id === "warm" && <Scroll className="h-4 w-4 text-[#a97c34]" aria-hidden />}
      {currentTheme.id === "light" && <Sun className="h-4 w-4 text-amber-500" aria-hidden />}
    </Button>
  );
}
