"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Check,
  Loader2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  college: { id: string; name: string };
  section: {
    id: string;
    name: string;
    course: {
      name: string;
      year: { label: string };
    };
  };
}

interface College {
  id: string;
  name: string;
}

export default function AddMembersPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(
    new Set()
  );
  const [colleges, setColleges] = useState<College[]>([]);
  const [eliteYear, setEliteYear] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Role redirect
  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "READER") {
      router.push(`/dashboard/elite/${params.id}`);
    }
  }, [status, session, router, params.id]);

  // Load data (elite first, then students of that year)
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const eliteRes = await fetch(`/api/elite/${params.id}`);
        if (!eliteRes.ok) {
          toast.error("Elite section not found");
          router.push("/dashboard/elite");
          return;
        }
        const elite = await eliteRes.json();

        const yearLabel = elite.year.label;
        setEliteYear(yearLabel);
        setExistingMemberIds(
          new Set(elite.members?.map((m: any) => m.student.id) || [])
        );

        const [studentsRes, collegesRes] = await Promise.all([
          fetch(`/api/students?year=${yearLabel}`),
          fetch("/api/colleges"),
        ]);
        const [students, cols] = await Promise.all([
          studentsRes.json(),
          collegesRes.json(),
        ]);
        setAllStudents(students);
        setColleges(cols);
      } catch {
        toast.error("Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  const availableStudents = useMemo(() => {
    return allStudents.filter((s) => !existingMemberIds.has(s.id));
  }, [allStudents, existingMemberIds]);

  const filteredStudents = useMemo(() => {
    return availableStudents.filter((s) => {
      if (collegeFilter !== "all" && s.college.id !== collegeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [availableStudents, collegeFilter, search]);

  // Early return AFTER all hooks
  if (status === "loading" || session?.user.role === "READER") {
    return null;
  }

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function selectAllVisible() {
    const next = new Set(selected);
    filteredStudents.forEach((s) => next.add(s.id));
    setSelected(next);
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function addMembers() {
    if (selected.size === 0) return;
    setSaving(true);
    const res = await fetch(`/api/elite/${params.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: Array.from(selected) }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
      setSaving(false);
      return;
    }
    const msg =
      data.skipped > 0
        ? `Added ${data.added}, skipped ${data.skipped} (wrong year)`
        : `Added ${data.added} member${data.added === 1 ? "" : "s"}`;
    toast.success(msg);
    router.push(`/dashboard/elite/${params.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/elite/${params.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to elite section
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add Members</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          {eliteYear ? (
            <>
              Showing students from{" "}
              <span className="font-medium text-foreground">
                {eliteYear} batch
              </span>{" "}
              only
            </>
          ) : (
            "Loading..."
          )}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={collegeFilter} onValueChange={(v) => setCollegeFilter(v || "")}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All colleges</SelectItem>
                {colleges.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selection actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{selected.size}</span> selected
              {" · "}
              <span>{filteredStudents.length} showing</span>
              {" · "}
              <span>{availableStudents.length} available</span>
            </p>
            <div className="flex gap-2">
              {selected.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
              <button
                onClick={selectAllVisible}
                className="text-xs text-primary hover:underline"
              >
                Select all visible
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : availableStudents.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium">
                {allStudents.length === 0
                  ? `No students in ${eliteYear} batch yet`
                  : "All students are already members"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {allStudents.length === 0
                  ? "Add students to this batch from the Students page first"
                  : "Add more students from the Students page first"}
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm">No students match your filters</p>
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {filteredStudents.map((s) => {
                const isSelected = selected.has(s.id);
                const initials = s.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-input"
                      )}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                          {s.college.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {s.rollNumber} · {s.section.course.name} · Sec {s.section.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-6 z-10 flex justify-end">
          <div className="flex items-center gap-3 bg-card border rounded-full shadow-lg pl-4 pr-2 py-2">
            <span className="text-sm">
              <span className="font-semibold">{selected.size}</span>{" "}
              {selected.size === 1 ? "student" : "students"} selected
            </span>
            <Button onClick={addMembers} disabled={saving} className="rounded-full">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Add to Elite
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}