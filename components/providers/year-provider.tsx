"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface YearContextValue {
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
  refreshBump: number;
  triggerRefresh: () => void;
}

const YearContext = createContext<YearContextValue | undefined>(undefined);

export function YearProvider({ children }: { children: React.ReactNode }) {
  const [selectedYear, setSelectedYearState] = useState<number | null>(null);
  const [refreshBump, setRefreshBump] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("selectedYear");
    if (stored) setSelectedYearState(Number(stored));
  }, []);

  const setSelectedYear = (year: number | null) => {
    setSelectedYearState(year);
    if (year === null) localStorage.removeItem("selectedYear");
    else localStorage.setItem("selectedYear", String(year));
  };

  const triggerRefresh = useCallback(() => {
    setRefreshBump((n) => n + 1);
  }, []);

  return (
    <YearContext.Provider
      value={{ selectedYear, setSelectedYear, refreshBump, triggerRefresh }}
    >
      {children}
    </YearContext.Provider>
  );
}

export function useSelectedYear() {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error("useSelectedYear must be used inside YearProvider");
  return ctx;
}