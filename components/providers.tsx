"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { YearProvider } from "./providers/year-provider";
import { CollegeProvider } from "./providers/college-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <YearProvider>
          <CollegeProvider>{children}</CollegeProvider>
        </YearProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}