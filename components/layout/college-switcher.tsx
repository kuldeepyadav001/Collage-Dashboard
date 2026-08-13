"use client";

import { useEffect, useState } from "react";
import { useSelectedCollege } from "@/components/providers/college-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronDown } from "lucide-react";

interface College {
  id: string;
  name: string;
  fullName: string | null;
}

export function CollegeSwitcher() {
  const { selectedCollegeId, setSelectedCollegeId, refreshBump } = useSelectedCollege();
  const [colleges, setColleges] = useState<College[]>([]);

  useEffect(() => {
    fetch("/api/colleges")
      .then((r) => (r.ok ? r.json() : []))
      .then(setColleges)
      .catch(() => setColleges([]));
  }, [refreshBump]);

  const selected = colleges.find((c) => c.id === selectedCollegeId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent transition-colors outline-none">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">
          {selected ? selected.name : <span className="text-muted-foreground">All Colleges</span>}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => setSelectedCollegeId(null)}
          className="flex items-center justify-between"
        >
          <span>All Colleges</span>
          {selectedCollegeId === null && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        {colleges.length > 0 && <DropdownMenuSeparator />}
        {colleges.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => setSelectedCollegeId(c.id)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span>{c.name}</span>
              {c.fullName && (
                <span className="text-[10px] text-muted-foreground">{c.fullName}</span>
              )}
            </div>
            {selectedCollegeId === c.id && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
        {colleges.length === 0 && (
          <div className="px-2 py-6 text-center">
            <p className="text-xs text-muted-foreground">No colleges yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">Add from Manage</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}