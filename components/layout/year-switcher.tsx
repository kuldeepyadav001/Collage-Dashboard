"use client";

import { useEffect, useState } from "react";
import { useSelectedYear } from "@/components/providers/year-provider";
import { getBatchInfo } from "@/lib/year-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Check, ChevronDown } from "lucide-react";

export function YearSwitcher() {
  const { selectedYear, setSelectedYear, refreshBump } = useSelectedYear();
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    fetch("/api/years")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { label: string }[]) => {
        const parsed = data
          .map((y) => parseInt(y.label))
          .filter((n) => !isNaN(n))
          .sort((a, b) => b - a);
        setYears(parsed);

        // Clear stale selection if year no longer exists
        if (selectedYear !== null && !parsed.includes(selectedYear)) {
          setSelectedYear(null);
        }
      })
      .catch(() => setYears([]));
  }, [refreshBump, selectedYear, setSelectedYear]);

  const activeBatches = years
    .map((y) => getBatchInfo(y))
    .filter((b) => b.status === "ACTIVE" || b.status === "UPCOMING");

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
              Batch {selectedInfo.passingYear}
              <span className="text-muted-foreground ml-1.5">
                · {selectedInfo.label}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">All Batches</span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem
          onClick={() => setSelectedYear(null)}
          className="flex items-center justify-between"
        >
          <span>All Batches</span>
          {selectedYear === null && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {activeBatches.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Active Batches
            </DropdownMenuLabel>
            {activeBatches.map((b) => (
              <DropdownMenuItem
                key={b.passingYear}
                onClick={() => setSelectedYear(b.passingYear)}
                className="flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span>Batch {b.passingYear}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {b.label} · admitted {b.admissionYear}
                  </span>
                </div>
                {selectedYear === b.passingYear && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}

        {passedOutBatches.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Alumni
              </DropdownMenuLabel>
              {passedOutBatches.map((b) => (
                <DropdownMenuItem
                  key={b.passingYear}
                  onClick={() => setSelectedYear(b.passingYear)}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span>Batch {b.passingYear}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Passed out · admitted {b.admissionYear}
                    </span>
                  </div>
                  {selectedYear === b.passingYear && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        {years.length === 0 && (
          <div className="px-2 py-6 text-center">
            <p className="text-xs text-muted-foreground">No batches yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Add a passing year from Manage
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}