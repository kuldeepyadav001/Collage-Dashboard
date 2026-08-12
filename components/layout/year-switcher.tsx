"use client";

import { useEffect, useState } from "react";
import { useSelectedYear } from "@/components/providers/year-provider";
import { getBatchInfo } from "@/lib/year-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Check, ChevronDown } from "lucide-react";

export function YearSwitcher() {
  const { selectedYear, setSelectedYear } = useSelectedYear();
  const [years, setYears] = useState<number[]>([]);

  // Fetch available years from API
  useEffect(() => {
    fetch("/api/years")
      .then((r) => r.ok ? r.json() : [])
      .then((data: { label: string }[]) => {
        const parsed = data
          .map((y) => parseInt(y.label))
          .filter((n) => !isNaN(n))
          .sort((a, b) => b - a);
        setYears(parsed);
      })
      .catch(() => setYears([]));
  }, []);

  const activeBatches = years
    .map((y) => getBatchInfo(y))
    .filter((b) => b.status === "ACTIVE");

  const passedOutBatches = years
    .map((y) => getBatchInfo(y))
    .filter((b) => b.status === "PASSED_OUT");

  const selectedInfo = selectedYear ? getBatchInfo(selectedYear) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent transition-colors outline-none">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">
          {selectedInfo ? (
            <>
              {selectedInfo.admissionYear}
              <span className="text-muted-foreground ml-1.5">· {selectedInfo.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground">All Batches</span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => setSelectedYear(null)}
          className="flex items-center justify-between"
        >
          <span>All Batches</span>
          {selectedYear === null && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {activeBatches.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Active Batches
            </DropdownMenuLabel>
            {activeBatches.map((b) => (
              <DropdownMenuItem
                key={b.admissionYear}
                onClick={() => setSelectedYear(b.admissionYear)}
                className="flex items-center justify-between"
              >
                <span>
                  {b.admissionYear}
                  <span className="text-muted-foreground ml-1.5 text-xs">
                    · {b.label}
                  </span>
                </span>
                {selectedYear === b.admissionYear && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {passedOutBatches.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Passed Out
            </DropdownMenuLabel>
            {passedOutBatches.map((b) => (
              <DropdownMenuItem
                key={b.admissionYear}
                onClick={() => setSelectedYear(b.admissionYear)}
                className="flex items-center justify-between"
              >
                <span>
                  {b.admissionYear}
                  <span className="text-muted-foreground ml-1.5 text-xs">· Alumni</span>
                </span>
                {selectedYear === b.admissionYear && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {years.length === 0 && (
          <div className="px-2 py-6 text-center">
            <p className="text-xs text-muted-foreground">No batches yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Add a year from Manage
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}