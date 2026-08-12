"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface YearContextValue {
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
}

const YearContext = createContext<YearContextValue | undefined>(undefined);

export function YearProvider({ children }: { children: React.ReactNode }) {
  const [selectedYear, setSelectedYearState] = useState<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("selectedYear");
    if (stored) setSelectedYearState(Number(stored));
  }, []);

  const setSelectedYear = (year: number | null) => {
    setSelectedYearState(year);
    if (year === null) localStorage.removeItem("selectedYear");
    else localStorage.setItem("selectedYear", String(year));
  };

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear }}>
      {children}
    </YearContext.Provider>
  );
}

export function useSelectedYear() {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error("useSelectedYear must be used inside YearProvider");
  return ctx;
}