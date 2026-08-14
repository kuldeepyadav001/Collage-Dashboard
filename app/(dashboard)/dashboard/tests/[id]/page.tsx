"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Search,
  Users,
  TrendingUp,
  Trophy,
  Save,
  Pencil,
  Calendar,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  college: { name: string };
  section: {
    name: string;
    course: { name: string };
  };
}

interface Test {
  id: string;
  name: string;
  date: string;
  maxMarks: number;
  year: { id: string; label: string };
  marks: { studentId: string; marks: number }[];
  stats: {
    participants: number;
    totalStudents: number;
    avgMarks: number | null;
    highestMarks: number | null;
    lowestMarks: number | null;
  };
  allYearStudents: Student[];
}

export default function TestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [dirtyMarks, setDirtyMarks] = useState<Map<string, number | null>>(new Map());
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", date: "", maxMarks: "" });

  const canWrite =
    session?.user.role === "SUPER_ADMIN" || session?.user.role === "WRITE_ADMIN";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/${params.id}`);
      if (!res.ok) {
        router.push("/dashboard/tests");
        return;
      }
      const data = await res.json();
      setTest(data);
      setEditForm({
        name: data.name,
        date: new Date(data.date).toISOString().split("T")[0],
        maxMarks: String(data.maxMarks),
      });
      setDirtyMarks(new Map());
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build student → marks lookup
  const marksMap = useMemo(() => {
    if (!test) return new Map<string, number>();
    return new Map(test.marks.map((m) => [m.studentId, m.marks]));
  }, [test]);

  function getMark(studentId: string): number | null {
    if (dirtyMarks.has(studentId)) return dirtyMarks.get(studentId) ?? null;
    return marksMap.get(studentId) ?? null;
  }

  function updateMark(studentId: string, value: string) {
    const next = new Map(dirtyMarks);
    if (value === "") {
      next.set(studentId, null);
    } else {
      const num = parseFloat(value);
      if (isNaN(num)) return;
      if (num < 0 || (test && num > test.maxMarks)) return;
      next.set(studentId, num);
    }
    setDirtyMarks(next);
  }

  async function saveDirty() {
    if (!test || dirtyMarks.size === 0) return;
    setSaving(true);
    const marks = Array.from(dirtyMarks.entries()).map(([studentId, m]) => ({
      studentId,
      marks: m,
    }));
    const res = await fetch(`/api/tests/${test.id}/marks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marks }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed");
      setSaving(false);
      return;
    }
    toast.success(`Saved ${dirtyMarks.size} ${dirtyMarks.size === 1 ? "mark" : "marks"}`);
    setSaving(false);
    loadData();
  }

  async function saveEdit() {
    if (!test) return;
    const res = await fetch(`/api/tests/${test.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed");
      return;
    }
    toast.success("Test updated");
    setEditOpen(false);
    loadData();
  }

  // Filter + sort students
  const displayStudents = useMemo(() => {
    if (!test) return [];
    let list = test.allYearStudents;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    // Sort: students with marks first (by marks desc), then without
    return [...list].sort((a, b) => {
      const ma = getMark(a.id);
      const mb = getMark(b.id);
      if (ma !== null && mb === null) return -1;
      if (ma === null && mb !== null) return 1;
      if (ma !== null && mb !== null) return mb - ma;
      return a.name.localeCompare(b.name);
    });
  }, [test, search, dirtyMarks, marksMap]);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
    );
  }
  if (!test) return null;

  const avgPct = test.stats.avgMarks
    ? (test.stats.avgMarks / test.maxMarks) * 100
    : null;
  const highestPct = test.stats.highestMarks
    ? (test.stats.highestMarks / test.maxMarks) * 100
    : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/tests"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to tests
      </Link>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight">{test.name}</h1>
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  {test.year.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(test.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span>Max Marks: {test.maxMarks}</span>
              </div>
            </div>
            {canWrite && (
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md border hover:bg-accent transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <StatBox
              icon={Users}
              label="Participants"
              value={`${test.stats.participants} / ${test.stats.totalStudents}`}
              color="text-primary bg-primary/10"
            />
            <StatBox
              icon={TrendingUp}
              label="Average"
              value={
                test.stats.avgMarks
                  ? `${test.stats.avgMarks.toFixed(1)} / ${test.maxMarks}`
                  : "—"
              }
              subValue={avgPct ? `${avgPct.toFixed(1)}%` : undefined}
              color="text-[color:var(--emerald)] bg-[color:var(--emerald)]/10"
            />
            <StatBox
              icon={Trophy}
              label="Highest"
              value={
                test.stats.highestMarks
                  ? `${test.stats.highestMarks} / ${test.maxMarks}`
                  : "—"
              }
              subValue={highestPct ? `${highestPct.toFixed(1)}%` : undefined}
              color="text-[color:var(--gold)] bg-[color:var(--gold)]/10"
            />
            <StatBox
              icon={TrendingUp}
              label="Lowest"
              value={
                test.stats.lowestMarks !== null
                  ? `${test.stats.lowestMarks} / ${test.maxMarks}`
                  : "—"
              }
              color="text-muted-foreground bg-muted"
            />
          </div>
        </CardContent>
      </Card>

      {/* Marks entry */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {canWrite && dirtyMarks.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {dirtyMarks.size} unsaved
            </span>
            <Button onClick={saveDirty} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Save
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {displayStudents.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? "No students match" : "No students in this batch yet"}
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {displayStudents.map((s, idx) => {
                const mark = getMark(s.id);
                const isDirty = dirtyMarks.has(s.id);
                const pct = mark !== null ? (mark / test.maxMarks) * 100 : null;
                const initials = s.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const rank = mark !== null ? idx + 1 : null;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 p-3 hover:bg-accent transition-colors group",
                      isDirty && "bg-primary/5"
                    )}
                  >
                    <div className="w-8 text-center">
                      {rank && rank <= 3 ? (
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                            rank === 1 && "bg-[color:var(--gold)]/20 text-[color:var(--gold)]",
                            rank === 2 && "bg-slate-400/20 text-slate-500",
                            rank === 3 && "bg-orange-500/20 text-orange-600"
                          )}
                        >
                          {rank}
                        </span>
                      ) : rank ? (
                        <span className="text-xs text-muted-foreground">#{rank}</span>
                      ) : null}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      href={`/dashboard/students/${s.id}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                          {s.college.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {s.rollNumber} · {s.section.course.name} · Sec {s.section.name}
                      </p>
                    </Link>
                    <div className="flex items-center gap-2">
                      {canWrite ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            max={test.maxMarks}
                            step="0.5"
                            value={mark ?? ""}
                            onChange={(e) => updateMark(s.id, e.target.value)}
                            placeholder="—"
                            className="w-20 h-8 text-right"
                          />
                          <span className="text-xs text-muted-foreground w-8">
                            /{test.maxMarks}
                          </span>
                          <span className="text-xs w-12 text-right font-medium">
                            {pct !== null ? `${pct.toFixed(0)}%` : "—"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium">
                            {mark !== null ? `${mark} / ${test.maxMarks}` : "—"}
                          </span>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {pct !== null ? `${pct.toFixed(0)}%` : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Marks</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  value={editForm.maxMarks}
                  onChange={(e) =>
                    setEditForm({ ...editForm, maxMarks: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!editForm.name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className={cn("inline-flex p-1.5 rounded-md", color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-tight">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}