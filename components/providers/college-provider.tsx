"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface CollegeContextValue {
  selectedCollegeId: string | null;
  setSelectedCollegeId: (id: string | null) => void;
  refreshBump: number;
  triggerRefresh: () => void;
}

const CollegeContext = createContext<CollegeContextValue | undefined>(undefined);

export function CollegeProvider({ children }: { children: React.ReactNode }) {
  const [selectedCollegeId, setSelectedCollegeIdState] = useState<string | null>(null);
  const [refreshBump, setRefreshBump] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("selectedCollegeId");
    if (stored) setSelectedCollegeIdState(stored);
  }, []);

  const setSelectedCollegeId = (id: string | null) => {
    setSelectedCollegeIdState(id);
    if (id === null) localStorage.removeItem("selectedCollegeId");
    else localStorage.setItem("selectedCollegeId", id);
  };

  const triggerRefresh = useCallback(() => setRefreshBump((n) => n + 1), []);

  return (
    <CollegeContext.Provider
      value={{ selectedCollegeId, setSelectedCollegeId, refreshBump, triggerRefresh }}
    >
      {children}
    </CollegeContext.Provider>
  );
}

export function useSelectedCollege() {
  const ctx = useContext(CollegeContext);
  if (!ctx) throw new Error("useSelectedCollege must be used inside CollegeProvider");
  return ctx;
}