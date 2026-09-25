"use client";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/useMounted";
import { vibrateLight } from "@/lib/haptic";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) return <div className="w-9 h-9" aria-hidden />;

  const cycleTheme = () => {
    vibrateLight();
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const label =
    theme === "dark" ? "الوضع الداكن" : theme === "light" ? "الوضع الفاتح" : "حسب النظام";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="rounded-full w-9 h-9 text-muted-foreground hover:text-primary transition-colors"
      title={label}
      aria-label={`المظهر: ${label} — اضغط للتبديل`}
    >
      {theme === "dark" && <Moon className="h-4 w-4" aria-hidden />}
      {theme === "light" && <Sun className="h-4 w-4" aria-hidden />}
      {theme === "system" && <Monitor className="h-4 w-4" aria-hidden />}
    </Button>
  );
}
