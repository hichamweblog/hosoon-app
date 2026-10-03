"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const APP_THEME_IDS = ["dark", "ocean", "ocean-dark", "warm", "light"] as const;
export type AppTheme = (typeof APP_THEME_IDS)[number];

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isAppTheme(value: string | null): value is AppTheme {
  return value !== null && (APP_THEME_IDS as readonly string[]).includes(value);
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window === "undefined") return "warm";
    const stored = window.localStorage.getItem("theme");
    return isAppTheme(stored) ? stored : "warm";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...APP_THEME_IDS);
    root.classList.add(theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme: (nextTheme: AppTheme) => setThemeState(nextTheme),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme must be used inside AppThemeProvider");
  return context;
}
