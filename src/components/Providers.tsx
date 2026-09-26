'use client';

import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      themes={["dark", "ocean", "ocean-dark", "warm", "light"]}
      enableSystem={false}
      disableTransitionOnChange
    >
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  );
}
